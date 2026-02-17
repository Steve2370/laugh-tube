import { useEffect, useMemo, useState } from "react";
import { Play, Eye, ThumbsUp, MessageCircle, Clock, Users } from "lucide-react";
import apiService from "../services/apiService.js";

const VideoCard = ({ video, onClick }) => {
    const [authorData, setAuthorData] = useState(null);
    const [loadingAuthor, setLoadingAuthor] = useState(true);
    const [imageError, setImageError] = useState({ thumbnail: false, avatar: false });

    const authorId = useMemo(() => {
        return video?.user_id ?? video?.userId ?? video?.author_id ?? video?.authorId ?? null;
    }, [video]);

    const views = useMemo(() => {
        return video?.views ?? video?.nb_vues ?? video?.view_count ?? 0;
    }, [video]);

    const likes = useMemo(() => {
        return video?.likes ?? video?.likes_count ?? 0;
    }, [video]);

    const comments = useMemo(() => {
        return video?.commentaires ?? video?.comments ?? video?.comments_count ?? 0;
    }, [video]);

    useEffect(() => {
        let cancelled = false;

        const loadAuthorData = async () => {
            const fallback = {
                id: authorId,
                username: video?.username || video?.author_name || video?.auteur || "Utilisateur",
                avatar_url: null,
                subscribersCount: 0,
            };

            if (!authorId) {
                if (!cancelled) {
                    setAuthorData(fallback);
                    setLoadingAuthor(false);
                }
                return;
            }

            try {
                const [profileResponse, subsResponse] = await Promise.allSettled([
                    apiService.getUserProfile(authorId),
                    apiService.getSubscribersCount(authorId),
                ]);

                let rawProfile = {};
                if (profileResponse.status === "fulfilled" && profileResponse.value?.success) {
                    rawProfile =
                        profileResponse.value?.data?.profile ||
                        profileResponse.value?.data ||
                        profileResponse.value?.profile ||
                        {};
                }

                let subscribersCount = 0;
                if (subsResponse.status === "fulfilled") {
                    const v = subsResponse.value;
                    subscribersCount =
                        v?.count ??
                        v?.subscribers_count ??
                        v?.data?.count ??
                        v?.data?.subscribers_count ??
                        0;
                } else {
                    subscribersCount = rawProfile.subscribers_count ?? rawProfile.subscribersCount ?? 0;
                }

                const merged = {
                    id: authorId,
                    username: rawProfile.username || fallback.username,
                    avatar_url: rawProfile.avatar_url || rawProfile.avatar || null,
                    subscribersCount: Number(subscribersCount) || 0,
                };

                if (!cancelled) setAuthorData(merged);
            } catch (err) {
                console.error("Erreur lors du chargement de l'auteur:", err);
                if (!cancelled) setAuthorData(fallback);
            } finally {
                if (!cancelled) setLoadingAuthor(false);
            }
        };

        loadAuthorData();
        return () => {
            cancelled = true;
        };
    }, [authorId, video]);

    const getThumbnailUrl = (videoId) => {
        if (imageError.thumbnail) return "/images/placeholder-video.png";
        return apiService.getThumbnailUrl(videoId);
    };

    const formatDate = (dateString) => {
        if (!dateString) return "Date inconnue";
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

        if (secondes < 60) return secondes <= 1 ? "À l'instant" : `Il y a ${secondes}s`;
        if (minutes < 60) return minutes === 1 ? "Il y a 1min" : `Il y a ${minutes}min`;
        if (heures < 24) return heures === 1 ? "Il y a 1h" : `Il y a ${heures}h`;
        if (jours < 7) return jours === 1 ? "Il y a 1j" : `Il y a ${jours}j`;
        if (semaines < 4) return semaines === 1 ? "Il y a 1 semaine" : `Il y a ${semaines} semaines`;
        if (mois < 12) return mois === 1 ? "Il y a 1 mois" : `Il y a ${mois} mois`;
        return annees === 1 ? "Il y a 1 an" : `Il y a ${annees} ans`;
    };

    const formatViews = (v) => {
        if (!v || v === 0) return "0 vue";
        if (v === 1) return "1 vue";
        if (v < 1000) return `${v} vues`;
        if (v < 1000000) return `${Math.floor(v / 100) / 10}k vues`;
        return `${Math.floor(v / 100000) / 10}M vues`;
    };

    const formatSubscribers = (count) => {
        if (!count || count === 0) return "0 abonné";
        if (count === 1) return "1 abonné";
        if (count < 1000) return `${count} abonnés`;
        if (count < 1000000) return `${Math.floor(count / 100) / 10}k abonnés`;
        return `${Math.floor(count / 100000) / 10}M abonnés`;
    };

    const handleAuthorClick = (e) => {
        e.stopPropagation();
        if (authorData?.id) {
            localStorage.setItem(
                "channelUser",
                JSON.stringify({ id: authorData.id, username: authorData.username })
            );
            window.location.hash = "#/chaine";
        }
    };

    const getAvatarUrl = () => {
        if (imageError.avatar || !authorData?.avatar_url) return null;
        return authorData?.id ? `/api/users/${authorData.id}/profile-image` : null;
    };

    return (
        <div
            onClick={onClick}
            className="cursor-pointer bg-white rounded-2xl shadow-md hover:shadow-2xl transition-all duration-300 overflow-hidden group"
        >
            <div className="relative overflow-hidden aspect-video bg-gray-200">
                <img
                    src={getThumbnailUrl(video.id)}
                    loading="lazy"
                    alt={video.title ?? "Vidéo"}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    onError={(e) => {
                        setImageError((prev) => ({ ...prev, thumbnail: true }));
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
                    {video.title || "Sans titre"}
                </h3>

                {video.description && (
                    <p className="text-sm text-gray-600 line-clamp-2 mb-3">{video.description}</p>
                )}

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3 flex-wrap">
                    <div className="flex items-center gap-1">
                        <Eye size={14} />
                        <span>{formatViews(views)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <ThumbsUp size={14} />
                        <span>{likes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <MessageCircle size={14} />
                        <span>{comments}</span>
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
                                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                    {getAvatarUrl() ? (
                                        <img
                                            src={getAvatarUrl()}
                                            loading="lazy"
                                            alt={authorData.username}
                                            className="w-full h-full object-cover"
                                            onError={(e) => {
                                                setImageError((prev) => ({ ...prev, avatar: true }));
                                                e.target.style.display = "none";
                                            }}
                                        />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center text-white text-sm font-bold">
                                            {authorData.username.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-900 truncate">{authorData.username}</p>
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

export default VideoCard;
