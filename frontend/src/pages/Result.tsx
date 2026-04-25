// Result.tsx — Post-debate result with ELO change display

import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, TrendingDown, Minus, BarChart2, RotateCcw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const Result = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const result = location.state?.result;

    React.useEffect(() => {
        refreshUser();
    }, []);

    if (!result) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-400 mb-4">No result data found.</p>
                    <Button onClick={() => navigate('/dashboard')} className="bg-amber-500 text-black">Back to Dashboard</Button>
                </div>
            </div>
        );
    }

    const { winner, p1, p2, evaluation } = result;
    const myData   = String(p1?.username) === user?.username ? p1 : p2;
    const oppData  = String(p1?.username) === user?.username ? p2 : p1;
    const isWin    = winner === user?.username;
    const isDraw   = winner === 'Draw';
    const isForfeit = result.result?.includes('forfeit');

    const outcomeConfig = {
        win:    { label: 'Victory!',   color: '#22c55e', icon: '🏆', bg: 'from-green-900/30' },
        draw:   { label: 'Draw',       color: '#f59e0b', icon: '🤝', bg: 'from-amber-900/30' },
        loss:   { label: 'Defeated',   color: '#ef4444', icon: '⚔️', bg: 'from-red-900/30' },
    };
    const outcome = isDraw ? outcomeConfig.draw : isWin ? outcomeConfig.win : outcomeConfig.loss;

    const myFeedbackKey = String(p1?.username) === user?.username ? 'player1' : 'player2';
    const myFeedback = evaluation?.feedback?.[myFeedbackKey];
    const oppFeedbackKey = myFeedbackKey === 'player1' ? 'player2' : 'player1';
    const oppFeedback = evaluation?.feedback?.[oppFeedbackKey];

    return (
        <div className={`min-h-screen bg-gray-950 bg-gradient-to-b ${outcome.bg} to-gray-950 p-6 flex flex-col items-center`}>
            <div className="max-w-2xl w-full space-y-6">

                {/* Outcome header */}
                <div className="text-center py-8">
                    <div className="text-6xl mb-4">{outcome.icon}</div>
                    <h1 className="text-4xl font-bold mb-2" style={{ color: outcome.color }}>{outcome.label}</h1>
                    {isForfeit && <p className="text-gray-400 text-sm">by forfeit</p>}
                    <p className="text-gray-400 mt-2 text-sm max-w-sm mx-auto">{evaluation?.overall || ''}</p>
                </div>

                {/* ELO change card */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                    <h3 className="text-gray-400 text-sm font-medium mb-4 uppercase tracking-wider">ELO Changes</h3>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { data: myData, label: 'You', isSelf: true },
                            { data: oppData, label: oppData?.username, isSelf: false },
                        ].map(({ data, label, isSelf }) => (
                            <div key={label} className={`rounded-xl p-4 ${isSelf ? 'bg-gray-800' : 'bg-gray-800/50'}`}>
                                <div className="text-sm font-medium text-gray-300 mb-2">{label}</div>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-2xl font-bold text-white">{data?.elo_after}</span>
                                    <span className={`text-sm font-bold flex items-center gap-0.5 ${
                                        (data?.elo_change || 0) > 0 ? 'text-green-400' : (data?.elo_change || 0) < 0 ? 'text-red-400' : 'text-gray-400'
                                    }`}>
                                        {(data?.elo_change || 0) > 0
                                            ? <TrendingUp className="w-3.5 h-3.5" />
                                            : (data?.elo_change || 0) < 0
                                            ? <TrendingDown className="w-3.5 h-3.5" />
                                            : <Minus className="w-3.5 h-3.5" />}
                                        {(data?.elo_change || 0) > 0 ? '+' : ''}{data?.elo_change || 0}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-600">{data?.elo_before} → {data?.elo_after}</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* AI Evaluation */}
                {myFeedback && (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6">
                        <div className="flex items-center gap-2 mb-4">
                            <BarChart2 className="w-5 h-5 text-amber-400" />
                            <h3 className="text-white font-semibold">AI Evaluation — Your Performance</h3>
                        </div>

                        {/* Score bars */}
                        <div className="space-y-3 mb-4">
                            {(['logic', 'persuasion', 'evidence', 'style'] as const).map(key => (
                                <div key={key}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-gray-400 capitalize">{key}</span>
                                        <span className="text-white font-medium">{myFeedback[key]}/100</span>
                                    </div>
                                    <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{
                                                width: `${myFeedback[key] || 0}%`,
                                                background: myFeedback[key] >= 70 ? '#22c55e' : myFeedback[key] >= 50 ? '#f59e0b' : '#ef4444'
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {myFeedback.summary && (
                            <div className="bg-gray-800/50 rounded-xl p-4 mb-4">
                                <p className="text-gray-300 text-sm leading-relaxed">{myFeedback.summary}</p>
                            </div>
                        )}

                        {/* Opponent feedback */}
                        {oppFeedback?.summary && (
                            <div className="border-t border-gray-800 pt-4">
                                <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Opponent's performance</p>
                                <p className="text-gray-400 text-sm">{oppFeedback.summary}</p>
                            </div>
                        )}

                        {evaluation?.key_moments?.length > 0 && (
                            <div className="border-t border-gray-800 pt-4 mt-4">
                                <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Key Moments</p>
                                <ul className="space-y-1">
                                    {evaluation.key_moments.map((m: string, i: number) => (
                                        <li key={i} className="text-gray-400 text-sm flex gap-2">
                                            <span className="text-amber-500">•</span> {m}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        onClick={() => navigate('/matchmaking')}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Play Again
                    </Button>
                    <Button
                        onClick={() => navigate('/dashboard')}
                        variant="outline"
                        className="flex-1 border-gray-700 text-gray-300 hover:text-white py-3 rounded-xl"
                    >
                        Dashboard
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Result;
