const express = require('express');
const next = require('next');
const http = require('http');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const app = next({ dev });
const handle = app.getRequestHandler();

const choices = ["rock", "paper", "scissors", "dragon", "ant"];

const getResult = (player1, player2) => {
  if (player1.choice === player2.choice) return "draw";

  const winsAgainst = {
    rock: ["scissors", "ant"],
    paper: ["rock", "ant"],
    scissors: ["paper", "ant"],
    dragon: ["rock", "paper", "scissors"],
    ant: ["dragon"]
  };

  if (winsAgainst[player1.choice].includes(player2.choice)) {
    return player1.id;
  }
  return player2.id;
};

app.prepare().then(() => {
  const server = express();
  const httpServer = http.createServer(server);
  const io = new Server(httpServer);

  const PORT = process.env.PORT || 3000;

  const maxPlayersPerRoom = 2; // Maximum players per room
  let rooms = {};

  function startGame(roomcode) {
    io.to(roomcode).emit('start-game', roomcode);
    console.log(`Starting game in room ${roomcode}`);
  }

  io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    socket.on('choose', (choice) => {
      const room = Object.values(rooms).find(r => r.players.some(p => p.id === socket.id));
      if (room) {
        const player = room.players.find(p => p.id === socket.id);
        player.choice = choice;

        if (room.players.every(p => p.choice)) {
          const [player1, player2] = room.players;
          const winnerId = getResult(player1, player2);
          if (winnerId !== "draw") {
            room.scores[winnerId]++;
          }
          io.to(room.code).emit('result', { winnerId, players: room.players, scores: room.scores });
          room.players.forEach(p => p.choice = null); // Reset choices
        }
      }
    });

    socket.on('join-room', ({ roomCode, playerName }) => {
      if (!rooms[roomCode]) {
        rooms[roomCode] = {
          code: roomCode,
          players: [],
          scores: {}
        };
      }

      if (rooms[roomCode].players.length < maxPlayersPerRoom) {
        const newPlayer = { id: socket.id, name: playerName, choice: null };
        rooms[roomCode].players.push(newPlayer);
        rooms[roomCode].scores[socket.id] = 0; // Initialize score

        socket.join(roomCode);
        io.to(roomCode).emit('player-joined', { player: newPlayer, players: rooms[roomCode].players });

        if (rooms[roomCode].players.length === maxPlayersPerRoom) {
          startGame(roomCode);
        }
      } else {
        socket.emit('room-full', roomCode);
      }
    });

    socket.on('rematch', (roomCode) => {
      const room = rooms[roomCode];
      if (room) {
        if (!room.rematchRequests) room.rematchRequests = [];
        room.rematchRequests.push(socket.id);

        io.to(roomCode).emit('rematch-requested', { playerId: socket.id });

        if (room.rematchRequests.length === maxPlayersPerRoom) {
          room.rematchRequests = [];
          io.to(roomCode).emit('rematch', roomCode);
          startGame(roomCode);
        }
      }
    });

    socket.on('exit-room', (roomCode) => {
      const room = rooms[roomCode];
      if (room) {
        room.players = room.players.filter(p => p.id !== socket.id);
        socket.leave(roomCode);
        io.to(roomCode).emit('player-left', { playerId: socket.id, players: room.players });
        if (room.players.length === 0) {
          delete rooms[roomCode];
        } else {
          io.to(roomCode).emit('player-exit', { playerId: socket.id });
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('user disconnected:', socket.id);

      Object.keys(rooms).forEach((roomCode) => {
        const room = rooms[roomCode];
        const playerIndex = room.players.findIndex(p => p.id === socket.id);
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1);
          io.to(roomCode).emit('player-left', { playerId: socket.id, players: room.players });
          if (room.players.length === 0) {
            delete rooms[roomCode];
          } else {
            io.to(roomCode).emit('player-exit', { playerId: socket.id });
          }
        }
      });
    });
  });

  server.all('*', (req, res) => handle(req, res));

  httpServer.listen(PORT, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
