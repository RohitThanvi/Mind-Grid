// AuthContext.tsx — MindGrid Production

import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
    id: string;
    username: string;
    email: string;
    elo: number;
    peak_elo: number;
    mind_tokens: number;
    interests_setup: boolean;
    wins: number;
    losses: number;
    draws: number;
    win_streak: number;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (username: string, password: string) => Promise<void>;
    register: (username: string, email: string, password: string) => Promise<void>;
    logout: () => void;
    refreshUser: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
};

export const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser]       = useState<User | null>(null);
    const [token, setToken]     = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    const fetchMe = async (t: string): Promise<User | null> => {
        const res = await fetch(`${API_BASE}/users/me`, {
            headers: { Authorization: `Bearer ${t}` },
        });
        if (!res.ok) return null;
        return res.json();
    };

    useEffect(() => {
        const init = async () => {
            if (token) {
                const userData = await fetchMe(token);
                if (userData) setUser(userData);
                else logout();
            }
            setIsLoading(false);
        };
        init();
    }, [token]);

    const login = async (username: string, password: string) => {
        const fd = new FormData();
        fd.append('username', username);
        fd.append('password', password);
        const res = await fetch(`${API_BASE}/token`, { method: 'POST', body: fd });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Login failed');
        }
        const { access_token } = await res.json();
        localStorage.setItem('token', access_token);
        setToken(access_token);
        const userData = await fetchMe(access_token);
        if (userData) setUser(userData);
    };

    const register = async (username: string, email: string, password: string) => {
        const res = await fetch(`${API_BASE}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password }),
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.detail || 'Registration failed');
        }
        await login(username, password);
    };

    const refreshUser = async () => {
        if (token) {
            const userData = await fetchMe(token);
            if (userData) setUser(userData);
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, token, login, register, logout, refreshUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
};
