import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, Radio, Users, StopCircle, ArrowLeft, Loader } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import apiService from '../services/apiService';
import '@livekit/components-styles';
import {
    LiveKitRoom,
    VideoConference,
    useParticipants,
    useTracks,
    VideoTrack,
    useDataChannel,
    useLocalParticipant,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

const LIVEKIT_URL = 'wss://laughtube.ca/livekit';

const FloatingEmoji = ({ emoji, id }) => {
    return (
        <div
            key={id}
            className="absolute bottom-24 pointer-events-none text-3xl animate-bounce"
            style={{
                left: `${10 + Math.random() * 60}%`,
                animation: 'floatUp 3s ease-out forwards',
            }}
        >
            {emoji}
        </div>
    );
};

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
        const stored = localStorage.getItem('currentLive');
        if (stored) {
            const live = JSON.parse(stored);
            localStorage.removeItem('currentLive');
            handleJoinLive(live);
        }

        if (isAuthenticated && user?.id) {
            apiService.requestV2('/lives').then(r => {
                const myLive = (r.lives || []).find(l => l.user_id === user.id);
                if (myLive) {
                    setLiveId(myLive.id);
                    setIsStreaming(true);
                    apiService.requestV2('/lives/start', { method: 'POST' })
                        .then(res => setToken(res.token))
                        .catch(() => {});
                }
            });
        }

        loadLives();
    }, [isAuthenticated, user?.id]);

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
            <LiveKitRoom
                serverUrl={LIVEKIT_URL}
                token={token}
                connect={true}
                video={isStreaming}
                audio={isStreaming}
                style={{ height: '100vh', background: '#000' }}
            >
                <TikTokLiveView
                    isStreaming={isStreaming}
                    streamerName={isStreaming ? user?.username : currentLive?.username}
                    onStop={isStreaming ? handleStopLive : handleLeave}
                />
            </LiveKitRoom>
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
                                    {live.user_id === user?.id ? (
                                            <button
                                                onClick={async () => {
                                                    await apiService.requestV2(`/lives/${live.id}/stop`, { method: 'POST' });
                                                    toast.success('Live terminé');
                                                    loadLives();
                                                }}
                                                className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all active:scale-95"
                                            >
                                                <StopCircle size={14} />
                                                Terminer le live
                                            </button>
                                        ) : (
                                        <button
                                            onClick={() => handleJoinLive(live)}
                                            disabled={joining}
                                            className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all active:scale-95 disabled:opacity-50"
                                        >
                                            {joining ? <Loader size={14} className="animate-spin" /> : <Users size={14} />}
                                            Rejoindre
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const TikTokLiveView = ({ isStreaming, streamerName, onStop }) => {
    const [comments, setComments] = useState([]);
    const [emojis, setEmojis] = useState([]);
    const [commentInput, setCommentInput] = useState('');
    const commentsEndRef = useRef(null);
    const { localParticipant } = useLocalParticipant();

    const tracks = useTracks([
        { source: Track.Source.Camera, withPlaceholder: true },
    ]);

    const streamerTrack = tracks.find(t => t.participant?.isHost || tracks[0]);

    const { send } = useDataChannel('chat', (msg) => {
        try {
            const data = JSON.parse(new TextDecoder().decode(msg.payload));
            if (data.type === 'comment') {
                setComments(prev => [...prev.slice(-50), { ...data, id: Date.now() }]);
                commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            } else if (data.type === 'emoji') {
                const id = Date.now() + Math.random();
                setEmojis(prev => [...prev, { emoji: data.emoji, id }]);
                setTimeout(() => setEmojis(prev => prev.filter(e => e.id !== id)), 3000);
            }
        } catch {}
    });

    const sendComment = () => {
        if (!commentInput.trim()) return;
        const data = { type: 'comment', text: commentInput.trim(), username: localParticipant?.name || 'Anonyme' };
        send(new TextEncoder().encode(JSON.stringify(data)), { reliable: true });
        setComments(prev => [...prev.slice(-50), { ...data, id: Date.now() }]);
        setCommentInput('');
    };

    const sendEmoji = (emoji) => {
        const data = { type: 'emoji', emoji };
        send(new TextEncoder().encode(JSON.stringify(data)), { reliable: false });
        const id = Date.now() + Math.random();
        setEmojis(prev => [...prev, { emoji, id }]);
        setTimeout(() => setEmojis(prev => prev.filter(e => e.id !== id)), 3000);
    };

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">
            <style>{`
                @keyframes floatUp {
                    0% { transform: translateY(0) scale(1); opacity: 1; }
                    100% { transform: translateY(-300px) scale(1.5); opacity: 0; }
                }
                .float-emoji { animation: floatUp 3s ease-out forwards; }
            `}</style>

            {streamerTrack && streamerTrack.publication?.track ? (
                <VideoTrack
                    trackRef={streamerTrack}
                    className="absolute inset-0 w-full h-full object-cover"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-white text-center">
                        <Mic size={64} className="mx-auto mb-4 opacity-50" />
                        <p className="text-lg opacity-50">Connexion en cours...</p>
                    </div>
                </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-70 pointer-events-none" />

            <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-4 z-10">
                <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse" />
                    <span className="text-white font-bold text-sm">{streamerName} — EN DIRECT</span>
                </div>
                <button
                    onClick={onStop}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-xl text-sm transition-all"
                >
                    <StopCircle size={14} />
                    {isStreaming ? 'Terminer' : 'Quitter'}
                </button>
            </div>

            <div className="absolute inset-0 pointer-events-none z-20">
                {emojis.map(e => (
                    <div
                        key={e.id}
                        className="absolute bottom-32 text-3xl float-emoji"
                        style={{ left: `${10 + Math.random() * 60}%` }}
                    >
                        {e.emoji}
                    </div>
                ))}
            </div>

            <div className="absolute bottom-32 left-4 right-4 z-10 max-h-48 overflow-hidden flex flex-col gap-1">
                {comments.slice(-8).map(c => (
                    <div key={c.id} className="flex items-start gap-2">
                        <span className="text-yellow-400 font-bold text-xs shrink-0">{c.username}</span>
                        <span className="text-white text-xs">{c.text}</span>
                    </div>
                ))}
                <div ref={commentsEndRef} />
            </div>

            {/* Barre bas — emojis + input */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-4 flex flex-col gap-2">
                {/* Emojis rapides */}
                <div className="flex gap-3 justify-center">
                    {['❤️','😂','🔥','👏','💯'].map(emoji => (
                        <button
                            key={emoji}
                            onClick={() => sendEmoji(emoji)}
                            className="text-2xl hover:scale-125 transition-transform active:scale-95"
                        >
                            {emoji}
                        </button>
                    ))}
                </div>

                {/* Input commentaire */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={commentInput}
                        onChange={e => setCommentInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendComment()}
                        placeholder="Ajouter un commentaire..."
                        className="flex-1 bg-white bg-opacity-20 backdrop-blur-sm text-white placeholder-gray-300 px-4 py-2.5 rounded-full text-sm focus:outline-none focus:bg-opacity-30"
                    />
                    <button
                        onClick={sendComment}
                        className="bg-blue-500 hover:bg-blue-600 text-white font-bold px-4 py-2.5 rounded-full text-sm transition-all"
                    >
                        Envoyer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StandUp;