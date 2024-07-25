require("dotenv").config();

const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const db = require("./database/db");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const Redis = require("./redis");

const loggerInstance = require("./logger");
const logger = loggerInstance.getLogger();

const {
  createGame,
  getValidMoves,
  checkWinner,
  makeMove,
  getBotMove,
  createAIGame,
} = require("./reversi");

Redis.setConnection({
  port: 6379,
  host: process.env.HOST,
  password: process.env.PASSWORD,
});

const Room = require("./room");
const rooms = require("./routes/rooms");

const GAME_TTL = 3600;

const RETRY_DELAY = 1000; // 1 second
const MAX_RETRIES = 3;

async function getGame(roomId) {
  try {
    const gameString = await Redis.connection.get(`game:${roomId}`);
    return gameString ? JSON.parse(gameString) : null;
  } catch (error) {
    logger.error(`Error getting game: ${error}`);
    return null;
  }
}

async function setGame(roomId, game) {
  try {
    await Redis.connection.set(
      `game:${roomId}`,
      JSON.stringify(game),
      "EX",
      GAME_TTL
    );
  } catch (error) {
    logger.error(`Error setting game: ${error}`);
  }
}

async function createAndSaveGame(roomId, mode) {
  const game = mode === "ai" ? createAIGame(roomId, mode) : createGame();
  await setGame(roomId, game);
  
  const room = new Room(Redis.connection);
  const rooms = await room.getRooms();
  io.emit("roomsUpdated", rooms);
  return new Promise((resolve) => setTimeout(() => resolve(game), 100)); // Small delay to ensure Redis saves the game
}

