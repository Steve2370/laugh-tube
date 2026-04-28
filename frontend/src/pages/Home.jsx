import React, { useState, useEffect, useRef, useMemo } from "react";
import { useVideos } from "../hooks/useVideos";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../contexts/ToastContext";
import VideoCard from "../components/VideoCard";
import apiService from "../services/apiService";
import { Play, Search, LogIn, TrendingUp, Flame, Clock, Star, LayoutGrid, Sparkles, Trophy, Zap, CheckCircle2, Mic, Radio, Users, Swords } from "lucide-react";
const ParticleNetwork = () => {
    const canvasRef = useRef(null);
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        let animId;
        let particles = [];
        const PARTICLE_COUNT = 55;
        const MAX_DIST = 140;
        const SPEED = 0.4;

        const resize = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
        const init = () => {
            resize();
            particles = Array.from({ length: PARTICLE_COUNT }, () => ({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * SPEED,
                vy: (Math.random() - 0.5) * SPEED,
                r: 1.5 + Math.random() * 2,
            }));
        };
        const draw = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            for (let i = 0; i < particles.length; i++) {
                for (let j = i + 1; j < particles.length; j++) {
                    const dx = particles[i].x - particles[j].x;
                    const dy = particles[i].y - particles[j].y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < MAX_DIST) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(59,130,246,${(1 - dist / MAX_DIST) * 0.22})`;
                        ctx.lineWidth = 1;
                        ctx.moveTo(particles[i].x, particles[i].y);
                        ctx.lineTo(particles[j].x, particles[j].y);
                        ctx.stroke();
                    }
                }
            }
            particles.forEach(p => {
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(99,102,241,0.3)';
                ctx.fill();
            });
        };
        const loop = () => {
            particles.forEach(p => {
                p.x += p.vx; p.y += p.vy;
                if (p.x < 0 || p.x > canvas.width) p.vx *= -1;
                if (p.y < 0 || p.y > canvas.height) p.vy *= -1;
            });
            draw();
            animId = requestAnimationFrame(loop);
        };
        init(); loop();
        const ro = new ResizeObserver(() => init());
        ro.observe(canvas);
        return () => { cancelAnimationFrame(animId); ro.disconnect(); };
    }, []);

    useEffect(() => {
        document.body.style.backgroundColor = 'transparent';
        document.documentElement.style.backgroundColor = 'transparent';
        return () => {
            document.body.style.backgroundColor = '';
            document.documentElement.style.backgroundColor = '';
        };
    }, []);
    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />;
};

const FLOATING = ['😂','🤣','😄','😭','🔥','👏','💯','🎭','🎬','✨'];
const FloatingEmoji = ({ emoji, style }) => (
    <span className="absolute text-2xl select-none pointer-events-none opacity-50 animate-bounce" style={style}>
        {emoji}
    </span>
);

const HeroBanner = ({ total, videoSrc }) => (
    <div className="mb-6">
        <div className="flex justify-center mb-3">
            <div className="inline-flex items-center gap-2 bg-gray-100 text-black text-sm font-medium px-4 py-1.5 rounded-full shadow-sm">
                <Flame size={14} className="text-orange-400" />
                {total > 0 ? `${total} punchlines disponibles` : 'Bienvenue sur LaughTube'}
            </div>
        </div>
        <div className="relative rounded-2xl overflow-hidden shadow-2xl w-full" style={{ aspectRatio: '16/9' }}>
            {videoSrc ? (
                <video
                    src={videoSrc}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full bg-gray-100 flex flex-col items-center justify-center gap-3 min-h-48">
                    <div className="text-6xl animate-bounce">🎭</div>
                    <p className="text-gray-500 text-sm font-semibold">Vidéo promo à venir</p>
                </div>
            )}
        </div>
    </div>
);

const ValueSection = ({ navigateTo, isAuthenticated }) => (
    <div className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">🎭</div>
            <h3 className="font-black text-gray-900 text-lg">Un tremplin, pas juste une plateforme</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
                LaughTube, c'est une scène numérique dédié à offrir de la visibilité aux créateurs de contenu humoristique.
                <br /><br />
                <span className="font-semibold text-gray-800">Notre mission : propulser les humoristes émergents qui veulent se faire connaître.</span>
            </p>
        </div>
        <div className="bg-blue-500 rounded-2xl p-6 shadow-sm flex flex-col gap-3">
            <div className="w-11 h-11 rounded-xl bg-white bg-opacity-20 flex items-center justify-center text-2xl">👀</div>
            <h3 className="font-black text-white text-lg">Pour les spectateurs</h3>
            <ul className="text-blue-100 text-sm space-y-2">
                <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-yellow-300 flex-shrink-0 mt-0.5" /> Du contenu 100% humour, sans distractions</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-yellow-300 flex-shrink-0 mt-0.5" /> Découvrez des talents avant tout le monde</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-yellow-300 flex-shrink-0 mt-0.5" /> Une communauté qui vient pour la même raison que toi</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-yellow-300 flex-shrink-0 mt-0.5" /> Zéro drama. Que du LOL.</li>
            </ul>
            {!isAuthenticated && (
                <button onClick={() => navigateTo("register")}
                        className="mt-2 w-full bg-white text-blue-700 font-bold py-2.5 rounded-xl hover:bg-blue-50 transition-all text-sm active:scale-95">
                    Je veux rire 😂
                </button>
            )}
        </div>
        <div className="bg-gray-900 rounded-2xl p-6 shadow-sm flex flex-col gap-3">
            <div className="w-11 h-11 rounded-xl bg-white bg-opacity-10 flex items-center justify-center text-2xl">🎤</div>
            <h3 className="font-black text-white text-lg">Pour les créateurs</h3>
            <ul className="text-gray-300 text-sm space-y-2">
                <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" /> Une audience qui cherche exactement ton contenu</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" /> De la visibilité basée sur ta créativité</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" /> Une communauté engagée qui vient pour rire</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" /> Le côté humain mis en avant, pas l'algorithme</li>
            </ul>
            {!isAuthenticated && (
                <button onClick={() => navigateTo("register")}
                        className="mt-2 w-full bg-yellow-400 text-gray-900 font-bold py-2.5 rounded-xl hover:bg-yellow-300 transition-all text-sm active:scale-95">
                    Je crée du contenu 🎤
                </button>
            )}
        </div>
    </div>
);

const FILTERS = [
    { id: 'all', label: 'Tout', icon: Play },
    { id: 'trending', label: 'Tendances', icon: TrendingUp },
    { id: 'popular', label: 'Populaires', icon: Flame },
    { id: 'recent', label: 'Récents', icon: Clock },
];

const FilterBar = ({ filter, onChange }) => (
    <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map(({ id, label, icon: Icon }) => (
            <button
                key={id}
                onClick={() => onChange(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                    filter === id
                        ? 'bg-gray-900 text-white shadow-lg scale-105'
                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                }`}
            >
                <Icon size={14} />
                {label}
            </button>
        ))}
    </div>
);

