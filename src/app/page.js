"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/socketContext';

const HomePage = () => {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  const [rooms, setRooms] = useState([]);
  const socket = useSocket();
  const router = useRouter();

  console.log(isNameSubmitted, 'isNameSubmitted')

  useEffect(() => {
    if (isNameSubmitted) {
      fetch('/api/rooms')
        .then(res => res.json())
        .then(data => setRooms(data))
        .catch(err => console.error(err));

      socket.on('room-updated', (updatedRooms) => {
        setRooms(Object.values(updatedRooms).map(room => ({
          code: room.code,
          playerCount: room.players.length,
          players: room.players.map(player => player.name)
        })));
      });

      return () => {
        socket.off('room-updated');
      };
    }
  }, [isNameSubmitted, socket]);

  const handleNameSubmit = () => {
    if (name) {
      setIsNameSubmitted(true);
    }
  };

  const handleJoinRoom = (roomCode) => {
    if (name) {
      socket.emit('join-room', { roomCode, playerName: name });
      router.push(`/room/${roomCode}`);
    }
  };

  const handleCreateRoom = () => {
    if (name && roomCode) {
      socket.emit('create-room', roomCode, name, (response) => {
        console.log('idk')
        if (response.success) {
          router.push(`/room/${response.roomCode}`);
        } else {
          alert(response.message);
        }
      });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-6 bg-gray-100">
      {!isNameSubmitted ? (
        <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
          <h2 className="text-2xl font-semibold mb-6">Enter Your Name</h2>
          <div className="mb-4">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
            />
          </div>
          <button
            onClick={handleNameSubmit}
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:bg-blue-700"
          >
            Submit
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen py-6 bg-gray-100">
          <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold mb-6">Create or Join a Room</h2>
            <div className="mb-4">
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value)}
                placeholder="Enter room code"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              onClick={handleCreateRoom}
              className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:bg-green-700"
            >
              Create Room
            </button>
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-4">Available Rooms</h3>
              <ul>
                {rooms.map((room) => (
                  <li key={room.code} className="mb-2">
                    <div className="flex justify-between items-center">
                      <span>{room.code} - {room.players.join(', ')}</span>
                      <button
                        onClick={() => handleJoinRoom(room.code)}
                        className="bg-blue-500 text-white py-1 px-3 rounded-lg hover:bg-blue-700 focus:outline-none focus:bg-blue-700"
                      >
                        Join
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
