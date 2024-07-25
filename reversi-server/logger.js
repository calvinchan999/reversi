// Logger.js
require("dotenv").config();
const winston = require("winston");

class Logger {
  static logger;
  constructor() {
    this.logger = null;
    this.createLogger();
  }

  createLogger() {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL,
      format: winston.format.json(),
      transports: [
        new winston.transports.File({
          filename: "./logger/error.log",
          level: "error",
        }),
        new winston.transports.File({ filename: "./logger/combined.log" }),
      ],
    });

    if (process.env.NODE_ENV !== "production") {
      this.logger.add(
        new winston.transports.Console({
          format: winston.format.simple(),
        })
      );
    }
  }

  getLogger() {
    return this.logger;
  }

  info(message) {
    this.logger.info(message);
  }

  error(message) {
    this.logger.error(message);
  }

  warn(message) {
    this.logger.warn(message);
  }

  debug(message) {
    this.logger.debug(message);
  }
}
const loggerInstance = new Logger();

module.exports = loggerInstance;
