import React, { useState, useEffect, useCallback } from 'react';
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

const ProfileHeader = ({ stats, isOwnProfile, targetUserId }) => {
    const [avatarPreview, setAvatarPreview] = useState(null);
    const [bioDraft, setBioDraft] = useState('');
    const [savingBio, setSavingBio] = useState(false);
    const [coverPreview, setCoverPreview] = useState(null);
    const [uploadingAvatar, setUploadingAvatar] = useState(false);
    const [uploadingCover, setUploadingCover] = useState(false);
    const { user: authUser, updateUser } = useAuth();
    const user = authUser;

    const toast = useToast();
    const { loading, subscribersCount, isSubscribed, toggle } = useAbonnement(targetUserId);

    useEffect(() => {
        if (authUser?.id) {
            setBioDraft(authUser.bio || '');

            if (authUser.avatar_url) {
                const avatarUrl = authUser.avatar_url.startsWith('http')
                    ? authUser.avatar_url
                    : `${window.location.origin}${authUser.avatar_url}`;
                setAvatarPreview(avatarUrl);
            } else {
                setAvatarPreview('/images/default-avatar.png');
            }

            if (authUser.cover_url) {
                const coverUrl = authUser.cover_url.startsWith('http')
                    ? authUser.cover_url
                    : `${window.location.origin}${authUser.cover_url}`;
                setCoverPreview(coverUrl);
            } else {
                setCoverPreview('/images/default-cover.png');
            }
        }
    }, [authUser?.id, authUser?.avatar_url, authUser?.cover_url]);


    const handleAvatarChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
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

            if (result?.avatar_url) {
                toast.success(result.message ?? "Photo de profil mise à jour");

                const fullUrl = result.avatar_url.startsWith('http')
                    ? result.avatar_url
                    : `${window.location.origin}${result.avatar_url}`;

                setAvatarPreview(fullUrl);

                updateUser({ avatar_url: result.avatar_url });

                URL.revokeObjectURL(previewUrl);
            } else {
                throw new Error(result?.error || "Upload avatar failed");
            }
        } catch (err) {
            console.error("Erreur avatar:", err);
            toast.error("Erreur lors de la mise à jour");
            if (authUser?.avatar_url) {
                const avatarUrl = authUser.avatar_url.startsWith('http')
                    ? authUser.avatar_url
                    : `${window.location.origin}${authUser.avatar_url}`;
                setAvatarPreview(avatarUrl);
            } else {
                setAvatarPreview('/images/default-avatar.png');
            }
        } finally {
            setUploadingAvatar(false);
            e.target.value = "";
        }
    };



    const handleCoverChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
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

            if (result?.cover_url) {
                toast.success(result.message ?? "Couverture mise à jour");

                const fullUrl = result.cover_url.startsWith('http')
                    ? result.cover_url
                    : `${window.location.origin}${result.cover_url}`;

                setCoverPreview(fullUrl);

                updateUser({ cover_url: result.cover_url });

                URL.revokeObjectURL(previewUrl);
            } else {
                throw new Error(result?.error || "Upload cover failed");
            }
        } catch (err) {
            console.error("Erreur cover:", err);
            toast.error("Erreur lors de la mise à jour");
            if (authUser?.cover_url) {
                const coverUrl = authUser.cover_url.startsWith('http')
                    ? authUser.cover_url
                    : `${window.location.origin}${authUser.cover_url}`;
                setCoverPreview(coverUrl);
            } else {
                setCoverPreview('/images/default-cover.png');
            }
        } finally {
            setUploadingCover(false);
            e.target.value = "";
        }
    };


    const handleBioSave = async () => {
        if (bioDraft === authUser?.bio) return;

        try {
            setSavingBio(true);
            await apiService.updateBio(bioDraft);
            updateUser({ bio: bioDraft });
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
                    <img src={coverPreview} alt="Couverture" className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200"></div>
                )}

                {isOwnProfile && (
                    <div className="absolute inset-0 bg-black bg-opacity-30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <label htmlFor="cover-upload" className="bg-white bg-opacity-90 px-4 py-2 rounded-lg cursor-pointer hover:bg-opacity-100 transition-all flex items-center gap-2">
                            {uploadingCover ? <RefreshCw size={18} className="animate-spin" /> : <Camera size={18} />}
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
                    <div className="w-40 h-40 rounded-full overflow-hidden border-4 border-white shadow-2xl bg-gradient-to-br from-blue-500 to-blue-600 relative group/avatar">
                        {avatarPreview ? (
                            <img
                                src={avatarPreview}
                                alt="Avatar"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-white text-5xl font-bold">
                                {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                        )}

                        {isOwnProfile && (
                            <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover/avatar:opacity-100 transition-opacity flex items-center justify-center">
                                <label htmlFor="avatar-upload" className="cursor-pointer text-white flex flex-col items-center gap-1">
                                    {uploadingAvatar ? (
                                        <RefreshCw size={24} className="animate-spin" />
                                    ) : (
                                        <Camera size={24} />
                                    )}
                                    <span className="text-xs">{uploadingAvatar ? 'Upload...' : 'Modifier'}</span>
                                </label>
                                <input
                                    id="avatar-upload"
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleAvatarChange}
                                    disabled={uploadingAvatar}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end pt-4">
                    {!isOwnProfile && (
                        <button
                            onClick={toggle}
                            disabled={loading}
                            className={`px-6 py-2.5 rounded-xl font-semibold transition-all ${
                                isSubscribed
                                    ? 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                    : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 shadow-lg'
                            }`}
                        >
                            {loading ? (
                                <RefreshCw size={18} className="animate-spin inline mr-2" />
                            ) : (
                                <Users size={18} className="inline mr-2" />
                            )}
                            {isSubscribed ? 'Abonné' : "S'abonner"}
                        </button>
                    )}
                </div>

                <div className="pt-24">
                    <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
                        <div className="flex-1">
                            <h1 className="text-4xl font-bold text-gray-900 mb-4">
                                {user?.username || 'Utilisateur'}
                            </h1>

                            {isOwnProfile ? (
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                        Biographie
                                    </label>
                                    <textarea
                                        value={bioDraft}
                                        onChange={(e) => setBioDraft(e.target.value)}
                                        placeholder="Parlez-nous de vous..."
                                        className="w-full p-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500 resize-none"
                                        rows={3}
                                        maxLength={200}
                                    />
                                    <div className="flex items-center justify-between mt-2">
                                        <span className="text-xs text-gray-500">
                                            {bioDraft.length}/200 caractères
                                        </span>
                                        {bioDraft !== (user?.bio || '') && (
                                            <button
                                                onClick={handleBioSave}
                                                disabled={savingBio}
                                                className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50"
                                            >
                                                {savingBio ? (
                                                    <RefreshCw size={16} className="animate-spin inline mr-2" />
                                                ) : null}
                                                Sauvegarder
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                user?.bio && (
                                    <p className="text-gray-700 mb-4 text-lg">
                                        {user.bio}
                                    </p>
                                )
                            )}

                            <div className="flex items-center gap-4 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                    <Calendar size={16} />
                                    Membre depuis{' '}
                                    {new Date(user?.created_at || Date.now()).toLocaleDateString('fr-FR', {
                                        month: 'long',
                                        year: 'numeric',
                                    })}
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
                                    {formatNumber(stats?.totalVideos || 0)}
                                </div>
                                <div className="text-sm text-gray-600">Vidéos</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-600">
                                    {formatNumber(stats?.totalViews || 0)}
                                </div>
                                <div className="text-sm text-gray-600">Vues</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-blue-600">
                                    {formatNumber(stats?.totalLikes || 0)}
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

const VideosTab = ({ videos, onVideoClick, onDelete, isOwnProfile }) => {
    if (videos.length === 0) {
        return (
            <div className="text-center py-16">
                <Video size={64} className="mx-auto text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-700 mb-2">
                    Aucune vidéo
                </h3>
                <p className="text-gray-500">
                    {isOwnProfile
                        ? "Vous n'avez pas encore publié de vidéos."
                        : "Cet utilisateur n'a pas encore publié de vidéos."}
                </p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {videos.map((video) => (
                <div
                    key={video.id}
                    className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-xl transition-all duration-300 group"
                >
                    <div
                        onClick={() => onVideoClick(video)}
                        className="relative aspect-video bg-gray-200 overflow-hidden cursor-pointer"
                    >
                        <img
                            src={apiService.getThumbnailUrl(video.id)}
                            alt={video.title || 'Vidéo'}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                            onError={(e) => {
                                e.currentTarget.src = '/images/placeholder-video.png';
                            }}
                        />

                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all duration-300 flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                <div className="bg-white bg-opacity-90 rounded-full p-3">
                                    <Eye className="h-6 w-6 text-blue-600" />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="p-4">
                        <h3 className="font-semibold text-gray-900 line-clamp-2 mb-2">
                            {video.title}
                        </h3>

                        <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                            <span className="flex items-center gap-1">
                                <Eye size={14} />
                                {video.views || 0} vues
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

                        {isOwnProfile && (
                            <div className="flex gap-2 pt-3 border-t border-gray-100">
                                <button
                                    onClick={() => onDelete(video)}
                                    className="flex-1 px-3 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-colors flex items-center justify-center gap-2"
                                >
                                    <Trash2 size={16} />
                                    Supprimer
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

const AnalyticsTab = ({ stats, videos }) => {
    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <Video className="text-blue-600" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                        {stats?.totalVideos || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Vidéos</div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <Eye className="text-blue-600" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                        {stats?.totalViews || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total Vues</div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <ThumbsUp className="text-blue-600" size={24} />
                    </div>
                    <div className="text-3xl font-bold text-gray-900 mb-1">
                        {stats?.totalLikes || 0}
                    </div>
                    <div className="text-sm text-gray-600">Total J'aime</div>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-2">
                        <BarChart3 className="text-blue-600" size={24} />
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
    const isOwnProfile = true;
    const targetUserId = user?.id;
    const [activeTab, setActiveTab] = useState('videos');
    const [stats, setStats] = useState({
        totalVideos: 0,
        totalViews: 0,
        totalLikes: 0,
        totalComments: 0,
        engagementRate: 0,
    });

    const loadUserData = useCallback(async () => {
        if (!user?.id) return;

        try {
            await getUserVideos(user.id);
        } catch (err) {
            console.error('Erreur chargement données:', err);
            toast.error('Erreur lors du chargement des vidéos');
        }
    }, [user?.id, getUserVideos]);

    const calculateStats = () => {
        const totalViews = userVideos.reduce((sum, v) => sum + (v.views || 0), 0);
        const totalLikes = userVideos.reduce((sum, v) => sum + (v.likes || 0), 0);
        const totalComments = userVideos.reduce((sum, v) => sum + (v.comments || 0), 0);
        const engagementRate =
            totalViews > 0 ? Math.round(((totalLikes + totalComments) / totalViews) * 100) : 0;

        setStats({
            totalVideos: userVideos.length,
            totalViews,
            totalLikes,
            totalComments,
            engagementRate,
        });
    };

    useEffect(() => {
        loadUserData();
    }, [loadUserData]);

    useEffect(() => {
        if (userVideos.length > 0) {
            calculateStats();
        }
    }, [userVideos]);

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
                            stats={stats}
                            isOwnProfile={isOwnProfile}
                            targetUserId={targetUserId}
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
                                        Vidéos ({userVideos.length})
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