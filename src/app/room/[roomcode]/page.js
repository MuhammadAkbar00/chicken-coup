'use client'

import React, { useEffect, useState } from 'react'
import { useSocket } from '@/context/socketContext'
import { useRouter } from 'next/navigation'
import { FaHandRock, FaHandPaper, FaHandScissors, FaDragon } from 'react-icons/fa'
import { HiBugAnt } from 'react-icons/hi2'

const choices = [
  { name: 'rock', icon: <FaHandRock size={80} /> },
  { name: 'paper', icon: <FaHandPaper size={80} /> },
  { name: 'scissors', icon: <FaHandScissors size={80} /> },
  { name: 'dragon', icon: <FaDragon size={80} /> },
  { name: 'ant', icon: <HiBugAnt size={80} /> }
]

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

  useEffect(() => {
    if (!socket) return

    // Fetch the players from the server
    const fetchPlayers = async () => {
      try {
        fetch(`/api/rooms/${roomCode}/players`)
          .then((res) => res.json())
          .then((data) => {
            if (!data.find((player) => player.id === socket.id)) {
              router.push('/')
            }
            setPlayers([...data])
          })
          .catch((err) => router.push('/'))
      } catch (error) {
        console.error('Failed to fetch players:', error)
        router.push('/')
      }
    }

    fetchPlayers()

    socket.on('player-joined', ({ player, players }) => {
      setPlayers(players)
    })

    socket.on('result', ({ winnerId, players, scores }) => {
      setPlayers(players)
      setScores(scores)
      setResult(winnerId === socket.id ? 'You win!' : winnerId === 'draw' ? "It's a draw!" : 'You lose!')
    })

    socket.on('player-left', ({ playerId, players }) => {
      setPlayers(players)
      setResult('Opponent left the game.')
    })

    socket.on('start-game', (roomcode) => {
      setChoice('')
      setResult('')
      setRematchRequested(false)
      setOpponentRematchRequested(false)
    })

    socket.on('rematch', (roomcode) => {
      setChoice('')
      setResult('')
    })

    socket.on('rematch-requested', ({ playerId }) => {
      if (playerId !== socket.id) {
        setOpponentRematchRequested(true)
      }
    })

    socket.on('player-exit', ({ playerId }) => {
      if (playerId !== socket.id) {
        setOpponentExited(true)
      }
    })

    return () => {
      socket.off('player-joined')
      socket.off('result')
      socket.off('player-left')
      socket.off('start-game')
      socket.off('rematch')
      socket.off('rematch-requested')
      socket.off('player-exit')
    }
  }, [socket, roomCode, router])

  const handleChoice = (choice) => {
    setChoice(choice)
    socket.emit('choose', choice)
    console.log(`Choice made: ${choice}`) // Debug log
  }

  const handleRematchRequest = () => {
    setRematchRequested(true)
    socket.emit('rematch', roomCode)
  }

  const exitRoom = () => {
    socket.emit('exit-room', roomCode)
    router.push('/')
  }
  console.log(choice)
  console.log(players)
  return (
    <div className='flex min-h-screen flex-col p-6'>
      {/* Top Part */}
      <h1 className='mb-8 text-4xl font-bold text-purple-500'>{roomCode}</h1>
      <div className='flex flex-col'>
        <h2 className='text-center text-2xl'>Scoreboard</h2>
        <div className='flex justify-between'>
          {players.map((player) => (
            <div className='flex flex-col' key={player.name + 'scorediv'}>
              <span key={player.id + 'score'} className='text-xl font-semibold'>
                {player.name}
              </span>
              <span key={player.name + 'score'} className='text-center text-xl font-semibold'>
                {scores[player.id] || 0}
              </span>
            </div>
          ))}
        </div>
      </div>
      {/* Center */}
      <div className='flex items-center justify-between pt-28'>
        {/* Left Side */}
        {result
          ? players &&
            players.find((player) => player.id === socket.id)?.choice &&
            choices.find((item) => players.find((player) => player.id === socket.id)?.choice === item.name)?.icon &&
            React.cloneElement(
              choices.find((item) => players.find((player) => player.id === socket.id)?.choice === item.name)?.icon,
              { size: 200 }
            )
          : choice &&
            choices.find((item) => choice === item.name)?.icon &&
            React.cloneElement(choices.find((item) => choice === item.name)?.icon, { size: 200 })}
        {players &&
          players.find((player) => player.id !== socket.id)?.choice &&
          choices.find((item) => players.find((player) => player.id !== socket.id)?.choice === item.name)?.icon &&
          result && <h1 className='text-4xl font-bold'>VS</h1>}
        {/* Right Side */}
        {result &&
          players &&
          players.find((player) => player.id !== socket.id)?.choice &&
          choices.find((item) => players.find((player) => player.id !== socket.id)?.choice === item.name)?.icon &&
          React.cloneElement(
            choices.find((item) => players.find((player) => player.id !== socket.id)?.choice === item.name)?.icon,
            { size: 200 }
          )}
      </div>

      {/* Room Options */}
      {result && (
        <div className='flex flex-col items-center pt-12'>
          <div className='mb-6 text-2xl font-semibold'>{result}</div>
          <div className='flex flex-col justify-center'>
            {opponentRematchRequested && (
              <div className='pb-6 text-xl font-semibold text-green-500'>Opponent requested a rematch!</div>
            )}
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
          </div>
        </div>
      )}

      {/* Card Options */}
      <div className='fixed bottom-0 left-1/2 mb-4 flex -translate-x-1/2 transform flex-col'>
        {choice && <span className='pb-4 text-center text-3xl text-purple-500'>You chose {choice}</span>}
        <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5'>
          {choices.map((item) => (
            <button
              key={item.name}
              className={`card ${choice === item.name ? 'translate-y-[-5px] !bg-purple-700' : ''} enabled:hover:translate-y-[-5px] enabled:hover:!bg-purple-700`}
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

  return (
    <>
      {players.length >= 2 ? (
        <div className='flex min-h-screen flex-col items-center py-6'>
          {/* Top part */}
          <h1 className='mb-8 text-4xl font-bold text-purple-500'>Room: {roomCode}</h1>
          <div className='mb-4 flex flex-grow flex-col'>
            <h2>Scoreboard</h2>
            <div className='flex'>
              {players.map((player) => (
                <>
                  <div key={player.id + 'score'} className='text-xl font-semibold'>
                    {player.name}
                  </div>
                  <div key={player.name + 'score'} className='text-xl font-semibold'>
                    {scores[player.id] || 0}
                  </div>
                </>
              ))}
            </div>
          </div>
          <div className='mb-6 flex flex-col items-center space-x-4'>
            {choice && (
              <div key={choice + 'chosen'} className='pb-2 text-xl font-semibold'>
                You selected {choice}
              </div>
            )}
          </div>
          {result && (
            <>
              <div className='mb-6 text-2xl font-semibold'>{result}</div>
              <div className='flex space-x-4'>
                <button
                  onClick={handleRematchRequest}
                  className={`w-full rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-700 focus:bg-green-700 focus:outline-none ${rematchRequested ? 'cursor-not-allowed opacity-50' : ''}`}
                  disabled={rematchRequested}
                >
                  {rematchRequested ? 'Rematch Requested' : 'Request Rematch'}
                </button>
                {opponentRematchRequested && (
                  <div className='text-xl font-semibold text-green-500'>Opponent requested a rematch!</div>
                )}
                {opponentExited && <div className='text-xl font-semibold text-red-500'>Opponent left the game.</div>}
              </div>
            </>
          )}
          <div className='fixed bottom-0 left-1/2 mb-4 mb-6 flex -translate-x-1/2 transform space-x-4'>
            {choices.map((item) => (
              <button
                key={item.name}
                className={`card ${choice === item.name ? '!translate-y-[-5px] !bg-purple-700' : ''} enabled:hover:translate-y-[-5px]`}
                onClick={() => handleChoice(item.name)}
                disabled={choice}
              >
                {item.icon}
                <div className='mt-2'>{item.name.charAt(0).toUpperCase() + item.name.slice(1)}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className='flex min-h-screen flex-col items-center justify-center py-6'>
          <div className='w-full max-w-md rounded-lg bg-card-background p-8 shadow-md'>
            <h2 className='mb-6 text-2xl font-semibold'>Room: {roomCode}</h2>
            <div className='mb-4'>
              <h3 className='text-xl font-semibold'>Players:</h3>
              <ul>
                {players?.map((player) => (
                  <li key={player.id}>
                    {player.name}: {scores[player.id] || 0}
                  </li>
                ))}
              </ul>
            </div>
            <p>{result}</p>
            {opponentExited && (
              <button
                onClick={exitRoom}
                className='ml-4 mt-4 rounded-lg bg-red-500 px-4 py-2 text-white hover:bg-red-700'
              >
                Exit Room
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default RoomPage
