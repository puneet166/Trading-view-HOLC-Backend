require("dotenv").config();
const connectDB = require("../config/db");
const symbols = require("../config/symbols");
const { backfillSymbol } = require("../services/candle.service");

(async () => {
  try {
    await connectDB();

    // ⏱️ CHANGE THIS (30, 60, 90 days etc.)
    const DAYS = 60;

    for (const s of symbols) {
      await backfillSymbol(s.symbol, DAYS);
    }

    console.log("🚀 ALL SYMBOLS BACKFILLED");
    process.exit(0);
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exit(1);
  }
})();
