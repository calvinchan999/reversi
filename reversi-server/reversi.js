const loggerInstance = require("./logger");
const logger = loggerInstance.getLogger();

const BOARD_SIZE = 64;
const INITIAL_BLACK_POSITIONS = [27, 36];
const INITIAL_WHITE_POSITIONS = [28, 35];

const directions = [-9, -8, -7, -1, 1, 7, 8, 9];

function createGame() {
  let board = Array(BOARD_SIZE).fill(null);
  INITIAL_BLACK_POSITIONS.forEach((pos) => (board[pos] = "black"));
  INITIAL_WHITE_POSITIONS.forEach((pos) => (board[pos] = "white"));
  return {
    board,
    currentPlayer: "black",
    players: { black: null, white: null },
  };
}

function isValidIndex(index) {
  // const row = Math.floor(index / 8);
  // const col = index % 8;
  // return row >= 0 && row < 8 && col >= 0 && col < 8;
  return index >= 0 && index < BOARD_SIZE;
}

function isValidMove(board, player, index) {
  if (index < 0 || index >= BOARD_SIZE || board[index] !== null) return false;

  const opponent = player === "black" ? "white" : "black";

  return directions.some((direction) => {
    let currentIndex = index + direction;
    let hasOpponent = false;

    while (isValidIndex(currentIndex) && isInSameDirection(index, currentIndex, direction)) {
      if (board[currentIndex] === null) return false;
      if (board[currentIndex] === opponent) {
        hasOpponent = true;
        currentIndex += direction;
      } else if (board[currentIndex] === player) {
        return hasOpponent;
      }
    }

    return false;
  });
}

function isInSameDirection(start, current, direction) {
  const startRow = Math.floor(start / 8);
  const startCol = start % 8;
  const currentRow = Math.floor(current / 8);
  const currentCol = current % 8;

  switch (direction) {
    case -9:
    case 7:
      return currentCol < startCol && currentRow < startRow; // up-left diagonal
    case -7:
    case 9:
      return currentCol > startCol && currentRow > startRow; // down-right diagonal
    case -8:
      return currentCol === startCol && currentRow < startRow; // up
    case 8:
      return currentCol === startCol && currentRow > startRow; // down
    case -1:
      return currentRow === startRow && currentCol < startCol; // left
    case 1:
      return currentRow === startRow && currentCol > startCol; // right
    default:
      return false;
  }
}

function getValidMoves(board, player) {
  const validMoves = [];
  for (let i = 0; i < board.length; i++) {
    if (isValidMove(board, player, i)) {
      validMoves.push(i);
    }
  }
  return validMoves;
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

  directions.forEach((direction) => {
    let currentIndex = index + direction;
    let toFlip = [];

    while (
      isValidIndex(currentIndex) &&
      isInSameDirection(index, currentIndex, direction)
    ) {
      if (board[currentIndex] === null) break;
      if (board[currentIndex] === player) {
        toFlip.forEach((flipIndex) => {
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

function isInSameDirection(start, current, direction) {
  console.log(
    `isInSameDirection start:${start} current:${current} direction:${direction}`
  );
  const startRow = Math.floor(start / 8);
  const startCol = start % 8;
  const currentRow = Math.floor(current / 8);
  const currentCol = current % 8;

  switch (direction) {
    case -9:
    case 7:
      return currentCol < startCol; // left diagonal
    case -7:
    case 9:
      return currentCol > startCol; // right diagonal
    case -8:
    case 8:
      return currentCol === startCol; // vertical
    case -1:
    case 1:
      return currentRow === startRow; // horizontal
    default:
      return false;
  }
}

function getBotMove(game) {
  const validMoves = getValidMoves(game.board, game.currentPlayer);
  if (validMoves.length === 0) return null;

  // Simple strategy: choose the move that flips the most pieces
  let bestMove = validMoves[0];
  let maxFlipped = 0;

  for (const move of validMoves) {
    const tempBoard = [...game.board];
    makeMove(tempBoard, move, game.currentPlayer);
    const flippedCount =
      tempBoard.filter((cell) => cell === game.currentPlayer).length -
      game.board.filter((cell) => cell === game.currentPlayer).length;

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
  game.players.black = "human";
  game.players.white = "ai";
  return game;
}

module.exports = {
  createGame,
  getValidMoves,
  checkWinner,
  makeMove,
  getBotMove,
  createAIGame,
};
