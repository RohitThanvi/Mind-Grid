// Profile.tsx — GitHub-style profile with badges and ELO graph

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { API_BASE, useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Brain, Trophy, TrendingUp, Flame, Star, ArrowLeft, Swords } from 'lucide-react';

interface BadgeData {
    id: number; slug: string; name: string; description: string;
    icon: string; tier: string; rarity: string; earned_at: string | null;
}
interface EloPoint { debate_id: number; elo_after: number; change: number; result: string; timestamp: string; }
interface ProfileData {
    id: number; username: string; bio: string | null; elo: number; peak_elo: number;
    rank_label: string; mind_tokens: number; total_debates: number; wins: number;
    losses: number; draws: number; win_rate: number; win_streak: number;
    max_win_streak: number; interests: string[]; badges: BadgeData[];
    elo_graph: EloPoint[]; member_since: string;
}

const tierColors: Record<string, string> = {
    bronze: '#cd7f32', silver: '#c0c0c0', gold: '#ffd700', platinum: '#e5e4e2',
};
const rarityBg: Record<string, string> = {
    common: 'bg-gray-800', uncommon: 'bg-blue-900/40', rare: 'bg-purple-900/40',
    epic: 'bg-amber-900/40', legendary: 'bg-gradient-to-br from-amber-900/40 to-orange-900/40',
};

const MiniEloGraph = ({ points }: { points: EloPoint[] }) => {
    if (!points.length) return <div className="text-gray-600 text-xs text-center py-4">No games yet</div>;
    const elos = points.map(p => p.elo_after);
    const minElo = Math.min(...elos) - 20;
    const maxElo = Math.max(...elos) + 20;
    const w = 300, h = 80;
    const toX = (i: number) => (i / (elos.length - 1 || 1)) * w;
    const toY = (e: number) => h - ((e - minElo) / (maxElo - minElo || 1)) * h;

    const pathD = elos.map((e, i) => `${i === 0 ? 'M' : 'L'} ${toX(i)} ${toY(e)}`).join(' ');
    const lastPoint = points[points.length - 1];
    const firstPoint = points[0];
    const delta = lastPoint.elo_after - firstPoint.elo_after;

    return (
        <div>
            <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                <span>ELO History</span>
                <span className={delta >= 0 ? 'text-green-400' : 'text-red-400'}>
                    {delta >= 0 ? '+' : ''}{delta} overall
                </span>
            </div>
            <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: 80 }}>
                <defs>
                    <linearGradient id="eloGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </linearGradient>
                </defs>
                {/* Fill area */}
                <path
                    d={`${pathD} L ${toX(elos.length - 1)} ${h} L 0 ${h} Z`}
                    fill="url(#eloGrad)"
                />
                {/* Line */}
                <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinejoin="round" />
                {/* Last point dot */}
                <circle cx={toX(elos.length - 1)} cy={toY(elos[elos.length - 1])} r="3" fill="#f59e0b" />
            </svg>
        </div>
    );
};

