const WebSocket = require("ws");
const wsManager = require("./ws.manager");

function initWSServer(server) {
  const wss = new WebSocket.Server({ server });

  wss.on("connection", ws => {
    console.log("WS client connected");

    ws.on("message", msg => {
      try {
        const data = JSON.parse(msg.toString());
        wsManager.handleMessage(ws, data);
      } catch (err) {
        console.error("WS parse error", err.message);
      }
    });

    ws.on("close", () => {
      wsManager.removeClient(ws);
      console.log("WS client disconnected");
    });
  });
}

module.exports = initWSServer;
