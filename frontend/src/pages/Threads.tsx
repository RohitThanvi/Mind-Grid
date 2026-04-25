import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuth, API_BASE } from '@/contexts/AuthContext';
import { ArrowLeft, Plus, MessageSquare, ChevronRight } from 'lucide-react';

interface Thread { id: number; title: string; forum_id: number; user_id: number; }

const Threads = () => {
    const { forumId } = useParams();
    const navigate    = useNavigate();
    const { token }   = useAuth();
    const [threads, setThreads]         = useState<Thread[]>([]);
    const [loading, setLoading]         = useState(true);
    const [showCreate, setShowCreate]   = useState(false);
    const [newTitle, setNewTitle]       = useState('');
    const [creating, setCreating]       = useState(false);

    const fetchThreads = () => {
        fetch(`${API_BASE}/forums/${forumId}/threads`)
            .then(r => r.json())
            .then(setThreads)
            .catch(() => toast({ title: 'Failed to load threads', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchThreads(); }, [forumId]);

    const createThread = async () => {
        if (!newTitle.trim()) return;
        setCreating(true);
        try {
            const res = await fetch(`${API_BASE}/forums/threads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ title: newTitle.trim(), forum_id: Number(forumId) }),
            });
            if (!res.ok) throw new Error();
            setNewTitle(''); setShowCreate(false);
            fetchThreads();
            toast({ title: '✅ Thread created!' });
        } catch {
            toast({ title: 'Failed to create thread', variant: 'destructive' });
        } finally {
            setCreating(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <button onClick={() => navigate('/forums')} className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Forums
                </button>

                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                        <MessageSquare className="w-6 h-6 text-amber-400" /> Threads
                    </h1>
                    <Button onClick={() => setShowCreate(!showCreate)} size="sm"
                        className="bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg flex items-center gap-1">
                        <Plus className="w-4 h-4" /> New Thread
                    </Button>
                </div>

                {showCreate && (
                    <div className="bg-gray-900 border border-amber-700/30 rounded-xl p-4 mb-4">
                        <input
                            type="text" value={newTitle}
                            onChange={e => setNewTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && createThread()}
                            placeholder="Thread title..."
                            className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-amber-500 mb-3"
                            autoFocus
                        />
                        <div className="flex gap-2">
                            <Button onClick={createThread} disabled={!newTitle.trim() || creating} size="sm"
                                className="bg-amber-500 hover:bg-amber-400 text-black font-bold">
                                {creating ? 'Creating...' : 'Create'}
                            </Button>
                            <Button onClick={() => setShowCreate(false)} variant="outline" size="sm"
                                className="border-gray-700 text-gray-400">Cancel</Button>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="text-center py-16 text-gray-500 animate-pulse">Loading threads...</div>
                ) : threads.length === 0 ? (
                    <div className="text-center py-16">
                        <MessageSquare className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                        <p className="text-gray-500">No threads yet — start the discussion!</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {threads.map(t => (
                            <Link key={t.id} to={`/threads/${t.id}/posts`}>
                                <div className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-4 flex items-center gap-3 group transition-all">
                                    <MessageSquare className="w-4 h-4 text-gray-600 flex-shrink-0" />
                                    <span className="flex-1 text-gray-300 group-hover:text-white transition-colors">{t.title}</span>
                                    <ChevronRight className="w-4 h-4 text-gray-600 group-hover:text-gray-400" />
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Threads;
