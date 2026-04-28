import React, { useState, useEffect, useCallback, useRef } from 'react';
import EmojiPickerLib from 'emoji-picker-react';
import { Swords, Clock, Trophy, Users, Play, X, Calendar, CheckCircle, XCircle, Loader } from 'lucide-react';
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

const getAvatarUrl = (avatarUrl) => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    return `/uploads/profiles/${avatarUrl}`;
};

const Avatar = ({ url, username, size = 'md' }) => {
    const sizes = { sm: 'w-8 h-8 text-xs', md: 'w-12 h-12 text-sm', lg: 'w-20 h-20 text-2xl' };
    return url ? (
        <img src={url} alt={username} className={`${sizes[size]} rounded-full object-cover`} />
    ) : (
        <div className={`${sizes[size]} rounded-full bg-gray-600 flex items-center justify-center text-white font-bold`}>
            {username?.charAt(0).toUpperCase()}
        </div>
    );
};

const Countdown = ({ scheduledAt }) => {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const update = () => {
            const diff = new Date(scheduledAt) - new Date();
            if (diff <= 0) { setTimeLeft('En cours !'); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setTimeLeft(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
        };
        update();
        const interval = setInterval(update, 1000);
        return () => clearInterval(interval);
    }, [scheduledAt]);

    return <span className="font-mono font-bold text-lg">{timeLeft}</span>;
};

