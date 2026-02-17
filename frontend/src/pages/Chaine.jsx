import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {useAbonnement} from '../hooks/useAbonnement.js';
import { useToast } from '../contexts/ToastContext.jsx';
import apiService from '../services/apiService.js';
import BoutonAbonne from '../components/BoutonAbonne.jsx';
import {
    ArrowLeft,
    Calendar,
    Eye,
    ThumbsUp,
    MessageCircle,
    Users,
    Video,
    Play,
} from 'lucide-react';

const ChaineHeader = ({ channelUser, stats, subscribersCount }) => {
    const getAvatarUrl = () => {
        if (!channelUser?.id) return null;
        return `/api/users/${channelUser.id}/profile-image`;
    };

    const getCoverUrl = () => {
        if (!channelUser?.id) return null;
        return `/api/users/${channelUser.id}/cover-image`;
    };

    const formatSubscribers = (count) => {
        if (!count || count === 0) return '0';
        if (count === 1) return '1';
        if (count < 1000) return `${count}`;
        if (count < 1000000) return `${Math.floor(count / 100) / 10}k`;
        return `${Math.floor(count / 100000) / 10}M`;
    };

    const formatNumber = (num) => {
        if (!num) return '0';
        if (num < 1000) return num.toString();
        if (num < 1000000) return `${Math.floor(num / 100) / 10}k`;
        return `${Math.floor(num / 100000) / 10}M`;
    };

    return (
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-8">
            <div className="relative h-56">
                {getCoverUrl() ? (
                    <img
                        src={getCoverUrl()}
                        alt="Couverture"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.parentElement.innerHTML = `
                                <div class="w-full h-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600"></div>
                            `;
                        }}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600"></div>
                )}
            </div>

            <div className="relative px-8 pb-8">
                <div className="absolute -top-20 left-8">
                    <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                        {getAvatarUrl() ? (
                            <img
                                src={getAvatarUrl()}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    e.target.style.display = 'none';
                                    e.target.parentElement.innerHTML = `
                                        <span class="text-white text-5xl font-bold">
                                            ${channelUser.username.charAt(0).toUpperCase()}
                                        </span>
                                    `;
                                }}
                            />
                        ) : (
                            <span className="text-white text-5xl font-bold">
                                {channelUser.username.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    <BoutonAbonne targetUserId={channelUser.id} />
                </div>

                <div className="pt-24">
                    <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
                        <div className="flex-1">
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">
                                {channelUser.username}
                            </h1>

                            {channelUser.bio && (
                                <p className="text-gray-700 mb-4 text-lg">
                                    {channelUser.bio}
                                </p>
                            )}

                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Calendar size={16} />
                                    Chaîne créée en{' '}
                                    {new Date(channelUser.created_at || Date.now()).toLocaleDateString(
                                        'fr-FR',
                                        {
                                            month: 'long',
                                            year: 'numeric',
                                        }
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-600 flex items-center justify-center gap-1">
                                    <Users size={24} className="text-blue-500" />
                                    <span>{formatSubscribers(subscribersCount)}</span>
                                </div>
                                <div className="text-sm text-gray-600">Abonnés</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-600">
                                    {formatNumber(stats.totalVideos)}
                                </div>
                                <div className="text-sm text-gray-600">Vidéos</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-600">
                                    {formatNumber(stats.totalViews)}
                                </div>
                                <div className="text-sm text-gray-600">Vues</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-600">
                                    {formatNumber(stats.totalLikes)}
                                </div>
                                <div className="text-sm text-gray-600">J'aime</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VideoGrid = ({ videos, onVideoClick }) => {
    const formatNumber = (num) => {
        if (!num) return '0';
        if (num < 1000) return num.toString();
        if (num < 1000000) return `${Math.floor(num / 100) / 10}k`;
        return `${Math.floor(num / 100000) / 10}M`;
    };

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

    if (videos.length === 0) {
        return (
            <div className="text-center py-16">
                <Video size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Aucune vidéo
                </h3>
                <p className="text-gray-500">
                    Cette chaîne n'a pas encore publié de vidéos.
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => (
                <div
                    key={video.id}
                    onClick={() => onVideoClick(video)}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 cursor-pointer group"
                >
                    <div className="relative aspect-video bg-gray-200 overflow-hidden">
                        <img
                            src={apiService.getThumbnailUrl(video.id)}
                            alt={video.title || "Vidéo"}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                                e.currentTarget.src = '/images/placeholder-video.png';
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
                        <h3 className="font-bold text-gray-900 line-clamp-2 mb-2">
                            {video.title || 'Sans titre'}
                        </h3>

                        <div className="flex items-center gap-4 text-sm text-gray-500 flex-wrap">
                            <span className="flex items-center gap-1">
                                <Eye size={14} />
                                {formatNumber(video.views || video.views_count || 0)}
                            </span>
                            <span className="flex items-center gap-1">
                                <ThumbsUp size={14} />
                                {formatNumber(video.likes || video.likes_count || 0)}
                            </span>
                            <span className="flex items-center gap-1">
                                <MessageCircle size={14} />
                                {formatNumber(video.comments || video.comments_count || 0)}
                            </span>
                        </div>

                        <p className="text-xs text-gray-500 mt-2">
                            {formatDate(video.created_at)}
                        </p>
                    </div>
                </div>
            ))}
        </div>
    );
};

const LoadingState = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600 font-medium">Chargement de la chaîne...</p>
        </div>
    </div>
);

const Chaine = () => {
    const { user: currentUser } = useAuth();
    const toast = useToast();

    const [channelUser, setChannelUser] = useState(null);
    const [videos, setVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalVideos: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
    });

    const { subscribersCount, refresh: refreshAbonnement } = useAbonnement(channelUser?.id);

    useEffect(() => {
        if (channelUser?.id) {
            refreshAbonnement();
        }
    }, [channelUser?.id]);

    useEffect(() => {
        loadChannelData();
    }, []);

    useEffect(() => {
        if (videos.length > 0) {
            calculateStats();
        }
    }, [videos]);

    const loadChannelData = async () => {
        try {
            setLoading(true);

            const storedChannelUser = localStorage.getItem('channelUser');
            if (!storedChannelUser) {
                toast.error('Aucune chaîne sélectionnée');
                window.location.hash = '#/home';
                return;
            }

            const channelUserData = JSON.parse(storedChannelUser);
            setChannelUser(channelUserData);

            const userVideosResponse = await apiService.getUserVideos(channelUserData.id);
            const videosList = userVideosResponse.success
                ? userVideosResponse.videos
                : Array.isArray(userVideosResponse)
                    ? userVideosResponse
                    : [];

            setVideos(videosList);

            try {
                const profileResponse = await apiService.getUserProfile(channelUserData.id);
                if (profileResponse.success && profileResponse.data) {
                    setChannelUser(prev => ({
                        ...prev,
                        ...profileResponse.data,
                    }));
                }
            } catch (err) {
                console.log('Profil non disponible, utilisation des données de base');
            }

        } catch (err) {
            console.error('Erreur chargement chaîne:', err);
            toast.error('Erreur lors du chargement de la chaîne');
        } finally {
            setLoading(false);
        }
    };

    const calculateStats = () => {
        const totalViews    = videos.reduce((sum, v) => sum + (v.views    || v.views_count    || 0), 0);
        const totalLikes    = videos.reduce((sum, v) => sum + (v.likes    || v.likes_count    || 0), 0);
        const totalComments = videos.reduce((sum, v) => sum + (v.comments || v.comments_count || 0), 0);

        setStats({
            totalVideos: videos.length,
            totalViews,
            totalLikes,
            totalComments,
        });
    };

    const handleVideoClick = (video) => {
        localStorage.setItem('currentVideo', JSON.stringify(video));
        window.location.hash = '#/video';
    };

    const navigateTo = (page) => {
        window.location.hash = `#/${page}`;
    };

    const goBack = () => {
        window.history.back();
    };

    if (!channelUser) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <Users size={64} className="mx-auto text-gray-300 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">
                            Chaîne introuvable
                        </h2>
                        <p className="text-gray-600 mb-6">
                            Impossible de charger cette chaîne
                        </p>
                        <button
                            onClick={() => navigateTo('home')}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
                        >
                            Retour à l'accueil
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                <button
                    onClick={goBack}
                    className="mb-6 flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-colors"
                >
                    <ArrowLeft size={20} />
                    <span className="font-medium">Retour</span>
                </button>

                {loading ? (
                    <LoadingState />
                ) : (
                    <>
                        <ChaineHeader
                            channelUser={channelUser}
                            stats={stats}
                            subscribersCount={subscribersCount}
                        />

                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
                                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                                    <Video size={24} className="text-blue-600" />
                                    Vidéos ({stats?.totalVideos || 0})
                                </h2>
                            </div>

                            <div className="p-6">
                                <VideoGrid
                                    videos={videos}
                                    onVideoClick={handleVideoClick}
                                />
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Chaine;