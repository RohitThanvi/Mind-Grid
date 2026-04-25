import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_BASE } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Send, Bot, ArrowLeft, Loader2 } from 'lucide-react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface Message { id: number; content: string; sender_type: string; timestamp: string; }

const AiDebate = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const socketRef = useRef<Socket | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const [debate, setDebate]     = useState<any>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput]       = useState('');
    const [loading, setLoading]   = useState(false);
    const [starting, setStarting] = useState(false);
    const [ended, setEnded]       = useState(false);

    useEffect(() => {
        if (!user || !token) return;
        const socket = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
        socketRef.current = socket;
        socket.on('new_message', (msg: Message) => {
            setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg]);
            setLoading(false);
        });
        return () => { socket.disconnect(); };
    }, [user, token]);

    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const startDebate = async () => {
        if (!token) return;
        setStarting(true);
        try {
            const res = await fetch(`${API_BASE}/ai-debate/start`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setDebate(data);
            socketRef.current?.emit('join_debate_room', { debateId: data.id, userId: user?.id });
            toast({ title: 'AI Debate Started', description: `Topic: ${data.topic}` });
        } catch {
            toast({ title: 'Failed to start AI debate', variant: 'destructive' });
        } finally {
            setStarting(false);
        }
    };

    const sendMessage = async () => {
        if (!input.trim() || !debate || loading || ended) return;
        const content = input.trim();
        setInput('');
        setLoading(true);
        try {
            await fetch(`${API_BASE}/ai-debate/${debate.id}/${encodeURIComponent(debate.topic)}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ content, sender_type: 'user' }),
            });
        } catch {
            setLoading(false);
            toast({ title: 'Error sending message', variant: 'destructive' });
        }
    };

    const endDebate = () => {
        setEnded(true);
        toast({ title: 'Debate ended', description: 'Thanks for debating with AI!' });
        setTimeout(() => navigate('/dashboard'), 1500);
    };

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col">
            {/* Header */}
            <div className="border-b border-gray-800 bg-gray-900 px-4 py-3 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate('/dashboard')} className="text-gray-500 hover:text-white">
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-purple-900/40 border border-purple-700/50 flex items-center justify-center">
                                <Bot className="w-4 h-4 text-purple-400" />
                            </div>
                            <div>
                                <div className="text-sm font-bold text-white">AI Opponent</div>
                                <div className="text-xs text-purple-400">Powered by Groq</div>
                            </div>
                        </div>
                    </div>
                    {debate && !ended && (
                        <Button onClick={endDebate} variant="outline" size="sm"
                            className="border-gray-700 text-gray-400 hover:text-white text-xs">
                            End Debate
                        </Button>
                    )}
                </div>
            </div>

            {/* Topic */}
            {debate && (
                <div className="bg-gray-900/50 border-b border-gray-800 px-4 py-2">
                    <p className="text-center text-sm text-gray-400 max-w-3xl mx-auto">
                        <span className="text-amber-400 font-medium">Topic: </span>{debate.topic}
                    </p>
                </div>
            )}

            {/* Main content */}
            <div className="flex-1 overflow-y-auto px-4 py-4">
                <div className="max-w-3xl mx-auto">
                    {!debate ? (
                        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
                            <div className="w-20 h-20 rounded-full bg-purple-900/30 border-2 border-purple-700/50 flex items-center justify-center mb-6">
                                <Bot className="w-10 h-10 text-purple-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-2">Debate the AI</h2>
                            <p className="text-gray-400 mb-2 max-w-sm">
                                Challenge our AI opponent on a random topic. Sharpen your arguments before facing real players.
                            </p>
                            <p className="text-gray-600 text-sm mb-8">A random topic will be assigned — no ELO changes in AI mode.</p>
                            <Button onClick={startDebate} disabled={starting}
                                className="bg-purple-600 hover:bg-purple-500 text-white font-bold px-8 py-3 rounded-xl flex items-center gap-2 text-base">
                                {starting ? <><Loader2 className="w-5 h-5 animate-spin" /> Starting...</> : <><Bot className="w-5 h-5" /> Start AI Debate</>}
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {messages.map(msg => {
                                const isMe = msg.sender_type === 'user';
                                return (
                                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        {!isMe && (
                                            <div className="w-7 h-7 rounded-full bg-purple-900/40 border border-purple-700/50 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                                                <Bot className="w-3.5 h-3.5 text-purple-400" />
                                            </div>
                                        )}
                                        <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                                            isMe ? 'bg-amber-500 text-black rounded-br-sm' : 'bg-gray-800 text-white rounded-bl-sm'
                                        }`}>
                                            <div className={`text-xs font-medium mb-1 ${isMe ? 'text-amber-900' : 'text-purple-400'}`}>
                                                {isMe ? 'You' : 'AI'}
                                            </div>
                                            <p className="text-sm leading-relaxed">{msg.content}</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {loading && (
                                <div className="flex justify-start">
                                    <div className="w-7 h-7 rounded-full bg-purple-900/40 border border-purple-700/50 flex items-center justify-center mr-2 flex-shrink-0">
                                        <Bot className="w-3.5 h-3.5 text-purple-400" />
                                    </div>
                                    <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
                                        <div className="flex gap-1 items-center">
                                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                            <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>
            </div>

            {/* Input */}
            {debate && !ended && (
                <div className="border-t border-gray-800 bg-gray-900 px-4 py-3">
                    <div className="max-w-3xl mx-auto flex gap-3">
                        <input type="text" value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                            disabled={loading || ended}
                            placeholder="Make your argument..."
                            className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 disabled:opacity-50"
                        />
                        <Button onClick={sendMessage} disabled={!input.trim() || loading || ended}
                            className="bg-purple-600 hover:bg-purple-500 text-white rounded-xl px-4 font-bold">
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AiDebate;
