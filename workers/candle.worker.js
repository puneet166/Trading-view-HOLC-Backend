const cron = require("node-cron");
const symbols = require("../config/symbols");
const { fetchAndSave } = require("../services/candle.service");
const redis = require("../config/redis");

cron.schedule("*/1 * * * *", async () => {
  for (const s of symbols) {
    await fetchAndSave(s.symbol, "1", Date.now() - 60 * 1000);
  }

  // Clear candle cache
  await redis.flushdb();

  console.log("Updated candles & cleared cache");
});
