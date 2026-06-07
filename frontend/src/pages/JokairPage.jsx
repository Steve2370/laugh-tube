import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Radio, Trophy, Medal, Star, Upload, ChevronRight,
    Clock, Users, Play, Flame, Check, X, AlertCircle,
    Crown, Mic, Calendar, Zap, TrendingUp, Eye
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../contexts/ToastContext";
import { useJokair } from '../hooks/useJokair';


const useJokairSound = () => {
    const audioRef = useRef(null);

    useEffect(() => {
        const audio = new Audio('/uploads/MrClaps.wav');
        audio.loop = true;
        audio.volume = 0.35;
        audioRef.current = audio;
        audio.play().catch(() => {});

        return () => {
            audio.pause();
            audio.src = '';
        };
    }, []);

    return audioRef;
};
const useCountdown = (targetDate) => {
    const calc = () => {
        const diff = Math.max(0, new Date(targetDate) - Date.now());
        return {
            days: Math.floor(diff / 86400000),
            hours: Math.floor((diff % 86400000) / 3600000),
            minutes: Math.floor((diff % 3600000) / 60000),
            seconds: Math.floor((diff % 60000) / 1000),
            done: diff === 0,
        };
    };
    const [time, setTime] = useState(calc);
    useEffect(() => {
        const t = setInterval(() => setTime(calc()), 1000);
        return () => clearInterval(t);
    }, [targetDate]);
    return time;
};

const CountdownBlock = ({ value, label }) => (
    <div style={{
        textAlign: 'center',
        background: 'rgba(255,255,255,0.06)',
        border: '0.5px solid rgba(255,255,255,0.1)',
        borderRadius: 10,
        padding: '10px 16px',
        minWidth: 56,
    }}>
        <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 32, lineHeight: 1, color: '#fff' }}>
            {String(value).padStart(2, '0')}
        </div>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', letterSpacing: '0.08em', marginTop: 2 }}>
            {label}
        </div>
    </div>
);

const PhaseBadge = ({ status }) => {
    const map = {
        upcoming: { label: 'À venir', bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)', dot: false },
        submissions: { label: 'Soumissions', bg: 'rgba(59,130,246,0.15)', color: '#60A5FA', dot: true  },
        voting: { label: 'Votes ouverts', bg: 'rgba(204,0,0,0.15)', color: '#FF4444', dot: true  },
        ended: { label: 'Terminé', bg: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.35)', dot: false },
    };
    const { label, bg, color, dot } = map[status] || map.upcoming;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: bg, border: `0.5px solid ${color}40`,
            borderRadius: 20, padding: '4px 12px',
            fontSize: 11, fontWeight: 500, letterSpacing: '0.07em',
            color, textTransform: 'uppercase',
        }}>
            {dot && (
                <span style={{
                    width: 6, height: 6, borderRadius: '50%', background: color,
                    animation: 'jkPulse 1.4s ease-in-out infinite',
                }} />
            )}
            {label}
        </span>
    );
};

const RankColors = {
    1: { accent: '#F5C842', bg: 'rgba(245,200,66,0.07)', border: 'rgba(245,200,66,0.3)' },
    2: { accent: '#B0B8C8', bg: 'rgba(176,184,200,0.06)', border: 'rgba(176,184,200,0.25)' },
    3: { accent: '#C97B3A', bg: 'rgba(201,123,58,0.07)', border: 'rgba(201,123,58,0.25)' },
};

