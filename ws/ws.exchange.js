const WebSocket = require("ws");
const wsManager = require("./ws.manager");

/**
 * Binance Kline WebSocket
 */
function connectExchangeWS(symbol, timeframe) {
  const intervalMap = {
    "1m": "1m",
    "5m": "5m",
    "15m": "15m",
    "1h": "1h",
    "1d": "1d",
  };

  const stream = `${symbol.toLowerCase()}@kline_${intervalMap[timeframe]}`;
  const url = `wss://stream.binance.com:9443/ws/${stream}`;

  const ws = new WebSocket(url);

  ws.on("message", msg => {
    const data = JSON.parse(msg.toString());
    const k = data.k;

    const candle = {
      time: Math.floor(k.t / 1000),
      open: Number(k.o),
      high: Number(k.h),
      low: Number(k.l),
      close: Number(k.c),
      volume: Number(k.v),
    };

    wsManager.broadcast(symbol.toUpperCase(), timeframe, candle);
  });

  ws.on("open", () => {
    console.log(`Exchange WS connected: ${symbol} ${timeframe}`);
  });

  ws.on("close", () => {
    console.log("Exchange WS closed, reconnecting...");
    setTimeout(() => connectExchangeWS(symbol, timeframe), 3000);
  });
}

module.exports = connectExchangeWS;
