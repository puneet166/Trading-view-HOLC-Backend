const rateLimit = require("express-rate-limit");
const { RedisStore } = require("rate-limit-redis");
const redis = require("../config/redis");

function createLimiter(max, windowMs) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,

    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),

    handler: (req, res) => {
      res.status(429).json({
        error: "Too many requests",
        message: "Rate limit exceeded. Please slow down.",
      });
    },
  });
}

module.exports = {
  historyLimiter: createLimiter(60, 60 * 1000), // 60 req/min
  symbolLimiter: createLimiter(30, 60 * 1000),  // 30 req/min
};
