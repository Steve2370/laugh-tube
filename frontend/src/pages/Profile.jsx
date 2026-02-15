import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext.jsx';
import { useVideos } from '../hooks/useVideos';
import { useAbonnement } from '../hooks/useAbonnement';
import apiService from '../services/apiService.js';

import {
    User,
    Calendar,
    Eye,
    ThumbsUp,
    MessageCircle,
    Upload,
    Settings,
    Camera,
    Video,
    BarChart3,
    RefreshCw,
    Users,
    Trash2,
    TrendingUp,
    Clock,
} from 'lucide-react';

const LoadingState = () => (
    <div className="flex items-center justify-center py-20">
        <div className="text-center">
            <RefreshCw className="h-12 w-12 text-blue-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Chargement...</p>
        </div>
    </div>
);

const ProfileHeader = ({
    user,
    stats,
    coverPreview,
    onCoverChange,
    isOwnProfile,
    targetUserId
}) => {
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [bioDraft, setBioDraft] = useState('');
    const [savingBio, setSavingBio] = useState(false);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);

    const toast = useToast();
    const { loading, subscribersCount, isSubscribed, toggle } = useAbonnement(targetUserId);

    useEffect(() => {
        if (user) {
            setBioDraft(user.bio || '');
            loadProfileImage();
        }
    }, [user]);

    const loadProfileImage = async () => {
        try {
            const imageUrl = apiService.getProfileImageUrl(user.id);
            setAvatarPreview(imageUrl);
        } catch (err) {
            console.error('Erreur chargement image:', err);
        }
    };

    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Veuillez choisir une image");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("L'image ne doit pas dépasser 5MB");
            return;
        }

        try {
            setUploadingAvatar(true);

            const previewUrl = URL.createObjectURL(file);
            setAvatarPreview(previewUrl);

            const formData = new FormData();
            formData.append("avatar", file);

            const result = await apiService.uploadAvatar(formData);

            if (result?.success) {
                toast.success("Photo de profil mise à jour");
            } else {
                throw new Error("Upload avatar failed");
            }

        } catch (err) {
            console.error('Erreur avatar:', err);
            toast.error("Erreur lors de la mise à jour");
        } finally {
            setUploadingAvatar(false);
            e.target.value = "";
        }
    };


    const handleCoverChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            toast.error("Veuillez choisir une image");
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            toast.error("L'image ne doit pas dépasser 5MB");
            return;
        }

        try {
            setUploadingCover(true);

            const previewUrl = URL.createObjectURL(file);
            setCoverPreview(previewUrl);

            const formData = new FormData();
            formData.append("cover", file);

            const result = await apiService.uploadCover(formData);

            if (result?.success) {
                toast.success("Couverture mise à jour");
            } else {
                throw new Error("Upload cover failed");
            }

        } catch (err) {
            console.error("Erreur cover:", err);
            toast.error("Erreur lors de la mise à jour");
        } finally {
            setUploadingCover(false);
            e.target.value = "";
        }
    };



    const handleBioSave = async () => {
        if (bioDraft === user?.bio) return;

        try {
            setSavingBio(true);
            await apiService.updateUserBio(bioDraft);
            toast.success("Biographie mise à jour");
        } catch (err) {
            console.error('Erreur sauvegarde bio:', err);
            toast.error("Erreur lors de la sauvegarde");
        } finally {
            setSavingBio(false);
        }
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
            <div className="relative h-56 group">
                {coverPreview ? (
                    <img
                        src={coverPreview}
                        alt="Couverture"
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"></div>
                )}

                {isOwnProfile && (
                    <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label
                            htmlFor="cover-upload"
                            className="bg-white bg-opacity-90 px-4 py-2 rounded-lg cursor-pointer hover:bg-opacity-100 transition-all flex items-center gap-2"
                        >
                            {uploadingCover ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : (
                                <Camera size={18} />
                            )}
                            {uploadingCover ? 'Upload...' : 'Modifier la couverture'}
                        </label>
                        <input
                            id="cover-upload"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleCoverChange}
                            disabled={uploadingCover}
                        />
                    </div>
                )}
            </div>

            <div className="relative px-8 pb-8">
                <div className="absolute -top-20 left-8">
                    <div className="relative group">
                        <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt="Avatar"
                                    className="w-full h-full object-cover"
                                />
                            ) : (
                                <span className="text-white text-5xl font-bold">
                                    {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                                </span>
                            )}
                        </div>

                        {isOwnProfile && (
                            <>
                                <label
                                    htmlFor="avatar-upload"
                                    className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                                >
                                    {uploadingAvatar ? (
                                        <RefreshCw className="h-8 w-8 text-white animate-spin" />
                                    ) : (
                                        <Camera className="h-8 w-8 text-white" />
                                    )}
                                </label>
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarChange}
                                    disabled={uploadingAvatar}
                                />
                            </>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4 gap-3">
                    {isOwnProfile ? (
                        <>
                            <button
                                onClick={() => window.location.hash = '#/upload'}
                                className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg flex items-center gap-2"
                            >
                                <Upload size={18} />
                                Upload vidéo
                            </button>
                            <button
                                onClick={() => window.location.hash = '#/settings'}
                                className="bg-gray-100 text-gray-700 px-6 py-2.5 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center gap-2"
                            >
                                <Settings size={18} />
                                Paramètres
                            </button>
                        </>
                    ) : (
                        <button
                            onClick={toggle}
                            disabled={loading}
                            className={`px-6 py-2.5 rounded-xl font-semibold transition-all shadow-lg flex items-center gap-2 ${
                                isSubscribed
                                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    : 'bg-gradient-to-r from-red-500 to-red-600 text-white hover:from-red-600 hover:to-red-700'
                            }`}
                        >
                            {loading ? (
                                <RefreshCw size={18} className="animate-spin" />
                            ) : (
                                <Users size={18} />
                            )}
                            {isSubscribed ? 'Abonné' : 'S\'abonner'}
                        </button>
                    )}
                </div>

                <div className="mt-16">
                    <h1 className="text-3xl font-bold text-gray-900 mb-1">
                        {user?.username || 'Utilisateur'}
                    </h1>
                    <p className="text-gray-500 flex items-center gap-2 mb-4">
                        <Calendar size={16} />
                        Membre depuis {user?.created_at ? new Date(user.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : 'récemment'}
                    </p>

                    <div className="flex gap-6 mb-6">
                        <div className="flex items-center gap-2">
                            <Users size={18} className="text-gray-400" />
                            <span className="font-bold text-gray-900">
                                {formatSubscribers(subscribersCount)}
                            </span>
                            <span className="text-gray-500">abonnés</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Video size={18} className="text-gray-400" />
                            <span className="font-bold text-gray-900">
                                {stats?.totalVideos || 0}
                            </span>
                            <span className="text-gray-500">vidéos</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Eye size={18} className="text-gray-400" />
                            <span className="font-bold text-gray-900">
                                {formatNumber(stats?.totalViews)}
                            </span>
                            <span className="text-gray-500">vues</span>
                        </div>
                    </div>

                    {isOwnProfile ? (
                        <div>
                            <textarea
                                value={bioDraft}
                                onChange={(e) => setBioDraft(e.target.value)}
                                placeholder="Parlez-nous de vous..."
                                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-700"
                                rows={3}
                                maxLength={500}
                            />
                            <div className="flex justify-between items-center mt-2">
                                <span className="text-xs text-gray-400">
                                    {bioDraft.length}/500
                                </span>
                                {bioDraft !== (user?.bio || '') && (
                                    <button
                                        onClick={handleBioSave}
                                        disabled={savingBio}
                                        className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                                    >
                                        {savingBio ? 'Sauvegarde...' : 'Sauvegarder'}
                                    </button>
                                )}
                            </div>
                        </div>
                    ) : (
                        user?.bio && (
                            <p className="text-gray-700 leading-relaxed bg-gray-50 px-4 py-3 rounded-xl">
                                {user.bio}
                            </p>
                        )
                    )}
                </div>
            </div>
        </div>
    );
};

