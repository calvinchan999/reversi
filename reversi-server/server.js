// server.js
const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const Redis = require("ioredis");

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const { redisConfig } = require("./redisConfig")

const redis = new Redis(redisConfig);
const GAME_TTL = 3600;

// const rooms = new Map();

function createGame() {
  let board = Array(64).fill(null);
  board[27] = board[36] = "white";
  board[28] = board[35] = "black";
  return {
    board,
    currentPlayer: "black",
    players: { black: null, white: null },
  };
}

const directions = [-9, -8, -7, -1, 1, 7, 8, 9];

function isValidMove(board, player, index) {
  if (board[index] !== null) return false;

  const opponent = player === "black" ? "white" : "black";

  for (let direction of directions) {
    let currentIndex = index + direction;
    let flipped = false;

    while (currentIndex >= 0 && currentIndex < 64) {
      if (board[currentIndex] === null) break;
      if (board[currentIndex] === player) {
        if (flipped) return true;
        break;
      }
      if (board[currentIndex] === opponent) {
        flipped = true;
        currentIndex += direction;
      }
    }
  }

  return false;
}

function getValidMoves(board, player) {
  return board.reduce((moves, cell, index) => {
    if (isValidMove(board, player, index)) {
      moves.push(index);
    }
    return moves;
  }, []);
}

function checkWinner(board) {
  const blackCount = board.filter((cell) => cell === "black").length;
  const whiteCount = board.filter((cell) => cell === "white").length;
  const emptyCount = board.filter((cell) => cell === null).length;

  if (
    emptyCount === 0 ||
    (getValidMoves(board, "black").length === 0 &&
      getValidMoves(board, "white").length === 0)
  ) {
    if (blackCount > whiteCount) return "black";
    if (whiteCount > blackCount) return "white";
    return "draw";
  }

  return null;
}

function makeMove(board, index, player) {
  if (!isValidMove(board, player, index)) return false;

  board[index] = player;
  const opponent = player === "black" ? "white" : "black";

  for (let direction of directions) {
    let currentIndex = index + direction;
    let toFlip = [];

    while (currentIndex >= 0 && currentIndex < 64) {
      if (board[currentIndex] === null) break;
      if (board[currentIndex] === player) {
        for (let flipIndex of toFlip) {
          board[flipIndex] = player;
        }
        break;
      }
      if (board[currentIndex] === opponent) {
        toFlip.push(currentIndex);
        currentIndex += direction;
      }
    }
  }

  return true;
}

async function getGame(roomId) {
  const gameString = await redis.get(`game:${roomId}`);
  return gameString ? JSON.parse(gameString) : null;
}

async function setGame(roomId, game) {
  await redis.set(`game:${roomId}`, JSON.stringify(game));
}

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("joinRoom", async (roomId) => {
    console.log(`Player attempting to join room: ${roomId}`);

    let game = await getGame(roomId);
    if (!game) {
      console.log(`Creating new room: ${roomId}`);
      game = createGame();
      await setGame(roomId, game);
    }

    if (!game.players.black) {
      game.players.black = socket.id;
      socket.join(roomId);
      socket.emit("playerColor", "black");
      console.log(`Player ${socket.id} joined room ${roomId} as black`);
    } else if (!game.players.white) {
      game.players.white = socket.id;
      socket.join(roomId);
      socket.emit("playerColor", "white");
      console.log(`Player ${socket.id} joined room ${roomId} as white`);
    } else {
      console.log(`Room ${roomId} is full, rejecting player ${socket.id}`);
      socket.emit("roomFull");
      return;
    }

    await setGame(roomId, game);

    socket.emit("updateBoard", game.board);
    socket.emit("switchTurn", game.currentPlayer);

    if (game.players.black && game.players.white) {
      console.log(`Game in room ${roomId} is starting`);
      io.to(roomId).emit("gameStart");
    }

    const blackCount = game.board.filter((cell) => cell === "black").length;
    const whiteCount = game.board.filter((cell) => cell === "white").length;
    io.to(roomId).emit("score", { blackCount, whiteCount });
  });

  socket.on("makeMove", async ({ index, player, roomId }) => {
    // const game = rooms.get(roomId);
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
        game.currentPlayer = game.currentPlayer === "black" ? "white" : "black";
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
    }
  });

  socket.on("sendMessage", async ({ roomId, message, player }) => {
    // const game = rooms.get(roomId);
    const game = await getGame(roomId);
    if (game && game?.players[player] === socket.id && message) {
      io.to(roomId).emit("chatMessage", {
        player,
        message,
        socketId: game.players[player],
      });
    }
  });

  // socket.on("score", ({roomId, player}) => {
  //   const game = rooms.get(roomId);
  //   if (game && game?.players[player] === socket.id) {

  //   }
  // })

  // socket.on("disconnect", () => {
  //   for (let [roomId, game] of rooms.entries()) {
  //     if (
  //       game.players.black === socket.id ||
  //       game.players.white === socket.id
  //     ) {
  //       io.to(roomId).emit("playerDisconnected");
  //       rooms.delete(roomId);
  //       break;
  //     }
  //   }
  //   console.log("Client disconnected");
  // });

  socket.on("disconnect", async () => {
    const rooms = await redis.keys("game:*");
    for (let roomKey of rooms) {
      const roomId = roomKey.split(":")[1];
      const game = await getGame(roomId);
      if (
        game &&
        (game.players.black === socket.id || game.players.white === socket.id)
      ) {
        io.to(roomId).emit("playerDisconnected");
        await redis.del(`game:${roomId}`);
        break;
      }
    }
    console.log("Client disconnected");
  });
});

const port = 3001;
server.listen(port, () => console.log(`Server running on port ${port}`));
