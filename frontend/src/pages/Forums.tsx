import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useAuth, API_BASE } from '@/contexts/AuthContext';
import { MessageSquare, ArrowLeft, ChevronRight } from 'lucide-react';

interface Forum { id: number; name: string; description: string; }

const Forums = () => {
    const { token } = useAuth();
    const navigate = useNavigate();
    const [forums, setForums] = useState<Forum[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch(`${API_BASE}/forums/`)
            .then(r => r.json())
            .then(setForums)
            .catch(() => toast({ title: 'Failed to load forums', variant: 'destructive' }))
            .finally(() => setLoading(false));
    }, []);

    const icons = ['💬', '📜', '🔬', '🧠', '💹'];

    return (
        <div className="min-h-screen bg-gray-950 p-4 md:p-8">
            <div className="max-w-2xl mx-auto">
                <button onClick={() => navigate('/dashboard')} className="flex items-center gap-2 text-gray-500 hover:text-white text-sm mb-6 transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                </button>
                <div className="flex items-center gap-3 mb-6">
                    <MessageSquare className="w-6 h-6 text-amber-400" />
                    <h1 className="text-2xl font-bold text-white">Forums</h1>
                </div>

                {loading ? (
                    <div className="text-center py-16 text-gray-500 animate-pulse">Loading forums...</div>
                ) : (
                    <div className="space-y-3">
                        {forums.map((forum, i) => (
                            <Link key={forum.id} to={`/forums/${forum.id}/threads`}>
                                <div className="bg-gray-900 border border-gray-800 hover:border-gray-600 rounded-xl p-4 flex items-center gap-4 transition-all group">
                                    <div className="text-2xl">{icons[i] || '💬'}</div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-white group-hover:text-amber-400 transition-colors">{forum.name}</p>
                                        <p className="text-sm text-gray-500">{forum.description}</p>
                                    </div>
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

export default Forums;
