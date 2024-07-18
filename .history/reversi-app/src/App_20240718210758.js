import "./App.css";
import React, { useState, useEffect, useRef } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:3001");

function App() {
  const [board, setBoard] = useState(Array(64).fill(null));
  const [currentPlayer, setCurrentPlayer] = useState("black");
  const [playerColor, setPlayerColor] = useState(null);
  const [roomId, setRoomId] = useState("");
  const [gameStarted, setGameStarted] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const [message, setMessage] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [chatHistory, setChatHistory] = useState([]);
  const chatEndRef = useRef(null);

  useEffect(() => {
    socket.on("updateBoard", (newBoard) => {
      setBoard(newBoard);
    });

    socket.on("switchTurn", (player) => {
      setCurrentPlayer(player);
    });

    socket.on("playerColor", (color) => {
      setPlayerColor(color);
      setMessage(`You are ${color}. Waiting for opponent...`);
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
    });

    socket.on("chatMessage", (msg) => {
      setChatHistory((prevHistory) => [...prevHistory, msg]);
    });

    return () => {
      socket.off("updateBoard");
      socket.off("switchTurn");
      socket.off("playerColor");
      socket.off("gameStart");
      socket.off("roomFull");
      socket.off("playerDisconnected");
      socket.off("chatMessage");
    };
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const handleJoinRoom = (e) => {
    e.preventDefault();
    if (roomId && !isJoining) {
      setIsJoining(true);
      setMessage("Joining room...");
      socket.emit("joinRoom", roomId);
    }
  };

  const handleCellClick = (index) => {
    if (gameStarted && currentPlayer === playerColor) {
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

    return (
      <div className="cell-container">
        <div
          key={index}
          className={cellClass}
          onClick={() => handleCellClick(index)}
        ></div>
      </div>
    );
  };

  return (
    <div className="app">
      <h1>Reversi</h1>
      {!gameStarted ? (
        <form onSubmit={handleJoinRoom}>
          <input
            type="text"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
            placeholder="Enter room ID"
            disabled={isJoining}
          />
          <button type="submit" disabled={isJoining}>
            Join Room
          </button>
        </form>
      ) : (
        <div className="game-container">
          <div className="game-board">
            <div className="board">
              {board.map((cell, index) => renderCell(cell, index))}
            </div>
            <p>Current player: {currentPlayer}</p>
            <p>You are: {playerColor}</p>
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
                  <span className="player-color">{msg.player}:</span>{" "}
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
    </div>
  );
}

export default App;
