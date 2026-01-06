const exchange = require("../config/exchange");
const Candle = require("../models/Candle");
const symbols = require("../config/symbols");
const { acquireLock, releaseLock } = require("../utils/locks");

/**
 * TradingView resolution → exchange timeframe
 */
const resolutionMap = {
  "1": "1m",
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
  const locked = await acquireLock(lockKey, 10000);
  if (!locked) return;

  try {
    let from = since;
    const limit = 500;

    while (true) {
      const ohlcv = await exchange.fetchOHLCV(
        symbolConfig.exchangeSymbol,
        timeframe,
        from,
        limit
      );

      if (!ohlcv || ohlcv.length === 0) break;

      const bulkOps = ohlcv.map(c => {
        const time = Math.floor(c[0] / 1000);

        return {
          updateOne: {
            filter: { symbol, timeframe, time },
            update: {
              $set: {
                symbol,
                timeframe,
                time,
                open: c[1],
                high: c[2],
                low: c[3],
                close: c[4],
                volume: c[5],
              },
            },
            upsert: true,
          },
        };
      });

      await Candle.bulkWrite(bulkOps, { ordered: false });

      // move forward in time
      from = ohlcv[ohlcv.length - 1][0] + 1;

      // stop if less than limit (no more data)
      if (ohlcv.length < limit) break;
    }
  } catch (err) {
    console.error("fetchAndSave error:", err.message);
  } finally {
    await releaseLock(lockKey);
  }
}
async function backfillSymbol(symbol, days = 30) {
  const timeframe = "1m";
  const symbolConfig = symbols.find(s => s.symbol === symbol);
  if (!symbolConfig) return;

  const limit = 500;
  const now = Date.now();
  let since = now - days * 24 * 60 * 60 * 1000;

  console.log(`🔁 Backfilling ${symbol} for ${days} days`);

  while (since < now) {
    try {
      const ohlcv = await exchange.fetchOHLCV(
        symbolConfig.exchangeSymbol,
        timeframe,
        since,
        limit
      );

      if (!ohlcv || ohlcv.length === 0) break;

      const bulkOps = ohlcv.map(c => ({
        updateOne: {
          filter: {
            symbol,
            timeframe,
            time: Math.floor(c[0] / 1000),
          },
          update: {
            $set: {
              symbol,
              timeframe,
              time: Math.floor(c[0] / 1000),
              open: c[1],
              high: c[2],
              low: c[3],
              close: c[4],
              volume: c[5],
            },
          },
          upsert: true,
        },
      }));

      await Candle.bulkWrite(bulkOps, { ordered: false });

      since = ohlcv[ohlcv.length - 1][0] + 1;

      console.log(
        `✅ ${symbol} → saved ${ohlcv.length} candles up to ${new Date(since).toISOString()}`
      );

      // 🛑 VERY IMPORTANT: avoid Binance rate limits
      await new Promise(res => setTimeout(res, 300));

    } catch (err) {
      console.error(`❌ Backfill error for ${symbol}:`, err.message);
      await new Promise(res => setTimeout(res, 1000));
    }
  }

  console.log(`🎉 Backfill complete for ${symbol}`);
}


module.exports = {
  fetchAndSave,
  backfillSymbol,
  resolutionMap,
};

