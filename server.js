// server.js
const express = require('express');
const next = require('next');
const http = require('http');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const choices = ["rock", "paper", "scissors"];

const getResult = (player1, player2) => {
  if (player1.choice === player2.choice) return "draw";
  if (
    (player1.choice === "rock" && player2.choice === "scissors") ||
    (player1.choice === "scissors" && player2.choice === "paper") ||
    (player1.choice === "paper" && player2.choice === "rock")
  ) {
    return player1.id;
  }
  return player2.id;
};


app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);
  const io = new Server(httpServer);

  const maxPlayersPerRoom = 2; // Maximum players per room
  let players = {};
  let rooms = {};

  function startGame(roomcode) {
    // Implement your game start logic here
    // Example: shuffle cards, assign roles, initialize game state, etc.

    // Emit an event to all clients in the room to start the game
    io.to(roomcode).emit('start-game', { roomcode });
    console.log(`Starting game in room ${roomcode}`);
  }

  io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    socket.on('choose', (choice) => {
      console.log('choooseee')
      players[socket.id] = { id: socket.id, choice };
      if (Object.keys(players).length === 2) {
        const [player1, player2] = Object.values(players);
        const winnerId = getResult(player1, player2);
        io.emit('result', { winnerId, players });
        players = {};
      }
    });

    socket.on('join-room', (roomcode) => {
      if (!rooms[roomcode]) {
        rooms[roomcode] = {
          players: [],
        };
      }

      if (rooms[roomcode].players.length < maxPlayersPerRoom) {
        rooms[roomcode].players.push(socket.id);
        socket.join(roomcode);

        // Notify all clients in the room about the new player
        io.to(roomcode).emit('player-joined', { playerId: socket.id, roomcode, players: rooms[roomcode].players });

        // Check if room is full and start the game
        if (rooms[roomcode].players.length === maxPlayersPerRoom) {
          startGame(roomcode); // Start the game when the room is full
        }
      } else {
        console.log(`Room ${roomcode} is full, cannot join`);
        // Optionally emit an event or send a message back to the client indicating room is full
      }
    });

    socket.on('disconnect', () => {
      console.log('user disconnected:', socket.id);
      // Remove player from any rooms they were in
      Object.keys(rooms).forEach((roomcode) => {
        const index = rooms[roomcode].players.indexOf(socket.id);
        if (index !== -1) {
          rooms[roomcode].players.splice(index, 1);
          io.to(roomcode).emit('player-left', { playerId: socket.id, roomcode, players: rooms[roomcode].players });
          console.log(`Player ${socket.id} left room ${roomcode}`);
        }
      });
    });

    socket.on('disconnect', () => {
      console.log('user disconnected:', socket.id);
      // Remove player from players object
      delete players[socket.id];

      // Find and remove player from any rooms they were in
      Object.keys(rooms).forEach((roomcode) => {
        const index = rooms[roomcode].players.indexOf(socket.id);
        if (index !== -1) {
          rooms[roomcode].players.splice(index, 1);
          io.to(roomcode).emit('player-left', { playerId: socket.id, roomcode });
          console.log(`Player ${socket.id} left room ${roomcode}`);
        }
      });
    });
  });

  server.all('*', (req, res) => handle(req, res));

  httpServer.listen(3000, (err) => {
    if (err) throw err;
    console.log('> Ready on http://localhost:3000');
  });
});
