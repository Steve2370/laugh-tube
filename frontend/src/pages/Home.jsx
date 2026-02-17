import React, { useState, useEffect, useRef, useMemo } from "react";
import { useVideos } from "../hooks/useVideos";
import { useAuth } from "../hooks/useAuth";
import { useToast } from "../contexts/ToastContext";
import VideoCard from "../components/VideoCard";
import { Play, Search, LogIn } from "lucide-react";

const Home = () => {
    const { videos, loading, error, getTrending, searchVideos } = useVideos();
    const { isAuthenticated } = useAuth();
    const toast = useToast();

    const [searchTerm, setSearchTerm] = useState("");
    const [filter, setFilter] = useState("all");
    const [trendingVideos, setTrendingVideos] = useState([]);
    const [displayVideos, setDisplayVideos] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (error) toast.error(error);
    }, [error, toast]);

    useEffect(() => {
        setDisplayVideos(videos);
    }, [videos]);

    const handleSearch = async (value) => {
        setSearchTerm(value);

        if (!value.trim()) {
            setDisplayVideos(videos);
            return;
        }

        if (value.length < 2) return;

        setIsSearching(true);
        try {
            const result = await searchVideos(value, { limit: 20 });
            if (result?.success) {
                setDisplayVideos(result.videos ?? []);
            }
        } catch (err) {
            toast.error("Erreur lors de la recherche");
        } finally {
            setIsSearching(false);
        }
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
        } catch {
            toast.error("Erreur lors du chargement des tendances");
        } finally {
            setIsSearching(false);
        }
    };

    const handleVideoClick = (video) => {
        localStorage.setItem("currentVideo", JSON.stringify(video));
        window.location.hash = "#/video";
    };

    const navigateTo = (page) => {
        window.location.hash = `#/${page}`;
    };

    const baseVideos = useMemo(() => {
        if (filter === "trending") return trendingVideos;
        return displayVideos;
    }, [filter, trendingVideos, displayVideos]);

    const filteredVideos = useMemo(() => {
        return baseVideos.filter((video) => {
            const q = searchTerm.toLowerCase();
            const matchesSearch =
                (video.title ?? "").toLowerCase().includes(q) ||
                (video.description ?? "").toLowerCase().includes(q);

            if (!matchesSearch) return false;

            switch (filter) {
                case "popular":
                    return (video.views || 0) > 100;
                case "recent":
                case "all":
                case "trending":
                default:
                    return true;
            }
        });
    }, [baseVideos, searchTerm, filter]);

    if (loading) {
        return (
            <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-50 to-blue-50">
                <div className="flex items-center justify-center min-h-[60vh]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600 font-medium">Chargement des vidéos...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {isSearching && (
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-500 mx-auto mb-2"></div>
                        <p className="text-gray-600">Recherche en cours...</p>
                    </div>
                )}

                {!isSearching && filteredVideos.length === 0 ? (
                    <EmptyState
                        searchTerm={searchTerm}
                        isAuthenticated={isAuthenticated}
                        navigateTo={navigateTo}
                    />
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredVideos.map((video) => (
                            <VideoCard
                                key={video.id}
                                video={video}
                                onClick={() => handleVideoClick(video)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

const EmptyState = ({ searchTerm, isAuthenticated, navigateTo }) => {
    if (searchTerm) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Search className="h-24 w-24 text-gray-300 mb-6" />
                <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    Aucun résultat pour "{searchTerm}"
                </h2>
                <p className="text-gray-600 mb-6 text-center max-w-md">
                    Essayez avec d'autres mots-clés ou explorez les vidéos populaires.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center py-20">
            <Play className="h-24 w-24 text-blue-400 mb-6" />
            <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Bienvenue sur Laugh Tube
            </h2>
            <p className="text-gray-600 mb-8 text-center max-w-md">
                Aucune vidéo disponible pour le moment.
                {isAuthenticated && " Soyez le premier à partager du contenu !"}
            </p>
            {isAuthenticated ? (
                <button
                    onClick={() => navigateTo("upload")}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg flex items-center gap-2"
                >
                    <Play className="h-5 w-5" />
                    Télécharger une vidéo
                </button>
            ) : (
                <button
                    onClick={() => navigateTo("login")}
                    className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg flex items-center gap-2"
                >
                    <LogIn className="h-5 w-5" />
                    Se connecter pour partager
                </button>
            )}
        </div>
    );
};

export default Home;
