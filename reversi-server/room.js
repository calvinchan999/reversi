class Room {
  static redis;

  constructor(redis) {
    this.redis = redis;
  }

  async getRooms() {
    const roomKeys = await this.redis.keys('game:*');
    const rooms = [];
    for (const key of roomKeys) {
      const roomData = await this.redis.get(key);
      if (roomData) {
        rooms.push(JSON.parse(roomData));
      }
    }
    return rooms;
  }
}

module.exports = Room;
