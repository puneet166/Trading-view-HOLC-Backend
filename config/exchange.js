const ccxt = require("ccxt");

const exchange = new ccxt.binance({
  enableRateLimit: true,
});

module.exports = exchange;
