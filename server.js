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
  let players = {};
  let rooms = {};

  function startGame(roomcode) {
    io.to(roomcode).emit('start-game', { roomcode });
    console.log(`Starting game in room ${roomcode}`);
  }

  io.on('connection', (socket) => {
    console.log('a user connected:', socket.id);

    socket.on('choose', (choice) => {
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

        io.to(roomcode).emit('player-joined', { playerId: socket.id, roomcode, players: rooms[roomcode].players });

        if (rooms[roomcode].players.length === maxPlayersPerRoom) {
          startGame(roomcode);
        }
      } else {
        console.log(`Room ${roomcode} is full, cannot join`);
      }
    });

    socket.on('rematch', (roomcode) => {
      if (rooms[roomcode]) {
        io.to(roomcode).emit('rematch', { roomcode });
        startGame(roomcode);
      }
    });

    socket.on('exit-room', (roomcode) => {
      if (rooms[roomcode]) {
        rooms[roomcode].players = rooms[roomcode].players.filter(id => id !== socket.id);
        socket.leave(roomcode);
        io.to(roomcode).emit('player-left', { playerId: socket.id, roomcode, players: rooms[roomcode].players });
        if (rooms[roomcode].players.length === 0) {
          delete rooms[roomcode];
        }
      }
    });

    socket.on('disconnect', () => {
      console.log('user disconnected:', socket.id);
      delete players[socket.id];

      Object.keys(rooms).forEach((roomcode) => {
        const index = rooms[roomcode].players.indexOf(socket.id);
        if (index !== -1) {
          rooms[roomcode].players.splice(index, 1);
          io.to(roomcode).emit('player-left', { playerId: socket.id, roomcode, players: rooms[roomcode].players });
          console.log(`Player ${socket.id} left room ${roomcode}`);
          if (rooms[roomcode].players.length === 0) {
            delete rooms[roomcode];
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
