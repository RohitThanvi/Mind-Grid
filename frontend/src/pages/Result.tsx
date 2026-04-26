import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Trophy, TrendingUp, TrendingDown, Minus, BarChart2, RotateCcw, Brain } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ScoreBar = ({ label, value }: { label: string; value: number }) => (
    <div>
        <div className="flex justify-between text-sm mb-1">
            <span className="text-gray-400 capitalize">{label}</span>
            <span className="text-white font-medium">{value}/100</span>
        </div>
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700"
                style={{
                    width: `${value}%`,
                    background: value >= 70 ? '#22c55e' : value >= 50 ? '#f59e0b' : '#ef4444'
                }} />
        </div>
    </div>
);

const Result = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, refreshUser } = useAuth();
    const result = location.state?.result;

    useEffect(() => { refreshUser(); }, []);

    // Debug: log what we received
    useEffect(() => {
        console.log('[Result] full result payload:', JSON.stringify(result, null, 2));
    }, [result]);

    if (!result) {
        return (
            <div className="min-h-screen bg-gray-950 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-400 mb-4">No result data. The debate may have ended unexpectedly.</p>
                    <Button onClick={() => navigate('/dashboard')} className="bg-amber-500 text-black">Dashboard</Button>
                </div>
            </div>
        );
    }

    const { winner, p1, p2, evaluation } = result;

    // Determine which player slot is "me" — match by id first, then username
    const iAmP1 = String(p1?.id) === String(user?.id) || p1?.username === user?.username;
    const myData  = iAmP1 ? p1 : p2;
    const oppData = iAmP1 ? p2 : p1;

    const isWin    = winner === user?.username;
    const isDraw   = winner === 'Draw';
    const isForfeit = result.result?.includes('forfeit');

    const outcomeConfig = {
        win:  { label: 'Victory!', color: '#22c55e', icon: '🏆', bg: 'from-green-900/20' },
        draw: { label: 'Draw',     color: '#f59e0b', icon: '🤝', bg: 'from-amber-900/20' },
        loss: { label: 'Defeated', color: '#ef4444', icon: '⚔️', bg: 'from-red-900/20' },
    };
    const outcome = isDraw ? outcomeConfig.draw : isWin ? outcomeConfig.win : outcomeConfig.loss;

    // Get my feedback — "player1" if I am p1, else "player2"
    const myKey  = iAmP1 ? 'player1' : 'player2';
    const oppKey = iAmP1 ? 'player2' : 'player1';
    const myFeedback  = evaluation?.feedback?.[myKey];
    const oppFeedback = evaluation?.feedback?.[oppKey];
    const hasEvaluation = !!evaluation && (!!myFeedback || !!evaluation.overall);

    return (
        <div className={`min-h-screen bg-gray-950 bg-gradient-to-b ${outcome.bg} to-gray-950 p-4 md:p-6`}>
            <div className="max-w-2xl mx-auto space-y-5">

                {/* Outcome */}
                <div className="text-center pt-8 pb-4">
                    <div className="text-6xl mb-4">{outcome.icon}</div>
                    <h1 className="text-4xl font-bold mb-2" style={{ color: outcome.color }}>{outcome.label}</h1>
                    {isForfeit && <p className="text-gray-500 text-sm">by forfeit</p>}
                    {evaluation?.overall && (
                        <p className="text-gray-400 mt-3 text-sm max-w-md mx-auto leading-relaxed">{evaluation.overall}</p>
                    )}
                </div>

                {/* ELO Changes */}
                <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5">
                    <h3 className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-4">ELO Changes</h3>
                    <div className="grid grid-cols-2 gap-3">
                        {[
                            { data: myData,  label: 'You',              highlight: true },
                            { data: oppData, label: oppData?.username,  highlight: false },
                        ].map(({ data, label, highlight }) => {
                            const change = data?.elo_change ?? 0;
                            return (
                                <div key={label} className={`rounded-xl p-4 ${highlight ? 'bg-gray-800' : 'bg-gray-800/40'}`}>
                                    <div className="text-sm font-semibold text-gray-300 mb-2 truncate">{label}</div>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-white">{data?.elo_after ?? '—'}</span>
                                        <span className={`text-sm font-bold flex items-center gap-0.5 ${
                                            change > 0 ? 'text-green-400' : change < 0 ? 'text-red-400' : 'text-gray-500'
                                        }`}>
                                            {change > 0 ? <TrendingUp className="w-3.5 h-3.5" /> : change < 0 ? <TrendingDown className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
                                            {change > 0 ? '+' : ''}{change}
                                        </span>
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">{data?.elo_before} → {data?.elo_after}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* AI Analysis */}
                {hasEvaluation ? (
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 space-y-5">
                        <div className="flex items-center gap-2">
                            <BarChart2 className="w-5 h-5 text-amber-400" />
                            <h3 className="text-white font-semibold">AI Judge Analysis</h3>
                        </div>

                        {/* Overall scores */}
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: 'Your Score',      value: iAmP1 ? result.player1_score : result.player2_score, color: 'text-amber-400' },
                                { label: "Opponent's Score", value: iAmP1 ? result.player2_score : result.player1_score, color: 'text-gray-300' },
                            ].map(s => (
                                <div key={s.label} className="bg-gray-800/50 rounded-xl p-3 text-center">
                                    <div className={`text-3xl font-bold ${s.color}`}>{s.value ?? '—'}</div>
                                    <div className="text-xs text-gray-500 mt-1">{s.label}</div>
                                </div>
                            ))}
                        </div>

                        {/* My detailed scores */}
                        {myFeedback && (
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Your Breakdown</p>
                                <div className="space-y-3">
                                    {(['logic', 'persuasion', 'evidence', 'style'] as const).map(k => (
                                        <ScoreBar key={k} label={k} value={myFeedback[k] ?? 50} />
                                    ))}
                                </div>
                                {myFeedback.summary && (
                                    <div className="mt-4 bg-gray-800/50 rounded-xl p-4">
                                        <p className="text-gray-300 text-sm leading-relaxed">{myFeedback.summary}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Opponent breakdown */}
                        {oppFeedback && (
                            <div className="border-t border-gray-800 pt-4">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Opponent's Breakdown</p>
                                <div className="space-y-3">
                                    {(['logic', 'persuasion', 'evidence', 'style'] as const).map(k => (
                                        <ScoreBar key={k} label={k} value={oppFeedback[k] ?? 50} />
                                    ))}
                                </div>
                                {oppFeedback.summary && (
                                    <div className="mt-4 bg-gray-800/50 rounded-xl p-4">
                                        <p className="text-gray-400 text-sm leading-relaxed">{oppFeedback.summary}</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Key moments */}
                        {evaluation?.key_moments?.length > 0 && (
                            <div className="border-t border-gray-800 pt-4">
                                <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Key Moments</p>
                                <ul className="space-y-2">
                                    {evaluation.key_moments.map((m: string, i: number) => (
                                        <li key={i} className="text-gray-400 text-sm flex gap-2">
                                            <span className="text-amber-500 flex-shrink-0">•</span>{m}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Show this if we got a result but evaluation is missing */
                    <div className="bg-gray-900 border border-gray-800 rounded-2xl p-5 text-center">
                        <Brain className="w-8 h-8 text-gray-700 mx-auto mb-2" />
                        <p className="text-gray-500 text-sm">AI analysis not available for this debate.</p>
                        <p className="text-gray-700 text-xs mt-1">This can happen if the debate ended by forfeit or had no messages.</p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pb-8">
                    <Button onClick={() => navigate('/matchmaking')}
                        className="flex-1 bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                        <RotateCcw className="w-4 h-4" /> Play Again
                    </Button>
                    <Button onClick={() => navigate('/dashboard')} variant="outline"
                        className="flex-1 border-gray-700 text-gray-300 hover:text-white py-3 rounded-xl">
                        Dashboard
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default Result;
