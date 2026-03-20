import React, { useState, useEffect, useRef } from 'react';
import { ThumbsUp, ThumbsDown, Share2, Send, User, MessageCircle, Calendar, X, Eye, Users } from 'lucide-react';

function PageVideo() {
    const { selectedVideo, user, setCurrentPage, addNotification, apiService } = useAppContext();
    const [videoData, setVideoData] = useState(null);
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(true);
    const [reactionLoading, setReactionLoading] = useState(false);
    const [commentLoading, setCommentLoading] = useState(false);
    const videoRef = useRef(null);
    const [videoCurrentTime, setVideoCurrentTime] = useState(0);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [hasViewed, setHasViewed] = useState(false);
    const [watchStartTime, setWatchStartTime] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [viewCounted, setViewCounted] = useState(false);

    const VIEW_THRESHOLD_TIME = 3000;
    const VIEW_PERCENTAGE_THRESHOLD = 0.25;

    useEffect(() => {
        if (!user) {
            let storedSessionId = localStorage.getItem('session_id');
            if (!storedSessionId) {
                storedSessionId = 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
                localStorage.setItem('session_id', storedSessionId);
            }
            setSessionId(storedSessionId);
        }
    }, [user]);

    useEffect(() => {
        if (selectedVideo) {
            loadVideoData();
            checkIfAlreadyViewed();
        }
    }, [selectedVideo]);

    useEffect(() => {
        if (videoRef.current && videoCurrentTime > 0) {
            videoRef.current.currentTime = videoCurrentTime;
        }
    }, [videoData]);

    const checkIfAlreadyViewed = async () => {
        if (!selectedVideo) return;

        if (user) {
            try {
                const response = await fetch(`${apiService.baseUrl}/videos/${selectedVideo.id}/viewed?userId=${user.id}`);
                const data = await response.json();
                setHasViewed(data.hasViewed);
            } catch (error) {
                console.error('Erreur vérification vue:', error);
            }
        } else {
            const viewedKey = `video_viewed_${selectedVideo.id}_${sessionId}`;
            setHasViewed(localStorage.getItem(viewedKey) === 'true');
        }
    };

    const loadVideoData = async () => {
        try {
            setLoading(true);
            const response = await apiService.getVideoById(selectedVideo.id);
            setVideoData(response.video || response);

            const viewsResponse = await fetch(`${apiService.baseUrl}/videos/${selectedVideo.id}/views`);
            const viewsData = await viewsResponse.json();
            setVideoData(prev => ({
                ...prev,
                views: viewsData.views,
                unique_views: viewsData.unique_views
            }));

            let commentsData = [];
            if (response.comments) {
                commentsData = response.comments;
            } else if (response.commentaires) {
                commentsData = response.commentaires;
            } else {
                try {
                    commentsData = await apiService.getComments(selectedVideo.id);
                } catch (commentError) {
                    console.log('Pas de commentaires disponibles');
                    commentsData = [];
                }
            }

            setComments(Array.isArray(commentsData) ? commentsData : []);
        } catch (error) {
            console.error('Erreur loadVideoData:', error);
            addNotification('Erreur lors du chargement de la vidéo', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleReaction = async (type) => {
        if (!user) {
            setShowLoginModal(true);
            return;
        }

        if (videoRef.current) {
            setVideoCurrentTime(videoRef.current.currentTime);
        }

        try {
            setReactionLoading(true);
            if (type === 'like') {
                await apiService.likeVideo(selectedVideo.id);
            } else {
                await apiService.dislikeVideo(selectedVideo.id);
            }

            const response = await apiService.getVideoById(selectedVideo.id);
            setVideoData(response.video || response);

            addNotification('Réaction enregistrée !', 'success');
        } catch (error) {
            addNotification('Erreur lors de la réaction', 'error');
        } finally {
            setReactionLoading(false);
        }
    };

    const handlePlay = () => {
        if (!hasViewed && !viewCounted) {
            setWatchStartTime(Date.now());

            setTimeout(() => {
                if (!viewCounted) {
                    recordView();
                }
            }, VIEW_THRESHOLD_TIME);
        }
    };

    const handleTimeUpdate = () => {
        if (!hasViewed && !viewCounted && videoRef.current) {
            const video = videoRef.current;
            const watchedPercentage = video.currentTime / video.duration;

            if (watchedPercentage >= VIEW_PERCENTAGE_THRESHOLD) {
                recordView();
            }
        }
    };

    const handleEnded = () => {
        if (!hasViewed && !viewCounted) {
            recordView();
        }
    };

    const recordView = async () => {
        if (viewCounted || hasViewed) return;

        setViewCounted(true);

        const watchTime = watchStartTime ? Date.now() - watchStartTime : 0;
        const video = videoRef.current;
        const watchPercentage = video ? (video.currentTime / video.duration) : 0;
        const completed = watchPercentage >= 0.95;

        try {
            const response = await fetch(`${apiService.baseUrl}/videos/${selectedVideo.id}/record-view`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(user && { 'Authorization': `Bearer ${localStorage.getItem('token')}` })
                },
                body: JSON.stringify({
                    userId: user?.id || null,
                    sessionId: sessionId,
                    watchTime: Math.round(watchTime),
                    watchPercentage: Math.round(watchPercentage * 100) / 100,
                    completed
                })
            });

            if (response.ok) {
                const result = await response.json();
                setHasViewed(true);

                if (!result.alreadyViewed) {
                    setVideoData(prev => ({
                        ...prev,
                        views: (prev.views || 0) + 1,
                        unique_views: user ? (prev.unique_views || 0) + 1 : prev.unique_views
                    }));
                }

                const viewedKey = user
                    ? `video_viewed_${selectedVideo.id}_${user.id}`
                    : `video_viewed_${selectedVideo.id}_${sessionId}`;
                localStorage.setItem(viewedKey, 'true');

                console.log('Vue enregistrée avec succès');
            }
        } catch (error) {
            console.error('Erreur enregistrement vue:', error);
            setViewCounted(false);
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!user) {
            setShowLoginModal(true);
            return;
        }
        if (!newComment.trim()) return;

        try {
            setCommentLoading(true);
            await apiService.postComment(selectedVideo.id, newComment.trim());
            setNewComment('');
            await loadVideoData();
            addNotification('Commentaire ajouté !', 'success');
        } catch (error) {
            addNotification('Erreur lors de l\'ajout du commentaire', 'error');
        } finally {
            setCommentLoading(false);
        }
    };

    const formatViewCount = (count) => {
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count?.toString() || '0';
    };

    if (!selectedVideo) {
        return (
            <div className="container mx-auto px-4 py-8 pt-32">
                <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded">
                    Aucune vidéo sélectionnée
                </div>
                <button
                    onClick={() => setCurrentPage('home')}
                    className="mt-4 text-blue-600 hover:text-blue-800"
                >
                    ← Retour à l'accueil
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8 pt-32">
                <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    <span className="ml-4">Chargement de la vidéo...</span>
                </div>
            </div>
        );
    }

    const currentVideoData = videoData || selectedVideo;

    if (!currentVideoData) {
        return (
            <div className="container mx-auto px-4 py-8 pt-32">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    Erreur : Impossible de charger la vidéo
                </div>
                <button
                    onClick={() => setCurrentPage('home')}
                    className="mt-4 text-blue-600 hover:text-blue-800"
                >
                    ← Retour à l'accueil
                </button>
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8 pt-32">
            <div className="max-w-4xl mx-auto">
                <div className="relative bg-black rounded-lg overflow-hidden mb-6">
                    {hasViewed && (
                        <div className="absolute top-4 right-4 z-10 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                            ✓ Vue
                        </div>
                    )}

                    <video
                        ref={videoRef}
                        src={apiService.getVideoStreamUrl(selectedVideo.id)}
                        controls
                        onPlay={handlePlay}
                        onTimeUpdate={handleTimeUpdate}
                        onEnded={handleEnded}
                        className="w-full h-auto max-h-96"
                        poster={apiService.getThumbnailUrl(selectedVideo.id)}
                    >
                        Votre navigateur ne supporte pas la lecture vidéo.
                    </video>
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        {currentVideoData.title}
                    </h1>

                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
                        <div className="flex items-center mb-4 sm:mb-0">
                            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white mr-3">
                                {localStorage.getItem(`profileImage_${currentVideoData.user_id || currentVideoData.auteur || currentVideoData.username}`) ? (
                                    <img
                                        src={localStorage.getItem(`profileImage_${currentVideoData.user_id || currentVideoData.auteur || currentVideoData.username}`)}
                                        alt={`Photo de profil de ${currentVideoData.auteur || currentVideoData.username}`}
                                        className="w-10 h-10 rounded-full object-cover"
                                    />
                                ) : (
                                    <User size={20} />
                                )}
                            </div>
                            <div>
                                <p className="font-medium text-gray-900">
                                    {currentVideoData.auteur || currentVideoData.username || 'Utilisateur inconnu'}
                                </p>
                                <p className="text-sm text-gray-500">Créateur</p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handleReaction('like')}
                                disabled={reactionLoading}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                                    currentVideoData.liked_by_me
                                        ? 'bg-green-50 border-green-300 text-green-700'
                                        : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                                }`}
                            >
                                <ThumbsUp size={16} />
                                <span>{currentVideoData.likes || 0}</span>
                            </button>

                            <button
                                onClick={() => handleReaction('dislike')}
                                disabled={reactionLoading}
                                className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${
                                    currentVideoData.disliked_by_me
                                        ? 'bg-red-50 border-red-300 text-red-700'
                                        : 'bg-gray-50 border-gray-300 hover:bg-gray-100'
                                }`}
                            >
                                <ThumbsDown size={16} />
                                <span>{currentVideoData.dislikes || 0}</span>
                            </button>

                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(window.location.href);
                                    addNotification('Lien copié !', 'success');
                                }}
                                className="flex items-center space-x-2 px-4 py-2 rounded-lg border bg-gray-50 border-gray-300 hover:bg-gray-100"
                            >
                                <Share2 size={16} />
                                <span>Partager</span>
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
                        <div className="flex items-center space-x-1">
                            <Eye size={16} />
                            <span>{formatViewCount(currentVideoData.views)} vues</span>
                        </div>
                        {currentVideoData.unique_views && (
                            <div className="flex items-center space-x-1">
                                <Users size={16} />
                                <span>{formatViewCount(currentVideoData.unique_views)} spectateurs uniques</span>
                            </div>
                        )}
                        <div className="flex items-center space-x-1">
                            <Calendar size={16} />
                            <span>
                                {currentVideoData.created_at
                                    ? new Date(currentVideoData.created_at).toLocaleDateString('fr-FR')
                                    : 'Date inconnue'
                                }
                            </span>
                        </div>
                    </div>

                    {currentVideoData.description && (
                        <div className="border-t pt-4">
                            <h3 className="font-semibold text-gray-900 mb-2 flex items-center">
                                <MessageCircle size={16} className="mr-2" />
                                Description
                            </h3>
                            <p className="text-gray-700 whitespace-pre-wrap">
                                {currentVideoData.description}
                            </p>
                        </div>
                    )}
                </div>

                <div className="bg-white rounded-lg shadow-lg p-6">
                    <h3 className="text-xl font-bold mb-4 flex items-center">
                        <MessageCircle size={20} className="mr-2" />
                        Commentaires ({comments.length})
                    </h3>

                    {user ? (
                        <div className="mb-6">
                            <div className="flex items-start space-x-3">
                                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white">
                                    {user && localStorage.getItem(`profileImage_${user.id}`) ? (
                                        <img
                                            src={localStorage.getItem(`profileImage_${user.id}`)}
                                            alt={`Photo de profil de ${user.username}`}
                                            className="w-8 h-8 rounded-full object-cover"
                                        />
                                    ) : (
                                        <User size={16} />
                                    )}
                                </div>
                                <div className="flex-1">
                                    <textarea
                                        value={newComment}
                                        onChange={(e) => setNewComment(e.target.value)}
                                        placeholder="Ajoutez un commentaire..."
                                        rows={3}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        maxLength={1000}
                                    />
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-xs text-gray-500">
                                            {newComment.length}/1000
                                        </span>
                                        <button
                                            onClick={handleCommentSubmit}
                                            disabled={!newComment.trim() || commentLoading}
                                            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <Send size={16} />
                                            <span>{commentLoading ? 'Envoi...' : 'Commenter'}</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="mb-6 p-4 bg-gray-50 rounded-lg text-center">
                            <p className="text-gray-600 mb-2">
                                Connectez-vous pour laisser un commentaire
                            </p>
                            <button
                                onClick={() => setCurrentPage('login')}
                                className="text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Se connecter
                            </button>
                        </div>
                    )}

                    <div className="space-y-4">
                        {comments.length === 0 ? (
                            <div className="text-center py-8 text-gray-500">
                                <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                                <p>Aucun commentaire pour le moment.</p>
                                <p className="text-sm">Soyez le premier à commenter !</p>
                            </div>
                        ) : (
                            comments.map((comment, index) => (
                                <div key={comment.id || index} className="border-b border-gray-100 pb-4 last:border-b-0">
                                    <div className="flex items-start space-x-3">
                                        <div className="w-8 h-8 bg-gray-400 rounded-full flex items-center justify-center text-white">
                                            {localStorage.getItem(`profileImage_${comment.user_id || comment.username}`) ? (
                                                <img
                                                    src={localStorage.getItem(`profileImage_${comment.user_id || comment.username}`)}
                                                    alt={`Photo de profil de ${comment.username}`}
                                                    className="w-8 h-8 rounded-full object-cover"
                                                />
                                            ) : (
                                                <User size={16} />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-1">
                                                <span className="font-medium text-gray-900">
                                                    {comment.username || 'Utilisateur inconnu'}
                                                </span>
                                                <div className="flex items-center text-xs text-gray-500">
                                                    <Calendar size={12} className="mr-1" />
                                                    {comment.created_at ? new Date(comment.created_at).toLocaleDateString('fr-FR') : 'Date inconnue'}
                                                </div>
                                            </div>
                                            <p className="text-gray-700">{comment.content || 'Contenu vide'}</p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <button
                    onClick={() => setCurrentPage('home')}
                    className="mt-6 text-blue-600 hover:text-blue-800 font-medium"
                >
                    ← Retour à l'accueil
                </button>

                {showLoginModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                        <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-semibold text-gray-900">Connexion requise</h3>
                                <button
                                    onClick={() => setShowLoginModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                            <p className="text-gray-600 mb-6">
                                Vous devez être connecté pour réagir aux vidéos.
                            </p>
                            <div className="flex space-x-3">
                                <button
                                    onClick={() => {
                                        setShowLoginModal(false);
                                        setCurrentPage('login');
                                    }}
                                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Se connecter
                                </button>
                                <button
                                    onClick={() => setShowLoginModal(false)}
                                    className="flex-1 bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                                >
                                    Annuler
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default PageVideo;