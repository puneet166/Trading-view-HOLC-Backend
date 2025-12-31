const mongoose = require("mongoose");

const CandleSchema = new mongoose.Schema({
  symbol: { type: String, index: true },
  timeframe: { type: String, index: true }, // 1m,5m,1h,1d
  time: { type: Number, index: true }, // UNIX seconds
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  volume: Number,
});

CandleSchema.index({ symbol: 1, timeframe: 1, time: 1 }, { unique: true });

module.exports = mongoose.model("Candle", CandleSchema);
