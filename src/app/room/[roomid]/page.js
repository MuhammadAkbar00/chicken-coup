"use client"
// app/page.js or pages/index.js
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const choices = ["rock", "paper", "scissors"];

export default function Home() {
    const [socket, setSocket] = useState(null);
    const [choice, setChoice] = useState("");
    const [result, setResult] = useState("");
    const [players, setPlayers] = useState({});

    useEffect(() => {
        const newSocket = io();
        setSocket(newSocket);

        newSocket.on('result', ({ winnerId, players }) => {
            console.log("result????")
            setPlayers(players);
            setResult(winnerId === newSocket.id ? "You win!" : winnerId === "draw" ? "It's a draw!" : "You lose!");
        });

        return () => newSocket.disconnect();
    }, []);

    const handleChoice = (choice) => {
        setChoice(choice);
        socket.emit('choose', choice);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-black-100">
            <h1 className="text-4xl font-bold mb-8">Rock-Paper-Scissors</h1>
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
                </div>
            )}
        </div>
    );
}

