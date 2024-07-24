const IORedis = require("ioredis");

class Redis {
  static connection;
  constructor() {}

  static setConnection(config = { port, host, password }) {
    if (!this.connection) {
      this.connection = new IORedis(config);
    }
  }

  static get connection() {
    if (!this.connection) {
      throw new Error("Redis connection not initialized");
    }
    return this.connection;
  }
}

module.exports = Redis;
