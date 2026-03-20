import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Eye, ThumbsUp, MessageCircle, Clock, Users } from "lucide-react";
import apiService from "../services/apiService.js";

const useScrollReveal = (threshold = 0.15) => {
    const ref = useRef(null);
    const [visible, setVisible] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(
            ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
            { threshold }
        );
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return [ref, visible];
};

const useAnimatedCount = (target, duration = 800) => {
    const [count, setCount] = useState(0);
    const started = useRef(false);
    const start = () => {
        if (started.current || target === 0) return;
        started.current = true;
        const startTime = performance.now();
        const tick = (now) => {
            const p = Math.min((now - startTime) / duration, 1);
            const ease = 1 - Math.pow(1 - p, 3);
            setCount(Math.floor(ease * target));
            if (p < 1) requestAnimationFrame(tick);
            else setCount(target);
        };
        requestAnimationFrame(tick);
    };
    return [count, start];
};


const EMOJIS = ['😂', '🤣', '💀', '😭', '🔥', '👏', '💯'];
const ConfettiBurst = ({ trigger }) => {
    const [particles, setParticles] = useState([]);
    useEffect(() => {
        if (!trigger) return;
        const p = Array.from({ length: 8 }, (_, i) => ({
            id: Date.now() + i,
            emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
            x: (Math.random() - 0.5) * 120,
            y: -(40 + Math.random() * 60),
            rotate: (Math.random() - 0.5) * 360,
            scale: 0.6 + Math.random() * 0.8,
        }));
        setParticles(p);
        const t = setTimeout(() => setParticles([]), 900);
        return () => clearTimeout(t);
    }, [trigger]);

    return (
        <div className="absolute inset-0 pointer-events-none overflow-visible z-20">
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute left-1/2 top-1/2 text-lg select-none"
                    style={{
                        animation: 'confettiBurst 0.9s ease-out forwards',
                        '--tx': `${p.x}px`,
                        '--ty': `${p.y}px`,
                        '--rot': `${p.rotate}deg`,
                        '--sc': p.scale,
                    }}
                >
                    {p.emoji}
                </div>
            ))}
        </div>
    );
};

