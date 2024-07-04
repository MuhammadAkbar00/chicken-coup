'use client'

import { useRouter } from 'next/navigation'
import React, { useState, useEffect } from 'react'
import { useSocket } from '@/context/socketContext'

const RoomEntry = () => {
  const [name, setName] = useState('')
  const [isNameSubmitted, setIsNameSubmitted] = useState(false)
  const [rooms, setRooms] = useState([])
  const [roomCode, setRoomCode] = useState('')
  const socket = useSocket()
  const router = useRouter()

  useEffect(() => {
    if (!socket) return

    if (isNameSubmitted) {
      fetch('/api/rooms')
        .then((res) => res.json())
        .then((data) => {
          setRooms(data)
        })
        .catch((err) => console.error(err))
    }

    socket.on('room-updated', (updatedRooms) => {
      setRooms(
        Object.values(updatedRooms).map((room) => ({
          code: room.code,
          playerCount: room.players.length,
          players: room.players.map((player) => player.name)
        }))
      )
    })

    return () => {
      socket.off('room-updated')
    }
  }, [isNameSubmitted, socket])

  useEffect(() => {
    const storedName = sessionStorage.getItem('chickenCoup_userName')
    if (storedName) {
      setName(storedName)
      setIsNameSubmitted(true)
    }
  }, [])

  const handleNameSubmit = () => {
    if (name) {
      sessionStorage.setItem('chickenCoup_userName', name)
      setIsNameSubmitted(true)
    }
  }

  const handleCreateRoom = () => {
    if (name && roomCode) {
      socket.emit('create-room', roomCode, name, (response) => {
        if (response.success) {
          router.push(`/room/${response.roomCode}`)
        } else {
          alert(response.message)
        }
      })
    }
  }

  const handlePlayWithBots = (botType) => {
    if (name && botType) {
      socket.emit('create-room', null, name, botType, (response) => {
        if (response.success) {
          router.push(`/room/${response.roomCode}`)
        } else {
          alert(response.message)
        }
      })
    }
  }

  const handleJoinRoom = (roomCode) => {
    if (name) {
      socket.emit('join-room', { roomCode, playerName: name })
      router.push(`/room/${roomCode}`)
    }
  }

  return (
    <div className='flex min-h-screen flex-col items-center justify-center py-6'>
      {!isNameSubmitted ? (
        <div className='w-full max-w-md rounded-lg bg-card-background p-8 shadow-md'>
          <h1 className='mb-8 text-4xl font-bold'>Rock Paper Scissors Dragon Ant</h1>
          <h2 className='mb-6 text-2xl font-semibold'>Enter Your Name</h2>
          <div className='mb-4'>
            <input
              type='text'
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleNameSubmit()
                }
              }}
              placeholder='Your name'
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none'
            />
          </div>
          <button
            onClick={handleNameSubmit}
            className='w-full rounded-lg bg-purple-500 px-4 py-2 text-white hover:bg-purple-700 focus:bg-purple-700 focus:outline-none'
          >
            Submit
          </button>
        </div>
      ) : (
        <div className='w-full max-w-md rounded-lg bg-card-background p-8 shadow-md'>
          <h2 className='mb-4 text-2xl font-semibold'>Welcome, {name}!</h2>
          <div className='mb-4'>
            <input
              type='text'
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateRoom()
                }
              }}
              placeholder='Room code'
              className='w-full rounded-lg border border-gray-300 px-3 py-2 text-black focus:border-blue-500 focus:outline-none'
            />
          </div>
          <button
            onClick={handleCreateRoom}
            className='w-full rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-700 focus:bg-green-700 focus:outline-none'
          >
            Create Room
          </button>
          <div className='flex gap-2 pt-2'>
            <button
              onClick={() => handlePlayWithBots('easy')}
              className='w-full rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-700 focus:bg-green-700 focus:outline-none'
            >
              Play Easy bot
            </button>
            <button
              onClick={() => handlePlayWithBots('impossible')}
              className='w-full rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-700 focus:bg-green-700 focus:outline-none'
            >
              Play Impossible bot
            </button>
          </div>
          <button
            onClick={() => router.push('/leaderboards')}
            className='mt-2 w-full rounded-lg bg-green-500 px-4 py-2 text-white hover:bg-green-700 focus:bg-green-700 focus:outline-none'
          >
            Leaderboards
          </button>
          <div className='mt-6'>
            <h3 className='mb-4 text-xl font-semibold'>Available Rooms</h3>
            <ul>
              {rooms.map((room) => (
                <li key={room.code} className='mb-2'>
                  <div className='flex items-center justify-between'>
                    <span>
                      {room.code} - {room?.players?.join(', ')}
                    </span>
                    <button
                      onClick={() => handleJoinRoom(room.code)}
                      className='rounded-lg bg-purple-500 px-3 py-1 text-white hover:bg-purple-700 focus:bg-purple-700 focus:outline-none'
                    >
                      Join
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

export default RoomEntry
