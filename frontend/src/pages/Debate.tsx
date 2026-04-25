import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { io, Socket } from 'socket.io-client';
import { Send, Flag, Handshake, Clock, X, Loader2 } from 'lucide-react';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';
const DEBATE_DURATION = 8 * 60;

interface Message {
    id: number; content: string; sender_id: number | null;
    sender_type: string; timestamp: string; debate_id: number;
}

const Debate = () => {
    const location  = useLocation();
    const navigate  = useNavigate();
    const { user, token } = useAuth();
    const state = location.state as any;

    const socketRef      = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const timerRef       = useRef<NodeJS.Timeout | null>(null);
    const endedRef       = useRef(false);  // prevent double-finalize

    const [messages, setMessages]     = useState<Message[]>([]);
    const [input, setInput]           = useState('');
    const [sending, setSending]       = useState(false);
    const [timeLeft, setTimeLeft]     = useState(DEBATE_DURATION);
    const [drawProposed, setDrawProposed] = useState<string | null>(null);
    const [opponentLeft, setOpponentLeft] = useState(false);
    const [ended, setEnded]           = useState(false);
    const [evaluating, setEvaluating] = useState(false);

    const debateId = state?.debateId;
    const topic    = state?.topic || 'Unknown topic';
    const opponent = state?.opponent;

    useEffect(() => {
        if (!state?.debateId) { navigate('/matchmaking'); return; }
    }, []);

    useEffect(() => {
        if (!user || !token || !debateId) return;

        const socket = io(SOCKET_URL, {
            auth: { token },
            transports: ['websocket', 'polling'],
            reconnection: true,
        });
        socketRef.current = socket;

        socket.on('connect', () => {
            socket.emit('user_online', { userId: user.id, username: user.username, elo: user.elo });
            socket.emit('join_debate_room', { debateId, userId: user.id });
        });

        socket.on('new_message', (msg: Message) => {
            setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
        });

        socket.on('draw_proposed', (data: any) => {
            if (String(data.proposer_id) !== String(user.id)) {
                setDrawProposed(opponent?.username || 'Opponent');
                toast({ title: '🤝 Draw Proposed', description: `${opponent?.username} wants to draw.` });
            } else {
                toast({ title: 'Draw proposed', description: 'Waiting for opponent...' });
            }
        });

        socket.on('draw_rejected', () => {
            setDrawProposed(null);
            toast({ title: 'Draw declined', description: 'Opponent rejected the draw.' });
        });

        // Opponent forfeited — we are the winner
        socket.on('opponent_forfeited', (data: any) => {
            if (String(data.forfeiter_id) !== String(user.id)) {
                setOpponentLeft(true);
                clearTimer();
                toast({ title: '🏆 Opponent forfeited!', description: 'You win! Calculating results...' });
            }
        });

        // debate_ended — navigate to result for BOTH players
        socket.on('debate_ended', (result: any) => {
            if (endedRef.current) return;
            endedRef.current = true;
            setEnded(true);
            setEvaluating(false);
            clearTimer();
            setTimeout(() => {
                navigate('/result', { state: { result } });
            }, 500);
        });

        socket.on('error', (err: any) => {
            toast({ title: 'Error', description: err.detail || 'Connection error', variant: 'destructive' });
        });

        // Start timer
        timerRef.current = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearTimer();
                    triggerEndDebate();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => {
            clearTimer();
            socket.emit('leave_debate_room', { debateId });
            socket.disconnect();
        };
    }, [user, token, debateId]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const clearTimer = () => {
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };

    const triggerEndDebate = () => {
        if (endedRef.current) return;
        endedRef.current = true;
        setEnded(true);
        setEvaluating(true);
        socketRef.current?.emit('end_debate', { debate_id: debateId, debateId });
    };

    const sendMessage = () => {
        if (!input.trim() || !socketRef.current || !user || ended) return;
        setSending(true);
        socketRef.current.emit('send_message_to_human', {
            debateId, senderId: user.id,
            content: input.trim(), senderType: 'user',
        });
        setInput('');
        setSending(false);
    };

    const proposeDraw = () => {
        socketRef.current?.emit('propose_draw', { debateId, userId: user?.id });
    };

    const acceptDraw = () => {
        setDrawProposed(null);
        socketRef.current?.emit('accept_draw', { debateId });
    };

    const rejectDraw = () => {
        setDrawProposed(null);
        socketRef.current?.emit('reject_draw', { debateId });
    };

    const forfeit = () => {
        if (!window.confirm('Forfeit? You will lose ELO and the match ends immediately.')) return;
        clearTimer();
        endedRef.current = true;
        setEnded(true);
        socketRef.current?.emit('forfeit_debate', { debateId, userId: user?.id });
        // Don't navigate — wait for debate_ended event which will do it
    };

    const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    const timerPct   = timeLeft / DEBATE_DURATION;
    const timerColor = timerPct > 0.5 ? '#22c55e' : timerPct > 0.25 ? '#f59e0b' : '#ef4444';

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col">
            {/* Top bar */}
            <div className="border-b border-gray-800 bg-gray-900 px-4 py-3 sticky top-0 z-10">
                <div className="max-w-4xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="text-center">
                            <div className="text-sm font-bold text-amber-400">{user?.username}</div>
                            <div className="text-xs text-gray-500">{user?.elo} ELO</div>
                        </div>
                        <div className="text-gray-600 font-bold">VS</div>
                        <div className="text-center">
                            <div className={`text-sm font-bold ${opponentLeft ? 'text-red-400 line-through' : 'text-white'}`}>
                                {opponent?.username}
                            </div>
                            <div className="text-xs text-gray-500">{opponent?.elo} ELO</div>
                        </div>
                    </div>

                    <div className="flex flex-col items-center">
                        <div className="font-mono text-xl font-bold" style={{ color: timerColor }}>
                            {formatTime(timeLeft)}
                        </div>
                        <div className="w-24 h-1 bg-gray-700 rounded-full mt-1 overflow-hidden">
                            <div className="h-full rounded-full transition-all duration-1000"
                                style={{ width: `${timerPct * 100}%`, background: timerColor }} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <Button onClick={proposeDraw} variant="outline" size="sm" disabled={ended || !!drawProposed}
                            className="border-gray-700 text-gray-400 hover:text-white text-xs flex items-center gap-1">
                            <Handshake className="w-3.5 h-3.5" /> Draw
                        </Button>
                        <Button onClick={forfeit} variant="outline" size="sm" disabled={ended}
                            className="border-red-900 text-red-400 hover:bg-red-950 text-xs flex items-center gap-1">
                            <Flag className="w-3.5 h-3.5" /> Forfeit
                        </Button>
                    </div>
                </div>
            </div>

            {/* Topic bar */}
            <div className="bg-gray-900/50 border-b border-gray-800 px-4 py-2">
                <p className="text-center text-sm text-gray-400 max-w-4xl mx-auto">
                    <span className="text-amber-400 font-medium">Topic: </span>{topic}
                </p>
            </div>

            {/* Draw proposal banner */}
            {drawProposed && (
                <div className="bg-amber-900/30 border-b border-amber-700/50 px-4 py-3">
                    <div className="max-w-4xl mx-auto flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Handshake className="w-5 h-5 text-amber-400" />
                            <span className="text-amber-200 text-sm"><strong>{drawProposed}</strong> is proposing a draw</span>
                        </div>
                        <div className="flex gap-2">
                            <Button onClick={acceptDraw} size="sm" className="bg-green-600 hover:bg-green-500 text-white text-xs">Accept</Button>
                            <Button onClick={rejectDraw} size="sm" variant="outline" className="border-gray-600 text-gray-300 text-xs">
                                <X className="w-3 h-3 mr-1" /> Decline
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Evaluating overlay */}
            {evaluating && (
                <div className="bg-blue-900/30 border-b border-blue-700/50 px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        <span className="text-blue-300 text-sm">AI is evaluating your debate... Calculating ELO changes...</span>
                    </div>
                </div>
            )}

            {/* Opponent left banner */}
            {opponentLeft && !evaluating && (
                <div className="bg-green-900/30 border-b border-green-700/50 px-4 py-3 text-center">
                    <span className="text-green-300 text-sm font-medium">🏆 Opponent forfeited — calculating your win...</span>
                </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="max-w-4xl mx-auto space-y-3">
                    {messages.length === 0 && !ended && (
                        <div className="text-center text-gray-600 mt-16">
                            <div className="text-4xl mb-3">⚔️</div>
                            <p className="text-gray-500">The debate begins. Make your opening argument.</p>
                            <p className="text-gray-700 text-xs mt-2">AI will evaluate both sides when time is up.</p>
                        </div>
                    )}
                    {messages.map(msg => {
                        const isMe     = String(msg.sender_id) === String(user?.id);
                        const isSystem = msg.sender_type === 'system';
                        if (isSystem) return (
                            <div key={msg.id} className="text-center">
                                <span className="text-xs text-gray-600 bg-gray-800/50 px-3 py-1 rounded-full">{msg.content}</span>
                            </div>
                        );
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                    isMe ? 'bg-amber-500 text-black rounded-br-sm' : 'bg-gray-800 text-white rounded-bl-sm'
                                }`}>
                                    <div className={`text-xs font-medium mb-1 ${isMe ? 'text-amber-900' : 'text-gray-400'}`}>
                                        {isMe ? 'You' : opponent?.username}
                                    </div>
                                    <p className="text-sm leading-relaxed">{msg.content}</p>
                                    <div className={`text-xs mt-1 ${isMe ? 'text-amber-800' : 'text-gray-600'}`}>
                                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                    <div ref={messagesEndRef} />
                </div>
            </div>

            {/* Input */}
            <div className="border-t border-gray-800 bg-gray-900 px-4 py-3">
                <div className="max-w-4xl mx-auto flex gap-3">
                    <input
                        type="text" value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                        disabled={ended}
                        placeholder={ended ? (evaluating ? 'Evaluating...' : 'Debate ended') : 'Make your argument...'}
                        className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 disabled:opacity-50"
                    />
                    <Button onClick={sendMessage} disabled={!input.trim() || sending || ended}
                        className="bg-amber-500 hover:bg-amber-400 text-black rounded-xl px-4 font-bold">
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Debate;
