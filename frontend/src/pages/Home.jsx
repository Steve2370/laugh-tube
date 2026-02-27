import React, { useState, useEffect, useRef, useMemo } from "react";
import { useVideos } from "../hooks/useVideos";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../contexts/ToastContext";
import VideoCard from "../components/VideoCard";
import { Play, Search, LogIn, TrendingUp, Flame, Clock, Star, LayoutGrid, Sparkles, Trophy, Zap, CheckCircle2 } from "lucide-react";


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
    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }} />;
};

const FLOATING = ['😂','🤣','😄','😭','🔥','👏','💯','🎭','🎬','✨'];
const FloatingEmoji = ({ emoji, style }) => (
    <span className="absolute text-2xl select-none pointer-events-none opacity-50 animate-bounce" style={style}>
        {emoji}
    </span>
);

const HeroBanner = ({ isAuthenticated, navigateTo, total }) => {
    const particles = useMemo(() =>
            Array.from({ length: 12 }, (_, i) => ({
                emoji: FLOATING[i % FLOATING.length],
                style: {
                    left: `${(i * 8.5) % 100}%`,
                    top: `${10 + (i * 17) % 75}%`,
                    animationDelay: `${(i * 0.3) % 2}s`,
                    animationDuration: `${2 + (i % 3) * 0.5}s`,
                    fontSize: `${1.2 + (i % 3) * 0.4}rem`,
                }
            }))
        , []);

    return (
        <div className="relative overflow-hidden rounded-3xl mb-6 bg-blue-500 shadow-2xl">
            {particles.map((p, i) => <FloatingEmoji key={i} {...p} />)}
            <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-400 rounded-full opacity-10 blur-3xl" />
            <div className="absolute -bottom-16 -left-16 w-64 h-64 bg-indigo-400 rounded-full opacity-10 blur-3xl" />

            <div className="relative z-10 px-8 py-12 text-center">
                <div className="inline-flex items-center gap-2 bg-white bg-opacity-20 backdrop-blur-sm text-white text-sm font-medium px-4 py-1.5 rounded-full mb-4">
                    <Flame size={14} className="text-orange-300" />
                    {total > 0 ? `${total} punchlines disponibles` : 'Bienvenue sur LaughTube'}
                </div>

                <h1 className="text-4xl md:text-5xl font-black text-white mb-3 leading-tight">
                    Là où le rire prend{' '}
                    <span className="text-yellow-400">toute sa place</span>
                </h1>

                <p className="text-blue-100 text-lg mb-2 max-w-xl mx-auto font-medium">
                    YouTube ? TikTok ? Trop de recettes de cuisine, trop de drama, trop de tout.
                </p>
                <p className="text-white text-xl mb-8 max-w-xl mx-auto font-bold">
                    LaughTube, c'est <span className="text-yellow-400">100% humour</span>. Rien d'autre. On est sérieux là-dedans. 😄
                </p>

                <div className="flex items-center justify-center gap-4 flex-wrap">
                    {isAuthenticated ? (
                        <button
                            onClick={() => navigateTo("upload")}
                            className="flex items-center gap-2 bg-white text-blue-700 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
                        >
                            <Play size={18} fill="currentColor" />
                            Partager une punchline
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={() => navigateTo("register")}
                                className="flex items-center gap-2 bg-white text-blue-700 font-bold px-6 py-3 rounded-xl hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
                            >
                                <Star size={18} />
                                Je veux rire 😂
                            </button>
                            <button
                                onClick={() => navigateTo("register")}
                                className="flex items-center gap-2 bg-yellow-400 text-blue-900 font-bold px-6 py-3 rounded-xl hover:bg-yellow-300 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95"
                            >
                                <Play size={18} fill="currentColor" />
                                Je crée du contenu 🎤
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

const ValueSection = ({ navigateTo, isAuthenticated }) => (
    <div className="mb-10 grid grid-cols-1 md:grid-cols-3 gap-4">

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 flex flex-col gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-100 flex items-center justify-center text-2xl">🎭</div>
            <h3 className="font-black text-gray-900 text-lg">Pas un second YouTube</h3>
            <p className="text-gray-600 text-sm leading-relaxed">
                YouTube et TikTok, c'est bien. Mais tu y cherches du rire et tu finis par regarder un tutoriel de plomberie à 2h du matin.
                <br /><br />
                <span className="font-semibold text-gray-800">LaughTube : uniquement du contenu qui fait rire.</span> Promis, pas de plomberie.
            </p>
        </div>

        <div className="bg-blue-500 rounded-2xl p-6 shadow-sm flex flex-col gap-3">
            <div className="w-11 h-11 rounded-xl bg-white bg-opacity-20 flex items-center justify-center text-2xl">👀</div>
            <h3 className="font-black text-white text-lg">Pour les spectateurs</h3>
            <ul className="text-blue-100 text-sm space-y-2">
                <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-yellow-300 flex-shrink-0 mt-0.5" /> Du rire garanti, pas de contenu hors sujet</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-yellow-300 flex-shrink-0 mt-0.5" /> Une plateforme pensée pour se divertir vite</li>
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
                <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" /> Moins de compétition avec du contenu hors sujet</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" /> Tu ne cours pas après un algorithme invisible</li>
                <li className="flex items-start gap-2"><CheckCircle2 size={15} className="text-yellow-400 flex-shrink-0 mt-0.5" /> Le côté humain est mis en avant ici</li>
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
    { id: 'recent', label: 'Récentes', icon: Clock },
];

const FilterBar = ({ filter, onChange }) => (
    <div className="flex gap-2 mb-8 overflow-x-auto pb-1 scrollbar-hide">
        {FILTERS.map(({ id, label, icon: Icon }) => (
            <button
                key={id}
                onClick={() => onChange(id)}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-full font-semibold text-sm whitespace-nowrap transition-all duration-200
                    ${filter === id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600 hover:shadow-md hover:-translate-y-0.5'
                }`}
            >
                <Icon size={14} />
                {label}
            </button>
        ))}
    </div>
);


const SkeletonCard = ({ delay = 0 }) => (
    <div
        className="bg-white rounded-2xl shadow-md overflow-hidden opacity-0"
        style={{ animation: `fadeIn 0.4s ease-out ${delay}ms forwards` }}
    >
        <div className="aspect-video bg-gray-200 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-shimmer" />
        </div>
        <div className="p-4 space-y-3">
            <div className="h-4 bg-gray-200 rounded animate-pulse w-4/5" />
            <div className="h-3 bg-gray-200 rounded animate-pulse w-3/5" />
            <div className="flex gap-3">
                <div className="h-3 bg-gray-200 rounded animate-pulse w-12" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-12" />
                <div className="h-3 bg-gray-200 rounded animate-pulse w-16" />
            </div>
            <div className="pt-2 border-t border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse" />
                <div className="flex-1 space-y-2">
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                    <div className="h-2 bg-gray-200 rounded animate-pulse w-1/2" />
                </div>
            </div>
        </div>
    </div>
);


const SectionTitle = ({ filter, count }) => {
    const titles = {
        all: { text: 'Toutes les punchlines', icon: <LayoutGrid size={22} className="text-blue-500" /> },
        trending: { text: 'En tendance', icon: <TrendingUp size={22} className="text-orange-500" /> },
        popular: { text: 'Les plus populaires', icon: <Trophy size={22} className="text-yellow-500" /> },
        recent: { text: 'Les plus récentes', icon: <Zap size={22} className="text-green-500" /> },
    };
    const { text, icon } = titles[filter] || titles.all;
    return (
        <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                {icon} {text}
                {count > 0 && (
                    <span className="text-sm font-medium text-gray-400 ml-1">({count})</span>
                )}
            </h2>
            <div className="h-1 flex-1 ml-6 bg-gradient-to-r from-blue-200 to-transparent rounded-full" />
        </div>
    );
};

const Home = () => {
    const { videos, loading, error, getTrending, searchVideos } = useVideos();
    const { isAuthenticated } = useAuth();
    const toast = useToast();

    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("all");
    const [trendingVideos, setTrendingVideos] = useState([]);
    const [displayVideos, setDisplayVideos] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => { if (error) toast.error(error); }, [error, toast]);
    useEffect(() => { setDisplayVideos(videos); }, [videos]);
    useEffect(() => {
        const hash = window.location.hash;
        if (hash.includes('verified=1')) {
            toast.success('Email vérifié avec succès ! Bienvenue sur LaughTube 🎉');
            window.location.hash = '#/home';
        }
    }, []);

    const handleSearch = async (value) => {
        setSearchTerm(value);
        if (!value.trim()) { setDisplayVideos(videos); return; }
        if (value.length < 2) return;
        setIsSearching(true);
        try {
            const result = await searchVideos(value, { limit: 20 });
            if (result?.success) setDisplayVideos(result.videos ?? []);
        } catch { toast.error("Erreur lors de la recherche"); }
        finally { setIsSearching(false); }
    };

    const reqIdRef = useRef(0);
    const handleFilterChange = async (newFilter) => {
        setFilter(newFilter);
        if (newFilter !== "trending") return;
        const reqId = ++reqIdRef.current;
        setIsSearching(true);
        try {
            const result = await getTrending({ limit: 20, period: 7 });
            if (reqId !== reqIdRef.current) return;
            if (result?.success) setTrendingVideos(result.videos ?? []);
        } catch { toast.error("Erreur lors du chargement des tendances"); }
        finally { setIsSearching(false); }
    };

    const handleVideoClick = (video) => {
        localStorage.setItem("currentVideo", JSON.stringify(video));
        window.location.hash = "#/video";
    };

    const navigateTo = (page) => { window.location.hash = `#/${page}`; };

    const baseVideos = useMemo(() => filter === "trending" ? trendingVideos : displayVideos, [filter, trendingVideos, displayVideos]);

    const filteredVideos = useMemo(() => baseVideos.filter((video) => {
        const q = searchTerm.toLowerCase();
        const matchesSearch = (video.title ?? "").toLowerCase().includes(q) || (video.description ?? "").toLowerCase().includes(q);
        if (!matchesSearch) return false;
        if (filter === 'popular') return (video.views || 0) > 100;
        return true;
    }), [baseVideos, searchTerm, filter]);

    if (loading) {
        return (
            <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-50 to-blue-50">
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
        <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-50 to-blue-50">
            <style>{`
                @keyframes fadeIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
                @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
                .animate-shimmer { background-size:800px 100%; animation:shimmer 1.5s infinite linear; }
                .scrollbar-hide::-webkit-scrollbar { display:none; }
                .scrollbar-hide { -ms-overflow-style:none; scrollbar-width:none; }
            `}</style>

            <div className="max-w-7xl mx-auto px-4 py-8">
                <HeroBanner
                    isAuthenticated={isAuthenticated}
                    navigateTo={navigateTo}
                    total={videos.length}
                />

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
                    Partager une punchline
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