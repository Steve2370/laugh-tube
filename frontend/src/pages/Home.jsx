import React, { useState, useEffect } from 'react';
import { useVideos } from '../hooks/useVideos';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import { Play, Eye, Clock, Search, LogIn, Users, ThumbsUp, MessageCircle, TrendingUp, Filter } from 'lucide-react';
import apiService from '../services/apiService.js';

const Home = () => {
    const { videos, loading, error, getTrending, searchVideos } = useVideos();
    const { isAuthenticated } = useAuth();
    const toast = useToast();

    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState('all');
    const [displayVideos, setDisplayVideos] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    useEffect(() => {
        if (error) {
            toast.error(error);
        }
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
            if (result.success) {
                setDisplayVideos(result.videos);
            }
        } catch (err) {
            toast.error('Erreur lors de la recherche');
        } finally {
            setIsSearching(false);
        }
    };

    const handleFilterChange = async (newFilter) => {
        setFilter(newFilter);

        if (newFilter === 'trending') {
            setIsSearching(true);
            try {
                const result = await getTrending({ limit: 20, period: 7 });
                if (result.success) {
                    setDisplayVideos(result.videos);
                }
            } catch (err) {
                toast.error('Erreur lors du chargement des tendances');
            } finally {
                setIsSearching(false);
            }
        } else {
            setDisplayVideos(videos);
        }
    };

    const handleVideoClick = (video) => {
        localStorage.setItem('currentVideo', JSON.stringify(video));
        window.location.hash = '#/video';
    };

    const navigateTo = (page) => {
        window.location.hash = `#/${page}`;
    };

    const filteredVideos = displayVideos.filter(video => {
        const matchesSearch = video.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            video.description?.toLowerCase().includes(searchTerm.toLowerCase());

        if (!matchesSearch) return false;

        switch (filter) {
            case 'recent':
                return true;
            case 'popular':
                return (video.views || 0) > 100;
            default:
                return true;
        }
    });

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
                <div className="mb-8">
                    <div className="flex flex-col sm:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Rechercher des vidéos..."
                                value={searchTerm}
                                onChange={(e) => handleSearch(e.target.value)}
                                className="w-full pl-12 pr-4 py-3 bg-white border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={() => handleFilterChange('all')}
                                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                                    filter === 'all'
                                        ? 'bg-blue-500 text-white shadow-lg'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <Filter size={20} className="inline mr-2" />
                                Tout
                            </button>
                            <button
                                onClick={() => handleFilterChange('trending')}
                                className={`px-4 py-3 rounded-xl font-medium transition-all ${
                                    filter === 'trending'
                                        ? 'bg-blue-500 text-white shadow-lg'
                                        : 'bg-white text-gray-700 hover:bg-gray-50'
                                }`}
                            >
                                <TrendingUp size={20} className="inline mr-2" />
                                Tendances
                            </button>
                        </div>
                    </div>
                </div>

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
            <div className="text-center py-16 bg-white rounded-2xl shadow-xl">
                <Search className="mx-auto h-24 w-24 text-gray-300 mb-4" />
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    Aucun résultat
                </h3>
                <p className="text-gray-600 mb-4">
                    Aucune vidéo ne correspond à votre recherche "{searchTerm}"
                </p>
                <p className="text-sm text-gray-500">
                    Essayez avec d'autres mots-clés
                </p>
            </div>
        );
    }

    if (isAuthenticated) {
        return (
            <div className="text-center py-16 bg-white rounded-2xl shadow-xl">
                <Play className="mx-auto h-24 w-24 text-gray-300 mb-4" />
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    Aucune punchline disponible
                </h3>
                <p className="text-gray-600 mb-8">
                    Soyez le premier à partager une punchline avec la communauté !
                </p>
                <button
                    onClick={() => navigateTo('upload')}
                    className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg inline-flex items-center gap-2"
                >
                    <Play size={20} />
                    Uploader ma première punchline
                </button>
            </div>
        );
    } else {
        return (
            <div className="text-center py-16 bg-white rounded-2xl shadow-xl">
                <Play className="mx-auto h-24 w-24 text-gray-300 mb-4" />
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">
                    Aucune punchline disponible
                </h3>
                <p className="text-gray-600 mb-8">
                    Connectez-vous pour être le premier à partager du contenu !
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <button
                        onClick={() => navigateTo('login')}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg inline-flex items-center justify-center gap-2"
                    >
                        <LogIn size={20} />
                        Se connecter
                    </button>
                    <button
                        onClick={() => navigateTo('register')}
                        className="bg-white border-2 border-gray-300 text-gray-700 px-8 py-3.5 rounded-xl font-semibold hover:bg-gray-50 transition-all inline-flex items-center justify-center gap-2"
                    >
                        Créer un compte
                    </button>
                </div>
            </div>
        );
    }
};

