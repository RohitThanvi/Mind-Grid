import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { Analytics } from "@vercel/analytics/react";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Interests from "./pages/Interests";
import Dashboard from "./pages/Dashboard";
import Matchmaking from "./pages/Matchmaking";
import Debate from "./pages/Debate";
import Result from "./pages/Result";
import NotFound from "./pages/NotFound";
import Leaderboard from "./pages/Leaderboard";
import Redeem from "./pages/Redeem";
import Forums from "./pages/Forums";
import Threads from "./pages/Threads";
import Posts from "./pages/Posts";
import Analysis from "./pages/Analysis";
import Profile from "./pages/Profile";
import AiDebate from './pages/AiDebate';

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoading } = useAuth();
    if (isLoading) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="text-amber-400 animate-pulse text-lg font-mono">Loading MindGrid...</div>
        </div>
    );
    if (!user) return <Navigate to="/login" />;
    // Force interests setup after registration
    if (user && !user.interests_setup && window.location.pathname !== '/interests') {
        return <Navigate to="/interests" />;
    }
    return <>{children}</>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
    const { user, isLoading } = useAuth();
    if (isLoading) return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="text-amber-400 animate-pulse">Loading...</div>
        </div>
    );
    return user ? <Navigate to="/dashboard" /> : <>{children}</>;
};

const App = () => (
    <QueryClientProvider client={queryClient}>
        <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
                <AuthProvider>
                    <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" />} />
                        <Route path="/login"    element={<PublicRoute><Login /></PublicRoute>} />
                        <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
                        <Route path="/interests" element={<ProtectedRoute><Interests /></ProtectedRoute>} />
                        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                        <Route path="/matchmaking" element={<ProtectedRoute><Matchmaking /></ProtectedRoute>} />
                        <Route path="/debate" element={<ProtectedRoute><Debate /></ProtectedRoute>} />
                        <Route path="/result" element={<ProtectedRoute><Result /></ProtectedRoute>} />
                        <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
                        <Route path="/redeem" element={<ProtectedRoute><Redeem /></ProtectedRoute>} />
                        <Route path="/forums" element={<ProtectedRoute><Forums /></ProtectedRoute>} />
                        <Route path="/forums/:forumId/threads" element={<ProtectedRoute><Threads /></ProtectedRoute>} />
                        <Route path="/threads/:threadId/posts" element={<ProtectedRoute><Posts /></ProtectedRoute>} />
                        <Route path="/analysis/:debateId" element={<ProtectedRoute><Analysis /></ProtectedRoute>} />
                        <Route path="/profile/:username" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                        <Route path="/ai-debate" element={<ProtectedRoute><AiDebate /></ProtectedRoute>} />
                        <Route path="*" element={<NotFound />} />
                    </Routes>
                </AuthProvider>
            </BrowserRouter>
            <Analytics />
        </TooltipProvider>
    </QueryClientProvider>
);

export default App;
