// Matchmaking.tsx — Chess.com style ELO + interest matching

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_BASE } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { io, Socket } from 'socket.io-client';
import { Brain, Swords, X, Wifi, WifiOff, Clock, Users } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';

const rankColors: Record<string, string> = {
    'Novice': '#94a3b8', 'Beginner': '#6ee7b7', 'Intermediate': '#60a5fa',
    'Advanced': '#818cf8', 'Expert': '#c084fc', 'Candidate Master': '#f59e0b',
    'Master': '#f59e0b', 'International Master': '#ef4444', 'Grandmaster': '#ef4444',
    'Super Grandmaster': '#ef4444', 'World Champion': '#f97316',
};

const eloLabel = (elo: number): string => {
    if (elo < 400)  return 'Novice';
    if (elo < 600)  return 'Beginner';
    if (elo < 800)  return 'Intermediate';
    if (elo < 1000) return 'Advanced';
    if (elo < 1200) return 'Expert';
    if (elo < 1400) return 'Candidate Master';
    if (elo < 1600) return 'Master';
    if (elo < 1800) return 'International Master';
    if (elo < 2000) return 'Grandmaster';
    return 'Super Grandmaster';
};

type QueueState = 'idle' | 'searching' | 'found';

const Matchmaking = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const socketRef = useRef<Socket | null>(null);
    const [queueState, setQueueState] = useState<QueueState>('idle');
    const [connected, setConnected] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const [interests, setInterests] = useState<string[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Fetch user interests
    useEffect(() => {
        if (!token) return;
        fetch(`${API_BASE}/interests/me`, { headers: { Authorization: `Bearer ${token}` } })
            .then(r => r.json())
            .then(data => setInterests(data.map((i: any) => i.slug)))
            .catch(() => {});
    }, [token]);

    // Setup socket
    useEffect(() => {
        if (!user || !token) return;

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            setConnected(true);
            socket.emit('user_online', {
                userId: user.id,
                username: user.username,
                elo: user.elo,
                interests,
            });
        });

        socket.on('disconnect', () => setConnected(false));

        socket.on('match_found', (data: any) => {
            clearTimer();
            setQueueState('found');
            toast({
                title: '⚔️ Opponent Found!',
                description: `You'll debate: "${data.topic}"`,
            });
            setTimeout(() => {
                navigate('/debate', {
                    state: {
                        debateId: data.debate_id,
                        topic: data.topic,
                        opponent: data.opponent,
                        interestSlug: data.interest,
                    }
                });
            }, 1500);
        });

        socket.on('error', (err: any) => {
            toast({ title: 'Socket Error', description: err.detail || 'Connection error', variant: 'destructive' });
            setQueueState('idle');
            clearTimer();
        });

        return () => {
            clearTimer();
            socket.emit('user_offline', { userId: user.id });
            socket.disconnect();
        };
    }, [user, token, interests]);

    const clearTimer = () => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        setElapsed(0);
    };

    const startSearch = () => {
        if (!socketRef.current || !user) return;
        setQueueState('searching');
        setElapsed(0);
        timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);

        socketRef.current.emit('join_matchmaking_queue', {
            userId: user.id,
            username: user.username,
            elo: user.elo,
            interests,
        });
    };

    const cancelSearch = () => {
        if (!socketRef.current || !user) return;
        socketRef.current.emit('cancel_matchmaking', { userId: user.id });
        setQueueState('idle');
        clearTimer();
        toast({ title: 'Search cancelled' });
    };

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const rank = eloLabel(user?.elo || 1200);
    const rankColor = rankColors[rank] || '#f59e0b';

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
            {/* Header */}
            <div className="flex items-center gap-3 mb-12">
                <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                    <Brain className="w-5 h-5 text-amber-400" />
                </div>
                <span className="text-xl font-bold text-white">MindGrid</span>
                <span className="text-gray-600">|</span>
                <span className="text-gray-400">Find a Match</span>
            </div>

            {/* Main Card */}
            <div className="w-full max-w-md">
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-8 text-center">

                    {/* Connection status */}
                    <div className="flex items-center justify-center gap-2 mb-6">
                        {connected
                            ? <><Wifi className="w-4 h-4 text-green-400" /><span className="text-green-400 text-sm">Connected</span></>
                            : <><WifiOff className="w-4 h-4 text-red-400" /><span className="text-red-400 text-sm">Connecting...</span></>
                        }
                    </div>

                    {/* Player card */}
                    <div className="mb-8">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-amber-600/10 border-2 border-amber-500/30 flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl font-bold text-amber-400">
                                {user?.username?.charAt(0).toUpperCase()}
                            </span>
                        </div>
                        <h2 className="text-xl font-bold text-white mb-1">{user?.username}</h2>
                        <div className="flex items-center justify-center gap-3">
                            <span className="text-2xl font-bold" style={{ color: rankColor }}>{user?.elo}</span>
                            <span className="text-sm px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ background: `${rankColor}20`, color: rankColor }}>
                                {rank}
                            </span>
                        </div>
                        {interests.length > 0 && (
                            <p className="text-gray-500 text-xs mt-2">
                                Matching on: {interests.slice(0, 3).join(', ')}{interests.length > 3 ? ` +${interests.length - 3}` : ''}
                            </p>
                        )}
                    </div>

                    {/* ELO range info */}
                    <div className="bg-gray-800/50 rounded-xl p-3 mb-6 text-sm text-gray-400">
                        <div className="flex items-center justify-center gap-2">
                            <Users className="w-4 h-4" />
                            <span>Searching ±300 ELO range ({Math.max(100, (user?.elo || 1200) - 300)} – {(user?.elo || 1200) + 300})</span>
                        </div>
                    </div>

                    {/* State-based UI */}
                    {queueState === 'idle' && (
                        <Button
                            onClick={startSearch}
                            disabled={!connected}
                            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-4 text-base rounded-xl flex items-center justify-center gap-2 transition-all"
                        >
                            <Swords className="w-5 h-5" />
                            Find Opponent
                        </Button>
                    )}

                    {queueState === 'searching' && (
                        <div className="space-y-4">
                            {/* Pulse animation */}
                            <div className="flex items-center justify-center">
                                <div className="relative">
                                    <div className="w-16 h-16 rounded-full border-4 border-amber-500/30 animate-ping absolute inset-0" />
                                    <div className="w-16 h-16 rounded-full border-4 border-amber-500 flex items-center justify-center relative">
                                        <Swords className="w-6 h-6 text-amber-400" />
                                    </div>
                                </div>
                            </div>
                            <div>
                                <p className="text-white font-semibold">Searching for an opponent...</p>
                                <div className="flex items-center justify-center gap-2 mt-1 text-amber-400">
                                    <Clock className="w-4 h-4" />
                                    <span className="font-mono text-sm">{formatTime(elapsed)}</span>
                                </div>
                                <p className="text-gray-500 text-xs mt-1">
                                    {elapsed > 30 ? 'Expanding ELO range...' : 'Finding best match by interests & ELO'}
                                </p>
                            </div>
                            <Button
                                onClick={cancelSearch}
                                variant="outline"
                                className="w-full border-gray-700 text-gray-400 hover:text-white hover:border-gray-500 flex items-center justify-center gap-2"
                            >
                                <X className="w-4 h-4" />
                                Cancel
                            </Button>
                        </div>
                    )}

                    {queueState === 'found' && (
                        <div className="space-y-3">
                            <div className="text-4xl">⚔️</div>
                            <p className="text-green-400 font-bold text-lg">Opponent Found!</p>
                            <p className="text-gray-400 text-sm">Entering debate arena...</p>
                            <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                <div className="h-full bg-green-400 animate-pulse w-full" />
                            </div>
                        </div>
                    )}
                </div>

                {/* Info */}
                <div className="mt-6 grid grid-cols-3 gap-3 text-center">
                    {[
                        { label: 'ELO Matching', icon: '📊', desc: 'Chess.com style' },
                        { label: 'Interest-Based', icon: '🎯', desc: 'Shared topics' },
                        { label: 'AI Judged', icon: '🤖', desc: 'Fair evaluation' },
                    ].map(item => (
                        <div key={item.label} className="bg-gray-900 border border-gray-800 rounded-xl p-3">
                            <div className="text-xl mb-1">{item.icon}</div>
                            <div className="text-white text-xs font-medium">{item.label}</div>
                            <div className="text-gray-500 text-xs">{item.desc}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Matchmaking;