const VideoCard = ({ video, onClick }) => {
    const [authorData, setAuthorData] = useState(null);
    const [loadingAuthor, setLoadingAuthor] = useState(true);

    useEffect(() => {
        const loadAuthorData = async () => {
            if (!video.author_id && !video.auteur_id && !video.user_id) {
                setLoadingAuthor(false);
                return;
            }

            try {
                const userId = video.author_id || video.auteur_id || video.user_id;
                const abonnesData = await apiService.getNombreAbonnes(userId);

                setAuthorData({
                    id: userId,
                    username: video.auteur || video.author || 'Créateur',
                    subscribersCount: abonnesData.count || 0
                });
            } catch (err) {
                setAuthorData({
                    id: video.author_id || video.auteur_id || video.user_id,
                    username: video.auteur || video.author || 'Créateur',
                    subscribersCount: 0
                });
            } finally {
                setLoadingAuthor(false);
            }
        };

        loadAuthorData();
    }, [video]);

    const getThumbnailUrl = (videoId) => apiService.getThumbnailUrl(videoId);

    const formatDate = (dateString) => {
        if (!dateString) return 'Date inconnue';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;

        const secondes = Math.floor(diff / 1000);
        const minutes = Math.floor(diff / 60000);
        const heures = Math.floor(diff / 3600000);
        const jours = Math.floor(diff / 86400000);
        const semaines = Math.floor(diff / 604800000);
        const mois = Math.floor(diff / 2592000000);
        const annees = Math.floor(diff / 31536000000);

        if (secondes < 60) return secondes <= 1 ? 'À l\'instant' : `Il y a ${secondes}s`;
        if (minutes < 60) return minutes === 1 ? 'Il y a 1min' : `Il y a ${minutes}min`;
        if (heures < 24) return heures === 1 ? 'Il y a 1h' : `Il y a ${heures}h`;
        if (jours < 7) return jours === 1 ? 'Il y a 1j' : `Il y a ${jours}j`;
        if (semaines < 4) return semaines === 1 ? 'Il y a 1 semaine' : `Il y a ${semaines} semaines`;
        if (mois < 12) return mois === 1 ? 'Il y a 1 mois' : `Il y a ${mois} mois`;
        return annees === 1 ? 'Il y a 1 an' : `Il y a ${annees} ans`;
    };

    const formatViews = (views) => {
        if (!views || views === 0) return '0 vue';
        if (views === 1) return '1 vue';
        if (views < 1000) return `${views} vues`;
        if (views < 1000000) return `${Math.floor(views / 100) / 10}k vues`;
        return `${Math.floor(views / 100000) / 10}M vues`;
    };

    const formatSubscribers = (count) => {
        if (!count || count === 0) return '0 abonné';
        if (count === 1) return '1 abonné';
        if (count < 1000) return `${count} abonnés`;
        if (count < 1000000) return `${Math.floor(count / 100) / 10}k abonnés`;
        return `${Math.floor(count / 100000) / 10}M abonnés`;
    };

    const handleAuthorClick = (e) => {
        e.stopPropagation();
        if (authorData?.id) {
            localStorage.setItem('channelUser', JSON.stringify({
                id: authorData.id,
                username: authorData.username
            }));
            window.location.hash = '#/chaine';
        }
    };

    const getProfileImageUrl = (userId) => {
        const localImage = localStorage.getItem(`profileImage_${userId}`);
        if (localImage) return localImage;
        return apiService.getProfileImageUrl(userId);
    };

    return (
        <div
            onClick={onClick}
            className="cursor-pointer bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden group"
        >
            <div className="relative overflow-hidden aspect-video bg-gray-200">
                <img
                    src={getThumbnailUrl(video.id)}
                    alt={video.title ?? "Vidéo"}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                        if (e.currentTarget.dataset.fallbackApplied) return;
                        e.currentTarget.dataset.fallbackApplied = "1";
                        e.currentTarget.src = "/images/placeholder-video.png";
                    }}
                />

                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-white bg-opacity-90 rounded-full p-4">
                            <Play className="h-8 w-8 text-blue-600" fill="currentColor" />
                        </div>
                    </div>
                </div>

                {video.duration && (
                    <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        {video.duration}
                    </div>
                )}
            </div>

            <div className="p-4">
                <h3 className="font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-blue-600 transition-colors">
                    {video.title || 'Sans titre'}
                </h3>

                {video.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">
                        {video.description}
                    </p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3 flex-wrap">
                    <div className="flex items-center gap-1">
                        <Eye size={14} />
                        <span>{formatViews(video.views)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <ThumbsUp size={14} />
                        <span>{video.likes || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <MessageCircle size={14} />
                        <span>{video.commentaires || 0}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>{formatDate(video.created_at)}</span>
                    </div>
                </div>

                {!loadingAuthor && authorData && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <div
                            onClick={handleAuthorClick}
                            className="flex items-center gap-3 hover:bg-gray-50 -mx-2 px-2 py-2 rounded-lg transition-colors cursor-pointer"
                        >
                            <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 bg-gradient-to-br from-blue-500 to-blue-600">
                                    <img
                                        src={getProfileImageUrl(authorData.id)}
                                        alt={authorData.username}
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                            e.target.parentElement.innerHTML = `
                                                <div class="w-full h-full flex items-center justify-center text-white text-sm font-bold bg-gradient-to-br from-blue-500 to-blue-600">
                                                    ${authorData.username.charAt(0).toUpperCase()}
                                                </div>
                                            `;
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">
                                    {authorData.username}
                                </p>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <Users size={12} />
                                    <span>{formatSubscribers(authorData.subscribersCount)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {loadingAuthor && (
                    <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 animate-pulse"></div>
                            <div className="flex-1">
                                <div className="h-3 bg-gray-200 rounded animate-pulse mb-2"></div>
                                <div className="h-2 bg-gray-200 rounded animate-pulse w-2/3"></div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Home;