const BattleEmojiPicker = ({ onSend }) => {
    const [open, setOpen] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const handleClick = (e) => {
            if (ref.current && !ref.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    return (
        <div className="relative" ref={ref}>
            {open && (
                <div className="absolute bottom-12 right-0" style={{ zIndex: 100 }}>
                    <EmojiPickerLib
                        onEmojiClick={(emojiData) => { onSend(emojiData.emoji); setOpen(false); }}
                        theme="dark"
                        height={350}
                        width={300}
                        lazyLoadEmojis={true}
                    />
                </div>
            )}
            <button
                onClick={() => setOpen(!open)}
                className="w-10 h-10 flex items-center justify-center bg-white bg-opacity-20 hover:bg-opacity-30 rounded-full text-xl transition-all"
            >
                😊
            </button>
        </div>
    );
};

const BattleLiveView = ({ battle, isParticipant, userId, userAvatar, onStop }) => {
    const [scores, setScores] = useState({
        challenger: battle.challenger_score || 0,
        challenged: battle.challenged_score || 0,
    });
    const [comments, setComments] = useState([]);
    const [commentInput, setCommentInput] = useState('');
    const [myVote, setMyVote] = useState(null);
    const commentsEndRef = useRef(null);
    const { localParticipant } = useLocalParticipant();

    const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
    const challengerTrack = tracks.find(t => String(t.participant?.identity) === String(battle.challenger_id));
    const challengedTrack = tracks.find(t => String(t.participant?.identity) === String(battle.challenged_id));

    const setScoresRef = useRef(setScores);
    const setCommentsRef = useRef(setComments);
    setScoresRef.current = setScores;
    setCommentsRef.current = setComments;

    const { send } = useDataChannel('battle', (msg) => {
        try {
            const data = JSON.parse(new TextDecoder().decode(msg.payload));
            if (data.type === 'scores') {
                setScoresRef.current({ challenger: data.challenger, challenged: data.challenged });
            } else if (data.type === 'comment') {
                setCommentsRef.current(prev => [...prev.slice(-50), { ...data, id: Date.now() + Math.random() }]);
            }
        } catch {}
    });

    const vote = async (targetId, emoji, points) => {
        try {
            const res = await apiService.requestV2(`/battles/${battle.id}/vote`, {
                method: 'POST',
                body: JSON.stringify({ target_id: targetId, emoji }),
            });
            setScores({ challenger: res.challenger_score, challenged: res.challenged_score });
            setMyVote(targetId);
            try {
                send(new TextEncoder().encode(JSON.stringify({
                    type: 'scores',
                    challenger: res.challenger_score,
                    challenged: res.challenged_score,
                })), { reliable: true });
            } catch {}
        } catch {}
    };

    const sendComment = useCallback(() => {
        if (!commentInput.trim()) return;
        const data = {
            type: 'comment',
            text: commentInput.trim(),
            username: localParticipant?.name || 'Anonyme',
            avatar: userAvatar || null
        };
        try { send(new TextEncoder().encode(JSON.stringify(data)), { reliable: true }); } catch {}
        setComments(prev => [...prev.slice(-50), { ...data, id: Date.now() + Math.random() }]);
        setCommentInput('');
    }, [commentInput, localParticipant, send, userAvatar]);

    const VOTE_EMOJIS = [
        { emoji: '🔥', points: 3, label: 'Feu' },
        { emoji: '😂', points: 2, label: 'Rires' },
        { emoji: '👑', points: 5, label: 'Roi' },
        { emoji: '👏', points: 1, label: 'Bravo' },
        { emoji: '💯', points: 1, label: 'Parfait' },
    ];

    const totalScore = scores.challenger + scores.challenged || 1;
    const challengerPct = Math.round((scores.challenger / totalScore) * 100);
    const challengedPct = 100 - challengerPct;

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden">
            <RoomAudioRenderer />

            <div className="absolute inset-0 flex">
                <div className="relative flex-1 border-r-2 border-white border-opacity-30">
                    {challengerTrack ? (
                        <VideoTrack trackRef={challengerTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-3">
                            <Avatar url={getAvatarUrl(battle.challenger_avatar)} username={battle.challenger_username} size="lg" />
                            <p className="text-white font-bold">{battle.challenger_username}</p>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none" />
                    <div className="absolute bottom-32 left-0 right-0 text-center">
                        <p className="text-white font-black text-lg drop-shadow">{battle.challenger_username}</p>
                        <p className="text-yellow-400 font-bold text-2xl">{scores.challenger} pts</p>
                    </div>
                    {!isParticipant && userId !== battle.challenger_id && (
                        <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-2">
                            {VOTE_EMOJIS.map(v => (
                                <button
                                    key={v.emoji}
                                    onClick={() => vote(battle.challenger_id, v.emoji, v.points)}
                                    className={`text-xl p-1.5 rounded-full transition-all hover:scale-125 ${myVote === battle.challenger_id ? 'bg-white bg-opacity-30' : 'bg-black bg-opacity-30'}`}
                                >
                                    {v.emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Challenged */}
                <div className="relative flex-1">
                    {challengedTrack ? (
                        <VideoTrack trackRef={challengedTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-3">
                            <Avatar url={getAvatarUrl(battle.challenged_avatar)} username={battle.challenged_username} size="lg" />
                            <p className="text-white font-bold">{battle.challenged_username}</p>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-black/40 pointer-events-none" />
                    <div className="absolute bottom-32 left-0 right-0 text-center">
                        <p className="text-white font-black text-lg drop-shadow">{battle.challenged_username}</p>
                        <p className="text-yellow-400 font-bold text-2xl">{scores.challenged} pts</p>
                    </div>
                    {!isParticipant && userId !== battle.challenged_id && (
                        <div className="absolute bottom-20 left-0 right-0 flex justify-center gap-2">
                            {VOTE_EMOJIS.map(v => (
                                <button
                                    key={v.emoji}
                                    onClick={() => vote(battle.challenged_id, v.emoji, v.points)}
                                    className={`text-xl p-1.5 rounded-full transition-all hover:scale-125 ${myVote === battle.challenged_id ? 'bg-white bg-opacity-30' : 'bg-black bg-opacity-30'}`}
                                >
                                    {v.emoji}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* VS au centre */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
                <div className="bg-red-600 rounded-full w-12 h-12 flex items-center justify-center shadow-2xl border-2 border-white">
                    <Swords size={20} className="text-white" />
                </div>
            </div>

            {/* Barre de score en haut */}
            <div className="absolute top-0 left-0 right-0 z-30 px-4" style={{ paddingTop: '72px' }}>
                <div className="bg-black bg-opacity-60 rounded-2xl p-3">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-white font-bold text-xs">{battle.challenger_username}</span>
                        <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-white text-xs font-bold">EN DIRECT</span>
                        </div>
                        <span className="text-white font-bold text-xs">{battle.challenged_username}</span>
                    </div>
                    <div className="flex rounded-full overflow-hidden h-3">
                        <div className="bg-blue-500 transition-all duration-500" style={{ width: `${challengerPct}%` }} />
                        <div className="bg-gray-500 transition-all duration-500" style={{ width: `${challengedPct}%` }} />
                    </div>
                    <div className="flex justify-between mt-1">
                        <span className="text-blue-400 text-xs font-bold">{challengerPct}%</span>
                        <span className="text-gray-400 text-xs font-bold">{challengedPct}%</span>
                    </div>
                </div>
            </div>

            <div className="absolute left-4 right-4 flex flex-col gap-1 z-10" style={{ bottom: '90px', maxHeight: '150px', overflow: 'hidden' }}>
                {comments.slice(-6).map(c => (
                    <div key={c.id} className="flex items-center gap-2">
                        {c.avatar ? (
                            <img src={c.avatar} alt={c.username} className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
                        ) : (
                            <div className="w-6 h-6 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {c.username?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="text-yellow-400 font-bold text-xs shrink-0">{c.username}</span>
                        <span className="text-white text-xs">{c.text}</span>
                    </div>
                ))}
                <div ref={commentsEndRef} />
            </div>

            <div className="absolute bottom-0 left-0 right-0 px-4 pb-6 pt-2 z-30 flex gap-2">
                <input
                    type="text"
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendComment()}
                    placeholder="Commenter..."
                    className="flex-1 bg-white bg-opacity-20 backdrop-blur-sm text-white placeholder-gray-300 px-4 py-2.5 rounded-full text-sm focus:outline-none"
                />
                <BattleEmojiPicker onSend={(emoji) => {
                    const data = { type: 'comment', text: emoji, username: localParticipant?.name || 'Anonyme', avatar: null };
                    try { send(new TextEncoder().encode(JSON.stringify(data)), { reliable: true }); } catch {}
                    setComments(prev => [...prev.slice(-50), { ...data, id: Date.now() + Math.random() }]);
                }} />
                <button onClick={sendComment} className="bg-blue-500 text-white font-bold px-4 py-2.5 rounded-full text-sm">
                    Envoyer
                </button>
                <button onClick={onStop} className="bg-red-600 text-white font-bold px-4 py-2.5 rounded-full text-sm flex items-center gap-1">
                    <X size={14} /> {isParticipant ? 'Terminer' : 'Quitter'}
                </button>
            </div>
        </div>
    );
};

const BattleRoom = () => {
    const { user, isAuthenticated } = useAuth();
    const toast = useToast();

    const [battles, setBattles] = useState([]);
    const [myBattles, setMyBattles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('battles');
    const [token, setToken] = useState(null);
    const [currentBattle, setCurrentBattle] = useState(null);
    const [joining, setJoining] = useState(false);
    const [schedulingId, setSchedulingId] = useState(null);
    const [scheduleDate, setScheduleDate] = useState('');

    const loadBattles = useCallback(async () => {
        try {
            const r = await apiService.requestV2('/battles');
            setBattles(r.battles || []);
        } catch { setBattles([]); }
        finally { setLoading(false); }
    }, []);

    const loadMyBattles = useCallback(async () => {
        if (!isAuthenticated) return;
        try {
            const r = await apiService.requestV2('/battles/my');
            setMyBattles(r.battles || []);
        } catch { setMyBattles([]); }
    }, [isAuthenticated]);

    useEffect(() => {
        loadBattles();
        loadMyBattles();
        const stored = localStorage.getItem('currentBattle');
        if (stored) {
            localStorage.removeItem('currentBattle');
            const battle = JSON.parse(stored);
            handleJoin(battle);
        }
    }, []);

    const audioRef = useRef(null);

    useEffect(() => {
        const audio = new Audio('/sounds/Battle.mp3');
        audio.loop = true;
        audio.volume = 0.3;
        audio.play().catch(() => {});
        audioRef.current = audio;

        return () => {
            audio.pause();
            audio.src = '';
        };
    }, []);

    useEffect(() => {
        if (token && audioRef.current) {
            audioRef.current.pause();
        }
    }, [token]);

    const handleJoin = async (battle) => {
        if (!isAuthenticated) { window.location.hash = '#/login'; return; }
        try {
            setJoining(true);
            setCurrentBattle(battle);
            const res = await apiService.requestV2(`/battles/${battle.id}/join`, { method: 'POST' });
            setToken(res.token);
        } catch {
            toast.error('Erreur lors de la connexion à la battle');
            setCurrentBattle(null);
        } finally { setJoining(false); }
    };

    const handleStart = async (battle) => {
        try {
            const res = await apiService.requestV2(`/battles/${battle.id}/start`, { method: 'POST' });
            setCurrentBattle({ ...battle, room_name: res.room_name });
            setToken(res.token);
        } catch { toast.error('Erreur lors du démarrage de la battle'); }
    };

    const handleStop = async () => {
        try {
            await apiService.requestV2(`/battles/${currentBattle.id}/stop`, { method: 'POST' });
            setToken(null);
            setCurrentBattle(null);
            toast.success('Battle terminée !');
            loadBattles();
            loadMyBattles();
        } catch { toast.error('Erreur'); }
    };

    const handleRespond = async (battleId, action) => {
        try {
            await apiService.requestV2(`/battles/${battleId}/respond`, {
                method: 'POST',
                body: JSON.stringify({ action }),
            });
            toast.success(action === 'accept' ? 'Défi accepté !' : 'Défi refusé');
            loadMyBattles();
        } catch { toast.error('Erreur'); }
    };

    const handleSchedule = async (battleId) => {
        if (!scheduleDate) return;
        try {
            const formatted = scheduleDate + ':00';
            await apiService.requestV2(`/battles/${battleId}/schedule`, {
                method: 'POST',
                body: JSON.stringify({ scheduled_at: formatted }),
            });
            toast.success('Battle programmée ! Les abonnés ont été notifiés');
            setSchedulingId(null);
            setScheduleDate('');
            loadMyBattles();
            loadBattles();
        } catch { toast.error('Erreur lors de la programmation'); }
    };

    const statusLabel = (status) => ({
        pending: { text: 'En attente', color: 'bg-yellow-100 text-yellow-700' },
        accepted: { text: 'Accepté', color: 'bg-green-100 text-green-700' },
        scheduled: { text: 'Programmé', color: 'bg-blue-100 text-blue-700' },
        live: { text: 'EN DIRECT', color: 'bg-red-100 text-red-600 animate-pulse' },
        ended: { text: 'Terminé', color: 'bg-gray-100 text-gray-600' },
        refused: { text: 'Refusé', color: 'bg-red-100 text-red-400' },
    }[status] || { text: status, color: 'bg-gray-100 text-gray-600' });

    if (token && currentBattle) {
        const isParticipant = user?.id === currentBattle.challenger_id || user?.id === currentBattle.challenged_id;
        return (
            <LiveKitRoom
                serverUrl={LIVEKIT_URL}
                token={token}
                connect={true}
                video={isParticipant}
                audio={isParticipant}
                style={{ height: '100vh', background: '#000' }}
            >
                <BattleLiveView
                    battle={currentBattle}
                    isParticipant={isParticipant}
                    userId={user?.id}
                    userAvatar={user?.avatar_url ? (user.avatar_url.startsWith('http') ? user.avatar_url : `/uploads/profiles/${user.avatar_url}`) : null}
                    onStop={handleStop}
                />
            </LiveKitRoom>
        );
    }

    return (
        <div className="min-h-screen pt-20 relative" style={{ backgroundColor: 'transparent' }}>
            <video
                autoPlay loop muted playsInline
                style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: -2, filter: 'brightness(0.4)' }}
            >
                <source src="/uploads/Battle.mp4" type="video/mp4" />
            </video>
            <div className="max-w-4xl mx-auto px-4 py-8">

                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gray-600 rounded-xl shadow-lg">
                            <Swords size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-white">Battle Room</h1>
                            <p className="text-sm text-gray-300 mt-0.5">Duels d'humoristes en direct</p>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                {isAuthenticated && (
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setTab('battles')}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === 'battles' ? 'bg-gray-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                        >
                            Battles publiques
                        </button>
                        <button
                            onClick={() => { setTab('my'); loadMyBattles(); }}
                            className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${tab === 'my' ? 'bg-gray-600 text-white' : 'bg-white text-gray-600 border border-gray-200'}`}
                        >
                            Mes battles
                            {myBattles.filter(b => b.status === 'pending' && b.challenged_id === user?.id).length > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                    {myBattles.filter(b => b.status === 'pending' && b.challenged_id === user?.id).length}
                                </span>
                            )}
                        </button>
                    </div>
                )}

                {tab === 'battles' && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                            <Swords size={18} className="text-gray-600" />
                            <h2 className="font-bold text-gray-700">Battles en cours & à venir</h2>
                            <span className="ml-auto text-sm text-gray-400">{battles.length} battle{battles.length !== 1 ? 's' : ''}</span>
                        </div>

                        {loading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader size={32} className="animate-spin text-gray-500" />
                            </div>
                        ) : battles.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <Swords size={48} className="mx-auto text-gray-200 mb-4" />
                                <p className="text-gray-500 font-semibold text-lg">Aucune battle programmée</p>
                                <p className="text-sm text-gray-400 mt-1">Défie un humoriste depuis sa chaîne</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {battles.map(battle => {
                                    const s = statusLabel(battle.status);
                                    return (
                                        <div key={battle.id} className="px-6 py-5">
                                            <div className="flex items-center gap-4 mb-3">
                                                <div className="flex items-center gap-2 flex-1">
                                                    <Avatar url={getAvatarUrl(battle.challenger_avatar)} username={battle.challenger_username} />
                                                    <div>
                                                        <p className="font-bold text-gray-900 text-sm">{battle.challenger_username}</p>
                                                        <p className="text-blue-600 font-bold text-xs">{battle.challenger_score} pts</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-center gap-1">
                                                    <div className="bg-gray-100 rounded-full p-2">
                                                        <Swords size={16} className="text-gray-600" />
                                                    </div>
                                                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${s.color}`}>{s.text}</span>
                                                </div>
                                                <div className="flex items-center gap-2 flex-1 justify-end">
                                                    <div className="text-right">
                                                        <p className="font-bold text-gray-900 text-sm">{battle.challenged_username}</p>
                                                        <p className="text-gray-600 font-bold text-xs">{battle.challenged_score} pts</p>
                                                    </div>
                                                    <Avatar url={getAvatarUrl(battle.challenged_avatar)} username={battle.challenged_username} />
                                                </div>
                                            </div>

                                            {battle.status === 'scheduled' && (
                                                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2">
                                                    <div className="flex items-center gap-2 text-gray-700">
                                                        <Clock size={14} />
                                                        <span className="text-sm">Dans :</span>
                                                        <Countdown scheduledAt={battle.scheduled_at} />
                                                    </div>
                                                    {(user?.id === battle.challenger_id) && (
                                                        <button
                                                            onClick={() => handleStart(battle)}
                                                            className="flex items-center gap-1.5 bg-gray-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                                                        >
                                                            <Play size={12} /> Démarrer
                                                        </button>
                                                    )}
                                                    {user?.id !== battle.challenger_id && user?.id !== battle.challenged_id && (
                                                        <button
                                                            onClick={() => handleJoin(battle)}
                                                            className="flex items-center gap-1.5 bg-gray-600 text-white font-bold px-3 py-1.5 rounded-lg text-xs"
                                                        >
                                                            <Users size={12} /> M'avertir
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {battle.status === 'live' && (
                                                <button
                                                    onClick={() => handleJoin(battle)}
                                                    disabled={joining}
                                                    className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-xl text-sm transition-all"
                                                >
                                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                                    Rejoindre la battle EN DIRECT
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {tab === 'my' && isAuthenticated && (
                    <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                            <h2 className="font-bold text-gray-700">Mes défis & battles</h2>
                        </div>
                        {myBattles.length === 0 ? (
                            <div className="text-center py-16 px-4">
                                <Swords size={48} className="mx-auto text-gray-200 mb-4" />
                                <p className="text-gray-500 font-semibold">Aucune battle pour l'instant</p>
                                <p className="text-sm text-gray-400 mt-1">Défie un humoriste depuis sa chaîne</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {myBattles.map(battle => {
                                    const s = statusLabel(battle.status);
                                    const isPending = battle.status === 'pending' && battle.challenged_id === user?.id;
                                    const isAccepted = battle.status === 'accepted';
                                    const canSchedule = isAccepted && (battle.challenger_id === user?.id || battle.challenged_id === user?.id);

                                    return (
                                        <div key={battle.id} className="px-6 py-4">
                                            <div className="flex items-center gap-3 mb-3">
                                                <Avatar url={getAvatarUrl(battle.challenger_avatar)} username={battle.challenger_username} size="sm" />
                                                <span className="text-gray-500 text-sm font-medium">{battle.challenger_username}</span>
                                                <div className="bg-gray-100 rounded-full p-1">
                                                    <Swords size={12} className="text-gray-600" />
                                                </div>
                                                <span className="text-gray-500 text-sm font-medium">{battle.challenged_username}</span>
                                                <Avatar url={getAvatarUrl(battle.challenged_avatar)} username={battle.challenged_username} size="sm" />
                                                <span className={`ml-auto text-xs font-bold px-2 py-0.5 rounded-full ${s.color}`}>{s.text}</span>
                                            </div>

                                            {battle.scheduled_at && (
                                                <div className="flex items-center gap-2 text-gray-500 text-xs mb-3">
                                                    <Calendar size={12} />
                                                    <span>{new Date(battle.scheduled_at).toLocaleString('fr-FR')}</span>
                                                    {battle.status === 'scheduled' && (
                                                        <span className="ml-2 font-bold text-gray-600">
                                                            <Countdown scheduledAt={battle.scheduled_at} />
                                                        </span>
                                                    )}
                                                </div>
                                            )}

                                            {battle.winner_id && (
                                                <div className="flex items-center gap-2 text-yellow-600 text-xs mb-3">
                                                    <Trophy size={12} />
                                                    <span className="font-bold">
                                                        Vainqueur : {battle.winner_id === battle.challenger_id ? battle.challenger_username : battle.challenged_username}
                                                    </span>
                                                </div>
                                            )}

                                            {isPending && (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleRespond(battle.id, 'accept')}
                                                        className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all"
                                                    >
                                                        <CheckCircle size={14} /> Accepter
                                                    </button>
                                                    <button
                                                        onClick={() => handleRespond(battle.id, 'refuse')}
                                                        className="flex items-center gap-1.5 bg-red-500 hover:bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all"
                                                    >
                                                        <XCircle size={14} /> Refuser
                                                    </button>
                                                </div>
                                            )}

                                            {canSchedule && (
                                                <div>
                                                    {schedulingId === battle.id ? (
                                                        <div className="flex gap-2 mt-2">
                                                            <input
                                                                type="datetime-local"
                                                                value={scheduleDate}
                                                                onChange={e => setScheduleDate(e.target.value)}
                                                                className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
                                                            />
                                                            <button
                                                                onClick={() => handleSchedule(battle.id)}
                                                                className="bg-gray-600 text-white font-bold px-4 py-2 rounded-xl text-sm"
                                                            >
                                                                Confirmer
                                                            </button>
                                                            <button
                                                                onClick={() => setSchedulingId(null)}
                                                                className="bg-gray-200 text-gray-700 font-bold px-3 py-2 rounded-xl text-sm"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => setSchedulingId(battle.id)}
                                                            className="flex items-center gap-1.5 bg-gray-600 hover:bg-gray-700 text-white font-bold px-4 py-2 rounded-xl text-sm transition-all"
                                                        >
                                                            <Calendar size={14} /> Programmer la battle
                                                        </button>
                                                    )}
                                                </div>
                                            )}

                                            {battle.status === 'live' && (
                                                <button
                                                    onClick={() => handleJoin(battle)}
                                                    className="flex items-center gap-2 bg-red-600 text-white font-bold px-4 py-2 rounded-xl text-sm"
                                                >
                                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                                    Rejoindre EN DIRECT
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BattleRoom;