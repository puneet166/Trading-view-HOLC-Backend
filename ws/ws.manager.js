const subscriptions = new Map();
/**
 * key: channel (symbol|timeframe)
 * value: Set<WebSocket>
 */

function getChannel(symbol, timeframe) {
  return `${symbol}|${timeframe}`;
}

function handleMessage(ws, data) {
  const { type, symbol, timeframe } = data;

  if (type === "subscribe") {
    const channel = getChannel(symbol, timeframe);

    if (!subscriptions.has(channel)) {
      subscriptions.set(channel, new Set());
    }

    subscriptions.get(channel).add(ws);
  }

  if (type === "unsubscribe") {
    const channel = getChannel(symbol, timeframe);
    subscriptions.get(channel)?.delete(ws);
  }
}

function broadcast(symbol, timeframe, candle) {
  const channel = getChannel(symbol, timeframe);
  const clients = subscriptions.get(channel);

  if (!clients) return;

  for (const ws of clients) {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(candle));
    }
  }
}

function removeClient(ws) {
  for (const clients of subscriptions.values()) {
    clients.delete(ws);
  }
}

module.exports = {
  handleMessage,
  broadcast,
  removeClient,
};