const LeaderboardRow = ({ entry, rank, onVideoClick }) => {
    const colors = RankColors[rank] || { accent: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.07)' };
    const initials = (entry.user?.username || '?').slice(0, 2).toUpperCase();

    return (
        <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: rank * 0.06 }}
            style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: colors.bg,
                border: `0.5px solid ${colors.border}`,
                borderRadius: 12, padding: '12px 14px',
                cursor: 'pointer',
            }}
            onClick={() => onVideoClick(entry.video)}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
        >
            <div style={{
                fontFamily: "'Poppins', sans-serif",
                fontSize: rank <= 3 ? 24 : 16,
                color: colors.accent,
                minWidth: 28, textAlign: 'center',
            }}>
                {rank <= 3
                    ? <Trophy size={rank === 1 ? 22 : 18} style={{ color: colors.accent }} />
                    : rank
                }
            </div>

            <div style={{
                width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
                background: `${colors.accent}22`,
                border: `1.5px solid ${colors.accent}44`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 13, fontWeight: 600, color: colors.accent,
            }}>
                {entry.user?.avatar
                    ? <img src={entry.user.avatar} alt={initials} style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                    : initials
                }
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    @{entry.user?.username}
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {entry.video?.titre || entry.video?.title}
                </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <div style={{
                    fontFamily: "'Poppins', sans-serif",
                    fontSize: 20, color: colors.accent, lineHeight: 1,
                }}>
                    {parseFloat(entry.score || 0).toFixed(1)}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Flame size={10} /> {entry.vote_count}
                    </span>
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', display: 'flex', alignItems: 'center', gap: 3 }}>
                        <Eye size={10} /> {entry.watch_count || 0}
                    </span>
                </div>
            </div>

            <div style={{ width: 48, height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, flexShrink: 0 }}>
                <div style={{ height: '100%', width: `${Math.min(100, parseFloat(entry.score || 0))}%`, background: colors.accent, borderRadius: 2 }} />
            </div>

            <Play size={14} style={{ color: 'rgba(255,255,255,0.2)', flexShrink: 0 }} />
        </motion.div>
    );
};

const SubmitModal = ({ contest, onClose, onSuccess }) => {
    const [videos, setVideos] = useState([]);
    const [selected, setSelected] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const toast = useToast();

    useEffect(() => {
        const user = apiService.getCurrentUser();
        if (!user) return;
        apiService.getUserVideos(user.id)
            .then(r => setVideos(r.videos || []))
            .catch(() => setVideos([]))
            .finally(() => setLoading(false));
    }, []);

    const handleSubmit = async (videoId) => {
        try {
            await submitEntry(videoId);
            toast.success("Vidéo soumise avec succès !");
        } catch (e) {
            toast.error(e.message || "Erreur lors de la soumission");
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
                position: 'fixed', inset: 0, zIndex: 1000,
                background: 'rgba(0,0,0,0.75)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: 16,
            }}
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.92, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.92, opacity: 0 }}
                onClick={e => e.stopPropagation()}
                style={{
                    background: '#13131A',
                    border: '0.5px solid rgba(255,255,255,0.1)',
                    borderRadius: 16,
                    padding: 24,
                    width: '100%', maxWidth: 480,
                    maxHeight: '80vh', overflow: 'auto',
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: '#fff' }}>Soumettre une vidéo</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Choisis une de tes vidéos existantes</div>
                    </div>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.4)' }}>
                        <X size={20} />
                    </button>
                </div>

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {[1,2,3].map(i => (
                            <div key={i} style={{ height: 64, background: 'rgba(255,255,255,0.05)', borderRadius: 10, animation: 'pulse 1.5s infinite' }} />
                        ))}
                    </div>
                ) : videos.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'rgba(255,255,255,0.4)' }}>
                        <Upload size={32} style={{ margin: '0 auto 8px' }} />
                        <div style={{ fontSize: 14 }}>Aucune vidéo uploadée</div>
                        <button
                            onClick={() => { window.location.hash = '#/upload'; }}
                            style={{ marginTop: 12, background: '#CC0000', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}
                        >
                            Uploader une vidéo
                        </button>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
                        {videos.map(v => (
                            <div
                                key={v.id}
                                onClick={() => setSelected(v.id)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                                    border: `0.5px solid ${selected === v.id ? '#CC0000' : 'rgba(255,255,255,0.08)'}`,
                                    background: selected === v.id ? 'rgba(204,0,0,0.1)' : 'rgba(255,255,255,0.03)',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <div style={{
                                    width: 48, height: 32, borderRadius: 6, overflow: 'hidden',
                                    background: 'rgba(255,255,255,0.08)', flexShrink: 0,
                                }}>
                                    {v.thumbnail && <img src={v.thumbnail} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ fontSize: 13, fontWeight: 500, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {v.titre || v.title}
                                    </div>
                                </div>
                                {selected === v.id && <Check size={16} style={{ color: '#CC0000', flexShrink: 0 }} />}
                            </div>
                        ))}
                    </div>
                )}

                {videos.length > 0 && (
                    <button
                        onClick={handleSubmit}
                        disabled={!selected || submitting}
                        style={{
                            width: '100%', padding: '12px 0', borderRadius: 10,
                            background: selected ? '#CC0000' : 'rgba(255,255,255,0.06)',
                            color: selected ? '#fff' : 'rgba(255,255,255,0.3)',
                            border: 'none', fontSize: 14, fontWeight: 600,
                            cursor: selected ? 'pointer' : 'not-allowed',
                            transition: 'all 0.15s',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        }}
                    >
                        {submitting ? 'Soumission...' : <><Radio size={15} /> Soumettre au Jok-Air</>}
                    </button>
                )}
            </motion.div>
        </motion.div>
    );
};

