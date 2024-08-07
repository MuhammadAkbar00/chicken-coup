'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useSocket } from '@/context/socketContext'
import { useRouter } from 'next/navigation'
import { FaHandRock, FaHandPaper, FaHandScissors, FaDragon } from 'react-icons/fa'
import { HiBugAnt } from 'react-icons/hi2'
import { delay, m, motion } from 'framer-motion'
import { IoMdHeart } from 'react-icons/io'
import { IoIosHeartEmpty } from 'react-icons/io'

// TODO: Make chat smaller and next to chat is the game log (red if you lose, green if you win and then it shows what you chose and what the opponents chose)

const choices = [
  { name: 'rock', icon: <FaHandRock size={80} /> },
  { name: 'paper', icon: <FaHandPaper size={80} /> },
  { name: 'scissors', icon: <FaHandScissors size={80} /> },
  { name: 'dragon', icon: <FaDragon size={80} /> },
  { name: 'ant', icon: <HiBugAnt size={80} /> }
]

const animationVariantsWin = {
  initial: { x: 0, opacity: 1 },
  player: {
    x: ['0vw', '45vw', '0vw'], // Adjusted values using viewport width (vw)
    transition: { duration: 0.7 }
  },
  opponent: {
    x: ['0vw', '-45vw', '0vw'], // Adjusted values using viewport width (vw)
    opacity: [1, 0],
    transition: { x: { duration: 0.7 }, opacity: { delay: 0.3, duration: 0.4 } }
  }
}

const animationVariantsLose = {
  initial: { x: 0, opacity: 1 },
  player: {
    x: ['0vw', '45vw', '0vw'], // Adjusted values using viewport width (vw)
    opacity: [1, 0],
    transition: { x: { duration: 0.7 }, opacity: { delay: 0.3, duration: 0.4 } }
  },
  opponent: {
    x: ['0vw', '-45vw', '0vw'], // Adjusted values using viewport width (vw)
    transition: { duration: 0.7 }
  }
}

const animationVariantsDraw = {
  initial: { x: 0 },
  player: {
    x: ['0vw', '50vw', '0vw'] // Adjusted values using viewport width (vw)
  },
  opponent: {
    x: ['0vw', '-50vw', '0vw'], // Adjusted values using viewport width (vw)
    transition: { duration: 0.7 }
  }
}

