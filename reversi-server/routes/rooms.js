// server.js or routes/rooms.js
const express = require("express");
const Room = require("../room");
const Redis = require("../redis");

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const room = new Room(Redis.connection);
    const rooms = await room.getRooms();

    // You might want to filter or transform the room data here
    // const roomSummaries = rooms.map(room => ({
    //   id: room.id,
    //   players: room.players,
    //   status: room.status,
    //   // Add other relevant fields
    // }));

    res.json({ rooms });
  } catch (error) {
    console.error("Error fetching rooms:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
