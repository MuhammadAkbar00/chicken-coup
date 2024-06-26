"use client"

import { useRouter } from 'next/navigation';
// RoomEntry.js
import React, { useState, useEffect } from 'react';
import io from 'socket.io-client';

const socket = io(); // Connect to the default server URL (assuming it's running on the same server)

const RoomEntry = () => {
  const router = useRouter()
  const [roomCode, setRoomCode] = useState('');
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    socket.on('player-joined', ({ playerId, roomcode, players }) => {
      console.log(`Player ${playerId} joined room ${roomcode}`);
      console.log(players, 'players ')
      setPlayers(players);
    });

    socket.on('start-game', ({ roomcode }) => {
      console.log(`Starting game in room ${roomcode}`);
      // Navigate to game start or update UI for game start
      // Example: history.push(`/room/${roomcode}/game`);
      router.push(`room/${roomcode}`)
    });

    return () => {
      socket.off('player-joined');
      socket.off('start-game');
    };
  }, [players]); // Add players to the dependency array to update useEffect properly

  const handleJoinRoom = () => {
    socket.emit('join-room', roomCode);
    console.log(`Joining room ${roomCode}`);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-6 bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-6">Enter Room Code</h2>
        <div className="mb-4">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Room code"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <button
          onClick={handleJoinRoom}
          className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:bg-blue-700"
        >
          Join Room
        </button>
        {players.length > 0 && (
          <div className="mt-4">
            <h3 className="text-xl font-semibold mb-2">Players in the room:</h3>
            <ul>
              {players.map((playerId) => (
                <li key={playerId}>Player {playerId}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomEntry;