const RoomPage = ({ params }) => {
  const socket = useSocket()
  const router = useRouter()
  const roomCode = params.roomcode

  const [choice, setChoice] = useState('')
  const [result, setResult] = useState('')
  const [players, setPlayers] = useState([])
  const [lives, setLives] = useState({})
  const [rematchRequested, setRematchRequested] = useState(false)
  const [opponentRematchRequested, setOpponentRematchRequested] = useState(false)
  const [opponentExited, setOpponentExited] = useState(false)
  const [gameOver, setGameOver] = useState(false)
  const [winningPair, setWinningPair] = useState({ winner: '', loser: '' })

  const [currentPlayer, setCurrentPlayer] = useState({})
  const [currentOpponent, setCurrentOpponent] = useState({})

  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const inputRef = useRef(null)

  const [gameLogs, setGameLogs] = useState([])

  useEffect(() => {
    if (!socket) return

    const fetchPlayers = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomCode}/players`)
        const { players, lives, gameLogs } = await res.json()

        if (!players.find((player) => player.id === socket.id)) {
          router.push('/')
        }

        setPlayers(movePlayerToFront(players, socket.id))
        setLives(lives)
        setGameLogs(gameLogs)
      } catch (error) {
        console.error('Failed to fetch players:', error)
        router.push('/')
      }
    }

    const handlePlayerJoined = ({ players, lives, gameLogs }) => {
      setPlayers(players)
      setLives(lives)
      setGameLogs(gameLogs)
    }

    const handleResult = ({ winnerId, players, lives, gameLogs }) => {
      setPlayers(movePlayerToFront(players, socket.id))
      setLives(lives)
      setGameLogs(gameLogs)

      const isDraw = winnerId === 'draw'
      const winnerChoice = isDraw ? choice : players.find((player) => player.id === winnerId)?.choice
      const loserChoice = isDraw ? choice : players.find((player) => player.id !== winnerId)?.choice

      setWinningPair({ winner: winnerChoice, loser: loserChoice })
      setResult(winnerId === socket.id ? 'You win!' : winnerId === 'draw' ? "It's a draw!" : 'You lose!')

      setTimeout(() => {
        socket.emit('continue-game', roomCode)
      }, 1000)
    }

    const handleGameOver = ({ winnerId, players, lives, gameLogs }) => {
      // New
      setGameOver(true)

      // Old
      setPlayers(movePlayerToFront(players, socket.id))
      setLives(lives)
      setGameLogs(gameLogs)

      const isDraw = winnerId === 'draw'
      const winnerChoice = isDraw ? choice : players.find((player) => player.id === winnerId)?.choice
      const loserChoice = isDraw ? choice : players.find((player) => player.id !== winnerId)?.choice

      setWinningPair({ winner: winnerChoice, loser: loserChoice })
      setResult(winnerId === socket.id ? 'You win!' : winnerId === 'draw' ? "It's a draw!" : 'You lose!')
    }

    const handlePlayerLeft = ({ players }) => setPlayers(movePlayerToFront(players, socket.id))

    const handleStartGame = () => {
      setChoice('')
      setResult('')
      setRematchRequested(false)
      setOpponentRematchRequested(false)
    }

    const handleNextMove = () => {
      setChoice('')
      setResult('')
    }

    const handleRematch = ({ startingLives }) => {
      setGameOver(false)
      setChoice('')
      setResult('')
      setLives((prevLives) => {
        const updatedLives = {}
        Object.keys(prevLives).forEach((playerId) => {
          updatedLives[playerId] = startingLives
        })
        return updatedLives
      })
    }

    const handleRematchRequested = ({ playerId }) => {
      if (playerId !== socket.id) {
        setOpponentRematchRequested(true)
      }
    }

    const handlePlayerExit = ({ playerId }) => {
      if (playerId !== socket.id) {
        setOpponentExited(true)
      }
    }

    fetchPlayers()

    // Listen for chat messages
    socket.on('chat-messages', (messages) => {
      setMessages(messages)
    })

    // Listen for new chat messages
    socket.on('chat-message', (message) => {
      setMessages((prevMessages) => [...prevMessages, message])
    })

    socket.on('player-joined', handlePlayerJoined)
    socket.on('result', handleResult)
    socket.on('game-over', handleGameOver)
    socket.on('player-left', handlePlayerLeft)
    socket.on('start-game', handleStartGame)
    socket.on('next-move', handleNextMove)
    socket.on('rematch-requested', handleRematchRequested)
    socket.on('rematch', handleRematch)
    socket.on('player-exit', handlePlayerExit)

    return () => {
      socket.off('player-joined', handlePlayerJoined)
      socket.off('result', handleResult)
      socket.off('game-over', handleGameOver)
      socket.off('player-left', handlePlayerLeft)
      socket.off('start-game', handleStartGame)
      socket.off('next-move', handleNextMove)
      socket.off('rematch-requested', handleRematchRequested)
      socket.off('rematch', handleRematch)
      socket.off('player-exit', handlePlayerExit)
      //
      socket.off('chat-messages')
      socket.off('chat-message')
    }
  }, [socket, roomCode, router])

  useEffect(() => {
    if (players?.length > 0) {
      setCurrentPlayer(players.find((player) => player.id === socket.id))
      setCurrentOpponent(players.find((player) => player.id !== socket.id))
    }
  }, [players])

  useEffect(() => {
    // Scroll to bottom on new message
    if (inputRef.current) {
      inputRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages])

  const handleChoice = (choice) => {
    setChoice(choice)
    socket.emit('choose', choice)
  }

  const handleRematchRequest = () => {
    setRematchRequested(true)
    socket.emit('rematch', roomCode)
  }

  const exitRoom = () => {
    socket.emit('exit-room', roomCode)
    router.push('/')
  }

  const getIcon = (playerChoice) => {
    return choice
      ? choices.find((item) => item.name === playerChoice)?.icon
      : choices.find((item) => item.name === choice)?.icon
  }

  const handleSendMessage = () => {
    if (message.trim() !== '') {
      socket.emit('send-message', { roomCode, message })
      setMessage('')
    }
  }

  function movePlayerToFront(players, playerIdToMoveToFront) {
    const index = players.findIndex((player) => player.id === playerIdToMoveToFront)

    if (index !== -1) {
      const playerToMove = players.splice(index, 1)[0]
      players.unshift(playerToMove)
    }

    return players
  }

  const renderAnimation = (winnerIconName, loserIconName) => {
    const isDraw = winnerIconName === loserIconName
    const winningPlayer = players?.find((player) => player.choice === winnerIconName)

    const didPlayerWin = winningPlayer?.id === socket.id

    const playerIcon = getIcon(currentPlayer?.choice)
    const opponentIcon = getIcon(currentOpponent?.choice)

    let animationVariants
    if (isDraw) {
      animationVariants = animationVariantsDraw
    } else if (didPlayerWin === true) {
      animationVariants = animationVariantsWin
    } else if (didPlayerWin === false) {
      animationVariants = animationVariantsLose
    }

    return (
      <div className='flex justify-between pt-12 md:pt-28'>
        <motion.div initial='initial' animate='player' variants={animationVariants}>
          {playerIcon && React.cloneElement(playerIcon, { size: 200, color: 'green' })}
        </motion.div>
        <motion.div initial='initial' animate='opponent' variants={animationVariants}>
          {opponentIcon && React.cloneElement(opponentIcon, { size: 200, color: 'red' })}
        </motion.div>
      </div>
    )
  }

  const renderHearts = (numOfLives) => {
    const totalLives = 10
    return (
      <>
        {Array.from({ length: numOfLives }, (_, i) => (
          <IoMdHeart key={`full-${i}`} />
        ))}
        {Array.from({ length: totalLives - numOfLives }, (_, i) => (
          <IoIosHeartEmpty key={`empty-${i}`} />
        ))}
      </>
    )
  }

  return (
    <div className='flex min-h-screen flex-col p-4 md:p-6'>
      {/* Header */}
      <h1 className='text-gold mb-4 text-2xl font-bold md:mb-6 md:text-3xl'>Room Code: {roomCode}</h1>

      {/* Scoreboard */}
      <div className='text-gold mb-4 flex flex-wrap justify-between rounded-lg bg-[#262626] p-4 md:mb-6'>
        {players.map((player) => (
          <div key={player.id} className='mb-2 w-full md:mb-0 md:w-auto'>
            <span className='font-semibold'>
              {player.name}: {10 - lives[player.id === currentPlayer?.id ? currentOpponent?.id : currentPlayer?.id]}
            </span>
            <div className='flex'>{renderHearts(lives[player?.id])}</div>
          </div>
        ))}
      </div>

      {/* Choices */}
      <div className='flex flex-wrap justify-center gap-4 md:gap-6'>
        {choices.map(({ name, icon }) => (
          <button
            key={name}
            className={`rounded-lg bg-[#333] p-4 enabled:cursor-pointer enabled:hover:bg-[#444] ${
              choice === name ? 'border-gold border-4' : ''
            }`}
            onClick={() => handleChoice(name)}
            disabled={choice || players.length < 2}
          >
            {icon}
            <span className={'hidden pt-4 font-bold capitalize md:block'}>{name}</span>
          </button>
        ))}
      </div>

      {/* Game Result */}
      {result && (
        <div className='text-gold mt-8 flex flex-col md:mt-12'>
          <h2 className='mb-4 self-center text-2xl font-bold md:text-3xl'>{result}</h2>
          {renderAnimation(winningPair.winner, winningPair.loser)}

          {/* Rematch Buttons */}
          <div className='mt-8 flex flex-wrap gap-4 self-center md:gap-6'>
            {!rematchRequested && !opponentExited && !opponentRematchRequested && gameOver && (
              <button
                className='rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700'
                onClick={handleRematchRequest}
              >
                Request Rematch
              </button>
            )}
            {opponentRematchRequested && gameOver && (
              <button
                className='rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700'
                onClick={handleRematchRequest}
              >
                Accept Rematch
              </button>
            )}
            {opponentExited && gameOver && (
              <div className='rounded-lg bg-red-600 px-4 py-2 text-white'>Opponent has left the room</div>
            )}
            {gameOver && (
              <button className='rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700' onClick={exitRoom}>
                Exit Room
              </button>
            )}
          </div>
        </div>
      )}

      <div className='!mt-auto flex flex-col gap-4 md:mt-12 md:flex-row'>
        {/* Chat Box */}
        <div className='flex-2 flex basis-2/4 flex-col rounded-lg bg-[#262626] p-4'>
          <div className='text-gold mb-4 text-lg font-semibold'>Chat</div>
          <div className='text-gold flex h-64 flex-col-reverse overflow-y-auto rounded-lg bg-[#333] p-4'>
            {messages
              .slice(0)
              .reverse()
              .map((msg, index) => (
                <div key={index} className='mb-2'>
                  <span className='font-semibold'>{msg.playerName}:</span> {msg.message}
                </div>
              ))}
          </div>
          <div className='mt-4 flex'>
            <input
              type='text'
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className='flex-grow rounded-lg bg-[#333] px-4 py-2 text-white'
              placeholder='Type a message...'
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage()
                }
              }}
            />
            <button
              onClick={handleSendMessage}
              className='ml-2 rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700'
            >
              Send
            </button>
          </div>
        </div>

        {/* Game Log */}
        <div className='flex flex-1 flex-col rounded-lg bg-[#262626] p-4'>
          <div className='text-gold mb-4 text-lg font-semibold'>Game Log</div>
          <div className='text-gold flex h-64 flex-grow flex-col-reverse overflow-y-auto rounded-lg bg-[#333] p-4'>
            {gameLogs
              .slice(0)
              .reverse()
              .map((gamelog, index) => (
                <div
                  key={index}
                  className={`mb-2 ${gamelog?.includes(currentPlayer?.name) ? 'text-green-500' : 'text-red-500'}`}
                >
                  {gamelog}
                </div>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default RoomPage
