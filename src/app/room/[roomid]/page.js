"use client"
import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const choices = ["rock", "paper", "scissors", "dragon", "ant"];

export default function Home() {
    const [socket, setSocket] = useState(null);
    const [choice, setChoice] = useState("");
    const [result, setResult] = useState("");
    const [players, setPlayers] = useState({});
    const [roomCode, setRoomCode] = useState("");
    const [inRoom, setInRoom] = useState(false);

    useEffect(() => {
        const newSocket = io();
        setSocket(newSocket);

        newSocket.on('result', ({ winnerId, players }) => {
            setPlayers(players);
            setResult(winnerId === newSocket.id ? "You win!" : winnerId === "draw" ? "It's a draw!" : "You lose!");
        });

        newSocket.on('player-joined', ({ roomcode, players }) => {
            setPlayers(players);
            setInRoom(true);
        });

        newSocket.on('player-left', ({ players }) => {
            setPlayers(players);
            setResult("Opponent left the game.");
        });

        newSocket.on('start-game', ({ roomcode }) => {
            setChoice("");
            setResult("");
            setRoomCode(roomcode);
        });

        newSocket.on('rematch', ({ roomcode }) => {
            setChoice("");
            setResult("");
        });

        return () => {
            if (newSocket) {
                newSocket.emit('exit-room', roomCode);
                newSocket.disconnect();
            }
        };
    }, [roomCode]);

    const handleChoice = (choice) => {
        setChoice(choice);
        socket.emit('choose', choice);
    };

    const joinRoom = (roomcode) => {
        socket.emit('join-room', roomcode);
        setRoomCode(roomcode);
    };

    const rematch = () => {
        socket.emit('rematch', roomCode);
    };

    const exitRoom = () => {
        socket.emit('exit-room', roomCode);
        setInRoom(false);
        setRoomCode("");
        setChoice("");
        setResult("");
        setPlayers({});
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen py-2 bg-black-100">
            <h1 className="text-4xl font-bold mb-8">Rock-Paper-Scissors-Dragon-Ant</h1>
            {!inRoom && (
                <div className="mb-8">
                    <input
                        type="text"
                        placeholder="Enter room code"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value)}
                        className="px-4 py-2 rounded-lg border-2 border-blue-500"
                    />
                    <button
                        onClick={() => joinRoom(roomCode)}
                        className="ml-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-700"
                    >
                        Join Room
                    </button>
                </div>
            )}
            {inRoom && (
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
                            <button
                                onClick={rematch}
                                className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-700"
                            >
                                Rematch
                            </button>
                            <button
                                onClick={exitRoom}
                                className="mt-4 ml-4 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-700"
                            >
                                Exit Room
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
