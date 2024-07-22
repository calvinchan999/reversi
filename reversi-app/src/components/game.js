import "./game.css";
import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { useTranslation } from 'react-i18next';

const socket = io("http://localhost:3001");

function Game() {
  const { t } = useTranslation();

  const [board, setBoard] = useState(Array(64).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState("black");
  const [playerColor, setPlayerColor] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [message, setMessage] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  const [score, setScore] = useState({ whiteScore: 2, blackScore: 2 });
  const [gameMode, setGameMode] = useState("human");
  const [legalMoves, setLegalMoves] = useState([]);
  const [boardHistory, setBoardHistory] = useState([]);
  const [currentHistoryIndex, setCurrentHistoryIndex] = useState(-1);

  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.on("updateBoard", (newBoard) => {
      setBoard(newBoard);
      updateScore(newBoard);
      setLegalMoves([]); // Reset legal moves when board updates
      setBoardHistory((prevHistory) => [
        ...prevHistory,
        { board: newBoard, player: currentPlayer },
      ]);
      setCurrentHistoryIndex((prevIndex) => prevIndex + 1);
      console.log(boardHistory);
    });

    socket.on("switchTurn", (player) => {
      setCurrentPlayer(player);
      if (player === playerColor) {
        fetchLegalMoves();
      }
    });

    socket.on("playerColor", (color) => {
      setPlayerColor(color);
      setMessage(
        `You are ${color}. ${
          gameMode === "ai"
            ? "Playing against AI..."
            : "Waiting for opponent..."
        }`
      );
      setIsJoining(false);
    });

    socket.on("gameStart", () => {
      setGameStarted(true);
      setMessage("Game started!");
    });

    socket.on("roomFull", () => {
      setMessage("Room is full. Please try another room.");
      setIsJoining(false);
    });

    socket.on("playerDisconnected", () => {
      setMessage("Other player disconnected. Game over.");
      setGameStarted(false);
      setPlayerColor(null);
      setRoomId("");
      setIsJoining(false);
      setGameOver(true);
    });

    socket.on("chatMessage", (msg) => {
      setChatHistory((prevHistory) => [...prevHistory, msg]);
    });

    socket.on("gameOver", (winner) => {
      setGameOver(true);
      setMessage(
        `Game Over! ${winner === "draw" ? "It's a draw!" : `${winner} wins!`}`
      );
    });

    socket.on("skipTurn", (message) => {
      setMessage(message);
    });

    return () => {
      socket.off("updateBoard");
      socket.off("switchTurn");
      socket.off("playerColor");
      socket.off("gameStart");
      socket.off("roomFull");
      socket.off("playerDisconnected");
      socket.off("chatMessage");
      socket.off("gameOver");
      socket.off("skipTurn");
      socket.off("legalMoves");
    };
  }, [gameMode, playerColor, board]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const updateScore = (newBoard) => {
    const whiteCount = newBoard.filter((cell) => cell === "white").length;
    const blackCount = newBoard.filter((cell) => cell === "black").length;
    setScore({ whiteScore: whiteCount, blackScore: blackCount });
  };

  const fetchLegalMoves = () => {
    socket.emit("getLegalMoves", { player: playerColor, roomId }, (moves) => {
      setLegalMoves(moves);
    });
  };

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId && !isJoining) {
      setIsJoining(true);
      setMessage("Joining room...");
      console.log(`Joining room roomId:${roomId} gameMode:${gameMode}`);
      socket.emit("joinRoom", roomId, gameMode);
    }
  };

  const handleCellClick = (index) => {
    if (gameStarted && currentPlayer === playerColor && !gameOver) {
      socket.emit("makeMove", { index, player: playerColor, roomId });
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (chatMessage.trim() && gameStarted) {
      socket.emit("sendMessage", {
        roomId,
        message: chatMessage,
        player: playerColor,
      });
      setChatMessage("");
    }
  };

  const renderCell = (value, index) => {
    let cellClass = "cell";
    if (value === "black") cellClass += " black";
    if (value === "white") cellClass += " white";
    if (legalMoves.includes(index)) cellClass += " legal-move";

    return (
      <div className="cell-container" key={index}>
        <div className={cellClass} onClick={() => handleCellClick(index)}></div>
      </div>
    );
  };

  const resetGame = () => {
    setBoard(Array(64).fill(null));
    setCurrentPlayer("black");
    setPlayerColor(null);
    setRoomId("");
    setGameStarted(false);
    setIsJoining(false);
    setMessage("");
    setChatHistory([]);
    setGameOver(false);
    setScore({ whiteScore: 2, blackScore: 2 });
    setLegalMoves([]);
    setBoardHistory([]);
    setCurrentHistoryIndex(-1);
  };

  const showPreviousBoard = () => {
    if (currentHistoryIndex > 0) {
      if (legalMoves.length > 0) {
        setLegalMoves([]); // clear legal moves
      }
      const newIndex = currentHistoryIndex - 1;
      const previousState = boardHistory[newIndex];
      setBoard(previousState.board);
      setCurrentPlayer(previousState.player);
      setCurrentHistoryIndex(newIndex);
    }
  };

  const showNextBoard = () => {
    const newIndex = currentHistoryIndex + 1;
    const nextState = boardHistory[newIndex];
    setBoard(nextState.board);
    setCurrentPlayer(nextState.player);
    setCurrentHistoryIndex(newIndex);
    if (newIndex === boardHistory.length - 1) {
      fetchLegalMoves();
    }
  };

  const showCurrentBoard = () => {
    const currentState = boardHistory[boardHistory.length - 1];
    setBoard(currentState.board);
    setCurrentPlayer(currentState.player);
    setCurrentHistoryIndex(boardHistory.length - 1);
    fetchLegalMoves();
  };

  return (
    <div className="app">
      <h1>{t('reversi')}</h1>
      {!gameStarted && !gameOver ? (
        <div className="setup-container">
          <form onSubmit={handleJoinRoom}>
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="Enter room ID"
              disabled={isJoining}
            />
            <select
              value={gameMode}
              onChange={(e) => setGameMode(e.target.value)}
              disabled={isJoining}
            >
              <option value="human">Human vs Human</option>
              <option value="ai">Human vs AI</option>
            </select>
            <button type="submit" disabled={isJoining}>
              Join Room
            </button>
          </form>
        </div>
      ) : (
        <div className="game-container">
          <div className="game-board">
            <div className="board">
              {board.map((cell, index) => renderCell(cell, index))}
            </div>

            <div className="game-info">
              <p>
                Current player:{" "}
                <span className={`player-${currentPlayer}`}>
                  {currentPlayer}
                </span>
              </p>
              <p>
                You are:{" "}
                <span className={`player-${playerColor}`}>{playerColor}</span>
              </p>
              <p>
                White: <span className="player-white">{score.whiteScore}</span>{" "}
                &nbsp; Black:{" "}
                <span className="player-black">{score.blackScore}</span>
              </p>
              <div className="game-info-btn">
                <button
                  onClick={showPreviousBoard}
                  disabled={currentHistoryIndex <= 0}
                >
                  Previous
                </button>
                <button
                  onClick={showNextBoard}
                  disabled={
                    currentHistoryIndex <= -1 ||
                    currentHistoryIndex === boardHistory.length - 1
                  }
                >
                  Next
                </button>
                <button
                  onClick={showCurrentBoard}
                  disabled={currentHistoryIndex === boardHistory.length - 1}
                >
                  Current Step
                </button>
              </div>
            </div>
          </div>
          <div className="chat-container">
            <div className="chat-history">
              {chatHistory.map((msg, index) => (
                <div
                  key={index}
                  className={`chat-message ${
                    msg.player === playerColor ? "my-message" : "other-message"
                  }`}
                >
                  <span className={`player-${msg.player}`}>{msg.player}:</span>
                  {msg.message}
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={handleSendMessage} className="chat-form">
              <input
                type="text"
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type a message..."
              />
              <button type="submit">Send</button>
            </form>
          </div>
        </div>
      )}
      {message && <p className="status-message">{message}</p>}
      {gameOver && (
        <button onClick={resetGame} className="reset-button">
          Play Again
        </button>
      )}
    </div>
  );
}

export default Game;
