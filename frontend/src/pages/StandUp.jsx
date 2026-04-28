import React, { useState, useEffect, useCallback } from 'react';
import { Mic, Radio, Users, StopCircle, ArrowLeft, Loader } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import apiService from '../services/apiService';
import '@livekit/components-styles';
import {
    LiveKitRoom,
    VideoConference,
    useParticipants,
} from '@livekit/components-react';

const LIVEKIT_URL = 'wss://laughtube.ca/livekit';

const ParticipantCount = () => {
    const participants = useParticipants();
    return (
        <div className="flex items-center gap-1 bg-black bg-opacity-50 text-white text-xs px-2 py-1 rounded-full">
            <Users size={12} />
            <span>{participants.length}</span>
        </div>
    );
};

const StandUp = () => {
    const { user, isAuthenticated } = useAuth();
    const toast = useToast();

    const [lives, setLives] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentLive, setCurrentLive] = useState(null);
    const [token, setToken] = useState(null);
    const [isStreaming, setIsStreaming] = useState(false);
    const [liveId, setLiveId] = useState(null);
    const [joining, setJoining] = useState(false);

    const loadLives = useCallback(async () => {
        try {
            const r = await apiService.requestV2('/lives');
            setLives(r.lives || []);
        } catch {
            setLives([]);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        // Vérifie si on arrive depuis Home avec un live sélectionné
        const stored = localStorage.getItem('currentLive');
        if (stored) {
            const live = JSON.parse(stored);
            localStorage.removeItem('currentLive');
            handleJoinLive(live);
        }
        loadLives();
    }, []);

    const handleStartLive = async () => {
        if (!isAuthenticated) {
            window.location.hash = '#/login';
            return;
        }
        try {
            setJoining(true);
            const response = await apiService.requestV2('/lives/start', { method: 'POST' });
            setToken(response.token);
            setLiveId(response.live_id);
            setIsStreaming(true);
            toast.success('Live démarré ! Tes abonnés ont été notifiés 🎤');
        } catch (err) {
            toast.error('Erreur lors du démarrage du live');
        } finally {
            setJoining(false);
        }
    };

    const handleStopLive = async () => {
        try {
            await apiService.requestV2(`/lives/${liveId}/stop`, { method: 'POST' });
            setToken(null);
            setIsStreaming(false);
            setLiveId(null);
            toast.success('Live terminé');
            loadLives();
        } catch {
            toast.error('Erreur lors de l\'arrêt du live');
        }
    };

    const handleJoinLive = async (live) => {
        if (!isAuthenticated) {
            window.location.hash = '#/login';
            return;
        }
        try {
            setJoining(true);
            setCurrentLive(live);
            const response = await apiService.requestV2(`/lives/${live.id}/join`, { method: 'POST' });
            setToken(response.token);
        } catch (err) {
            toast.error('Erreur lors de la connexion au live');
            setCurrentLive(null);
        } finally {
            setJoining(false);
        }
    };

    const handleLeave = () => {
        setToken(null);
        setCurrentLive(null);
        loadLives();
    };

    if (token) {
        return (
            <div className="min-h-screen pt-16 bg-gray-950">
                <div className="max-w-5xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <button onClick={isStreaming ? handleStopLive : handleLeave}
                                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all">
                                <ArrowLeft size={20} />
                            </button>
                            <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-white font-bold text-sm">
                                    {isStreaming ? `${user?.username} — En direct` : `${currentLive?.username} — En direct`}
                                </span>
                            </div>
                        </div>
                        {isStreaming ? (
                            <button onClick={handleStopLive}
                                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all">
                                <StopCircle size={16} />
                                Terminer le live
                            </button>
                        ) : (
                            <button onClick={handleLeave}
                                    className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all">
                                Quitter
                            </button>
                        )}
                    </div>

                    <LiveKitRoom
                        serverUrl={LIVEKIT_URL}
                        token={token}
                        connect={true}
                        video={isStreaming}
                        audio={isStreaming}
                        className="rounded-2xl overflow-hidden"
                        style={{ height: '70vh' }}
                    >
                        <VideoConference />
                    </LiveKitRoom>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-50 via-white to-blue-50">
            <div className="max-w-4xl mx-auto px-4 py-8">

                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-500 rounded-xl shadow-lg">
                            <Mic size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Stand-Up Live</h1>
                            <p className="text-sm text-gray-500 mt-0.5">Performances en direct</p>
                        </div>
                    </div>

                    {isAuthenticated && (
                        <button
                            onClick={handleStartLive}
                            disabled={joining}
                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-5 py-3 rounded-xl shadow-lg transition-all active:scale-95 disabled:opacity-50"
                        >
                            {joining ? <Loader size={18} className="animate-spin" /> : <Radio size={18} />}
                            Lancer mon Stand-Up
                        </button>
                    )}
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                        <h2 className="font-bold text-gray-700">Lives en cours</h2>
                        <span className="ml-auto text-sm text-gray-400">{lives.length} live{lives.length !== 1 ? 's' : ''}</span>
                    </div>

                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader size={32} className="animate-spin text-blue-500" />
                        </div>
                    ) : lives.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <Mic size={48} className="mx-auto text-gray-200 mb-4" />
                            <p className="text-gray-500 font-semibold text-lg">Aucun live en ce moment</p>
                            <p className="text-sm text-gray-400 mt-1">
                                {isAuthenticated ? 'Lance ton premier Stand-Up !' : 'Connecte-toi pour lancer un live'}
                            </p>
                            {!isAuthenticated && (
                                <button
                                    onClick={() => window.location.hash = '#/login'}
                                    className="mt-4 bg-blue-500 text-white font-bold px-6 py-2.5 rounded-xl hover:bg-blue-600 transition-all"
                                >
                                    Se connecter
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {lives.map(live => (
                                <div key={live.id} className="px-6 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors">
                                    <div className="relative">
                                        {live.avatar_url ? (
                                            <img
                                                src={live.avatar_url.startsWith('http') ? live.avatar_url : `/uploads/profiles/${live.avatar_url}`}
                                                alt={live.username}
                                                className="w-12 h-12 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-lg">
                                                {live.username?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 rounded-full border-2 border-white animate-pulse" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-gray-900">{live.username}</p>
                                        <div className="flex items-center gap-2 text-xs text-gray-400 mt-0.5">
                                            <span className="text-red-500 font-semibold">● EN DIRECT</span>
                                            <span>·</span>
                                            <span>{new Date(live.started_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleJoinLive(live)}
                                        disabled={joining}
                                        className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {joining ? <Loader size={14} className="animate-spin" /> : <Users size={14} />}
                                        Rejoindre
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StandUp;