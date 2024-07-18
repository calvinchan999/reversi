const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

function createInitialBoard() {
  const board = Array(64).fill(null);
  board[27] = 'white';
  board[28] = 'black';
  board[35] = 'black';
  board[36] = 'white';
  return board;
}

function isValidMove(board, player, index) {
  if (board[index] !== null) return false;

  const opponent = player === 'black' ? 'white' : 'black';
  const directions = [-9, -8, -7, -1, 1, 7, 8, 9];

  for (let direction of directions) {
    let currentIndex = index + direction;
    let flipped = false;

    while (currentIndex >= 0 && currentIndex < 64) {
      if (board[currentIndex] === null) break;
      if (board[currentIndex] === opponent) {
        flipped = true;
      } else if (board[currentIndex] === player && flipped) {
        return true;
      } else {
        break;
      }
      currentIndex += direction;
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
  const blackCount = board.filter(cell => cell === 'black').length;
  const whiteCount = board.filter(cell => cell === 'white').length;
  const emptyCount = board.filter(cell => cell === null).length;

  if (emptyCount === 0 || (getValidMoves(board, 'black').length === 0 && getValidMoves(board, 'white').length === 0)) {
    if (blackCount > whiteCount) return 'black';
    if (whiteCount > blackCount) return 'white';
    return 'draw';
  }

  return null;
}

io.on('connection', (socket) => {
  console.log('New client connected');

  socket.on('joinRoom', (roomId) => {
    if (!rooms.has(roomId)) {
      rooms.set(roomId, {
        board: createInitialBoard(),
        players: [],
        currentPlayer: 'black'
      });
    }

    const room = rooms.get(roomId);

    if (room.players.length >= 2) {
      socket.emit('roomFull');
      return;
    }

    socket.join(roomId);

    const playerColor = room.players.length === 0 ? 'black' : 'white';
    room.players.push({ id: socket.id, color: playerColor });

    socket.emit('playerColor', playerColor);
    socket.emit('updateBoard', room.board);

    if (room.players.length === 2) {
      io.to(roomId).emit('gameStart');
      io.to(roomId).emit('switchTurn', room.currentPlayer);
    }

    socket.on('makeMove', ({ index, player }) => {
      if (player === room.currentPlayer && isValidMove(room.board, player, index)) {
        room.board[index] = player;
        io.to(roomId).emit('updateBoard', room.board);

        const winner = checkWinner(room.board);
        if (winner) {
          io.to(roomId).emit('gameOver', winner);
        } else {
          room.currentPlayer = room.currentPlayer === 'black' ? 'white' : 'black';
          const validMoves = getValidMoves(room.board, room.currentPlayer);
          if (validMoves.length === 0) {
            room.currentPlayer = room.currentPlayer === 'black' ? 'white' : 'black';
            io.to(roomId).emit('skipTurn', `${room.currentPlayer === 'black' ? 'White' : 'Black'} has no valid moves. Skipping turn.`);
          }
          io.to(roomId).emit('switchTurn', room.currentPlayer);
        }
      }
    });



    socket.on('sendMessage', ({ message, player }) => {
      io.to(roomId).emit('chatMessage', { message, player });
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected');
      const room = rooms.get(roomId);
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        if (room.players.length === 0) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('playerDisconnected');
        }
      }
    });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));