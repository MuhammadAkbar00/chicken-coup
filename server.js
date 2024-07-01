const express = require('express')
const next = require('next')
const http = require('http')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const app = next({ dev })
const handle = app.getRequestHandler()

const getResult = (player1, player2) => {
  if (player1.choice === player2.choice) return 'draw'

  const winsAgainst = {
    rock: ['scissors', 'ant'],
    paper: ['rock', 'ant'],
    scissors: ['paper', 'ant'],
    dragon: ['rock', 'paper', 'scissors'],
    ant: ['dragon']
  }

  if (winsAgainst[player1.choice].includes(player2.choice)) {
    return { winnerId: player1.id, loserId: player2.id }
  }
  return { winnerId: player2.id, loserId: player1.id }
}

app.prepare().then(() => {
  const server = express()
  const httpServer = http.createServer(server)
  const io = new Server(httpServer)

  const PORT = process.env.PORT || 3000

  const maxPlayersPerRoom = 2
  const startingLives = 10
  let rooms = {}

  function startGame(roomcode) {
    io.to(roomcode).emit('start-game', roomcode)
    console.log(`Starting game in room ${roomcode}`)
  }

  // Function to send chat messages
  function sendChatMessage(roomCode, message) {
    const room = rooms[roomCode]
    if (room) {
      room.messages.push(message)
      io.to(roomCode).emit('chat-message', message)
    }
  }

  io.on('connection', (socket) => {
    console.log('a user connected:', socket.id)

    socket.on('choose', (choice) => {
      const room = Object.values(rooms).find((r) => r.players.some((p) => p.id === socket.id))
      if (room) {
        const player = room.players.find((p) => p.id === socket.id)
        player.choice = choice

        if (room.players.every((p) => p.choice)) {
          const [player1, player2] = room.players
          const { winnerId, loserId } = getResult(player1, player2)
          if (winnerId !== 'draw') {
            room.lives[loserId]--
          }
          console.log(room.players, 'room.players')
          io.to(room.code).emit('result', { winnerId, players: room.players, lives: room.lives })
          room.players.forEach((p) => (p.choice = null)) // Reset choices
        }
      }
    })

    socket.on('create-room', (roomCode, playerName, callback) => {
      if (!rooms[roomCode]) {
        rooms[roomCode] = {
          code: roomCode,
          messages: [],
          players: [{ id: socket.id, name: playerName, choice: null }],
          lives: { [socket.id]: startingLives },
          rematchRequests: []
        }

        socket.join(roomCode)
        callback({ success: true, roomCode })
        io.emit('room-updated', rooms)
      } else {
        callback({ success: false, message: 'Room code already exists. Please choose another one.' })
      }
    })

    socket.on('join-room', ({ roomCode, playerName }) => {
      if (!rooms[roomCode]) {
        rooms[roomCode] = {
          code: roomCode,
          players: [],
          lives: {},
          messages: [],
          rematchRequests: []
        }
      }

      if (rooms[roomCode].players.length < maxPlayersPerRoom) {
        const newPlayer = { id: socket.id, name: playerName, choice: null }

        rooms[roomCode].players.push(newPlayer)
        rooms[roomCode].lives[socket.id] = startingLives // Initialize lives

        socket.join(roomCode)
        io.to(roomCode).emit('player-joined', {
          player: newPlayer,
          players: rooms[roomCode].players,
          lives: rooms[roomCode].lives
        })
        io.emit('room-updated', rooms)

        if (rooms[roomCode].players.length === maxPlayersPerRoom) {
          startGame(roomCode)
        }
      } else {
        socket.emit('room-full', roomCode)
      }
    })

    // Send message to chat
    socket.on('send-message', ({ roomCode, message }) => {
      sendChatMessage(roomCode, {
        user: socket.id,
        playerName: rooms[roomCode]?.players?.find((player) => player.id === socket.id)?.name,
        message
      })
    })

    socket.on('rematch', (roomCode) => {
      const room = rooms[roomCode]
      if (room) {
        if (!room.rematchRequests) room.rematchRequests = []
        room.rematchRequests.push(socket.id)

        io.to(roomCode).emit('rematch-requested', { playerId: socket.id })

        if (room.rematchRequests.length === maxPlayersPerRoom) {
          room.rematchRequests = []
          io.to(roomCode).emit('rematch', roomCode)
          startGame(roomCode)
        }
      }
    })

    socket.on('exit-room', (roomCode) => {
      const room = rooms[roomCode]
      if (room) {
        room.players = room.players.filter((p) => p.id !== socket.id)
        socket.leave(roomCode)
        io.to(roomCode).emit('player-left', { playerId: socket.id, players: room.players })
        if (room.players.length === 0) {
          delete rooms[roomCode]
        } else {
          io.to(roomCode).emit('player-exit', { playerId: socket.id })
        }
        io.emit('room-updated', rooms)
      }
    })

    socket.on('disconnect', () => {
      console.log('user disconnected:', socket.id)

      Object.keys(rooms).forEach((roomCode) => {
        const room = rooms[roomCode]
        const playerIndex = room.players.findIndex((p) => p.id === socket.id)
        if (playerIndex !== -1) {
          room.players.splice(playerIndex, 1)
          io.to(roomCode).emit('player-left', { playerId: socket.id, players: room.players })
          if (room.players.length === 0) {
            delete rooms[roomCode]
          } else {
            io.to(roomCode).emit('player-exit', { playerId: socket.id })
          }
          io.emit('room-updated', rooms)
        }
      })
    })
  })

  server.get('/api/rooms', (req, res) => {
    res.json(
      Object.values(rooms).map((room) => ({
        code: room.code,
        playerCount: room.players.length,
        players: room.players.map((player) => player.name)
      }))
    )
  })

  server.get('/api/rooms/:roomCode/players', (req, res) => {
    const roomCode = req.params.roomCode
    const room = rooms[roomCode]
    if (room) {
      res.json(room.players)
    } else {
      res.status(404).json({ error: 'Room not found' })
    }
  })

  server.all('*', (req, res) => handle(req, res))

  httpServer.listen(PORT, (err) => {
    if (err) throw err
    console.log(`> Ready on http://localhost:${PORT}`)
  })
})
