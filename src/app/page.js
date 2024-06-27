"use client";

import { useRouter } from 'next/navigation';
import React, { useState, useEffect } from 'react';
import { useSocket } from '@/context/socketContext';

const RoomEntry = () => {
  const router = useRouter();
  const socket = useSocket();
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [players, setPlayers] = useState([]);

  useEffect(() => {
    if (!socket) return;

    socket.on('player-joined', ({ player, players }) => {
      setPlayers(players);
    });

    socket.on('start-game', (roomcode) => {
      router.push(`room/${roomcode}`);
    });

    return () => {
      socket.off('player-joined');
      socket.off('start-game');
    };
  }, [socket, router]);

  const handleJoinRoom = () => {
    if (playerName && roomCode) {
      socket.emit('join-room', { roomCode, playerName });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-6 bg-gray-100">
      <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-semibold mb-6">Enter Room Code and Name</h2>
        <div className="mb-4">
          <input
            type="text"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value)}
            placeholder="Room code"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="mb-4">
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Your name"
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
              {players.map((player) => (
                <li key={player.id}>Player {player.name}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomEntry;
