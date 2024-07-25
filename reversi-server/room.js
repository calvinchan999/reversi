class Room {
  static redis;

  constructor(redis) {
    this.redis = redis;
  }

  async getRooms() {
    const roomKeys = await this.redis.keys("game:*");
    const rooms = [];
    for (const key of roomKeys) {
      const roomData = await this.redis.get(key);
      if (roomData) {
        const roomDataJson = JSON.parse(roomData);
        const { black, white } = roomDataJson.players;
        const hasBlack = black ? 1 : 0;
        const hasWhite = white ? 1 : 0;
        const totalPlayers = hasBlack + hasWhite;
        rooms.push({
          ...roomDataJson,
          totalPlayers,
          roomId: key.split(":")[1],
        });
      }
    }
    return rooms;
  }
}

module.exports = Room;