const HallOfFame = ({ editions }) => (
    <div style={{ marginTop: 40 }}>
        <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
            Hall of Fame
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {editions.map((ed, i) => (
                <div key={i} style={{
                    flex: '1 1 140px',
                    background: ed.winner ? 'rgba(245,200,66,0.07)' : 'rgba(255,255,255,0.03)',
                    border: `0.5px solid ${ed.winner ? 'rgba(245,200,66,0.25)' : 'rgba(255,255,255,0.07)'}`,
                    borderRadius: 12, padding: '16px 14px', textAlign: 'center',
                    opacity: ed.winner ? 1 : 0.35,
                }}>
                    <Trophy size={26} style={{ color: ed.winner ? '#F5C842' : 'rgba(255,255,255,0.2)', margin: '0 auto 6px' }} />
                    <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Édition {ed.year}
                    </div>
                    {ed.winner
                        ? <div style={{ fontSize: 14, fontWeight: 600, color: '#fff', marginTop: 4 }}>@{ed.winner}</div>
                        : <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>—</div>
                    }
                </div>
            ))}
        </div>
    </div>
);

const JokairPage = () => {
    useJokairSound();
    const { isAuthenticated } = useAuth();
    const toast = useToast();
    const [showSubmitModal, setShowSubmitModal] = useState(false);

    const {
        contest,
        leaderboard,
        hallOfFame,
        myEntry,
        myVotes,
        votingId,
        loadingContest,
        loadingLeaderboard,
        submitting,
        canSubmit,
        canVote,
        isEnded,
        submitEntry,
        vote,
        refreshLeaderboard,
    } = useJokair();

    const voteEnd = contest?.vote_end || null;
    const countdown = useCountdown(voteEnd || Date.now() + 86400000 * 30);

    const HALL = [
        { year: new Date().getFullYear(), winner: null },
        { year: new Date().getFullYear() + 1, winner: null },
        { year: new Date().getFullYear() + 2, winner: null },
    ];

    useEffect(() => {
        if (!contest || !isAuthenticated) return;
        leaderboard.forEach(entry => {
            const me = apiService.getCurrentUser();
            if (me && entry.user?.id === me.id) setMyEntry(entry);
        });
    }, [leaderboard, isAuthenticated]);

    const handleVote = async (entry) => {
        if (!isAuthenticated) { window.location.hash = '#/login'; return; }
        try {
            await vote(entry);
            toast.success("Vote enregistré !");
        } catch (e) {
            toast.error(e.message || "Erreur lors du vote");
        }
    };

    const handleVideoClick = (video) => {
        if (!video) return;
        localStorage.setItem("currentVideo", JSON.stringify(video));
        window.location.hash = "#/video";
    };

    const navigateTo = (page) => { window.location.hash = `#/${page}`; };

    const phases = contest ? [
        { label: 'Soumissions', start: contest.submission_start, end: contest.submission_end, active: contest.status === 'submissions' },
        { label: 'Votes', start: contest.vote_start, end: contest.vote_end, active: contest.status === 'voting' },
        { label: 'Résultats', start: contest.vote_end, end: null, active: contest.status === 'ended'  },
    ] : [];

    const formatDate = (d) => d ? new Date(d).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' }) : '';

    if (loadingContest) return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0A0A0F' }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid rgba(255,255,255,0.1)', borderTopColor: '#CC0000', animation: 'spin 0.8s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
    );

    return (
        <div style={{ minHeight: '100vh', background: '#0A0A0F', paddingTop: 80, fontFamily: "'Poppins', sans-serif" }}>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Poppins:wght@400;500;600&display=swap');
                @keyframes jkPulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.5;transform:scale(0.7)} }
                @keyframes spin { to { transform:rotate(360deg) } }
            `}</style>

            <div style={{
                position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none',
                background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(204,0,0,0.12) 0%, transparent 65%)',
            }} />

            <div style={{ position: 'relative', zIndex: 1, maxWidth: 800, margin: '0 auto', padding: '0 16px 60px' }}>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 40 }}>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        {contest ? <PhaseBadge status={contest.status} /> : (
                            <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                                Aucun concours actif
                            </span>
                        )}
                    </div>

                    <img
                        src="/uploads/Jok-Air.png"
                        alt="Jok-Air"
                        style={{ height: 90, width: 'auto', margin: '0 0 6px', display: 'block' }}
                    />

                    <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.45)', margin: '0 0 24px', maxWidth: 480 }}>
                        {contest?.titre || "Le championnat annuel d'humour de LaughTube"} · <strong style={{ color: 'rgba(255,255,255,0.7)' }}>300$ à gagner</strong>
                    </p>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 28 }}>
                        {[
                            { place: '1er', amount: '200$', color: '#F5C842', icon: <Crown size={18} /> },
                            { place: '2e', amount: '75$',  color: '#B0B8C8', icon: <Medal size={18} /> },
                            { place: '3e', amount: '25$',  color: '#C97B3A', icon: <Star size={18}  /> },
                        ].map(({ place, amount, color, icon }) => (
                            <div key={place} style={{
                                display: 'flex', alignItems: 'center', gap: 10,
                                background: 'rgba(255,255,255,0.04)',
                                border: '0.5px solid rgba(255,255,255,0.08)',
                                borderRadius: 12, padding: '10px 16px',
                            }}>
                                <span style={{ color }}>{icon}</span>
                                <div>
                                    <div style={{ fontFamily: "'Poppins', sans-serif", fontSize: 26, lineHeight: 1, color }}>{amount}</div>
                                    <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 1 }}>{place} place{place === '1er' ? ' + trophée gravé' : ''}</div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {contest?.status === 'voting' && !countdown.done && (
                        <div>
                            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                                Fin du vote dans
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                <CountdownBlock value={countdown.days}    label="jours" />
                                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 24, color: '#CC0000', marginBottom: 10 }}>:</span>
                                <CountdownBlock value={countdown.hours}   label="heures" />
                                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 24, color: '#CC0000', marginBottom: 10 }}>:</span>
                                <CountdownBlock value={countdown.minutes} label="min" />
                                <span style={{ fontFamily: "'Poppins', sans-serif", fontSize: 24, color: '#CC0000', marginBottom: 10 }}>:</span>
                                <CountdownBlock value={countdown.seconds} label="sec" />
                            </div>
                        </div>
                    )}

                    {phases.length > 0 && (
                        <div style={{
                            display: 'flex', marginTop: 24,
                            border: '0.5px solid rgba(255,255,255,0.08)',
                            borderRadius: 12, overflow: 'hidden',
                        }}>
                            {phases.map((p, i) => (
                                <div key={i} style={{
                                    flex: 1, padding: '10px 14px', textAlign: 'center',
                                    background: p.active ? 'rgba(204,0,0,0.1)' : 'transparent',
                                    borderRight: i < phases.length - 1 ? '0.5px solid rgba(255,255,255,0.08)' : 'none',
                                }}>
                                    <div style={{ fontSize: 10, color: p.active ? '#FF6666' : 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                                        {p.active && '● '}{p.label}
                                    </div>
                                    <div style={{ fontSize: 12, color: p.active ? '#fff' : 'rgba(255,255,255,0.35)', marginTop: 3 }}>
                                        {formatDate(p.start)}{p.end ? ` – ${formatDate(p.end)}` : ''}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                {contest && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} style={{ marginBottom: 36 }}>
                        {myEntry ? (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: 12,
                                background: 'rgba(34,197,94,0.08)', border: '0.5px solid rgba(34,197,94,0.25)',
                                borderRadius: 12, padding: '14px 18px',
                            }}>
                                <Check size={18} style={{ color: '#4ADE80', flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontSize: 14, fontWeight: 600, color: '#4ADE80' }}>Vidéo soumise</div>
                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>{myEntry.video?.titre || myEntry.video?.title}</div>
                                </div>
                            </div>
                        ) : canSubmit ? (
                            <button
                                onClick={() => setShowSubmitModal(true)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    background: '#CC0000', color: '#fff', border: 'none',
                                    borderRadius: 12, padding: '14px 24px', fontSize: 15,
                                    fontWeight: 600, cursor: 'pointer', transition: 'opacity 0.15s',
                                }}
                                onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
                                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                            >
                                <Radio size={18} /> Soumettre ma vidéo
                            </button>
                        ) : !isAuthenticated && contest.status === 'submissions' ? (
                            <button
                                onClick={() => navigateTo('login')}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 10,
                                    background: 'rgba(255,255,255,0.07)', color: '#fff',
                                    border: '0.5px solid rgba(255,255,255,0.15)',
                                    borderRadius: 12, padding: '14px 24px', fontSize: 15,
                                    fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                <Radio size={18} /> Connecte-toi pour participer
                            </button>
                        ) : null}
                    </motion.div>
                )}

                {contest && (
                    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)' }}>
                                {isEnded ? 'Classement final' : 'Classement en direct'}
                            </div>
                            {!isEnded && (
                                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <TrendingUp size={11} /> Mis à jour chaque heure
                                </div>
                            )}
                        </div>

                        {leaderboard.length === 0 ? (
                            <div style={{
                                textAlign: 'center', padding: '40px 0',
                                background: 'rgba(255,255,255,0.03)',
                                border: '0.5px solid rgba(255,255,255,0.07)',
                                borderRadius: 14,
                            }}>
                                <Mic size={32} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 10px' }} />
                                <div style={{ fontSize: 15, color: 'rgba(255,255,255,0.35)' }}>
                                    {contest.status === 'upcoming' ? 'Le concours n\'a pas encore commencé' : 'Aucune soumission pour le moment'}
                                </div>
                                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.2)', marginTop: 4 }}>
                                    Sois le premier à te lancer !
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                {leaderboard.map((entry, i) => (
                                    <div key={entry.id || i} style={{ position: 'relative' }}>
                                        <LeaderboardRow
                                            entry={entry}
                                            rank={i + 1}
                                            onVideoClick={handleVideoClick}
                                        />

                                        {canVote && (
                                            <button
                                                onClick={() => handleVote(entry)}
                                                disabled={!!myVotes[entry.video?.id] || votingId === entry.video?.id}
                                                style={{
                                                    position: 'absolute', right: 52, top: '50%', transform: 'translateY(-50%)',
                                                    background: myVotes[entry.video?.id] ? 'rgba(34,197,94,0.15)' : 'rgba(204,0,0,0.15)',
                                                    border: `0.5px solid ${myVotes[entry.video?.id] ? 'rgba(34,197,94,0.3)' : 'rgba(204,0,0,0.3)'}`,
                                                    color: myVotes[entry.video?.id] ? '#4ADE80' : '#FF6666',
                                                    borderRadius: 8, padding: '5px 10px', fontSize: 11, fontWeight: 600,
                                                    cursor: myVotes[entry.video?.id] ? 'default' : 'pointer',
                                                    transition: 'all 0.15s',
                                                    display: 'flex', alignItems: 'center', gap: 4,
                                                }}
                                            >
                                                {myVotes[entry.video?.id]
                                                    ? <><Check size={11} /> Voté</>
                                                    : votingId === entry.video?.id
                                                        ? '...'
                                                        : <><Flame size={11} /> Voter</>
                                                }
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </motion.div>
                )}

                {!contest && !loadingContest && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{
                        textAlign: 'center', padding: '60px 24px',
                        background: 'rgba(255,255,255,0.03)',
                        border: '0.5px solid rgba(255,255,255,0.07)',
                        borderRadius: 16,
                    }}>
                        <Radio size={40} style={{ color: 'rgba(255,255,255,0.15)', margin: '0 auto 16px' }} />
                        <div style={{ fontSize: 20, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 8 }}>
                            Bientôt disponible
                        </div>
                        <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.25)' }}>
                            Le premier Jok-Air arrive. Reste à l'affût.
                        </div>
                    </motion.div>
                )}

                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }} style={{ marginTop: 40 }}>
                    <div style={{ fontSize: 11, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'rgba(255,255,255,0.35)', marginBottom: 14 }}>
                        Comment ça marche
                    </div>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                        {[
                            { icon: <Upload size={16} />, title: 'Soumission', desc: 'Upload ta vidéo pendant la période de soumission. 1 vidéo par participant.' },
                            { icon: <Flame size={16} />, title: 'Vote gratuit', desc: 'Compte requis pour voter. 1 vote par vidéo. Pas de vote sur ta propre vidéo.' },
                            { icon: <Zap size={16} />, title: 'Score 70/30', desc: '70% votes + 30% temps de visionnage. Classement mis à jour chaque heure.' },
                            { icon: <Calendar size={16} />, title: 'Événement annuel', desc: 'Chaque année, un nouveau champion. Deviens le premier champion de LaughTube.' },
                        ].map(({ icon, title, desc }) => (
                            <div key={title} style={{
                                flex: '1 1 160px',
                                background: 'rgba(255,255,255,0.03)',
                                border: '0.5px solid rgba(255,255,255,0.07)',
                                borderRadius: 12, padding: '14px',
                                display: 'flex', gap: 10, alignItems: 'flex-start',
                            }}>
                                <span style={{ color: '#CC0000', flexShrink: 0, marginTop: 1 }}>{icon}</span>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', marginBottom: 3 }}>{title}</div>
                                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', lineHeight: 1.5 }}>{desc}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>

                <HallOfFame editions={hallOfFame.length > 0 ? hallOfFame : [
                    { year: new Date().getFullYear(), winner: null },
                    { year: new Date().getFullYear() + 1, winner: null },
                    { year: new Date().getFullYear() + 2, winner: null },
                ]} />

            </div>

            <AnimatePresence>
                {showSubmitModal && contest && (
                    <SubmitModal
                        contest={contest}
                        onClose={() => setShowSubmitModal(false)}
                        onSuccess={() => {
                            apiService.requestV2(`/jokair/${contest.id}/leaderboard`)
                                .then(data => setLeaderboard(Array.isArray(data) ? data : []));
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};

export default JokairPage;