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
 * History (Candles)
 */
router.get("/history",historyLimiter, async (req, res) => {
  const { symbol, resolution, from, to } = req.query;
  const timeframe = resolutionMap[resolution];

  if (!timeframe) {
    return res.json({ s: "no_data" });
  }

  const cacheKey = getCacheKey(symbol, timeframe, from, to);

  // 1️⃣ Check Redis cache
  const cached = await redis.get(cacheKey);
  if (cached) {
    return res.json(JSON.parse(cached));
  }

  // 2️⃣ Fetch missing candles (MongoDB auto-fill)
  await fetchAndSave(symbol, resolution, from * 1000);

  const candles = await Candle.find({
    symbol,
    timeframe,
    time: { $gte: Number(from), $lte: Number(to) },
  }).sort({ time: 1 });

  if (!candles.length) {
    return res.json({ s: "no_data" });
  }

  const response = {
    s: "ok",
    t: candles.map(c => c.time),
    o: candles.map(c => c.open),
    h: candles.map(c => c.high),
    l: candles.map(c => c.low),
    c: candles.map(c => c.close),
    v: candles.map(c => c.volume),
  };

  // 3️⃣ Save to Redis (TTL = 30 seconds)
  await redis.setex(cacheKey, 30, JSON.stringify(response));

  res.json(response);
});


module.exports = router;