const Profile = () => {
    const { username } = useParams<{ username: string }>();
    const { user: authUser } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState<ProfileData | null>(null);
    const [loading, setLoading]  = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!username) return;
        fetch(`${API_BASE}/profile/${username}`)
            .then(r => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
            .then(data => { if (data) setProfile(data); })
            .catch(() => setNotFound(true))
            .finally(() => setLoading(false));
    }, [username]);

    if (loading) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="text-amber-400 animate-pulse">Loading profile...</div>
        </div>
    );
    if (notFound || !profile) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center text-center">
            <div>
                <div className="text-5xl mb-4">🤷</div>
                <p className="text-gray-400 mb-4">User not found</p>
                <Button onClick={() => navigate('/dashboard')} className="bg-amber-500 text-black">Back</Button>
            </div>
        </div>
    );

    const isOwnProfile = authUser?.username === profile.username;

    return (
        <div className="min-h-screen bg-gray-950 p-4 md:p-8">
            <div className="max-w-3xl mx-auto space-y-6">

                {/* Back */}
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-500 hover:text-white text-sm transition-colors">
                    <ArrowLeft className="w-4 h-4" /> Back
                </button>

                {/* Profile header */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <div className="flex flex-col sm:flex-row gap-6 items-start">
                        {/* Avatar */}
                        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/30 to-amber-700/20 border-2 border-amber-500/40 flex items-center justify-center flex-shrink-0">
                            <span className="text-3xl font-bold text-amber-400">{profile.username[0].toUpperCase()}</span>
                        </div>

                        {/* Info */}
                        <div className="flex-1">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h1 className="text-2xl font-bold text-white">{profile.username}</h1>
                                    <p className="text-gray-500 text-sm">Member since {profile.member_since}</p>
                                    {profile.bio && <p className="text-gray-400 text-sm mt-2">{profile.bio}</p>}
                                </div>
                                {isOwnProfile && (
                                    <Link to="/interests">
                                        <Button variant="outline" size="sm" className="border-gray-700 text-gray-400 hover:text-white text-xs">
                                            Edit Interests
                                        </Button>
                                    </Link>
                                )}
                            </div>

                            {/* ELO & Rank */}
                            <div className="flex items-center gap-4 mt-4">
                                <div>
                                    <div className="text-3xl font-bold text-amber-400">{profile.elo}</div>
                                    <div className="text-xs text-gray-500">Current ELO</div>
                                </div>
                                <div>
                                    <div className="text-sm font-semibold text-gray-300">{profile.rank_label}</div>
                                    <div className="text-xs text-gray-600">Peak: {profile.peak_elo}</div>
                                </div>
                                <div>
                                    <div className="text-sm font-bold text-amber-400">{profile.mind_tokens} 🪙</div>
                                    <div className="text-xs text-gray-500">Mind Tokens</div>
                                </div>
                            </div>

                            {/* Interests */}
                            {profile.interests.length > 0 && (
                                <div className="flex flex-wrap gap-1.5 mt-3">
                                    {profile.interests.map(i => (
                                        <span key={i} className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full text-xs">{i}</span>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {[
                        { label: 'Debates',  value: profile.total_debates, icon: <Swords className="w-4 h-4" />, color: 'text-gray-300' },
                        { label: 'Wins',     value: profile.wins,  icon: <Trophy className="w-4 h-4" />, color: 'text-green-400' },
                        { label: 'Win Rate', value: `${profile.win_rate}%`, icon: <TrendingUp className="w-4 h-4" />, color: 'text-amber-400' },
                        { label: 'Best Streak', value: profile.max_win_streak, icon: <Flame className="w-4 h-4" />, color: 'text-orange-400' },
                    ].map(s => (
                        <div key={s.label} className="bg-gray-900 border border-gray-800 rounded-xl p-4 text-center">
                            <div className={`flex items-center justify-center gap-1.5 mb-1 ${s.color}`}>
                                {s.icon}
                            </div>
                            <div className={`text-xl font-bold ${s.color}`}>{s.value}</div>
                            <div className="text-xs text-gray-600">{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* W/L/D bar */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                        <span>Wins {profile.wins}</span>
                        <span>Draws {profile.draws}</span>
                        <span>Losses {profile.losses}</span>
                    </div>
                    <div className="h-3 rounded-full overflow-hidden flex">
                        {profile.total_debates > 0 && <>
                            <div className="bg-green-500" style={{ width: `${profile.wins / profile.total_debates * 100}%` }} />
                            <div className="bg-amber-500" style={{ width: `${profile.draws / profile.total_debates * 100}%` }} />
                            <div className="bg-red-500 flex-1" />
                        </>}
                        {profile.total_debates === 0 && <div className="bg-gray-800 flex-1 rounded-full" />}
                    </div>
                </div>

                {/* ELO Graph */}
                {profile.elo_graph.length > 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-amber-400" /> Rating History
                        </h3>
                        <MiniEloGraph points={profile.elo_graph} />
                    </div>
                )}

                {/* Badges — GitHub style */}
                {profile.badges.length > 0 && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                        <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                            <Star className="w-4 h-4 text-amber-400" /> Achievements
                            <span className="text-gray-600 text-sm font-normal">({profile.badges.length})</span>
                        </h3>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {profile.badges.map(badge => (
                                <div
                                    key={badge.id}
                                    className={`${rarityBg[badge.rarity] || 'bg-gray-800'} border rounded-xl p-3 flex items-start gap-3 group relative`}
                                    style={{ borderColor: `${tierColors[badge.tier] || '#6b7280'}40` }}
                                >
                                    <div className="text-2xl flex-shrink-0">{badge.icon || '🏅'}</div>
                                    <div className="min-w-0">
                                        <div className="font-medium text-white text-sm truncate">{badge.name}</div>
                                        <div className="text-gray-500 text-xs mt-0.5 leading-tight">{badge.description}</div>
                                        <div className="text-xs mt-1" style={{ color: tierColors[badge.tier] || '#6b7280' }}>
                                            {badge.tier} · {badge.rarity}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Profile;
