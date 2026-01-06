const express = require("express");
const Candle = require("../models/Candle");
const { fetchAndSave, resolutionMap } = require("../services/candle.service");
const symbols = require("../config/symbols");
const {
  historyLimiter,
  symbolLimiter,
} = require("../middlewares/rateLimiter");
const router = express.Router();
const redis = require("../config/redis");
const getCacheKey = require("../utils/cacheKey");
/**
 * TradingView config
 */
router.get("/config", (req, res) => {
  res.json({
    supported_resolutions: ["1", "5", "15", "60", "1D"],
    supports_group_request: false,
    supports_marks: false,
    supports_timescale_marks: false,
    supports_time: true,
  });
});

/**
 * Symbols
 */

router.get("/symbols",symbolLimiter, (req, res) => {
  res.json(
    symbols.map(s => ({
      symbol: s.symbol,
      full_name: s.symbol,
      description: s.name,
      exchange: "BINANCE",
      type: "crypto",
    }))
  );
});

/**
 * Symbol resolve
 */
router.get("/symbols/resolve",symbolLimiter, (req, res) => {
  const symbol = req.query.symbol;
  const s = symbols.find(x => x.symbol === symbol);

  if (!s) return res.status(404).json({});

  res.json({
    symbol: s.symbol,
    name: s.symbol,
    exchange: "BINANCE",
    timezone: "UTC",
    pricescale: s.pricescale,
    minmov: 1,
    has_intraday: true,
    supported_resolutions: ["1", "5", "15", "60", "1D"],
    volume_precision: 2,
    data_status: "streaming",
  });
});

/**
 * History (TradingView compatible)
 * Aggregates candles from 1m base timeframe
 */
router.get("/history", historyLimiter, async (req, res) => {
    console.log("HISTORY QUERY:", req.query);

  try {
    const { symbol, resolution, from, to } = req.query;

    if (!symbol || !resolution || !from || !to) {
      return res.json({ s: "no_data" });
    }

    // 1️⃣ Always read 1-minute candles
    const baseTimeframe = "1m";

    const candles = await Candle.find({
      symbol,
      timeframe: baseTimeframe,
      time: { $gte: Number(from), $lte: Number(to) },
    }).sort({ time: 1 });

    if (!candles.length) {
      return res.json({ s: "no_data" });
    }

    // 2️⃣ Bucket alignment (TradingView strict)
    function getBucketStart(time) {
      if (resolution === "1") {
        return time; // 1m stays same
      }

      if (resolution === "1D") {
        return Math.floor(time / 86400) * 86400;
      }

      const minutes = parseInt(resolution);
      return Math.floor(time / (minutes * 60)) * (minutes * 60);
    }

    // 3️⃣ Aggregate candles
    const buckets = new Map();

    for (const c of candles) {
      const bucketTime = getBucketStart(c.time);

      if (!buckets.has(bucketTime)) {
        buckets.set(bucketTime, {
          time: bucketTime,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
          volume: c.volume,
        });
      } else {
        const b = buckets.get(bucketTime);
        b.high = Math.max(b.high, c.high);
        b.low = Math.min(b.low, c.low);
        b.close = c.close;
        b.volume += c.volume;
      }
    }

    // 4️⃣ Sort buckets
    const result = Array.from(buckets.values()).sort(
      (a, b) => a.time - b.time
    );

    // 5️⃣ TradingView response format
    res.json({
      s: "ok",
      t: result.map(c => c.time),
      o: result.map(c => c.open),
      h: result.map(c => c.high),
      l: result.map(c => c.low),
      c: result.map(c => c.close),
      v: result.map(c => c.volume),
    });

  } catch (err) {
    console.error("History error:", err);
    res.json({ s: "error" });
  }
});

module.exports = router;