const SectionTitle = ({ filter, count }) => {
    const titles = {
        all: { label: 'Toutes les punchlines', icon: LayoutGrid },
        trending: { label: 'En tendance', icon: TrendingUp },
        popular: { label: 'Les plus populaires', icon: Trophy },
        recent: { label: 'Les plus récents', icon: Zap },
    };
    const { label, icon: Icon } = titles[filter] || titles.all;
    return (
        <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center">
                <Icon size={18} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-black text-gray-900">{label}</h2>
            <span className="ml-auto text-sm text-gray-400 font-medium">{count} vidéo{count > 1 ? 's' : ''}</span>
        </div>
    );
};

const SkeletonCard = ({ delay = 0 }) => (
    <div className="bg-white rounded-2xl overflow-hidden shadow-sm" style={{ animationDelay: `${delay}ms` }}>
        <div className="aspect-video bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer" />
        <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
        </div>
    </div>
);

const Home = () => {
    const { videos, loading, getTrending, getPopular, getRecent } = useVideos();
    const { isAuthenticated } = useAuth();
    const toast = useToast();

    const [filter, setFilter] = useState("all");
    const [searchTerm, setSearchTerm] = useState("");
    const [trendingVideos, setTrendingVideos] = useState([]);
    const [popularVideos, setPopularVideos] = useState([]);
    const [recentVideos, setRecentVideos] = useState([]);
    const [isSearching, setIsSearching] = useState(false);
    const reqIdRef = useRef(0);

    const displayVideos = useMemo(() => (Array.isArray(videos) ? videos : []), [videos]);

    const handleFilterChange = async (newFilter) => {
        setFilter(newFilter);
        setSearchTerm("");
        if (newFilter === "all") return;

        const reqId = ++reqIdRef.current;
        setIsSearching(true);
        try {
            if (newFilter === "trending") {
                const result = await getTrending({ limit: 20, period: 7 });
                if (reqId !== reqIdRef.current) return;
                if (result?.success) setTrendingVideos(result.videos ?? []);
            } else if (newFilter === "popular") {
                const result = await getPopular(20);
                if (reqId !== reqIdRef.current) return;
                if (result?.success) setPopularVideos(result.videos ?? []);
            } else if (newFilter === "recent") {
                const result = await getRecent(20);
                if (reqId !== reqIdRef.current) return;
                if (result?.success) setRecentVideos(result.videos ?? []);
            }
        } catch {
            toast.error("Erreur lors du chargement");
        } finally {
            if (reqId === reqIdRef.current) setIsSearching(false);
        }
    };

    const handleVideoClick = (video) => {
        localStorage.setItem("currentVideo", JSON.stringify(video));
        window.location.hash = "#/video";
    };

    const navigateTo = (page) => { window.location.hash = `#/${page}`; };

    const baseVideos = useMemo(() => {
        switch (filter) {
            case "trending": return trendingVideos;
            case "popular": return popularVideos;
            case "recent": return recentVideos;
            default: return displayVideos;
        }
    }, [filter, trendingVideos, popularVideos, recentVideos, displayVideos]);

    const filteredVideos = useMemo(() =>
            searchTerm ? baseVideos.filter(v =>
                (v.title ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                (v.description ?? "").toLowerCase().includes(searchTerm.toLowerCase())
            ) : baseVideos
        , [baseVideos, searchTerm]);

    if (loading) {
        return (
            <div className="min-h-screen pt-20">
                <style>{`
                    @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
                    @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
                    .animate-shimmer { background-size:800px 100%; animation:shimmer 1.5s infinite linear; }
                `}</style>
                <div className="max-w-7xl mx-auto px-4 py-8">
                    <div className="h-64 bg-gradient-to-br from-blue-600 to-indigo-800 rounded-3xl mb-10 animate-pulse" />
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({length: 8}, (_,i) => <SkeletonCard key={i} delay={i * 60} />)}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 relative" style={{ backgroundColor: 'transparent' }}>

            <video
                className="bg-video"
                autoPlay
                loop
                muted
                playsInline
                style={{
                    position: 'fixed',
                    top: 0, left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: -2,
                }}
            >
                <source src="/uploads/BG.mp4" type="video/mp4" />
            </video>
            <style>{`
                @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
                @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
                .animate-shimmer { background-size:800px 100%; animation:shimmer 1.5s infinite linear; }
                .scrollbar-hide::-webkit-scrollbar { display:none; }
                .scrollbar-hide { -ms-overflow-style:none; scrollbar-width:none; }
            `}</style>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <HeroBanner
                    total={videos.length}
                    videoSrc="/uploads/laugh-intro.mp4?v=1"
                />

                <div className="mb-10 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <StandUpSection isAuthenticated={isAuthenticated} navigateTo={navigateTo} />
                    <BattleRoomSection isAuthenticated={isAuthenticated} navigateTo={navigateTo} />
                </div>

                {!isAuthenticated && (
                    <ValueSection navigateTo={navigateTo} isAuthenticated={isAuthenticated} />
                )}

                <FilterBar filter={filter} onChange={handleFilterChange} />

                {isSearching ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {Array.from({length: 4}, (_,i) => <SkeletonCard key={i} delay={i * 60} />)}
                    </div>
                ) : filteredVideos.length === 0 ? (
                    <EmptyState searchTerm={searchTerm} isAuthenticated={isAuthenticated} navigateTo={navigateTo} />
                ) : (
                    <>
                        <SectionTitle filter={filter} count={filteredVideos.length} />
                        <div className="relative rounded-3xl overflow-hidden">
                            <ParticleNetwork />
                            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-2">
                                {filteredVideos.map((video) => (
                                    <VideoCard key={video.id} video={video} onClick={() => handleVideoClick(video)} />
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

const StandUpSection = ({ isAuthenticated, navigateTo }) => {
    const [lives, setLives] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        apiService.requestV2('/lives')
            .then(r => setLives(r.lives || []))
            .catch(() => setLives([]))
            .finally(() => setLoading(false));
    }, []);

    const handleJoinLive = (live) => {
        if (!isAuthenticated) {
            window.location.hash = '#/login';
            return;
        }
        localStorage.setItem('currentLive', JSON.stringify(live));
        window.location.hash = '#/standup';
    };

    return (
        <div className="h-full">
            <div className="bg-blue-500 rounded-2xl p-5 shadow-lg h-full">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white bg-opacity-20 flex items-center justify-center">
                            <Mic size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-white font-black text-lg">Stand-Up Live</h2>
                            <p className="text-blue-100 text-xs">Performances en direct</p>
                        </div>
                    </div>
                    {isAuthenticated && (
                        <button
                            onClick={() => navigateTo('standup')}
                            className="flex items-center gap-2 bg-white text-blue-600 font-bold px-4 py-2 rounded-xl hover:bg-blue-50 transition-all text-sm active:scale-95"
                        >
                            <Radio size={15} />
                            Lancer un Stand-Up
                        </button>
                    )}
                </div>

                {loading ? (
                    <div className="flex gap-3">
                        {[1,2].map(i => (
                            <div key={i} className="h-16 w-48 bg-white bg-opacity-10 rounded-xl animate-pulse" />
                        ))}
                    </div>
                ) : lives.length === 0 ? (
                    <div className="bg-white bg-opacity-10 rounded-xl px-4 py-3 flex items-center gap-3">
                        <Mic size={20} className="text-blue-100 flex-shrink-0" />
                        <div>
                            <p className="text-white text-sm font-semibold">Aucun live en ce moment</p>
                            <p className="text-blue-100 text-xs">
                                {isAuthenticated ? 'Sois le premier à te lancer !' : 'Connecte-toi pour lancer un live'}
                            </p>
                        </div>
                        {!isAuthenticated && (
                            <button
                                onClick={() => navigateTo('login')}
                                className="ml-auto bg-white text-blue-600 font-bold px-3 py-1.5 rounded-lg text-xs hover:bg-blue-50 transition-all"
                            >
                                Se connecter
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-1">
                        {lives.map(live => (
                            <button
                                key={live.id}
                                onClick={() => handleJoinLive(live)}
                                className="flex-shrink-0 bg-white bg-opacity-15 hover:bg-opacity-25 rounded-xl px-4 py-3 flex items-center gap-3 transition-all text-left active:scale-95"
                            >
                                    <div className="relative">
                                        {live.avatar_url ? (
                                            <img
                                                src={live.avatar_url.startsWith('http') ? live.avatar_url : `/uploads/profiles/${live.avatar_url}`}
                                                alt={live.username}
                                                className="w-10 h-10 rounded-full object-cover"
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-white bg-opacity-20 flex items-center justify-center text-white font-bold text-sm">
                                                {live.username?.charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-blue-500 animate-pulse" />
                                    </div>
                                <div>
                                    <p className="text-white font-semibold text-sm">{live.username}</p>
                                    <div className="flex items-center gap-1 text-blue-100 text-xs">
                                        <Users size={11} />
                                        <span>En direct</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const BattleRoomSection = ({ isAuthenticated, navigateTo }) => (
    <div className="h-full">
        <div className="bg-blue-500 rounded-2xl p-5 shadow-lg h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white bg-opacity-20 flex items-center justify-center">
                        <Swords size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-white font-black text-lg">Battle Room</h2>
                        <p className="text-blue-100 text-xs">Défie un humoriste en duel</p>
                    </div>
                </div>
                <span className="bg-white bg-opacity-20 text-white text-xs font-bold px-3 py-1.5 rounded-full">
                    Bientôt disponible
                </span>
            </div>
            <div className="bg-white bg-opacity-10 rounded-xl px-4 py-3 flex items-center gap-3">
                <Zap size={18} className="text-blue-200 flex-shrink-0" />
                <p className="text-blue-100 text-sm">
                    Provoque un autre humoriste en duel, programmez votre battle et laissez le public voter en temps réel.
                </p>
            </div>
        </div>
    </div>
);

const EmptyState = ({ searchTerm, isAuthenticated, navigateTo }) => {
    if (searchTerm) return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-gray-900 mb-3">Aucun résultat pour "{searchTerm}"</h2>
            <p className="text-gray-600 mb-6 text-center max-w-md">Essayez avec d'autres mots-clés.</p>
        </div>
    );
    return (
        <div className="flex flex-col items-center justify-center py-20">
            <div className="text-7xl mb-4 animate-bounce">🎭</div>
            <h2 className="text-3xl font-bold text-gray-900 mb-3">Bienvenue sur LaughTube !</h2>
            <p className="text-gray-600 mb-8 text-center max-w-md">
                Aucune vidéo pour le moment.{isAuthenticated && " Soyez le premier à partager !"}
            </p>
            {isAuthenticated ? (
                <button onClick={() => navigateTo("upload")}
                        className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg flex items-center gap-2 hover:-translate-y-0.5 active:scale-95">
                    <Play className="h-5 w-5" />
                    Partagez une punchline
                </button>
            ) : (
                <button onClick={() => navigateTo("login")}
                        className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg flex items-center gap-2 hover:-translate-y-0.5 active:scale-95">
                    <LogIn className="h-5 w-5" />
                    Se connecter pour partager
                </button>
            )}
        </div>
    );
};

export default Home;