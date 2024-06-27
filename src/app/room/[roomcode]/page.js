"use client";

import React, { useEffect, useState } from 'react';
import { useSocket } from '@/context/socketContext';
import { useRouter } from 'next/navigation';

const choices = ["rock", "paper", "scissors", "dragon", "ant"];

const RoomPage = ({ params }) => {
    const socket = useSocket();
    const router = useRouter();
    const roomCode = params.roomcode;
    const [choice, setChoice] = useState("");
    const [result, setResult] = useState("");
    const [players, setPlayers] = useState({});
    const [scores, setScores] = useState({});
    const [rematchRequested, setRematchRequested] = useState(false);
    const [opponentRematchRequested, setOpponentRematchRequested] = useState(false);
    const [opponentExited, setOpponentExited] = useState(false);

    useEffect(() => {
        if (!socket) return;

        socket.on('result', ({ winnerId, players, scores }) => {
            setPlayers(players);
            setScores(scores);
            setResult(winnerId === socket.id ? "You win!" : winnerId === "draw" ? "It's a draw!" : "You lose!");
        });

        socket.on('player-left', ({ playerId, players }) => {
            setPlayers(players);
            setResult("Opponent left the game.");
        });

        socket.on('start-game', (roomcode) => {
            setChoice("");
            setResult("");
            setRematchRequested(false);
            setOpponentRematchRequested(false);
        });

        socket.on('rematch', (roomcode) => {
            setChoice("");
            setResult("");
        });

        socket.on('rematch-requested', ({ playerId }) => {
            if (playerId !== socket.id) {
                setOpponentRematchRequested(true);
            }
        });

        socket.on('player-exit', ({ playerId }) => {
            if (playerId !== socket.id) {
                setOpponentExited(true);
            }
        });

        return () => {
            socket.off('result');
            socket.off('player-left');
            socket.off('start-game');
            socket.off('rematch');
            socket.off('rematch-requested');
            socket.off('player-exit');
        };
    }, [socket]);

    const handleChoice = (choice) => {
        setChoice(choice);
        socket.emit('choose', choice);
    };

    const rematch = () => {
        setRematchRequested(true);
        socket.emit('rematch', roomCode);
    };

    const exitRoom = () => {
        socket.emit('exit-room', roomCode);
        router.push('/');
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-black-100">
            <h1 className="text-4xl font-bold mb-8">Rock-Paper-Scissors-Dragon-Ant</h1>
            <div>
                <div className="flex space-x-4">
                    {choices.map((c) => (
                        <button
                            key={c}
                            onClick={() => handleChoice(c)}
                            disabled={!!choice}
                            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {c.charAt(0).toUpperCase() + c.slice(1)}
                        </button>
                    ))}
                </div>
                {choice && <p className="mt-4 text-xl">You chose: {choice}</p>}
                {result && (
                    <div className="mt-8 p-4 border rounded-lg bg-white shadow-md">
                        <h2 className="text-2xl font-semibold mb-4">{result}</h2>
                        <p>Your choice: {players[socket.id]?.choice}</p>
                        <p>Opponent's choice: {players[Object.keys(players).find((id) => id !== socket.id)]?.choice}</p>
                        <div className="mt-4">
                            <h3 className="text-lg font-semibold">Scores:</h3>
                            <p>{players[socket.id]?.name}: {scores[socket.id]}</p>
                            <p>{players[Object.keys(players).find((id) => id !== socket.id)]?.name}: {scores[Object.keys(players).find((id) => id !== socket.id)]}</p>
                        </div>
                        <button
                            onClick={rematch}
                            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-700"
                            disabled={rematchRequested}
                        >
                            {rematchRequested ? "Waiting for opponent..." : "Rematch"}
                        </button>
                        <button
                            onClick={exitRoom}
                            className="mt-4 ml-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-700"
                        >
                            Exit Room
                        </button>
                        {opponentRematchRequested && !rematchRequested && <p className="mt-2 text-red-500">Opponent wants a rematch!</p>}
                        {opponentExited && <p className="mt-2 text-red-500">Opponent exited the game.</p>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RoomPage;
