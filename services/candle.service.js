const exchange = require("../config/exchange");
const Candle = require("../models/Candle");
const symbols = require("../config/symbols");
const { acquireLock, releaseLock } = require("../utils/locks");

/**
 * TradingView resolution → exchange timeframe
 */
const resolutionMap = {
  "1": "1m",
  "5": "5m",
  "15": "15m",
  "60": "1h",
  "1D": "1d",
};

/**
 * Fetch candles from exchange and store in MongoDB
 * Uses Redis lock to avoid duplicate ccxt calls
 */
async function fetchAndSave(symbol, resolution, since) {
  const timeframe = resolutionMap[resolution];
  if (!timeframe) return;

  const symbolConfig = symbols.find(s => s.symbol === symbol);
  if (!symbolConfig) return;

  const lockKey = `fetch:${symbol}:${timeframe}`;

  // 🔒 Acquire distributed lock
  const locked = await acquireLock(lockKey, 10000); // 10 sec lock
  if (!locked) {
    // Another request/worker is already fetching
    return;
  }

  try {
    const ohlcv = await exchange.fetchOHLCV(
      symbolConfig.exchangeSymbol, // e.g. BTC/USDT
      timeframe,
      since,
      500
    );

    if (!ohlcv || !ohlcv.length) return;

    const bulkOps = ohlcv.map(candle => {
      const time = Math.floor(candle[0] / 1000);

      return {
        updateOne: {
          filter: {
            symbol,
            timeframe,
            time,
          },
          update: {
            $set: {
              symbol,
              timeframe,
              time,
              open: candle[1],
              high: candle[2],
              low: candle[3],
              close: candle[4],
              volume: candle[5],
            },
          },
          upsert: true,
        },
      };
    });

    // ⚡ Bulk write for performance
    await Candle.bulkWrite(bulkOps, { ordered: false });

  } catch (err) {
    console.error("fetchAndSave error:", err.message);
  } finally {
    // 🔓 Always release lock
    await releaseLock(lockKey);
  }
}

module.exports = {
  fetchAndSave,
  resolutionMap,
};
