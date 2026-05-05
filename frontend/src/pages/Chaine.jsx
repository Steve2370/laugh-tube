import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import {useAbonnement} from '../hooks/useAbonnement.js';
import { useToast } from '../contexts/ToastContext.jsx';
import apiService from '../services/apiService.js';
import BoutonAbonne from '../components/BoutonAbonne.jsx';
import BoutonSignaler from '../components/BoutonSignaler.jsx';
import BoutonBloquer from '../components/BoutonBloquer.jsx';
import LoadingPage from '../components/LoadingPage';
import VideoCard from '../components/VideoCard.jsx';
import {
    ArrowLeft,
    Calendar,
    Users,
    Video,
    Swords
} from 'lucide-react';

const ChaineHeader = ({ channelUser, stats, subscribersCount, currentUser, challenged, setChallenged, toast }) => {
    const getAvatarUrl = () => {
        if (!channelUser?.avatar_url || channelUser.avatar_url.includes('default')) return null;
        if (channelUser.avatar_url.startsWith('http')) return channelUser.avatar_url;
        if (channelUser.avatar_url.startsWith('/')) return channelUser.avatar_url;
        return `/uploads/profiles/${channelUser.avatar_url}`;
    };

    const getCoverUrl = () => {
        if (!channelUser?.cover_url || channelUser.cover_url.includes('default')) return null;
        if (channelUser.cover_url.startsWith('http')) return channelUser.cover_url;
        if (channelUser.cover_url.startsWith('/')) return channelUser.cover_url;
        return `/uploads/profiles/${channelUser.cover_url}`;
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

            <div className="h-32 sm:h-56">
                {getCoverUrl() ? (
                    <img src={getCoverUrl()} alt="Couverture" className="w-full h-full object-cover"
                         onError={(e) => { e.currentTarget.style.display='none'; e.currentTarget.parentElement.innerHTML=`<div class="w-full h-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600"></div>`; }}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600" />
                )}
            </div>

            <div className="px-4 sm:px-8 pb-6 sm:pb-8">

                <div className="flex items-end justify-between -mt-8 sm:-mt-16 mb-4">
                    <div className="w-16 h-16 sm:w-36 sm:h-36 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center flex-shrink-0">
                        {getAvatarUrl() ? (
                            <img src={getAvatarUrl()} alt="Avatar" className="w-full h-full object-cover"
                                 onError={(e) => { e.target.style.display='none'; e.target.parentElement.innerHTML=`<span class="text-white text-2xl sm:text-5xl font-bold">${channelUser.username.charAt(0).toUpperCase()}</span>`; }}
                            />
                        ) : (
                            <span className="text-white text-2xl sm:text-5xl font-bold">
                                {channelUser.username.charAt(0).toUpperCase()}
                            </span>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row items-end sm:items-center gap-2 mb-1">
                        <BoutonSignaler videoId={null} userId={channelUser.id} />

                        {currentUser && currentUser.id !== channelUser.id && (
                            <button
                                onClick={async () => {
                                    if (challenged) return;
                                    try {
                                        await apiService.requestV2(`/users/${channelUser.id}/challenge`, { method: 'POST' });
                                        setChallenged(true);
                                        toast.success(`Défi envoyé à ${channelUser.username}`);
                                    } catch (err) {
                                        const msg = err?.message || '';
                                        if (msg.includes('400') || msg.includes('déjà')) {
                                            toast.error('Un défi est déjà en cours avec cet utilisateur');
                                        } else {
                                            toast.error('Erreur lors de l\'envoi du défi');
                                        }
                                    }
                                }}
                                disabled={challenged}
                                className={`flex items-center gap-2 font-bold px-4 py-2 rounded-xl text-sm transition-all active:scale-95 ${
                                    challenged
                                        ? 'bg-gray-400 text-gray-200 cursor-not-allowed'
                                        : 'bg-gray-900 hover:bg-gray-800 text-white'
                                }`}
                            >
                                <Swords size={16} />
                                {challenged ? 'Défi envoyé' : 'Défier'}
                            </button>
                        )}

                        <BoutonBloquer userId={channelUser.id} />
                        <BoutonAbonne targetUserId={channelUser.id} />
                    </div>
                </div>

                <div className="mb-5">
                    <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-1">{channelUser.username}</h1>
                    {channelUser.bio && (
                        <p className="text-gray-700 mb-3 text-base sm:text-lg">{channelUser.bio}</p>
                    )}
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                        <Calendar size={15} />
                        Chaîne créée en{' '}
                        {new Date(channelUser.created_at || Date.now()).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                    </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-gray-100 pt-5">
                    <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-blue-600 flex items-center justify-center gap-1">
                            <Users size={20} className="text-blue-500" />
                            <span>{formatSubscribers(subscribersCount)}</span>
                        </div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-0.5">Abonnés</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-blue-600">{formatNumber(stats.totalVideos)}</div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-0.5">Vidéos</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-blue-600">{formatNumber(stats.totalViews)}</div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-0.5">Vues</div>
                    </div>
                    <div className="text-center">
                        <div className="text-2xl sm:text-3xl font-bold text-blue-600">{formatNumber(stats.totalLikes)}</div>
                        <div className="text-xs sm:text-sm text-gray-600 mt-0.5">J'aime</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const VideoGrid = ({ videos, onVideoClick }) => {
    if (videos.length === 0) {
        return (
            <div className="text-center py-16">
                <Video size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Aucune vidéo</h3>
                <p className="text-gray-500">Cette chaîne n'a pas encore publié de vidéos.</p>
            </div>
        );
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => (
                <VideoCard key={video.id} video={video} onClick={() => onVideoClick(video)} />
            ))}
        </div>
    );
};

const LoadingState = () => (
    <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
            <LoadingPage size={120} />
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
    const [challenged, setChallenged] = useState(false);
    const [battleCheckTime, setBattleCheckTime] = useState(Date.now());
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
        setChallenged(false);

        if (currentUser && channelUser?.id && currentUser.id !== channelUser.id) {
            apiService.requestV2('/battles/my')
                .then(r => {
                    const active = (r.battles || []).find(b =>
                        ['pending', 'accepted', 'scheduled', 'live'].includes(b.status) &&
                        ((Number(b.challenger_id) === Number(currentUser.id) && Number(b.challenged_id) === Number(channelUser.id)) ||
                            (Number(b.challenger_id) === Number(channelUser.id) && Number(b.challenged_id) === Number(currentUser.id)))
                    );
                    setChallenged(!!active);
                })
                .catch(() => setChallenged(false));
        }
    }, [currentUser?.id, channelUser?.id, battleCheckTime]);


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

            const enrichedVideos = videosList.map(v => ({
                ...v,
                user_id: v.user_id || channelUserData.id,
                username: v.username || channelUserData.username,
                auteur: v.auteur || channelUserData.username,
                avatar_url: v.avatar_url || channelUserData.avatar_url || null,
            }));

            setVideos(enrichedVideos);

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
        setBattleCheckTime(Date.now());
    };

    const calculateStats = () => {
        const totalViews = videos.reduce((sum, v) => sum + (v.views    || v.views_count    || 0), 0);
        const totalLikes = videos.reduce((sum, v) => sum + (v.likes    || v.likes_count    || 0), 0);
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
                            currentUser={currentUser}
                            challenged={challenged}
                            setChallenged={setChallenged}
                            toast={toast}
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