io.on("connection", (socket) => {
  logger.info("New client connected");

  socket.on("joinRoom", async (roomId, mode) => {
    logger.info(`Player attempting to join room: ${roomId} mode: ${mode}`);

    let retries = 0;
    const attemptJoin = async () => {
      try {
        let game = await getGame(roomId);
        if (!game) {
          logger.info(`Creating new room: ${roomId}`);
          game = await createAndSaveGame(roomId, mode);
        }

        if (
          mode === "ai" &&
          game.players.black === "human" &&
          game.players.white === "ai"
        ) {
          socket.join(roomId);
          socket.emit("playerColor", "black");
          logger.info(`Player ${socket.id} joined AI room ${roomId} as black`);
        } else if (!game.players.black) {
          game.players.black = socket.id;
          socket.join(roomId);
          socket.emit("playerColor", "black");
          logger.info(`Player ${socket.id} joined room ${roomId} as black`);
        } else if (!game.players.white && mode !== "ai") {
          game.players.white = socket.id;
          socket.join(roomId);
          socket.emit("playerColor", "white");
          logger.info(`Player ${socket.id} joined room ${roomId} as white`);
        } else {
          logger.info(
            `Room ${roomId} is full or incompatible mode, rejecting player ${socket.id}`
          );
          socket.emit("roomFull");
          return;
        }

        await setGame(roomId, game);

        socket.emit("updateBoard", game.board);
        socket.emit("switchTurn", game.currentPlayer);

        if (game.players.black && game.players.white) {
          logger.info(`Game in room ${roomId} is starting`);
          io.to(roomId).emit("gameStart");
          if (game.mode === "ai" && game.currentPlayer === "white") {
            await handleAIMove(roomId);
          }
        }

        const blackCount = game.board.filter((cell) => cell === "black").length;
        const whiteCount = game.board.filter((cell) => cell === "white").length;
        io.to(roomId).emit("score", { blackCount, whiteCount });
      } catch (error) {
        logger.error(`Error in joinRoom attempt ${retries + 1}: ${error}`);
        if (retries < MAX_RETRIES) {
          retries++;
          setTimeout(attemptJoin, RETRY_DELAY);
        } else {
          socket.emit(
            "error",
            "Failed to join the room after multiple attempts"
          );
        }
      }
    };

    attemptJoin();
  });

  async function handleAIMove(roomId) {
    try {
      const game = await getGame(roomId);
      if (
        game &&
        game.currentPlayer === "white" &&
        game.players.white === "ai"
      ) {
        // Wait for 5 seconds
        await new Promise((resolve) => setTimeout(resolve, 3000));

        const aiMove = getBotMove(game);
        if (aiMove !== null) {
          makeMove(game.board, aiMove, "white");
          io.to(roomId).emit("updateBoard", game.board);

          const winner = checkWinner(game.board);
          if (winner) {
            io.to(roomId).emit("gameOver", winner);
          } else {
            game.currentPlayer = "black";
            const validMoves = getValidMoves(game.board, game.currentPlayer);
            if (validMoves.length === 0) {
              game.currentPlayer = "white";
              io.to(roomId).emit(
                "skipTurn",
                "Black has no valid moves. Skipping turn."
              );
              await handleAIMove(roomId);
            } else {
              io.to(roomId).emit("switchTurn", game.currentPlayer);
            }
          }
          await setGame(roomId, game);
        }
      }
    } catch (error) {
      logger.error(`Error in handleAIMove: ${error}`);
    }
  }

  socket.on("makeMove", async ({ index, player, roomId }) => {
    try {
      const game = await getGame(roomId);
      if (
        game &&
        player === game.currentPlayer &&
        makeMove(game.board, index, player)
      ) {
        io.to(roomId).emit("updateBoard", game.board);

        const blackCount = game.board.filter((cell) => cell === "black").length;
        const whiteCount = game.board.filter((cell) => cell === "white").length;
        io.to(roomId).emit("score", { blackCount, whiteCount });

        const winner = checkWinner(game.board);
        if (winner) {
          io.to(roomId).emit("gameOver", winner);
        } else {
          game.currentPlayer =
            game.currentPlayer === "black" ? "white" : "black";
          const validMoves = getValidMoves(game.board, game.currentPlayer);
          if (validMoves.length === 0) {
            game.currentPlayer =
              game.currentPlayer === "black" ? "white" : "black";
            io.to(roomId).emit(
              "skipTurn",
              `${
                game.currentPlayer === "black" ? "White" : "Black"
              } has no valid moves. Skipping turn.`
            );
          }
          io.to(roomId).emit("switchTurn", game.currentPlayer);
        }
        await setGame(roomId, game);

        if (game.mode === "ai" && game.currentPlayer === "white") {
          await handleAIMove(roomId);
        }
      }
    } catch (error) {
      logger.error(`Error in makeMove: ${error}`);
      socket.emit("error", "An error occurred while making a move");
    }
  });

  socket.on("sendMessage", async ({ roomId, message, player }) => {
    try {
      const game = await getGame(roomId);
      if (game && game?.players[player] === socket.id && message) {
        io.to(roomId).emit("chatMessage", {
          player,
          message,
          socketId: game.players[player],
        });
      }
    } catch (error) {
      logger.error(`Error in sendMessage: ${error}`);
      socket.emit("error", "An error occurred while sending a message");
    }
  });

  socket.on("getLegalMoves", async ({ player, roomId }, callback) => {
    try {
      const game = await getGame(roomId);
      if (game) {
        const legalMoves = getValidMoves(game.board, player);
        callback(legalMoves);
      } else {
        callback([]);
      }
    } catch (error) {
      logger.error(`Error in getLegalMoves: ${error}`);
      callback([]);
    }
  });

  socket.on("requestRooms", async () => {
    try {
      const room = new Room(Redis.connection);
      const rooms = await room.getRooms();
      socket.emit("roomsUpdated", rooms);
    } catch (error) {
      logger.error(`Error fetching rooms: ${error}`);
      // socket.emit("error", "Failed to fetch rooms");
    }
  });

  socket.on("disconnect", async () => {
    try {
      const rooms = await Redis.connection.keys("game:*");
      for (let roomKey of rooms) {
        const roomId = roomKey.split(":")[1];
        const game = await getGame(roomId);
        if (
          game &&
          (game.players.black === socket.id || game.players.white === socket.id)
        ) {
          io.to(roomId).emit("playerDisconnected");
          await Redis.connection.del(`game:${roomId}`);
          break;
        }
      }
      logger.info("Client disconnected");
    } catch (error) {
      logger.error(`Error in disconnect handler: ${error}`);
    }
  });
});

// app.use(cors());

app.use("/api/v1/rooms", rooms);

const port = process.env.PORT || 3001;
server.listen(port, async () => {
  logger.info(`Server running on port ${port}`);

  // main();

  // debug
  // const d1 = [
  //   null, null, null, null, null, null, null, null ,
  //   null, null, null, null, null, null, null, null ,
  //   null, null, null, null, null, null, null, null ,
  //   null, null, null, "black", "black", "black", "black", null ,
  //   null, null, null, "white", "white", "white", "black", "white" ,
  //   null, null, null, null, null, null, "black", null ,
  //   null, null, null, null, null, null, "black", "white" ,
  //   null, null, null, null, null, null, null, null
  // ];

  // const legalMoves = getValidMoves(d1, "black");
  // logger.error(legalMoves);
});
