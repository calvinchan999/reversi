# Reversi Game

This repository contains a full-stack implementation of the classic board game Reversi. It consists of a Node.js backend with Socket.IO for real-time communication.

## Server: Reversi Node.js Backend

The server is a Node.js application that handles game logic, real-time communication, and persistent storage using Redis.

### Features

- Socket.IO for real-time game updates
- Redis for game state persistence
- Support for both player vs player and player vs AI modes
- Robust game logic implementation including move validation
- Player management and turn control
- Chat functionality
- Logging with Winston

### Dependencies

- Express
- Socket.IO
- ioredis
- Winston
- dotenv

### Setup

1. Install dependencies: npm ci
2. Set up environment variables:
Create a `.env` file in the root directory and add the following:
3. Start the server: npm run start
   The server will be running on `http://localhost:3001` (or the port specified in your .env file).

## Game Logic

The game implements the standard Reversi rules, including:
- Valid move checking
- Piece flipping
- Turn management
- Win condition checking

## Socket.IO Events

- `joinRoom`: Join a game room
- `makeMove`: Make a move on the board
- `sendMessage`: Send a chat message
- `getLegalMoves`: Get legal moves for the current player
- `updateBoard`: Receive updated board state
- `switchTurn`: Notify of turn change
- `gameStart`: Notify that the game has started
- `gameOver`: Notify of game end and winner
- `skipTurn`: Notify when a player's turn is skipped
- `playerDisconnected`: Notify when a player disconnects

## AI Implementation

The game includes a simple AI opponent that:
- Chooses moves based on the number of pieces flipped
- Has a delay before making moves to simulate "thinking"

## Data Persistence

Game states are stored in Redis with a TTL of 1 hour.

## Error Handling and Logging

The application uses Winston for logging. Logs are written to:
- `error.log` for error-level logs
- `combined.log` for all logs

In non-production environments, logs are also output to the console.

## Development

To run the server in development mode: npm run start
