require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");

const connectDB = require("./config/db");
const tvRoutes = require("./routes/tradingview.routes");
const initWSServer = require("./ws/ws.server");
const startExchangeStreams = require("./ws");

connectDB();

const app = express();
app.use(cors());
app.use("/tv", tvRoutes);

const server = http.createServer(app);

// 🔥 WebSocket server
initWSServer(server);

// 🔥 Start Binance streams
startExchangeStreams();

server.listen(4000, () => {
  console.log("Server running on port 4000");
});
