const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const Redis = require("ioredis");
const winston = require("winston");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_ORIGIN || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

const { redisConfig } = require("./redisConfig");

const redis = new Redis(redisConfig);
const GAME_TTL = 3600;
const BOARD_SIZE = 64;
const INITIAL_BLACK_POSITIONS = [27, 36];
const INITIAL_WHITE_POSITIONS = [28, 35];

const RETRY_DELAY = 1000; // 1 second
const MAX_RETRIES = 3;

const logger = winston.createLogger({
  level: "info",
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: "error.log", level: "error" }),
    new winston.transports.File({ filename: "combined.log" }),
  ],
});

if (process.env.NODE_ENV !== "production") {
  logger.add(new winston.transports.Console({
    format: winston.format.simple(),
  }));
}

function createGame() {
  let board = Array(BOARD_SIZE).fill(null);
  INITIAL_BLACK_POSITIONS.forEach(pos => board[pos] = "black");
  INITIAL_WHITE_POSITIONS.forEach(pos => board[pos] = "white");
  return {
    board,
    currentPlayer: "black",
    players: { black: null, white: null },
  };
}

const directions = [-9, -8, -7, -1, 1, 7, 8, 9];

function isValidMove(board, player, index) {
  if (index < 0 || index >= BOARD_SIZE || board[index] !== null) return false;

  const opponent = player === "black" ? "white" : "black";

  return directions.some(direction => {
    let currentIndex = index + direction;
    let flipped = false;

    while (isValidIndex(currentIndex)) {
      if (board[currentIndex] === null) break;
      if (board[currentIndex] === player) return flipped;
      if (board[currentIndex] === opponent) {
        flipped = true;
        currentIndex += direction;
      }
    }

    return false;
  });
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

  logger.info(board);
  const opponent = player === "black" ? "white" : "black";

  directions.forEach(direction => {
    let currentIndex = index + direction;
    let toFlip = [];

    while (isValidIndex(currentIndex) && isInSameDirection(index, currentIndex, direction)) {
      if (board[currentIndex] === null) break;
      if (board[currentIndex] === player) {
        toFlip.forEach(flipIndex => {
          board[flipIndex] = player;
        });
        break;
      }
      if (board[currentIndex] === opponent) {
        toFlip.push(currentIndex);
        currentIndex += direction;
      }
    }
  });

  return true;
}

function isValidIndex(index) {
  const row = Math.floor(index / 8);
  const col = index % 8;
  return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function isInSameDirection(start, current, direction) {
  const startRow = Math.floor(start / 8);
  const startCol = start % 8;
  const currentRow = Math.floor(current / 8);
  const currentCol = current % 8;

  switch (direction) {
    case -9: case 7: return currentCol < startCol; // left diagonal
    case -7: case 9: return currentCol > startCol; // right diagonal
    case -8: case 8: return currentCol === startCol; // vertical
    case -1: case 1: return currentRow === startRow; // horizontal
    default: return false;
  }
}

async function getGame(roomId) {
  try {
    const gameString = await redis.get(`game:${roomId}`);
    return gameString ? JSON.parse(gameString) : null;
  } catch (error) {
    logger.error(`Error getting game: ${error}`);
    return null;
  }
}

async function setGame(roomId, game) {
  try {
    await redis.set(`game:${roomId}`, JSON.stringify(game), "EX", GAME_TTL);
  } catch (error) {
    logger.error(`Error setting game: ${error}`);
  }
}

// AI Bot logic
function getBotMove(game) {
  const validMoves = getValidMoves(game.board, game.currentPlayer);
  if (validMoves.length === 0) return null;

  // Simple strategy: choose the move that flips the most pieces
  let bestMove = validMoves[0];
  let maxFlipped = 0;

  for (const move of validMoves) {
    const tempBoard = [...game.board];
    makeMove(tempBoard, move, game.currentPlayer);
    const flippedCount = tempBoard.filter(cell => cell === game.currentPlayer).length - 
                         game.board.filter(cell => cell === game.currentPlayer).length;
    
    if (flippedCount > maxFlipped) {
      maxFlipped = flippedCount;
      bestMove = move;
    }
  }

  return bestMove;
}

function createAIGame(roomId, mode) {
  const game = createGame();
  game.mode = mode;
  game.players.black = 'human';
  game.players.white = 'ai';
  return game;
}

async function createAndSaveGame(roomId, mode) {
  const game = mode === 'ai' ? createAIGame(roomId, mode) : createGame();
  await setGame(roomId, game);
  return new Promise(resolve => setTimeout(() => resolve(game), 100)); // Small delay to ensure Redis saves the game
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

        if (mode === 'ai' && game.players.black === 'human' && game.players.white === 'ai') {
          socket.join(roomId);
          socket.emit("playerColor", "black");
          logger.info(`Player ${socket.id} joined AI room ${roomId} as black`);
        } else if (!game.players.black) {
          game.players.black = socket.id;
          socket.join(roomId);
          socket.emit("playerColor", "black");
          logger.info(`Player ${socket.id} joined room ${roomId} as black`);
        } else if (!game.players.white && mode !== 'ai') {
          game.players.white = socket.id;
          socket.join(roomId);
          socket.emit("playerColor", "white");
          logger.info(`Player ${socket.id} joined room ${roomId} as white`);
        } else {
          logger.info(`Room ${roomId} is full or incompatible mode, rejecting player ${socket.id}`);
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
          socket.emit("error", "Failed to join the room after multiple attempts");
        }
      }
    };

    attemptJoin();
  });

  async function handleAIMove(roomId) {
    try {
      const game = await getGame(roomId);
      if (game && game.currentPlayer === "white" && game.players.white === "ai") {
        // Wait for 5 seconds
        await new Promise(resolve => setTimeout(resolve, 3000));

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
        console.log('test: ', player);
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

  socket.on("disconnect", async () => {
    try {
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
      logger.info("Client disconnected");
    } catch (error) {
      logger.error(`Error in disconnect handler: ${error}`);
    }
  });
});

const port = process.env.PORT || 3001;
server.listen(port, () => logger.info(`Server running on port ${port}`));