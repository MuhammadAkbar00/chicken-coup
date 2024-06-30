'use client'

import React, { useEffect, useRef, useState } from 'react'
import { useSocket } from '@/context/socketContext'
import { useRouter } from 'next/navigation'
import { FaHandRock, FaHandPaper, FaHandScissors, FaDragon } from 'react-icons/fa'
import { HiBugAnt } from 'react-icons/hi2'
import { delay, m, motion } from 'framer-motion'

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
    x: ['0vw', '45vw', '45vw'], // Adjusted values using viewport width (vw)
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
    x: ['0vw', '-45vw', '-45vw'], // Adjusted values using viewport width (vw)
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
  const [scores, setScores] = useState({})
  const [rematchRequested, setRematchRequested] = useState(false)
  const [opponentRematchRequested, setOpponentRematchRequested] = useState(false)
  const [opponentExited, setOpponentExited] = useState(false)
  const [winningPair, setWinningPair] = useState({ winner: '', loser: '' })

  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState([])
  const inputRef = useRef(null)

  useEffect(() => {
    if (!socket) return

    const fetchPlayers = async () => {
      try {
        const res = await fetch(`/api/rooms/${roomCode}/players`)
        const data = await res.json()

        if (!data.find((player) => player.id === socket.id)) {
          router.push('/')
        }

        setPlayers([...data])
      } catch (error) {
        console.error('Failed to fetch players:', error)
        router.push('/')
      }
    }

    const handlePlayerJoined = ({ players }) => setPlayers(players)

    const handleResult = ({ winnerId, players, scores }) => {
      setPlayers(players)
      setScores(scores)

      const isDraw = winnerId === 'draw'
      const winnerChoice = isDraw ? choice : players.find((player) => player.id === winnerId)?.choice
      const loserChoice = isDraw ? choice : players.find((player) => player.id !== winnerId)?.choice

      setWinningPair({ winner: winnerChoice, loser: loserChoice })
      setResult(winnerId === socket.id ? 'You win!' : winnerId === 'draw' ? "It's a draw!" : 'You lose!')
    }

    const handlePlayerLeft = ({ players }) => setPlayers(players)
    const handleStartGame = () => {
      setChoice('')
      setResult('')
      setRematchRequested(false)
      setOpponentRematchRequested(false)
    }

    const handleRematch = () => {
      setChoice('')
      setResult('')
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
    socket.on('player-left', handlePlayerLeft)
    socket.on('start-game', handleStartGame)
    socket.on('rematch', handleRematch)
    socket.on('rematch-requested', handleRematchRequested)
    socket.on('player-exit', handlePlayerExit)

    return () => {
      socket.off('player-joined', handlePlayerJoined)
      socket.off('result', handleResult)
      socket.off('player-left', handlePlayerLeft)
      socket.off('start-game', handleStartGame)
      socket.off('rematch', handleRematch)
      socket.off('rematch-requested', handleRematchRequested)
      socket.off('player-exit', handlePlayerExit)
      //
      socket.off('chat-messages')
      socket.off('chat-message')
    }
  }, [socket, roomCode, router])

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

  const renderPlayerChoice = (playerId) => {
    const playerChoice = result ? players.find((player) => player.id === playerId)?.choice : choice
    const icon = choices.find((item) => item.name === playerChoice)?.icon

    return icon ? React.cloneElement(icon, { size: 200 }) : null
  }

  const getIcon = (choice) => {
    return choices.find((item) => item.name === choice)?.icon
  }

  const handleSendMessage = () => {
    if (message.trim() !== '') {
      socket.emit('send-message', { roomCode, message })
      setMessage('')
    }
  }

  const renderAnimation = (winnerIconName, loserIconName) => {
    const isDraw = winnerIconName === loserIconName
    const winningPlayer = players?.find((player) => player.choice === winnerIconName)
    const losingPlayer = players?.find((player) => player.choice === loserIconName)

    const didPlayerWin = winningPlayer?.id === socket.id

    const playerIcon = didPlayerWin ? getIcon(winningPlayer?.choice) : getIcon(losingPlayer?.choice)
    const opponentIcon = didPlayerWin ? getIcon(losingPlayer?.choice) : getIcon(winningPlayer?.choice)

    let animationVariants
    if (isDraw) {
      animationVariants = animationVariantsDraw
    } else if (didPlayerWin === true) {
      animationVariants = animationVariantsWin
    } else if (didPlayerWin === false) {
      animationVariants = animationVariantsLose
    }

    return (
      <div className='flex items-center justify-between pt-28'>
        <motion.div initial='initial' animate='player' variants={animationVariants}>
          {playerIcon && React.cloneElement(playerIcon, { size: 200 })}
        </motion.div>
        <motion.div initial='initial' animate='opponent' variants={animationVariants}>
          {opponentIcon && React.cloneElement(opponentIcon, { size: 200 })}
        </motion.div>
      </div>
    )
  }

  return (
    <div className='flex min-h-screen flex-col p-6'>
      {/* Header */}
      <h1 className='mb-8 text-4xl font-bold text-purple-500'>{roomCode}</h1>

      {/* Scoreboard */}
      <div className='flex flex-col'>
        <h2 className='text-center text-2xl'>Scoreboard</h2>
        <div className='flex justify-between'>
          {players.map((player) => (
            <div key={player.id} className='flex flex-col'>
              <span className='text-xl font-semibold'>{player.name}</span>
              <span className='text-center text-xl font-semibold'>{scores[player.id] || 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Player Choices */}
      {(result && winningPair?.winner && winningPair?.loser) || result?.includes('draw') ? (
        renderAnimation(winningPair.winner, winningPair.loser)
      ) : (
        <div className='h-30 flex items-center justify-between pt-28'>
          {/* Left Player */}
          {result ? renderPlayerChoice(socket.id) : choice && renderPlayerChoice(socket.id)}

          {/* Versus */}
          {result && players.length > 1 && <h1 className='text-4xl font-bold'>VS</h1>}

          {/* Right Player */}
          {result && players.length > 1 && renderPlayerChoice(players.find((player) => player.id !== socket.id)?.id)}
        </div>
      )}

      {/* Result and Room Options */}
      <div className='flex h-96 flex-1 justify-center'>
        {result && (
          <div className='flex flex-col items-center pt-12'>
            <div className='mb-6 text-2xl font-semibold'>{result}</div>
            <div className='flex flex-col justify-center'>
              <div className='flex justify-center space-x-4'>
                {!opponentExited && (
                  <button
                    onClick={handleRematchRequest}
                    className={`w-50 rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-700 focus:bg-green-700 focus:outline-none ${rematchRequested ? 'cursor-not-allowed opacity-50' : ''}`}
                    disabled={rematchRequested}
                  >
                    {rematchRequested
                      ? 'Rematch Requested'
                      : opponentRematchRequested
                        ? 'Accept Rematch'
                        : 'Request Rematch'}
                  </button>
                )}
                <button
                  onClick={exitRoom}
                  className={`w-50 rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-700 focus:bg-red-700 focus:outline-none`}
                >
                  Exit Room
                </button>
              </div>
              {opponentRematchRequested && (
                <div className='pt-6 text-xl font-semibold text-green-500'>Opponent requested a rematch!</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Message Box */}
      <div className='flex max-w-96 flex-col'>
        <div className='max-h-80 overflow-y-auto'>
          {messages.map((msg, index) => (
            <div key={index + 'message-chat'} className='mb-2 rounded bg-gray-800 p-2'>
              <span className='text-white'>
                {msg.playerName}: {msg.message}
              </span>
            </div>
          ))}
        </div>
        <div className='mt-4 flex'>
          <input
            ref={inputRef}
            type='text'
            className='flex-1 rounded-l-lg px-4 py-2 text-black focus:outline-none'
            placeholder='Type your message...'
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSendMessage()
              }
            }}
          />
          <button
            onClick={handleSendMessage}
            className='rounded-r-lg bg-blue-500 px-4 py-2 text-white hover:bg-blue-600 focus:bg-blue-600 focus:outline-none'
          >
            Send
          </button>
        </div>
      </div>

      {/* Card Options */}
      <div className='fixed bottom-0 left-1/2 mb-4 flex -translate-x-1/2 transform flex-col'>
        {choice && <span className='pb-4 text-center text-3xl text-purple-500'>You chose {choice}</span>}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
          {choices.map((item) => (
            <button
              key={item.name}
              className={`card ${choice === item.name ? '!translate-y-[-5px] !bg-purple-700' : ''} enabled:hover:translate-y-[-5px] enabled:hover:!bg-purple-700`}
              onClick={() => handleChoice(item.name)}
              disabled={choice}
            >
              {item.icon}
              <div className='mt-2'>{item.name.charAt(0).toUpperCase() + item.name.slice(1)}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default RoomPage