const VideoCard = ({ video, onClick }) => {
    const [authorData, setAuthorData] = useState(null);
    const [loadingAuthor, setLoadingAuthor] = useState(true);
    const [imageError, setImageError] = useState({ thumbnail: false, avatar: false });
    const [hovered, setHovered] = useState(false);
    const [likesBurst, setLikesBurst] = useState(0);
    const [cardRef, visible] = useScrollReveal();

    const authorId = useMemo(() => video?.user_id ?? video?.userId ?? video?.author_id ?? video?.authorId ?? null, [video]);
    const views = useMemo(() => video?.views ?? video?.nb_vues ?? video?.view_count ?? 0, [video]);
    const likes = useMemo(() => video?.likes ?? video?.likes_count ?? 0, [video]);
    const comments = useMemo(() => video?.commentaires ?? video?.comments ?? video?.comments_count ?? 0, [video]);

    const [animViews, startViews] = useAnimatedCount(views);
    const [animLikes, startLikes] = useAnimatedCount(likes);
    const [animComments, startComments] = useAnimatedCount(comments);

    useEffect(() => {
        if (visible) { startViews(); startLikes(); startComments(); }
    }, [visible]);

    useEffect(() => {
        let cancelled = false;
        const loadAuthorData = async () => {
            const fallback = { id: authorId, username: video?.username || video?.author_name || video?.auteur || "Utilisateur", avatar_url: null, subscribersCount: 0 };
            if (!authorId) { if (!cancelled) { setAuthorData(fallback); setLoadingAuthor(false); } return; }
            try {
                const [profileResponse, subsResponse] = await Promise.allSettled([
                    apiService.getUserProfile(authorId),
                    apiService.getSubscribersCount(authorId),
                ]);
                let rawProfile = {};
                if (profileResponse.status === "fulfilled" && profileResponse.value?.success) {
                    rawProfile = profileResponse.value?.data?.profile || profileResponse.value?.data || profileResponse.value?.profile || {};
                }
                let subscribersCount = 0;
                if (subsResponse.status === "fulfilled") {
                    const v = subsResponse.value;
                    subscribersCount = v?.count ?? v?.subscribers_count ?? v?.data?.count ?? v?.data?.subscribers_count ?? 0;
                } else {
                    subscribersCount = rawProfile.subscribers_count ?? rawProfile.subscribersCount ?? 0;
                }
                const merged = { id: authorId, username: rawProfile.username || fallback.username, avatar_url: rawProfile.avatar_url || rawProfile.avatar || null, subscribersCount: Number(subscribersCount) || 0 };
                if (!cancelled) setAuthorData(merged);
            } catch { if (!cancelled) setAuthorData(fallback); }
            finally { if (!cancelled) setLoadingAuthor(false); }
        };
        loadAuthorData();
        return () => { cancelled = true; };
    }, [authorId, video]);

    const getThumbnailUrl = (id) => imageError.thumbnail ? "/images/placeholder-video.png" : apiService.getThumbnailUrl(id);

    const formatDate = (d) => {
        if (!d) return "Date inconnue";
        const diff = Date.now() - new Date(d);
        const m = Math.floor(diff / 60000), h = Math.floor(diff / 3600000), j = Math.floor(diff / 86400000);
        if (m < 1) return "À l'instant";
        if (m < 60) return `Il y a ${m}min`;
        if (h < 24) return `Il y a ${h}h`;
        if (j < 7) return `Il y a ${j}j`;
        if (j < 30) return `Il y a ${Math.floor(j/7)} sem.`;
        if (j < 365) return `Il y a ${Math.floor(j/30)} mois`;
        return `Il y a ${Math.floor(j/365)} an${Math.floor(j/365)>1?'s':''}`;
    };

    const fmt = (n, unit) => {
        if (!n) return `0 ${unit}`;
        if (n < 1000) return `${n} ${unit}${n>1&&unit==='vue'?'s':n>1&&unit!=='vue'?'s':''}`;
        if (n < 1e6) return `${(n/1000).toFixed(1)}k`;
        return `${(n/1e6).toFixed(1)}M`;
    };

    const handleAuthorClick = (e) => {
        e.stopPropagation();
        if (authorData?.id) {
            localStorage.setItem("channelUser", JSON.stringify({ id: authorData.id, username: authorData.username }));
            window.location.hash = "#/chaine";
        }
    };

    const handleLikeClick = (e) => {
        e.stopPropagation();
        setLikesBurst(b => b + 1);
    };

    const getAvatarUrl = () => (!imageError.avatar && authorData?.id) ? `/api/users/${authorData.id}/profile-image` : null;

    return (
        <>
            <style>{`
                @keyframes confettiBurst {
                    0%   { transform: translate(-50%,-50%) translate(0,0) rotate(0deg) scale(var(--sc)); opacity:1; }
                    100% { transform: translate(-50%,-50%) translate(var(--tx),var(--ty)) rotate(var(--rot)) scale(0); opacity:0; }
                }
                @keyframes cardReveal {
                    from { opacity:0; transform:translateY(28px) scale(0.97); }
                    to   { opacity:1; transform:translateY(0) scale(1); }
                }
                @keyframes shimmer {
                    0%   { background-position: -400px 0; }
                    100% { background-position: 400px 0; }
                }
                @keyframes playPulse {
                    0%,100% { transform: scale(1); box-shadow: 0 0 0 0 rgba(59,130,246,0.5); }
                    50%     { transform: scale(1.08); box-shadow: 0 0 0 10px rgba(59,130,246,0); }
                }
                @keyframes countUp {
                    from { opacity:0; transform:translateY(6px); }
                    to   { opacity:1; transform:translateY(0); }
                }
                .card-reveal { animation: cardReveal 0.5s cubic-bezier(0.22,1,0.36,1) forwards; }
                .card-hidden { opacity:0; transform:translateY(28px) scale(0.97); }
                .play-pulse  { animation: playPulse 1.6s ease-in-out infinite; }
                .count-anim  { animation: countUp 0.4s ease-out forwards; }
            `}</style>

            <div
                ref={cardRef}
                onClick={onClick}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                className={`cursor-pointer bg-white rounded-2xl shadow-md overflow-hidden relative
                    transition-all duration-300 ease-out
                    ${hovered ? 'shadow-2xl -translate-y-2 scale-[1.02]' : ''}
                    ${visible ? 'card-reveal' : 'card-hidden'}
                `}
                style={{ willChange: 'transform' }}
            >
                <div className="relative overflow-hidden aspect-video bg-gray-200">
                    <img
                        src={getThumbnailUrl(video.id)}
                        loading="lazy"
                        alt={video.title ?? "Vidéo"}
                        className={`w-full h-full object-cover transition-transform duration-500 ${hovered ? 'scale-110' : 'scale-100'}`}
                        onError={(e) => { setImageError(p => ({ ...p, thumbnail: true })); e.currentTarget.src = "/images/placeholder-video.png"; }}
                    />

                    <div className={`absolute inset-0 bg-black transition-all duration-300 flex items-center justify-center ${hovered ? 'bg-opacity-35' : 'bg-opacity-0'}`}>
                        <div className={`transition-all duration-300 ${hovered ? 'opacity-100 scale-100' : 'opacity-0 scale-75'}`}>
                            <div className="bg-white bg-opacity-95 rounded-full p-4 play-pulse">
                                <Play className="h-8 w-8 text-blue-600" fill="currentColor" />
                            </div>
                        </div>
                    </div>

                    <div className={`absolute inset-0 rounded-t-2xl pointer-events-none transition-all duration-300 ${hovered ? 'ring-2 ring-blue-400 ring-opacity-60' : ''}`} />

                    {video.duration && (
                        <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded font-medium">
                            {video.duration}
                        </div>
                    )}
                </div>

                <div className="p-4">
                    <h3 className={`font-bold text-gray-900 line-clamp-2 mb-2 transition-colors duration-200 ${hovered ? 'text-blue-600' : ''}`}>
                        {video.title || "Sans titre"}
                    </h3>

                    {video.description && (
                        <p className="text-sm text-gray-600 line-clamp-2 mb-3">{video.description}</p>
                    )}

                    <div className="flex items-center gap-3 text-sm text-gray-500 mb-3 flex-wrap">
                        <div className={`flex items-center gap-1 transition-colors duration-200 ${hovered ? 'text-blue-500' : ''}`}>
                            <Eye size={14} />
                            <span className={visible ? 'count-anim' : ''}>{fmt(animViews, 'vue')}</span>
                        </div>
                        <button
                            onClick={handleLikeClick}
                            className={`flex items-center gap-1 transition-all duration-200 relative
                                ${hovered ? 'text-blue-500 scale-110' : 'text-gray-500'}
                                hover:scale-125 active:scale-95`}
                        >
                            <ThumbsUp size={14} />
                            <span className={visible ? 'count-anim' : ''}>{fmt(animLikes, 'like')}</span>
                            <ConfettiBurst trigger={likesBurst} />
                        </button>
                        <div className={`flex items-center gap-1 transition-colors duration-200 ${hovered ? 'text-blue-500' : ''}`}>
                            <MessageCircle size={14} />
                            <span className={visible ? 'count-anim' : ''}>{fmt(animComments, 'commentaire')}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs">
                            <Clock size={12} />
                            <span>{formatDate(video.created_at)}</span>
                        </div>
                    </div>

                    {!loadingAuthor && authorData && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <div
                                onClick={handleAuthorClick}
                                className="flex items-center gap-3 hover:bg-blue-50 -mx-2 px-2 py-2 rounded-lg transition-all duration-200 cursor-pointer group/author"
                            >
                                <div className="relative flex-shrink-0">
                                    <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center transition-all duration-200 group-hover/author:border-blue-400 group-hover/author:scale-110">
                                        {getAvatarUrl() ? (
                                            <img src={getAvatarUrl()} loading="lazy" alt={authorData.username}
                                                 className="w-full h-full object-cover"
                                                 onError={(e) => { setImageError(p => ({ ...p, avatar: true })); e.target.style.display = "none"; }} />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                                                {authorData.username.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>
                                    <div className={`absolute inset-0 rounded-full ring-2 ring-blue-400 ring-offset-1 transition-opacity duration-200 ${hovered ? 'opacity-100' : 'opacity-0'}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-semibold text-gray-900 truncate group-hover/author:text-blue-600 transition-colors">{authorData.username}</p>
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Users size={12} />
                                        <span>{authorData.subscribersCount > 0
                                            ? `${authorData.subscribersCount < 1000 ? authorData.subscribersCount : (authorData.subscribersCount/1000).toFixed(1)+'k'} abonné${authorData.subscribersCount > 1 ? 's' : ''}`
                                            : '0 abonné'}</span>
                                    </div>
                                </div>
                                <div className={`text-blue-400 transition-all duration-200 ${hovered ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2'}`}>
                                    <Play size={14} fill="currentColor" />
                                </div>
                            </div>
                        </div>
                    )}

                    {loadingAuthor && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                                <div className="flex-1">
                                    <div className="h-3 bg-gray-200 rounded animate-pulse mb-2" />
                                    <div className="h-2 bg-gray-200 rounded animate-pulse w-2/3" />
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 transition-all duration-300 ${hovered ? 'opacity-100' : 'opacity-0'}`}/>
            </div>
        </>
    );
};

export default VideoCard;