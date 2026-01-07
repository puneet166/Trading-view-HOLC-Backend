const Redis = require("ioredis");

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT,
   maxRetriesPerRequest: null,
  enableReadyCheck: true,
    retryStrategy(times) {
    return Math.min(times * 100, 2000);
  },

});

redis.on("connect", () => {
  console.log("Redis Cluster connected");
});

redis.on("error", err => {
  console.error("Redis error", err);
});

module.exports = redis;
