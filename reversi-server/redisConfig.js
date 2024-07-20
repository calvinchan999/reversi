require('dotenv').config()

const redisConfig = {
    port: 6379,
    host: process.env.HOST ?? "",
    passowrd: process.env.PASSWORD ?? ""
}

module.exports = {
    redisConfig
}