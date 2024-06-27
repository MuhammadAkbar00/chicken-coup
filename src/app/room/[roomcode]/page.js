"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSocket } from '@/context/socketContext';

const RoomPage = ({ params }) => {
    const { code } = params;
    const [players, setPlayers] = useState([]);
    const [scores, setScores] = useState({});
    const [message, setMessage] = useState('');
    const socket = useSocket();
    const router = useRouter();

    useEffect(() => {
        // if (!localStorage.getItem('name')) {
        //     router.push('/');
        // }

        socket.emit('join-room', { roomCode: code, playerName: localStorage.getItem('name') });

        socket.on('player-joined', ({ player, players }) => {
            setPlayers(players);
        });

        socket.on('player-left', ({ playerId, players }) => {
            setPlayers(players);
        });

        socket.on('start-game', () => {
            setMessage('Game started!');
        });

        socket.on('result', ({ winnerId, players, scores }) => {
            setPlayers(players);
            setScores(scores);
            setMessage(winnerId === 'draw' ? 'It\'s a draw!' : `${players.find(p => p.id === winnerId).name} wins!`);
        });

        socket.on('rematch-requested', ({ playerId }) => {
            setMessage(`${players.find(p => p.id === playerId).name} requested a rematch.`);
        });

        socket.on('rematch', () => {
            setMessage('Rematch started!');
        });

        socket.on('player-exit', ({ playerId }) => {
            setMessage(`${players.find(p => p.id === playerId).name} left the game.`);
        });

        return () => {
            socket.off('player-joined');
            socket.off('player-left');
            socket.off('start-game');
            socket.off('result');
            socket.off('rematch-requested');
            socket.off('rematch');
            socket.off('player-exit');
        };
    }, [code, socket, router, players]);

    const handleRematch = () => {
        socket.emit('rematch', code);
    };

    const handleExit = () => {
        socket.emit('exit-room', code);
        router.push('/');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-6 bg-gray-100">
            <div className="max-w-md w-full bg-white p-8 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-6">Room: {code}</h2>
                <div className="mb-4">
                    <h3 className="text-xl font-semibold">Players:</h3>
                    <ul>
                        {players.map((player) => (
                            <li key={player.id}>{player.name}: {scores[player.id] || 0}</li>
                        ))}
                    </ul>
                </div>
                <p>{message}</p>
                <button
                    onClick={handleRematch}
                    className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-700 focus:outline-none focus:bg-green-700 mt-4"
                >
                    Rematch
                </button>
                <button
                    onClick={handleExit}
                    className="w-full bg-red-500 text-white py-2 px-4 rounded-lg hover:bg-red-700 focus:outline-none focus:bg-red-700 mt-4"
                >
                    Exit
                </button>
            </div>
        </div>
    );
};

export default RoomPage;
