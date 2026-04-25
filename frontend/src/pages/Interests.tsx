// Interests.tsx — Select your debate interests (shown after registration)

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, API_BASE } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Brain, CheckCircle2, ArrowRight } from 'lucide-react';

interface Interest {
    id: number;
    slug: string;
    label: string;
    icon: string;
}

const Interests = () => {
    const { token, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [interests, setInterests] = useState<Interest[]>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch(`${API_BASE}/interests/`)
            .then(r => r.json())
            .then(setInterests)
            .catch(() => toast({ title: 'Error', description: 'Could not load interests.', variant: 'destructive' }));
    }, []);

    const toggle = (slug: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(slug)) next.delete(slug);
            else if (next.size < 8) next.add(slug);
            else toast({ title: 'Limit reached', description: 'You can select up to 8 interests.' });
            return next;
        });
    };

    const save = async () => {
        if (selected.size === 0) {
            toast({ title: 'Select at least one interest', variant: 'destructive' });
            return;
        }
        setSaving(true);
        try {
            const res = await fetch(`${API_BASE}/interests/me`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ interest_slugs: Array.from(selected) }),
            });
            if (!res.ok) throw new Error();
            await refreshUser();
            toast({ title: '🎯 Interests saved!', description: 'You\'ll be matched with like-minded debaters.' });
            navigate('/dashboard');
        } catch {
            toast({ title: 'Error saving interests', variant: 'destructive' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
            {/* Header */}
            <div className="text-center mb-10">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <Brain className="w-6 h-6 text-amber-400" />
                    </div>
                    <span className="text-2xl font-bold text-white">MindGrid</span>
                </div>
                <h1 className="text-3xl font-bold text-white mb-3">What do you love debating about?</h1>
                <p className="text-gray-400 max-w-md">
                    Select your interests so we can match you with opponents who share your passion.
                    You can change these anytime from your profile.
                </p>
            </div>

            {/* Interest Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-w-2xl w-full mb-8">
                {interests.map(int => {
                    const isSelected = selected.has(int.slug);
                    return (
                        <button
                            key={int.slug}
                            onClick={() => toggle(int.slug)}
                            className={`
                                relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer
                                ${isSelected
                                    ? 'border-amber-500 bg-amber-500/10 text-white'
                                    : 'border-gray-700 bg-gray-900 text-gray-400 hover:border-gray-500 hover:text-gray-200'
                                }
                            `}
                        >
                            {isSelected && (
                                <CheckCircle2 className="absolute top-2 right-2 w-4 h-4 text-amber-400" />
                            )}
                            <span className="text-3xl">{int.icon}</span>
                            <span className="text-sm font-medium text-center">{int.label}</span>
                        </button>
                    );
                })}
            </div>

            {/* Counter & CTA */}
            <div className="flex flex-col items-center gap-4">
                <p className="text-gray-500 text-sm">
                    {selected.size} / 8 selected
                    {selected.size === 0 && ' — select at least one'}
                </p>
                <Button
                    onClick={save}
                    disabled={saving || selected.size === 0}
                    className="bg-amber-500 hover:bg-amber-400 text-black font-bold px-8 py-3 text-base rounded-xl flex items-center gap-2"
                >
                    {saving ? 'Saving...' : 'Enter the Arena'}
                    <ArrowRight className="w-5 h-5" />
                </Button>
            </div>
        </div>
    );
};

export default Interests;
