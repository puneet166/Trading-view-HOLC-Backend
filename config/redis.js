const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,

  // 🔥 IMPORTANT FIXES
  enableOfflineQueue: true,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    return Math.min(times * 200, 2000);
  },
});

redis.on("connect", () => {
  console.log("Redis connected");
});

redis.on("error", err => {
  console.error("Redis error", err.message);
});

module.exports = redis;