const VideosTab = ({ videos, onVideoClick, onDelete, isOwnProfile }) => {
    const formatDate = (date) => {
        if (!date) return 'Date inconnue';
        return new Date(date).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    };

    const formatDuration = (seconds) => {
        if (!seconds) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const formatViews = (count) => {
        if (!count) return '0 vue';
        if (count === 1) return '1 vue';
        if (count < 1000) return `${count} vues`;
        if (count < 1000000) return `${Math.floor(count / 100) / 10}k vues`;
        return `${Math.floor(count / 100000) / 10}M vues`;
    };

    if (!videos || videos.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4">
                    <Video size={40} className="text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Aucune vidéo</h3>
                <p className="text-gray-600 mb-6">
                    {isOwnProfile
                        ? 'Commencez à partager vos contenus en uploadant votre première vidéo'
                        : 'Cet utilisateur n\'a pas encore publié de vidéo'}
                </p>
                {isOwnProfile && (
                    <button
                        onClick={() => window.location.hash = '#/upload'}
                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg inline-flex items-center gap-2"
                    >
                        <Upload size={20} />
                        Uploader une vidéo
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
                <div
                    key={video.id}
                    className="bg-white rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-all cursor-pointer group"
                >
                    <div
                        onClick={() => onVideoClick(video)}
                        className="relative aspect-video bg-gradient-to-br from-gray-100 to-gray-200 overflow-hidden"
                    >
                        {video.thumbnail_url ? (
                            <img
                                src={video.thumbnail_url}
                                alt={video.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <Video size={48} className="text-gray-400" />
                            </div>
                        )}
                        {video.duration && (
                            <div className="absolute bottom-2 right-2 bg-black bg-opacity-80 text-white text-xs px-2 py-1 rounded">
                                {formatDuration(video.duration)}
                            </div>
                        )}
                    </div>

                    <div className="p-4">
                        <h3
                            onClick={() => onVideoClick(video)}
                            className="font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors"
                        >
                            {video.title}
                        </h3>

                        <div className="flex items-center gap-4 text-sm text-gray-600 mb-3">
                            <span className="flex items-center gap-1">
                                <Eye size={14} />
                                {formatViews(video.views)}
                            </span>
                            <span className="flex items-center gap-1">
                                <ThumbsUp size={14} />
                                {video.likes || 0}
                            </span>
                            <span className="flex items-center gap-1">
                                <MessageCircle size={14} />
                                {video.comments || 0}
                            </span>
                        </div>

                        <div className="flex items-center justify-between">
                            <p className="text-xs text-gray-500">
                                {formatDate(video.created_at)}
                            </p>

                            {isOwnProfile && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(video);
                                    }}
                                    className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Supprimer"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

const AnalyticsTab = ({ stats, videos }) => {
    const [selectedPeriod, setSelectedPeriod] = useState('7d');

    const getEngagementTrend = () => {
        if (!videos || videos.length === 0) return 'stable';

        const sorted = [...videos].sort((a, b) =>
            new Date(b.created_at) - new Date(a.created_at)
        );

        const recent = sorted.slice(0, 3);
        const older = sorted.slice(3, 6);

        if (recent.length === 0 || older.length === 0) return 'stable';

        const recentAvg = recent.reduce((sum, v) => sum + (v.views || 0), 0) / recent.length;
        const olderAvg = older.reduce((sum, v) => sum + (v.views || 0), 0) / older.length;

        if (recentAvg > olderAvg * 1.1) return 'up';
        if (recentAvg < olderAvg * 0.9) return 'down';
        return 'stable';
    };

    const trend = getEngagementTrend();

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-900">Vue d'ensemble</h3>
                <select
                    value={selectedPeriod}
                    onChange={(e) => setSelectedPeriod(e.target.value)}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                    <option value="7d">7 derniers jours</option>
                    <option value="30d">30 derniers jours</option>
                    <option value="all">Tout le temps</option>
                </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <Eye className="text-blue-600" size={24} />
                        <TrendingUp className={`text-${trend === 'up' ? 'green' : trend === 'down' ? 'red' : 'gray'}-600`} size={20} />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                        {stats?.totalViews?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-gray-600">Vues totales</div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <ThumbsUp className="text-green-600" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                        {stats?.totalLikes?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-gray-600">J'aime</div>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <MessageCircle className="text-purple-600" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                        {stats?.totalComments?.toLocaleString() || 0}
                    </div>
                    <div className="text-sm text-gray-600">Commentaires</div>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <BarChart3 className="text-orange-600" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                        {stats?.engagementRate || 0}%
                    </div>
                    <div className="text-sm text-gray-600">Engagement</div>
                </div>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Clock size={20} />
                    Vidéos récentes
                </h4>
                <div className="space-y-3">
                    {videos.slice(0, 5).map((video) => (
                        <div
                            key={video.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <div className="flex-1">
                                <p className="font-medium text-gray-900 line-clamp-1">
                                    {video.title}
                                </p>
                                <div className="flex gap-4 text-sm text-gray-600 mt-1">
                                    <span>{video.views || 0} vues</span>
                                    <span>{video.likes || 0} j'aime</span>
                                    <span>{video.comments || 0} commentaires</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const Profile = () => {
    const { user, isAuthenticated } = useAuth();
    const toast = useToast();
    const { videos: userVideos, loading: videosLoading, getUserVideos } = useVideos();

    const [activeTab, setActiveTab] = useState('videos');
    const [coverPreview, setCoverPreview] = useState(null);
    const [videos, setVideos] = useState([]);
    const [stats, setStats] = useState({
        totalVideos: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        engagementRate: 0,
    });

    useEffect(() => {
        if (user?.id) {
            loadUserData();
        }
    }, [user]);

    useEffect(() => {
        if (videos.length > 0) {
            calculateStats();
        }
    }, [videos]);

    const loadUserData = async () => {
        try {
            await getUserVideos(user.id);
        } catch (err) {
            console.error('Erreur chargement données:', err);
            toast.error('Erreur lors du chargement des vidéos');
        }
    };

    useEffect(() => {
        if (userVideos) {
            setVideos(userVideos);
        }
    }, [userVideos]);

    const calculateStats = () => {
        const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
        const totalLikes = videos.reduce((sum, v) => sum + (v.likes || 0), 0);
        const totalComments = videos.reduce((sum, v) => sum + (v.comments || 0), 0);
        const engagementRate =
            totalViews > 0 ? Math.round(((totalLikes + totalComments) / totalViews) * 100) : 0;

        setStats({
            totalVideos: videos.length,
            totalViews,
            totalLikes,
            totalComments,
            engagementRate,
        });
    };

    const handleCoverChange = (e) => {
        setCoverPreview(e.target.result);
    };

    const handleVideoSelect = (video) => {
        window.location.hash = `#/video/${video.id}`;
    };

    const handleDeleteVideo = async (video) => {
        const confirmed = window.confirm(
            `Êtes-vous sûr de vouloir supprimer "${video.title}" ?\n\nCette action est irréversible.`
        );

        if (!confirmed) return;

        try {
            await apiService.deleteVideo(video.id);
            setVideos(prev => prev.filter(v => v.id !== video.id));
            toast.success('Vidéo supprimée avec succès');
        } catch (err) {
            console.error('Erreur suppression:', err);
            toast.error('Erreur lors de la suppression');
        }
    };

    if (!isAuthenticated || !user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                            <User size={40} className="text-blue-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Accès restreint</h2>
                        <p className="text-gray-600 mb-6">
                            Connectez-vous pour accéder à votre profil
                        </p>
                        <button
                            onClick={() => window.location.hash = '#/login'}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg"
                        >
                            Se connecter
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-50 to-blue-50">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {videosLoading ? (
                    <LoadingState />
                ) : (
                    <>
                        <ProfileHeader
                            user={user}
                            stats={stats}
                            coverPreview={coverPreview}
                            onCoverChange={handleCoverChange}
                            isOwnProfile={true}
                            targetUserId={user.id}
                        />

                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                            <div className="border-b border-gray-200 bg-gray-50">
                                <nav className="flex space-x-8 px-6">
                                    <button
                                        onClick={() => setActiveTab('videos')}
                                        className={`py-4 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors ${
                                            activeTab === 'videos'
                                                ? 'border-blue-600 text-blue-600'
                                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        <Video size={18} />
                                        Vidéos ({videos.length})
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('analytics')}
                                        className={`py-4 border-b-2 font-semibold text-sm flex items-center gap-2 transition-colors ${
                                            activeTab === 'analytics'
                                                ? 'border-blue-600 text-blue-600'
                                                : 'border-transparent text-gray-600 hover:text-gray-900'
                                        }`}
                                    >
                                        <BarChart3 size={18} />
                                        Analytiques
                                    </button>
                                </nav>
                            </div>

                            <div className="p-6">
                                {activeTab === 'videos' && (
                                    <VideosTab
                                        videos={videos}
                                        onVideoClick={handleVideoSelect}
                                        onDelete={handleDeleteVideo}
                                        isOwnProfile={true}
                                    />
                                )}
                                {activeTab === 'analytics' && (
                                    <AnalyticsTab stats={stats} videos={videos} />
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Profile;