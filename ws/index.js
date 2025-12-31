const connectExchangeWS = require("./ws.exchange");

function startExchangeStreams() {
  const symbols = [
    "btcusdt",
    "ethusdt",
    "bnbusdt",
    "adausdt",
    "solusdt",
    "xrpusdt",
    "linkusdt",
  ];

  for (const symbol of symbols) {
    connectExchangeWS(symbol, "1m");
  }
}

module.exports = startExchangeStreams;
