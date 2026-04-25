import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth, API_BASE } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Brain, Swords, Trophy, TrendingUp, Flame, LogOut, Bot, Users, MessageSquare } from 'lucide-react';

const rankLabel = (elo: number) => {
    if (elo < 600)  return 'Beginner';
    if (elo < 1000) return 'Intermediate';
    if (elo < 1400) return 'Expert';
    if (elo < 1800) return 'Master';
    return 'Grandmaster';
};

const Dashboard = () => {
    const { user, logout, token, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [debates, setDebates]   = useState<any[]>([]);
    const [leaderboard, setLb]    = useState<any[]>([]);
    const [stats, setStats]       = useState<any>(null);
    const [loading, setLoading]   = useState(true);

    useEffect(() => {
        if (!user || !token) { setLoading(false); return; }
        refreshUser();
        const h = { Authorization: `Bearer ${token}` };
        Promise.all([
            fetch(`${API_BASE}/dashboard/stats`, { headers: h }).then(r => r.ok ? r.json() : null),
            fetch(`${API_BASE}/dashboard/history`, { headers: h }).then(r => r.ok ? r.json() : []),
            fetch(`${API_BASE}/leaderboard/`).then(r => r.ok ? r.json() : []),
        ]).then(([s, hist, lb]) => {
            if (s) setStats(s);
            setDebates(hist || []);
            setLb((lb || []).map((u: any, i: number) => ({ ...u, rank: i + 1 })));
        }).catch(() => toast({ title: 'Error loading dashboard', variant: 'destructive' }))
          .finally(() => setLoading(false));
    }, [user, token]);

    const handleLogout = () => { logout(); navigate('/login'); };

    const winPct = stats?.debates_competed > 0
        ? Math.round((stats.debates_won / stats.debates_competed) * 100) : 0;

    if (loading) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="text-amber-400 animate-pulse">Loading...</div>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-950">
            {/* Navbar */}
            <nav className="border-b border-gray-800 bg-gray-900 px-6 py-3.5 sticky top-0 z-10">
                <div className="max-w-6xl mx-auto flex items-center justify-between">
                    <Link to="/dashboard" className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                            <Brain className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="font-bold text-white text-lg">MindGrid</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link to="/leaderboard" className="text-gray-400 hover:text-white text-sm transition-colors hidden sm:block">Leaderboard</Link>
                        <Link to="/forums" className="text-gray-400 hover:text-white text-sm transition-colors hidden sm:block">Forums</Link>
                        <Link to={`/profile/${user?.username}`} className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-1.5 transition-colors">
                            <div className="w-6 h-6 rounded-full bg-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-400">
                                {user?.username?.[0]?.toUpperCase()}
                            </div>
                            <span className="text-white text-sm font-medium hidden sm:block">{user?.username}</span>
                            <span className="text-amber-400 text-xs font-mono">{user?.elo}</span>
                        </Link>
                        <button onClick={handleLogout} className="text-gray-600 hover:text-gray-400 transition-colors">
                            <LogOut className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </nav>

            <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">

                {/* Welcome banner */}
                <div className="bg-gradient-to-r from-amber-900/20 via-gray-900 to-gray-900 border border-amber-700/20 rounded-2xl p-6">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-white mb-1">
                                Welcome back, <span className="text-amber-400">{user?.username}</span>
                            </h1>
                            <div className="flex items-center gap-3 flex-wrap">
                                <span className="text-gray-400 text-sm">{rankLabel(user?.elo || 1200)}</span>
                                <span className="text-amber-400 font-bold">{user?.elo} ELO</span>
                                <span className="text-gray-600 text-xs">·</span>
                                <span className="text-gray-400 text-sm">{user?.mind_tokens} 🪙</span>
                                {(user?.win_streak || 0) > 0 && (
                                    <span className="text-orange-400 text-sm flex items-center gap-1">
                                        <Flame className="w-3.5 h-3.5" />{user?.win_streak} streak
                                    </span>
                                )}
                            </div>
                        </div>
                        {/* Two play buttons */}
                        <div className="flex gap-3">
                            <Button
                                onClick={() => navigate('/matchmaking')}
                                className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-5 py-2.5 rounded-xl flex items-center gap-2"
                            >
                                <Users className="w-4 h-4" />
                                vs Human
                            </Button>
                            <Button
                                onClick={() => navigate('/ai-debate')}
                                variant="outline"
                                className="border-purple-700 text-purple-400 hover:bg-purple-900/20 font-bold px-5 py-2.5 rounded-xl flex items-center gap-2"
                            >
                                <Bot className="w-4 h-4" />
                                vs AI
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                        { label: 'Debates',  value: stats?.debates_competed ?? 0, icon: <Swords className="w-4 h-4" />,     color: 'text-gray-300' },
                        { label: 'Wins',     value: stats?.debates_won ?? 0,      icon: <Trophy className="w-4 h-4" />,     color: 'text-green-400' },
                        { label: 'Win Rate', value: `${winPct}%`,                 icon: <TrendingUp className="w-4 h-4" />, color: 'text-amber-400' },
                        { label: 'Losses',   value: stats?.debates_lost ?? 0,     icon: <Flame className="w-4 h-4" />,      color: 'text-red-400' },
                    ].map(s => (
                        <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                            <div className={`mb-2 ${s.color}`}>{s.icon}</div>
                            <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
                            <div className="text-gray-600 text-sm">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* W/L/D bar */}
                {stats && stats.debates_competed > 0 && (() => {
                    const draws = stats.debates_competed - stats.debates_won - stats.debates_lost;
                    return (
                        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
                            <div className="flex justify-between text-xs text-gray-500 mb-2">
                                <span className="text-green-400">W {stats.debates_won}</span>
                                <span className="text-amber-400">D {draws}</span>
                                <span className="text-red-400">L {stats.debates_lost}</span>
                            </div>
                            <div className="h-3 rounded-full overflow-hidden flex">
                                <div className="bg-green-500 transition-all" style={{ width: `${stats.debates_won / stats.debates_competed * 100}%` }} />
                                <div className="bg-amber-500 transition-all" style={{ width: `${draws / stats.debates_competed * 100}%` }} />
                                <div className="bg-red-500 flex-1" />
                            </div>
                        </div>
                    );
                })()}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Recent debates */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                        <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
                            <Swords className="w-4 h-4 text-amber-400" /> Recent Debates
                        </h2>
                        {debates.length === 0 ? (
                            <div className="text-center py-8">
                                <Swords className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                                <p className="text-gray-600 text-sm">No debates yet — find a match!</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {debates.slice(0, 6).map((d: any) => {
                                    const isWin  = d.winner === user?.username;
                                    const isDraw = d.winner === 'Draw';
                                    return (
                                        <div key={d.id} className="flex items-center gap-3 py-2 border-b border-gray-800 last:border-0">
                                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                                                isDraw ? 'bg-amber-900/40 text-amber-400' :
                                                isWin  ? 'bg-green-900/40 text-green-400' :
                                                         'bg-red-900/40 text-red-400'
                                            }`}>
                                                {isDraw ? 'D' : isWin ? 'W' : 'L'}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-gray-300 text-sm truncate">{d.topic}</p>
                                                <p className="text-gray-600 text-xs">vs {d.opponent_username}</p>
                                            </div>
                                            <div className="text-gray-700 text-xs flex-shrink-0">
                                                {new Date(d.date).toLocaleDateString()}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Leaderboard */}
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="font-semibold text-white flex items-center gap-2">
                                <Trophy className="w-4 h-4 text-amber-400" /> Top Players
                            </h2>
                            <Link to="/leaderboard" className="text-amber-400 hover:text-amber-300 text-xs">View all</Link>
                        </div>
                        <div className="space-y-1">
                            {leaderboard.slice(0, 8).map((p: any) => {
                                const isMe = p.username === user?.username;
                                return (
                                    <div key={p.username} className={`flex items-center gap-3 py-2 rounded-lg px-2 ${isMe ? 'bg-amber-900/20 border border-amber-700/30' : ''}`}>
                                        <span className="text-gray-600 text-sm w-5 text-center font-mono">{p.rank}</span>
                                        <Link to={`/profile/${p.username}`}
                                            className="flex-1 text-sm font-medium hover:text-amber-400 transition-colors"
                                            style={{ color: isMe ? '#f59e0b' : '#d1d5db' }}>
                                            {p.username}{isMe ? ' (you)' : ''}
                                        </Link>
                                        <span className="text-amber-400 text-sm font-bold">{p.elo}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Quick links */}
                <div className="grid grid-cols-3 gap-3">
                    {[
                        { label: 'Forums', icon: <MessageSquare className="w-5 h-5" />, to: '/forums', color: 'text-blue-400' },
                        { label: 'Leaderboard', icon: <Trophy className="w-5 h-5" />, to: '/leaderboard', color: 'text-amber-400' },
                        { label: 'My Profile', icon: <Brain className="w-5 h-5" />, to: `/profile/${user?.username}`, color: 'text-green-400' },
                    ].map(l => (
                        <Link key={l.label} to={l.to}
                            className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col items-center gap-2 hover:border-gray-600 transition-colors text-center">
                            <div className={l.color}>{l.icon}</div>
                            <span className="text-gray-400 text-sm">{l.label}</span>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
