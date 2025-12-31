const redis = require("../config/redis");

async function acquireLock(key, ttl = 5000) {
  return redis.set(`lock:${key}`, "1", "PX", ttl, "NX");
}

async function releaseLock(key) {
  return redis.del(`lock:${key}`);
}

module.exports = { acquireLock, releaseLock };
