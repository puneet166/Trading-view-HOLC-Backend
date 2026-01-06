const cron = require("node-cron");
require("dotenv").config();

// 🔥 CONNECT TO MONGODB (THIS WAS MISSING)
const connectDB = require("../config/db");
connectDB();

const symbols = require("../config/symbols");
const { fetchAndSave } = require("../services/candle.service");

const resolutions = ["1"]; // 🔥 IMPORTANT: ONLY 1m (see note below)

cron.schedule("*/1 * * * *", async () => {
  try {
    const since = Date.now() - 24 * 60 * 60 * 1000; // last 24 hours

    for (const s of symbols) {
      await fetchAndSave(s.symbol, "1", since);
    }

    console.log("1m candles updated");
  } catch (err) {
    console.error("Worker error:", err.message);
  }
});
