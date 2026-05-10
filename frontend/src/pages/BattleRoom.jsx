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
import Lottie from 'lottie-react';
import heartAnim from '../animations/Valentine_Filled1.json';
import thumbsUpAnim from '../animations/Valentine_Filled3.json';
import lolAnim from '../animations/Valentine_Filled5.json';

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

const BattleCountdown = React.memo(({ durationMinutes, startedAt, onTimeUp }) => {
    const getSecondsLeft = () => {
        if (!durationMinutes || !startedAt) return durationMinutes * 60 || 0;
        const startTime = new Date(startedAt).getTime();
        if (isNaN(startTime)) return durationMinutes * 60; // ← fix NaN
        const totalSeconds = durationMinutes * 60;
        const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
        return Math.max(0, totalSeconds - elapsedSeconds);
    };

    const [secondsLeft, setSecondsLeft] = useState(() => getSecondsLeft());
    const onTimeUpRef = useRef(onTimeUp);
    onTimeUpRef.current = onTimeUp;

    useEffect(() => {
        if (!durationMinutes) return;
        if (getSecondsLeft() <= 0) {
            onTimeUpRef.current();
            return;
        }
        const interval = setInterval(() => {
            setSecondsLeft(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    onTimeUpRef.current();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(interval);
    }, []);

    if (!durationMinutes) return null;

    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;

    return (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 z-20" style={{ marginTop: '40px' }}>
            <div className="bg-black bg-opacity-70 rounded-2xl px-4 py-2 text-center">
                <p className="text-white font-mono font-black text-2xl">
                    {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}
                </p>
            </div>
        </div>
    );
});

const ANIM_MAP = {
    'icons8-heart': heartAnim,
    'icons8-thumbs-up': thumbsUpAnim,
    'icons8-lol': lolAnim,
};

const LottieIcon = ({ name, size = 40 }) => {
    const data = ANIM_MAP[name];
    if (!data) return null;
    return (
        <Lottie
            animationData={data}
            loop={true}
            autoplay={true}
            style={{ width: size, height: size }}
        />
    );
};

const VOTE_REACTIONS = [
    { name: 'Valentine_Filled1.json', reactionType: 'love_max', points: 5, label: '+5' },
    { name: 'Valentine_Filled3.json', reactionType: 'love_big', points: 3, label: '+3' },
    { name: 'Valentine_Filled5.json', reactionType: 'love_funny', points: 2, label: '+2' },
];

const BattleLiveView = ({ battle, isParticipant, userId, userAvatar, onStop, onLeave }) => {
    const [scores, setScores] = useState({
        challenger: battle.challenger_score || 0,
        challenged: battle.challenged_score || 0,
    });
    const [comments, setComments] = useState([]);
    const [commentInput, setCommentInput] = useState('');
    const [votedFor, setVotedFor] = useState(null);
    const commentsEndRef = useRef(null);
    const { localParticipant } = useLocalParticipant();

    const tracks = useTracks([{ source: Track.Source.Camera, withPlaceholder: false }]);
    const challengerTrack = tracks.find(t => String(t.participant?.identity) === String(battle.challenger_id));
    const challengedTrack = tracks.find(t => String(t.participant?.identity) === String(battle.challenged_id));

    const setScoresRef = useRef(setScores);
    const setCommentsRef = useRef(setComments);
    setScoresRef.current = setScores;
    setCommentsRef.current = setComments;

    // Polling scores depuis l'API toutes les 5s pour sync iOS ↔ Web
    useEffect(() => {
        const poll = setInterval(async () => {
            try {
                const res = await apiService.requestV2('/battles');
                const found = (res.battles || []).find(b => b.id === battle.id);
                if (found) {
                    setScoresRef.current({
                        challenger: found.challenger_score || 0,
                        challenged: found.challenged_score || 0,
                    });
                }
            } catch {}
        }, 5000);
        return () => clearInterval(poll);
    }, [battle.id]);

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

    useEffect(() => {
        commentsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [comments]);

    const vote = async (targetId, reactionType, points) => {
        if (isParticipant || votedFor) return;

        const isChallenger = targetId === battle.challenger_id;
        setScores(prev => ({
            challenger: isChallenger ? prev.challenger + points : prev.challenger,
            challenged: !isChallenger ? prev.challenged + points : prev.challenged,
        }));
        setVotedFor(targetId);

        try {
            const res = await apiService.requestV2(`/battles/${battle.id}/vote`, {
                method: 'POST',
                body: JSON.stringify({ target_id: targetId, reaction_type: reactionType }),
            });

            if (res.challenger_score !== undefined) {
                setScores({ challenger: res.challenger_score, challenged: res.challenged_score });
                try {
                    send(new TextEncoder().encode(JSON.stringify({
                        type: 'scores',
                        challenger: res.challenger_score,
                        challenged: res.challenged_score,
                    })), { reliable: true });
                } catch {}
            }
        } catch {}
    };

    const sendComment = useCallback(() => {
        if (!commentInput.trim()) return;
        const data = {
            type: 'comment',
            text: commentInput.trim(),
            username: localParticipant?.name || 'Anonyme',
            avatar: userAvatar || null,
        };
        try { send(new TextEncoder().encode(JSON.stringify(data)), { reliable: true }); } catch {}
        setComments(prev => [...prev.slice(-50), { ...data, id: Date.now() + Math.random() }]);
        setCommentInput('');
    }, [commentInput, localParticipant, send, userAvatar]);

    const ParticipantCount = () => {
        const participants = useParticipants();
        return (
            <div className="flex items-center gap-1.5 bg-white/10 text-white text-xs px-2.5 py-1 rounded-full">
                <Users size={11} />
                <span className="font-semibold">{participants.length}</span>
            </div>
        );
    };

    const total = scores.challenger + scores.challenged || 1;
    const challengerPct = Math.round((scores.challenger / total) * 100);
    const challengedPct = 100 - challengerPct;

    const canVoteChallenger = !isParticipant && !votedFor;
    const canVoteChallenged = !isParticipant && !votedFor;

    return (
        <div className="relative w-full h-screen bg-black overflow-hidden flex flex-col">
            <RoomAudioRenderer />

            <div className="relative flex flex-1 min-h-0">
                {/* Gauche */}
                <div className="relative flex-1 border-r border-white/20">
                    {challengerTrack ? (
                        <VideoTrack trackRef={challengerTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-3">
                            <Avatar url={getAvatarUrl(battle.challenger_avatar)} username={battle.challenger_username} size="lg" />
                            <p className="text-white/60 text-sm">En attente…</p>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

                    <div className="absolute bottom-2 left-0 right-0 text-center">
                        <p className="text-white font-bold text-sm drop-shadow">{battle.challenger_username}</p>
                        <p className="font-black text-2xl drop-shadow"
                           style={{ color: '#60a5fa', textShadow: '0 0 20px rgba(96,165,250,0.5)' }}>
                            {scores.challenger}
                        </p>
                        <p className="text-white/40 text-xs">pts</p>
                    </div>
                </div>

                <div className="relative flex-1">
                    {challengedTrack ? (
                        <VideoTrack trackRef={challengedTrack} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <div className="w-full h-full bg-gray-900 flex flex-col items-center justify-center gap-3">
                            <Avatar url={getAvatarUrl(battle.challenged_avatar)} username={battle.challenged_username} size="lg" />
                            <p className="text-white/60 text-sm">En attente…</p>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute bottom-2 left-0 right-0 text-center">
                        <p className="text-white font-bold text-sm drop-shadow">{battle.challenged_username}</p>
                        <p className="font-black text-2xl drop-shadow"
                           style={{ color: '#fb923c', textShadow: '0 0 20px rgba(251,146,60,0.5)' }}>
                            {scores.challenged}
                        </p>
                        <p className="text-white/40 text-xs">pts</p>
                    </div>
                </div>

                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
                    <div style={{
                        background: 'radial-gradient(circle, rgba(239,68,68,0.3) 0%, transparent 70%)',
                        width: 60, height: 60,
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <span className="text-white font-black text-xl drop-shadow-lg">VS</span>
                    </div>
                </div>

                <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 pt-3">
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 bg-red-600/80 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full border border-red-500/50">
                            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                            <span className="font-black tracking-wider">BATTLE</span>
                        </div>
                        <ParticipantCount />
                    </div>
                    <button
                        onClick={isParticipant ? onStop : onLeave}
                        className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full border border-white/20 transition-all"
                    >
                        <X size={14} className="text-white" />
                    </button>
                </div>
            </div>

            <div className="bg-black/80 backdrop-blur-sm px-4 py-2 flex items-center gap-3">
                <span className="font-black text-sm w-8 text-right" style={{ color: '#60a5fa' }}>{challengerPct}%</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/10">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${challengerPct}%`,
                            background: 'linear-gradient(to right, #3b82f6, #60a5fa)',
                        }}
                    />
                </div>
                <div className="flex-1 h-2 rounded-full overflow-hidden bg-white/10 flex justify-end">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                            width: `${challengedPct}%`,
                            background: 'linear-gradient(to left, #f97316, #fb923c)',
                        }}
                    />
                </div>
                <span className="font-black text-sm w-8" style={{ color: '#fb923c' }}>{challengedPct}%</span>
            </div>

            <div className="bg-black/60 backdrop-blur-sm px-3 py-2 flex gap-2">

                <div className="flex-1 rounded-xl p-2" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <Avatar url={getAvatarUrl(battle.challenger_avatar)} username={battle.challenger_username} size="sm" />
                        <span className="font-bold text-xs truncate" style={{ color: '#60a5fa' }}>{battle.challenger_username}</span>
                    </div>
                    <div className="flex gap-1">
                        {VOTE_REACTIONS.map(r => (
                            <button
                                key={r.reactionType}
                                onClick={() => vote(battle.challenger_id, r.reactionType, r.points)}
                                disabled={!canVoteChallenger}
                                className={`flex-1 flex flex-col items-center rounded-lg py-1 transition-all ${
                                    canVoteChallenger ? 'hover:scale-110 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                                } ${votedFor === battle.challenger_id ? 'ring-1 ring-blue-400' : ''}`}
                                style={{ background: 'rgba(59,130,246,0.15)' }}
                            >
                                <LottieIcon name={r.name} size={34} />
                                <span className="text-xs font-bold text-blue-300">{r.label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex-1 rounded-xl p-2" style={{ background: 'rgba(249,115,22,0.1)', border: '1px solid rgba(249,115,22,0.2)' }}>
                    <div className="flex items-center gap-1.5 mb-2">
                        <Avatar url={getAvatarUrl(battle.challenged_avatar)} username={battle.challenged_username} size="sm" />
                        <span className="font-bold text-xs truncate" style={{ color: '#fb923c' }}>{battle.challenged_username}</span>
                    </div>
                    <div className="flex gap-1">
                        {VOTE_REACTIONS.map(r => (
                            <button
                                key={r.reactionType}
                                onClick={() => vote(battle.challenged_id, r.reactionType, r.points)}
                                disabled={!canVoteChallenged}
                                className={`flex-1 flex flex-col items-center rounded-lg py-1 transition-all ${
                                    canVoteChallenged ? 'hover:scale-110 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                                } ${votedFor === battle.challenged_id ? 'ring-1 ring-orange-400' : ''}`}
                                style={{ background: 'rgba(249,115,22,0.15)' }}
                            >
                                <LottieIcon name={r.name} size={34} />
                                <span className="text-xs font-bold text-orange-300">{r.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="px-3 pt-1 pb-0 flex-1 min-h-0 overflow-y-auto flex flex-col-reverse" style={{ maxHeight: 100 }}>
                <div ref={commentsEndRef} />
                {[...comments].reverse().slice(0, 8).reverse().map(c => (
                    <div key={c.id} className="flex items-center gap-1.5 mb-1">
                        {c.avatar ? (
                            <img src={c.avatar} className="w-5 h-5 rounded-full object-cover flex-shrink-0" alt="" />
                        ) : (
                            <div className="w-5 h-5 rounded-full bg-gray-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                {c.username?.charAt(0).toUpperCase()}
                            </div>
                        )}
                        <span className="text-yellow-400 font-bold text-xs shrink-0">{c.username}</span>
                        <span className="text-white/80 text-xs">{c.text}</span>
                    </div>
                ))}
            </div>

            <div className="px-3 pb-4 pt-2 flex gap-2 bg-black/60 backdrop-blur-sm">
                <input
                    type="text"
                    value={commentInput}
                    onChange={e => setCommentInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && sendComment()}
                    placeholder="Commenter…"
                    className="flex-1 bg-white/10 text-white placeholder-white/40 px-3 py-2 rounded-full text-sm focus:outline-none focus:ring-1 focus:ring-white/30"
                />
                <button
                    onClick={sendComment}
                    className="bg-white/15 hover:bg-white/25 text-white px-3 py-2 rounded-full text-sm transition-all"
                >
                    ↑
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
    const [duration, setDuration] = useState('');

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
            setCurrentBattle({
                ...battle,
                room_name: res.room_name,
                duration_minutes: battle.duration_minutes,
                started_at: res.started_at || new Date().toISOString(), // ← fix NaN:NaN
            });
            setToken(res.token);
        } catch { toast.error('Erreur lors du démarrage de la battle'); }
    };

    const handleStop = useCallback(async () => {
        try {
            const res = await apiService.requestV2(`/battles/${currentBattle.id}/stop`, { method: 'POST' });
            const final = await apiService.requestV2(`/battles/${currentBattle.id}`).catch(() => null);
            if (final) {
                toast.success(
                    `Battle terminée ! ${res.winner_id === currentBattle.challenger_id
                        ? currentBattle.challenger_username
                        : currentBattle.challenged_username} remporte la victoire ! 🏆`
                );
            } else {
                toast.success('Battle terminée !');
            }
        } catch {
            toast.success('Battle terminée !');
        } finally {
            setToken(null);
            setCurrentBattle(null);
            loadBattles();
            loadMyBattles();
        }
    }, [currentBattle?.id]);

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
                body: JSON.stringify({
                    scheduled_at: formatted,
                    duration_minutes: duration ? parseInt(duration) : null,
                }),
            });
            toast.success('Battle programmée ! Les abonnés ont été notifiés');
            setSchedulingId(null);
            setScheduleDate('');
            setDuration('');
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

    const handleLeave = () => {
        setToken(null);
        setCurrentBattle(null);
    };

    if (token && currentBattle) {
        const isParticipant = user?.id === currentBattle.challenger_id || user?.id === currentBattle.challenged_id;
        return (
            <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000' }}>
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
                        onLeave={handleLeave}
                    />
                </LiveKitRoom>
                {currentBattle.duration_minutes && (
                    <BattleCountdown
                        durationMinutes={currentBattle.duration_minutes}
                        startedAt={currentBattle.started_at}
                        onTimeUp={handleStop}
                    />
                )}
            </div>
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
                                    const canSchedule = isAccepted && battle.challenger_id === user?.id;

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
                                                        <div className="flex flex-col gap-2 mt-2">
                                                            <div className="flex gap-2">
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
                                                            <div className="flex items-center gap-2">
                                                                <input
                                                                    type="number"
                                                                    value={duration}
                                                                    onChange={e => setDuration(e.target.value)}
                                                                    placeholder="Durée en minutes (optionnel)"
                                                                    min="1"
                                                                    className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
                                                                />
                                                                <span className="text-xs text-gray-400 whitespace-nowrap">min (optionnel)</span>
                                                            </div>
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