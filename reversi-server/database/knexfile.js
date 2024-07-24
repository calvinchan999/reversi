require("dotenv").config({ path: require("path").resolve("../.env") });

const path = require("path");

const config = {
  development: {
    client: "mysql2",
    connection: {
      host: process.env.HOST ?? "localhost",
      user: process.env.SQL_USER ?? "root",
      password: process.env.SQL_PASSWORD ?? "123456",
      port: 8088,
      database: "admin",
    },
    migrations: {
      directory: path.join(__dirname, "migrations"),
      tableName: 'knex_migrations'
    },
    // Optional: Seed data configuration
    // seeds: {
    //   directory: './seeds',
    // },
  },
  production: {
    client: "mysql2",
    connection: {
      host: process.env.HOST ?? "localhost",
      user: process.env.SQL_USER ?? "root",
      password: process.env.SQL_PASSWORD ?? "123456",
      port: 8088,
      database: "admin",
    },
    migrations: {
      directory: path.join(__dirname, "migrations"),
    },
  },
};

module.exports = config[process.env.NODE_ENV || "development"];
