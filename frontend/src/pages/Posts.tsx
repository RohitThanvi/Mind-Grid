import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuth, API_BASE } from '@/contexts/AuthContext';
import { ArrowLeft, Send, MessageCircle } from 'lucide-react';

interface Post { id: number; content: string; thread_id: number; user_id: number; }

const Posts = () => {
    const { threadId } = useParams();
    const navigate     = useNavigate();
    const { token, user } = useAuth();
    const [posts, setPosts]     = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput]     = useState('');
    const [posting, setPosting] = useState(false);

    const fetchPosts = () => {
        fetch(`${API_BASE}/forums/threads/${threadId}/posts`)
            .then(r => r.json())
            .then(setPosts)
            .catch(() => toast({ title: 'Failed to load posts', variant: 'destructive' }))
            .finally(() => setLoading(false));
    };

    useEffect(() => { fetchPosts(); }, [threadId]);

    const createPost = async () => {
        if (!input.trim()) return;
        setPosting(true);
        try {
            const res = await fetch(`${API_BASE}/forums/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ content: input.trim(), thread_id: Number(threadId) }),
            });
            if (!res.ok) throw new Error();
            setInput('');
            fetchPosts();
        } catch {
            toast({ title: 'Failed to post', variant: 'destructive' });
        } finally {
            setPosting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col">
            {/* Header */}
            <div className="border-b border-gray-800 bg-gray-900 px-4 py-3 sticky top-0 z-10">
                <div className="max-w-3xl mx-auto flex items-center gap-3">
                    <button onClick={() => navigate(-1)} className="text-gray-500 hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2">
                        <MessageCircle className="w-5 h-5 text-amber-400" />
                        <span className="font-semibold text-white">Discussion</span>
                    </div>
                </div>
            </div>

            {/* Posts */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
                <div className="max-w-3xl mx-auto space-y-4">
                    {loading ? (
                        <div className="text-center py-16 text-gray-500 animate-pulse">Loading posts...</div>
                    ) : posts.length === 0 ? (
                        <div className="text-center py-16">
                            <MessageCircle className="w-10 h-10 text-gray-700 mx-auto mb-3" />
                            <p className="text-gray-500">No replies yet — be the first to respond!</p>
                        </div>
                    ) : (
                        posts.map((post, i) => (
                            <div key={post.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">
                                        {String.fromCharCode(65 + (post.user_id % 26))}
                                    </div>
                                    <span className="text-gray-500 text-xs">User #{post.user_id}</span>
                                    <span className="text-gray-700 text-xs ml-auto">#{i + 1}</span>
                                </div>
                                <p className="text-gray-300 text-sm leading-relaxed">{post.content}</p>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Reply input */}
            <div className="border-t border-gray-800 bg-gray-900 px-4 py-3">
                <div className="max-w-3xl mx-auto flex gap-3">
                    <input
                        type="text" value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); createPost(); } }}
                        placeholder="Write a reply..."
                        className="flex-1 bg-gray-800 border border-gray-700 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-amber-500"
                    />
                    <Button onClick={createPost} disabled={!input.trim() || posting}
                        className="bg-amber-500 hover:bg-amber-400 text-black rounded-xl px-4 font-bold">
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Posts;
