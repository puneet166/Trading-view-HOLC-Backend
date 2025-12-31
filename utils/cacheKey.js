module.exports = (symbol, timeframe, from, to) => {
  return `candles:${symbol}:${timeframe}:${from}:${to}`;
};
