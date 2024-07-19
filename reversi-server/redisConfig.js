const redisConfig = {
    port: 6379,
    host: process.env.host ?? "",
    passowrd: process.env.password ?? ""
}

module.exports = {
    redisConfig
}