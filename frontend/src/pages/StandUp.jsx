import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Mic, Radio, Users, StopCircle, Loader } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import apiService from '../services/apiService';
import '@livekit/components-styles';
import {
    LiveKitRoom,
    useParticipants,
    useTracks,
    VideoTrack,
    useDataChannel,
    useLocalParticipant,
    RoomAudioRenderer,
} from '@livekit/components-react';
import { Track } from 'livekit-client';

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

const TikTokLiveView = ({ isStreaming, streamerName, streamerAvatar, onStop }) => {
    const [comments, setComments] = useState([]);
    const [emojis, setEmojis] = useState([]);
    const [commentInput, setCommentInput] = useState('');
    const commentsEndRef = useRef(null);
    const { localParticipant } = useLocalParticipant();
    const participants = useParticipants();

    const tracks = useTracks([
        { source: Track.Source.Camera, withPlaceholder: false },
    ]);

    const streamerTrack = tracks[0] || null;

    const setCommentsRef = useRef(setComments);
    const setEmojisRef = useRef(setEmojis);
    setCommentsRef.current = setComments;
    setEmojisRef.current = setEmojis;

    const { send } = useDataChannel('chat', (msg) => {
        try {
            const data = JSON.parse(new TextDecoder().decode(msg.payload));
            if (data.type === 'comment') {
                setCommentsRef.current(prev => [...prev.slice(-50), { ...data, id: Date.now() + Math.random() }]);
            } else if (data.type === 'emoji') {
                const id = Date.now() + Math.random();
                const left = 10 + Math.random() * 60;
                setEmojisRef.current(prev => [...prev, { emoji: data.emoji, id, left }]);
                setTimeout(() => setEmojisRef.current(prev => prev.filter(e => e.id !== id)), 3000);
            }
        } catch(e) { console.error('Message error:', e); }
    });

    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    const sendComment = useCallback(() => {
        if (!commentInput.trim()) return;
        const data = {
            type: 'comment',
            text: commentInput.trim(),
            username: localParticipant?.name || 'Anonyme'
        };
        try {
            send(new TextEncoder().encode(JSON.stringify(data)), { reliable: true });
        } catch {}
        setComments(prev => [...prev.slice(-50), { ...data, id: Date.now() + Math.random() }]);
        setCommentInput('');
    }, [commentInput, localParticipant, send]);

    const sendEmoji = useCallback((emoji) => {
        const data = { type: 'emoji', emoji };
        try {
            send(new TextEncoder().encode(JSON.stringify(data)), { reliable: false });
        } catch {}
        const id = Date.now() + Math.random();
        const left = 10 + Math.random() * 60;
        setEmojis(prev => [...prev, { emoji, id, left }]);
        setTimeout(() => setEmojis(prev => prev.filter(e => e.id !== id)), 3000);
    }, [send]);

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">
            <RoomAudioRenderer />

            <style>{`
                @keyframes floatUp {
                    0% { transform: translateY(0) scale(1); opacity: 1; }
                    100% { transform: translateY(-300px) scale(1.8); opacity: 0; }
                }
                .float-emoji { animation: floatUp 3s ease-out forwards; position: absolute; }
            `}</style>

            {streamerTrack ? (
                <VideoTrack
                    trackRef={streamerTrack}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center flex-col gap-4">
                    {streamerAvatar ? (
                        <img src={streamerAvatar} alt={streamerName} className="w-24 h-24 rounded-full object-cover border-4 border-white" />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white text-4xl font-bold">
                            {streamerName?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <Mic size={32} className="text-white opacity-50" />
                    <p className="text-white opacity-50">Connexion en cours...</p>
                </div>
            )}

            <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/30 pointer-events-none" style={{ zIndex: 1 }} />

            <div className="absolute top-0 left-0 right-0 flex items-center justify-between px-4 z-50" style={{ paddingTop: '72px' }}>
                <div className="flex items-center gap-3">
                    {streamerAvatar ? (
                        <img src={streamerAvatar} alt={streamerName} className="w-9 h-9 rounded-full object-cover border-2 border-white" />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-blue-500 flex items-center justify-center text-white font-bold text-sm">
                            {streamerName?.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <p className="text-white font-bold text-sm leading-none">{streamerName}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-red-400 text-xs font-semibold">EN DIRECT</span>
                        </div>
                    </div>
                    <ParticipantCount />
                </div>
                <button
                    onClick={onStop}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white font-bold px-3 py-1.5 rounded-xl text-sm transition-all"
                >
                    <StopCircle size={14} />
                    {isStreaming ? 'Terminer' : 'Quitter'}
                </button>
            </div>

            <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 20 }}>
                {emojis.map(e => (
                    <div
                        key={e.id}
                        className="float-emoji text-3xl"
                        style={{ bottom: '120px', left: `${e.left}%` }}
                    >
                        {e.emoji}
                    </div>
                ))}
            </div>

            <div className="absolute left-4 right-4 flex flex-col gap-1" style={{ bottom: '130px', zIndex: 10, maxHeight: '200px', overflow: 'hidden' }}>
                {comments.slice(-8).map(c => (
                    <div key={c.id} className="flex items-start gap-2">
                        <span className="text-yellow-400 font-bold text-xs shrink-0">{c.username}</span>
                        <span className="text-white text-xs">{c.text}</span>
                    </div>
                ))}
                <div ref={commentsEndRef} />
            </div>

            <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-2 flex flex-col gap-3" style={{ zIndex: 30 }}>
                <div className="flex gap-4 justify-center">
                    {['❤️', '😂', '🔥', '👏', '💯'].map(emoji => (
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
        } catch {
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
        } catch {
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

    const getAvatarUrl = (avatarUrl) => {
        if (!avatarUrl) return null;
        if (avatarUrl.startsWith('http')) return avatarUrl;
        return `/uploads/profiles/${avatarUrl}`;
    };

    if (token) {
        const streamerAvatar = isStreaming
            ? getAvatarUrl(user?.avatar_url)
            : getAvatarUrl(currentLive?.avatar_url);
        const streamerName = isStreaming ? user?.username : currentLive?.username;

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
                    streamerName={streamerName}
                    streamerAvatar={streamerAvatar}
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
                                                src={getAvatarUrl(live.avatar_url)}
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
                                            Terminer
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

export default StandUp;