const rateLimit = require("express-rate-limit");
const RedisStore = require("rate-limit-redis");
const redis = require("../config/redis");

const createLimiter = (max, windowMs) =>
  rateLimit({
    store: new RedisStore({
      sendCommand: (...args) => redis.call(...args),
    }),
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      res.status(429).json({
        error: "Too many requests",
        message: "Rate limit exceeded. Please slow down.",
      });
    },
  });

module.exports = {
  historyLimiter: createLimiter(60, 60 * 1000),
  symbolLimiter: createLimiter(30, 60 * 1000),
};
