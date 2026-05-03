import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useVideo } from '../hooks/useVideo';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import apiService from '../services/apiService';
import VideoPlayer from '../components/VideoPlayer';
import BoutonAbonne from '../components/BoutonAbonne.jsx';
import MentionPicker from '../components/MentionPicker';
import useAbonnement from '../hooks/useAbonnement.js';

import {
    ThumbsUp,
    ThumbsDown,
    Share2,
    Eye,
    Calendar,
    ArrowLeft,
    User,
    AlertCircle,
    LogIn,
    MessageCircle,
    Send,
    Users,
    X,
    Heart,
    Reply,
    ChevronDown,
    Pencil,
    MoreHorizontal,
    Trash2,
    ChevronUp,
    Flag,
} from 'lucide-react';
import videoService from "../services/videoService.js";

const useAnimatedCount = (target, duration = 700) => {
    const [count, setCount] = useState(0);
    const started = useRef(false);
    useEffect(() => {
        started.current = false;
        setCount(0);
    }, [target]);
    useEffect(() => {
        if (started.current || !target) return;
        started.current = true;
        const t0 = performance.now();
        const tick = (now) => {
            const p = Math.min((now - t0) / duration, 1);
            setCount(Math.floor((1 - Math.pow(1 - p, 3)) * target));
            if (p < 1) requestAnimationFrame(tick);
            else setCount(target);
        };
        requestAnimationFrame(tick);
    }, [target, duration]);
    return count;
};

const EMOJIS_BURST = ['😂','🤣','💀','🔥','👏','💯','❤️'];
const ConfettiBurst = ({ trigger }) => {
    const [particles, setParticles] = useState([]);
    useEffect(() => {
        if (!trigger) return;
        setParticles(Array.from({ length: 7 }, (_, i) => ({
            id: Date.now() + i,
            emoji: EMOJIS_BURST[i % EMOJIS_BURST.length],
            x: (Math.random() - 0.5) * 100,
            y: -(30 + Math.random() * 50),
            rot: (Math.random() - 0.5) * 360,
        })));
        setTimeout(() => setParticles([]), 900);
    }, [trigger]);
    return (
        <div className="absolute inset-0 pointer-events-none overflow-visible z-20">
            {particles.map(p => (
                <span key={p.id} className="absolute left-1/2 top-1/2 text-base select-none"
                      style={{ animation: 'confettiBurst 0.9s ease-out forwards', '--tx': `${p.x}px`, '--ty': `${p.y}px`, '--rot': `${p.rot}deg` }}>
                    {p.emoji}
                </span>
            ))}
        </div>
    );
};

const ANIM_STYLES = `
    @keyframes confettiBurst {
        0%   { transform: translate(-50%,-50%) translate(0,0) rotate(0deg); opacity:1; }
        100% { transform: translate(-50%,-50%) translate(var(--tx),var(--ty)) rotate(var(--rot)); opacity:0; }
    }
    @keyframes slideUp { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    @keyframes countUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
    .anim-slide-up { animation: slideUp 0.45s cubic-bezier(0.22,1,0.36,1) forwards; }
    .anim-count    { animation: countUp 0.35s ease-out forwards; }
`;

const RAISONS_SIGNALEMENT = [
    { value: 'spam', label: 'Spam ou publicité' },
    { value: 'inapproprie', label: 'Contenu inapproprié' },
    { value: 'haine', label: 'Discours haineux' },
    { value: 'desinformation', label: 'Désinformation' },
    { value: 'droits', label: "Violation de droits d'auteur" },
    { value: 'autre', label: 'Autre raison' },
];


const ReplyItem = ({ reply, isAuthenticated, userId, onUserClick, onReply }) => {
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(reply.like_count || 0);
    const [likeLoading, setLikeLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated && reply.id) {
            apiService.getReplyLikeStatus(reply.id)
                .then(res => {
                    setLiked(!!res.liked);
                    setLikeCount(res.like_count || 0);
                })
                .catch(() => {});
        }
    }, [reply.id, isAuthenticated]);

    const handleLike = async () => {
        if (!isAuthenticated) return;
        if (likeLoading) return;
        setLikeLoading(true);
        try {
            const res = await apiService.toggleReplyLike(reply.id);
            setLiked(res.liked);
            setLikeCount(res.like_count);
        } catch (e) {
            console.error('Erreur like réponse:', e);
        } finally {
            setLikeLoading(false);
        }
    };

    const formatDate = (d) => {
        if (!d) return '';
        const date = new Date(d);
        const now = new Date();
        const diffMs = now - date;
        const diffH = Math.floor(diffMs / 3600000);
        const diffD = Math.floor(diffH / 24);
        if (diffH < 1) return 'À l\'instant';
        if (diffH < 24) return `Il y a ${diffH}h`;
        if (diffD < 7) return `Il y a ${diffD}j`;
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    const avatarUrl = reply.avatar_url
        ? (reply.avatar_url.startsWith('http') ? reply.avatar_url : `/uploads/profiles/${reply.avatar_url}`)
        : null;

    return (
        <div className="flex items-start gap-2 py-2">
            {avatarUrl ? (
                <img src={avatarUrl} alt={reply.username || 'Avatar'} className="w-7 h-7 rounded-full object-cover border border-gray-200 flex-shrink-0" />
            ) : (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center flex-shrink-0">
                    <User size={13} className="text-white" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                    <button
                        onClick={() => onUserClick(reply.user_id, reply.username)}
                        className="font-semibold text-gray-900 text-sm hover:text-blue-600 transition-colors cursor-pointer"
                    >
                        {reply.username || 'Utilisateur'}
                    </button>
                    <span className="text-xs text-gray-400">{formatDate(reply.created_at)}</span>
                </div>
                <p className="text-gray-700 text-sm mt-0.5 whitespace-pre-wrap">{reply.content}</p>
                <div className="flex items-center gap-3 mt-1">
                    <button
                        onClick={handleLike}
                        disabled={!isAuthenticated || likeLoading}
                        className={`text-xs flex items-center gap-1 transition-colors ${
                            liked
                                ? 'text-red-600 hover:text-red-700 font-semibold'
                                : 'text-gray-500 hover:text-gray-700'
                        } ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                        title={!isAuthenticated ? 'Connectez-vous pour liker' : ''}
                    >
                        <Heart size={12} fill={liked ? 'currentColor' : 'none'} />
                        {likeCount > 0 && <span>{likeCount}</span>}
                    </button>
                    {onReply && (
                        <button
                            onClick={() => onReply(reply.username)}
                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                        >
                            <Reply size={12} />
                            Répondre
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const CommentItem = ({ comment, isAuthenticated, userId, onUserClick, onReplyPosted, onDelete }) => {
    const [liked, setLiked] = useState(false);
    const [likeCount, setLikeCount] = useState(comment.like_count || 0);
    const [showReplies, setShowReplies] = useState(false);
    const [replies, setReplies] = useState(comment.replies || []);
    const [replyText, setReplyText] = useState('');
    const [replyLoading, setReplyLoading] = useState(false);
    const [likeLoading, setLikeLoading] = useState(false);
    const [showMenu, setShowMenu] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState(comment.content);
    const menuRef = useRef(null);
    const replyInputRef = useRef(null);

    const isOwner = userId === comment.user_id;

    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setShowMenu(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    useEffect(() => {
        if (isAuthenticated && comment.id) {
            apiService.getCommentLikeStatus(comment.id)
                .then(res => { setLiked(!!res.liked); setLikeCount(res.like_count || 0); })
                .catch(() => {});
        }
    }, [comment.id, isAuthenticated]);

    useEffect(() => {
        if (showReplies && comment.id) loadReplies();
    }, [showReplies, comment.id]);

    const loadReplies = async () => {
        try {
            const data = await apiService.getReplies(comment.id);
            setReplies(data.replies || []);
        } catch (e) {}
    };

    const handleLike = async () => {
        if (!isAuthenticated || likeLoading) return;
        setLikeLoading(true);
        try {
            const res = await apiService.toggleCommentLike(comment.id);
            setLiked(res.liked);
            setLikeCount(res.like_count);
        } catch (e) {} finally { setLikeLoading(false); }
    };

    const handleReplySubmit = async (e) => {
        e.preventDefault();
        if (!replyText.trim() || !isAuthenticated || replyLoading) return;
        setReplyLoading(true);
        try {
            const res = await apiService.postReply(comment.id, replyText.trim());
            setReplies(prev => [...prev, res.reply]);
            setReplyText('');
            if (onReplyPosted) onReplyPosted();
        } catch (e) {} finally { setReplyLoading(false); }
    };

    const handleReplyClick = (username) => {
        setShowReplies(true);
        setTimeout(() => {
            if (replyInputRef.current) {
                replyInputRef.current.focus();
                setReplyText(`@${username} `);
            }
        }, 100);
    };

    const formatDate = (d) => {
        if (!d) return '';
        const date = new Date(d);
        const now = new Date();
        const diffH = Math.floor((now - date) / 3600000);
        const diffD = Math.floor(diffH / 24);
        if (diffH < 1) return 'À l\'instant';
        if (diffH < 24) return `Il y a ${diffH}h`;
        if (diffD < 7) return `Il y a ${diffD}j`;
        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    const avatarUrl = comment.avatar_url
        ? (comment.avatar_url.startsWith('http') ? comment.avatar_url : `/uploads/profiles/${comment.avatar_url}`)
        : null;

    const replyCount = comment.reply_count || replies.length || 0;

    return (
        <div className="mb-4 last:mb-0">
            <div className="flex items-start gap-3">
                {avatarUrl ? (
                    <img src={avatarUrl} alt={comment.username} className="w-9 h-9 rounded-full object-cover flex-shrink-0 cursor-pointer" onClick={() => onUserClick(comment.user_id, comment.username)} />
                ) : (
                    <div className="w-9 h-9 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 cursor-pointer" onClick={() => onUserClick(comment.user_id, comment.username)}>
                        <User size={16} className="text-gray-600" />
                    </div>
                )}

                <div className="flex-1 min-w-0">
                    <div className="relative">
                        <div className="bg-gray-100 rounded-2xl px-4 py-3 relative pr-8 max-w-prose">
                        <button onClick={() => onUserClick(comment.user_id, comment.username)} className="font-bold text-gray-900 text-sm hover:text-blue-600 transition-colors">
                                {comment.username || 'Utilisateur'}
                            </button>
                            {editing ? (
                                <div className="mt-1">
                                    <textarea
                                        value={editText}
                                        onChange={e => setEditText(e.target.value)}
                                        className="w-full text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        rows={2}
                                    />
                                    <div className="flex gap-2 mt-1">
                                        <button onClick={() => setEditing(false)} className="text-xs text-gray-500 hover:text-gray-700">Annuler</button>
                                        <button
                                            onClick={async () => {
                                                try {
                                                    await apiService.requestV2(`/comments/${comment.id}`, {
                                                        method: 'PUT',
                                                        body: JSON.stringify({ content: editText }),
                                                    });
                                                    comment.content = editText;
                                                    setEditing(false);
                                                } catch {}
                                            }}
                                            className="text-xs text-blue-600 font-semibold hover:text-blue-700"
                                        >
                                            Sauvegarder
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <p className="text-gray-800 text-sm mt-0.5 whitespace-pre-wrap">{comment.content}</p>
                            )}
                        </div>

                        {isOwner && !editing && (
                            <div className="absolute top-1.5 right-1.5" ref={menuRef}>
                                <button
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors rounded-full hover:bg-gray-200"
                                >
                                    <MoreHorizontal size={16} />
                                </button>
                                {showMenu && (
                                    <div className="absolute right-0 top-7 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50 w-36">
                                        <button
                                            onClick={() => { setEditing(true); setShowMenu(false); }}
                                            className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                        >
                                            <Pencil size={14} /> Modifier
                                        </button>
                                        <button
                                            onClick={() => { onDelete(comment.id); setShowMenu(false); }}
                                            className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                        >
                                            <Trash2 size={14} /> Supprimer
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4 mt-1 ml-2">
                        <span className="text-xs text-gray-400">{formatDate(comment.created_at)}</span>
                        <button
                            onClick={handleLike}
                            disabled={!isAuthenticated || likeLoading}
                            className={`text-xs font-semibold flex items-center gap-1 transition-colors ${liked ? 'text-red-500' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            <Heart size={13} fill={liked ? 'currentColor' : 'none'} />
                            {likeCount > 0 && <span>{likeCount}</span>}
                        </button>
                        <button
                            onClick={() => handleReplyClick(comment.username)}
                            className="text-xs font-semibold text-gray-500 hover:text-blue-600 transition-colors flex items-center gap-1"
                        >
                            <Reply size={13} />
                            Répondre
                        </button>
                        {replyCount > 0 && (
                            <button
                                onClick={() => setShowReplies(!showReplies)}
                                className="text-xs text-blue-500 font-semibold flex items-center gap-1"
                            >
                                {showReplies ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                {replyCount} {replyCount === 1 ? 'réponse' : 'réponses'}
                            </button>
                        )}
                    </div>

                    {showReplies && (
                        <div className="mt-3 pl-4 border-l-2 border-gray-200 space-y-2">
                            {replies.map((reply, idx) => (
                                <ReplyItem
                                    key={reply.id || idx}
                                    reply={reply}
                                    isAuthenticated={isAuthenticated}
                                    userId={userId}
                                    onUserClick={onUserClick}
                                    onReply={handleReplyClick}
                                />
                            ))}
                            {isAuthenticated && (
                                <form onSubmit={handleReplySubmit} className="mt-2 flex gap-2">
                                    <input
                                        ref={replyInputRef}
                                        type="text"
                                        value={replyText}
                                        onChange={e => setReplyText(e.target.value)}
                                        placeholder="Répondre..."
                                        maxLength={500}
                                        className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button type="submit" disabled={!replyText.trim() || replyLoading} className="px-3 py-2 bg-blue-600 text-white text-sm rounded-full hover:bg-blue-700 transition disabled:opacity-50">
                                        <Send size={14} />
                                    </button>
                                </form>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const Video = () => {
    const { user, isAuthenticated } = useAuth();
    const toast = useToast();

    const [videoId, setVideoId] = useState(null);
    const { video, comments, loading, error: videoError, likeVideo, dislikeVideo, postComment, reload, reloadComments } = useVideo(videoId);
    const { videoRef, recordView: _recordView } = useVideoPlayer(videoId);

    const recordView = useCallback(async () => {
        try {
            const result = await _recordView();
            if (result?.success && !result?.alreadyViewed) {
                setViewsCount(prev => prev + 1);
            }
        } catch (_) {
        }
    }, [_recordView]);

    const [newComment, setNewComment] = useState('');
    const [commentLoading, setCommentLoading] = useState(false);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [userReaction, setUserReaction] = useState(null);
    const [reactionsCount, setReactionsCount] = useState({ likes: 0, dislikes: 0 });
    const [auteurImage, setAuteurImage] = useState(null);
    const [auteurId, setAuteurId] = useState(null);
    const [viewsCount, setViewsCount] = useState(video?.views ?? 0);

    const [showSignalModal, setShowSignalModal] = useState(false);
    const [signalRaison, setSignalRaison] = useState('');
    const [signalDescription, setSignalDescription] = useState('');
    const [signalLoading, setSignalLoading] = useState(false);
    const [signalDone, setSignalDone] = useState(false);
    const [likeBurst, setLikeBurst] = useState(0);
    const [shareAnim, setShareAnim] = useState(false);
    const [showMentionPicker, setShowMentionPicker] = useState(false);
    const [mentionedUsers, setMentionedUsers] = useState([]);
    const animLikes = useAnimatedCount(reactionsCount.likes);
    const animDislikes = useAnimatedCount(reactionsCount.dislikes);
    const animViews = useAnimatedCount(viewsCount);
    const videoSrc = video?.filename
        ? `/uploads/videos/${video.filename}`
        : null;

    useEffect(() => {
        const hash = window.location.hash;
        const match = hash.match(/#\/video\/(\d+)/);

        if (match) {
            setVideoId(parseInt(match[1]));
            return;
        }

        const storedVideo = localStorage.getItem('currentVideo');
        if (storedVideo) {
            const videoData = JSON.parse(storedVideo);
            setVideoId(videoData.id);
        } else {
            toast.error('Aucune vidéo sélectionnée');
            window.location.hash = '#/home';
        }
    }, [toast]);

    useEffect(() => {
        if (video) {
            setViewsCount(video.views || video.views_count || 0);
            const id = video.author_id || video.auteur_id || video.user_id;
            setAuteurId(id);
            if (id) {
                apiService.requestV2(`/users/${id}/profile`)
                    .then(r => {
                        const avatarUrl = r.profile?.avatar_url || r.data?.avatar_url;
                        if (avatarUrl) {
                            setAuteurImage(avatarUrl.startsWith('http') ? avatarUrl : `/uploads/profiles/${avatarUrl}`);
                        } else {
                            setAuteurImage('/default-avatar.png');
                        }
                    })
                    .catch(() => setAuteurImage('/default-avatar.png'));
            }
        }
    }, [video]);

    const handleViewRecorded = () => {
        setViewsCount((v) => v + 1);
    };

    useEffect(() => {
        if (videoId && isAuthenticated) {
            loadUserReaction();
        }
        if (videoId) {
            loadReactions();
        }
    }, [videoId, isAuthenticated]);

    const loadUserReaction = async () => {
        try {
            const res = await apiService.getUserReactionStatus(videoId);
            setUserReaction(res.reaction_type);
        } catch (err) {
            console.error('Erreur chargement réaction:', err);
        }
    };

    const loadReactions = async () => {
        try {
            const res = await apiService.getVideoReactions(videoId);
            setReactionsCount({
                likes: res.likes_count || res.likes || 0,
                dislikes: res.dislikes_count || res.dislikes || 0
            });
        } catch (err) {
            console.error('Erreur chargement réactions:', err);
        }
    };

    const handleLike = async () => {
        if (!isAuthenticated) { setShowLoginModal(true); return; }

        const wasLiked    = userReaction === 'like';
        const wasDisliked = userReaction === 'dislike';

        setUserReaction(wasLiked ? null : 'like');
        setReactionsCount(prev => ({
            likes:    wasLiked    ? prev.likes - 1    : prev.likes + 1,
            dislikes: wasDisliked ? prev.dislikes - 1 : prev.dislikes,
        }));
        if (!wasLiked) setLikeBurst(b => b + 1);

        try {
            await videoService.likeVideo(videoId);
            await loadReactions();
        } catch (err) {
            setUserReaction(wasLiked ? 'like' : wasDisliked ? 'dislike' : null);
            setReactionsCount(prev => ({
                likes:    wasLiked    ? prev.likes + 1    : prev.likes - 1,
                dislikes: wasDisliked ? prev.dislikes + 1 : prev.dislikes,
            }));
            toast.error('Erreur lors du like');
        }
    };

    const handleDislike = async () => {
        if (!isAuthenticated) { setShowLoginModal(true); return; }
        const wasDisliked = userReaction === 'dislike';
        const wasLiked    = userReaction === 'like';

        setUserReaction(wasDisliked ? null : 'dislike');
        setReactionsCount(prev => ({
            dislikes: wasDisliked ? prev.dislikes - 1 : prev.dislikes + 1,
            likes:    wasLiked    ? prev.likes - 1    : prev.likes,
        }));

        try {
            await videoService.dislikeVideo(videoId);
            await loadReactions();
        } catch (err) {
            setUserReaction(wasDisliked ? 'dislike' : wasLiked ? 'like' : null);
            setReactionsCount(prev => ({
                dislikes: wasDisliked ? prev.dislikes + 1 : prev.dislikes - 1,
                likes:    wasLiked    ? prev.likes + 1    : prev.likes,
            }));
            toast.error('Erreur lors du dislike');
        }
    };

    const handleCommentSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim() || commentLoading) return;

        setCommentLoading(true);
        try {
            const response = await postComment(newComment.trim());
            const commentId = response?.comment?.id;
            setNewComment('');
            toast.success('Commentaire publié');

            if (mentionedUsers.length > 0 && commentId) {
                for (const mentionedUser of mentionedUsers) {
                    await apiService.requestV2(`/comments/${commentId}/mention`, {
                        method: 'POST',
                        body: JSON.stringify({ mentioned_user_id: mentionedUser.id }),
                    });
                }
                setMentionedUsers([]);
            }
        } catch (err) {
            toast.error('Erreur lors de la publication');
        } finally {
            setCommentLoading(false);
        }
    };

    const handleSignalOpen = () => {
        if (!isAuthenticated) { setShowLoginModal(true); return; }
        setSignalRaison('');
        setSignalDescription('');
        setSignalDone(false);
        setShowSignalModal(true);
    };

    const handleSignalSubmit = async () => {
        if (!signalRaison) { toast.error('Choisissez une raison'); return; }
        setSignalLoading(true);
        try {
            await apiService.requestV2(`/videos/${videoId}/signaler`, {
                method: 'POST',
                body: JSON.stringify({ raison: signalRaison, description: signalDescription }),
            });
            setSignalDone(true);
            toast.success('Signalement envoyé, merci !');
            setTimeout(() => setShowSignalModal(false), 1800);
        } catch (err) {
            if (err?.message?.includes('déjà') || err?.message?.includes('already')) {
                toast.info('Vous avez déjà signalé cette vidéo');
                setShowSignalModal(false);
            } else {
                toast.error('Erreur lors du signalement');
            }
        } finally {
            setSignalLoading(false);
        }
    };

    const handleShare = async () => {
        const url = `${window.location.origin}/#/video/${video.id}`;
        setShareAnim(true);
        setTimeout(() => setShareAnim(false), 600);
        try {
            if (navigator.share) {
                await navigator.share({ title: video.title, text: video.description, url });
            } else {
                await navigator.clipboard.writeText(url);
                toast.success('Lien copié dans le presse-papiers');
            }
        } catch (err) {
            console.log('Erreur partage:', err);
        }
    };

    const handleUserClick = (userId, username) => {
        localStorage.setItem('channelUser', JSON.stringify({ id: userId, username }));
        window.location.hash = '#/chaine';
    };

    const navigateTo = (page) => {
        window.location.hash = `#/${page}`;
    };

    const goBack = () => {
        window.history.back();
    };

    const getProfileImage = (userId) => {
        return localStorage.getItem(`profileImage_${userId}`);
    };

    const formatNumber = (num) => {
        if (!num) return '0';
        if (num < 1000) return num.toString();
        if (num < 1000000) return `${Math.floor(num / 100) / 10}k`;
        return `${Math.floor(num / 100000) / 10}M`;
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-500 mx-auto mb-4"></div>
                    <p className="text-gray-600 font-medium">Chargement de la vidéo...</p>
                </div>
            </div>
        );
    }

    if (videoError || !video) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20 flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4">
                    <div className="text-center">
                        <AlertCircle size={64} className="mx-auto text-red-500 mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Vidéo introuvable</h2>
                        <p className="text-gray-600 mb-6">Impossible de charger cette vidéo</p>
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 pt-20">
            <style>{ANIM_STYLES}</style>
            <div className="max-w-7xl mx-auto px-4 py-8">
                <button
                    onClick={goBack}
                    className="mb-6 flex items-center gap-2 text-gray-600 hover:text-blue-600 transition-all hover:-translate-x-1"
                >
                    <ArrowLeft size={20} />
                    <span className="font-medium">Retour</span>
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
                            <VideoPlayer
                                src={videoSrc}
                                videoId={video?.id}
                                onViewRecorded={handleViewRecorded}
                                poster={video?.thumbnail ? `/uploads/thumbnails/${video.thumbnail}` : undefined}
                            />
                        </div>

                        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 anim-slide-up" style={{opacity:0}}>
                            <h1 className="text-2xl font-bold text-gray-900 mb-4">{video.title}</h1>

                            <div className="flex items-center gap-6 mb-6 text-sm text-gray-600 flex-wrap">
                                <div className="flex items-center gap-1 transition-all hover:text-blue-600">
                                    <Eye size={18} />
                                    <span className="font-medium anim-count">{formatNumber(animViews)} vues</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar size={18} />
                                    <span>{new Date(video.created_at).toLocaleDateString('fr-FR')}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 mb-6 flex-wrap">
                                <div className="flex items-center gap-2 bg-gray-100 rounded-xl p-1">
                                    <button
                                        onClick={handleLike}
                                        className={`relative flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 active:scale-90
                                            ${userReaction === 'like'
                                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105'
                                            : 'bg-white text-gray-700 hover:bg-blue-50 hover:text-blue-600 hover:scale-105'
                                        }`}
                                    >
                                        <ThumbsUp size={20} fill={userReaction === 'like' ? 'currentColor' : 'none'}
                                                  className={`transition-transform duration-200 ${userReaction === 'like' ? 'scale-125' : ''}`} />
                                        <span className="font-medium">{formatNumber(reactionsCount.likes)}</span>
                                        <ConfettiBurst trigger={likeBurst} />
                                    </button>
                                    <button
                                        onClick={handleDislike}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all duration-200 active:scale-90
                                            ${userReaction === 'dislike'
                                            ? 'bg-red-600 text-white shadow-lg shadow-red-200 scale-105'
                                            : 'bg-white text-gray-700 hover:bg-red-50 hover:text-red-500 hover:scale-105'
                                        }`}
                                    >
                                        <ThumbsDown size={20} fill={userReaction === 'dislike' ? 'currentColor' : 'none'}
                                                    className={`transition-transform duration-200 ${userReaction === 'dislike' ? 'scale-125' : ''}`} />
                                        <span className="font-medium">{formatNumber(reactionsCount.dislikes)}</span>
                                    </button>
                                </div>
                                <button
                                    onClick={handleShare}
                                    className={`flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-xl transition-all font-medium shadow-lg hover:shadow-xl hover:-translate-y-0.5 active:scale-95
                                        ${shareAnim ? 'scale-110' : ''}`}
                                >
                                    <Share2 size={20} className={shareAnim ? 'animate-spin' : ''} /> Partager
                                </button>
                                <BoutonAbonne targetUserId={auteurId} user={user} />
                                <button
                                    onClick={handleSignalOpen}
                                    className="flex items-center gap-1.5 px-3 py-2 text-sm text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all hover:scale-105 active:scale-95"
                                    title="Signaler cette vidéo"
                                >
                                    <Flag size={16} />
                                    Signaler
                                </button>
                            </div>

                            {!isAuthenticated && (
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
                                    <LogIn className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                                    <div className="flex-1">
                                        <p className="text-blue-900 font-medium mb-1">Connectez-vous pour interagir</p>
                                        <div className="flex gap-2">
                                            <button onClick={() => navigateTo('login')} className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded-lg hover:bg-blue-700 transition font-medium">Se connecter</button>
                                            <button onClick={() => navigateTo('register')} className="text-sm bg-white text-blue-600 border border-blue-600 px-4 py-1.5 rounded-lg hover:bg-blue-50 transition font-medium">Créer un compte</button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {video.description && (
                                <div className="mb-6">
                                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                                    <p className="text-gray-700 whitespace-pre-wrap">{video.description}</p>
                                </div>
                            )}

                            {video.auteur && (
                                <div className="border-t pt-6">
                                    <button
                                        onClick={() => handleUserClick(auteurId, video.auteur)}
                                        className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer"
                                    >
                                        {auteurImage ? (
                                            <img
                                                src={auteurImage || '/default-avatar.png'}
                                                alt={`Photo de profil de ${video.auteur}`}
                                                className="w-10 h-10 rounded-full object-cover border-2 border-gray-300 bg-white"
                                                onError={(e) => { e.target.src = '/default-avatar.png'; }}
                                            />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                                                <User size={18} className="text-white" />
                                            </div>
                                        )}
                                        <div className="text-left">
                                            <p className="font-semibold text-gray-900 text-lg hover:text-blue-600 transition-colors">{video.auteur}</p>
                                            <p className="text-sm text-gray-600">Créateur de contenu</p>
                                        </div>
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="bg-white rounded-2xl shadow-xl p-6">
                            <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                                <MessageCircle size={22} />
                                Commentaires ({comments.length})
                            </h3>

                            {isAuthenticated ? (
                                <div className="mb-6">
                                    <form onSubmit={handleCommentSubmit} className="flex items-start gap-3">
                                        {user?.avatar_url ? (
                                            <img src={user.avatar_url.startsWith('http') ? user.avatar_url : `/uploads/profiles/${user.avatar_url}`} alt="Votre photo" className="w-10 h-10 rounded-full object-cover border border-gray-200" />
                                        ) : (
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center">
                                                <User size={18} className="text-white" />
                                            </div>
                                        )}
                                        <div className="flex-1 relative">
                                            <textarea
                                                value={newComment}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    setNewComment(val);
                                                    // Affiche le picker quand l'user tape @
                                                    if (val.endsWith('@')) {
                                                        setShowMentionPicker(true);
                                                    } else {
                                                        setShowMentionPicker(false);
                                                    }
                                                }}
                                                placeholder="Ajoutez un commentaire... (@ pour mentionner)"
                                                rows={3}
                                                maxLength={1000}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                            />

                                            {showMentionPicker && (
                                                <MentionPicker
                                                    onSelect={async (type, users) => {
                                                        setShowMentionPicker(false);
                                                        if (type === 'all') {
                                                            // Ajoute @all au commentaire
                                                            setNewComment(prev => prev.slice(0, -1) + '@tous ');
                                                            // Notifie tous les abonnés après soumission — géré dans handleCommentSubmit
                                                        } else {
                                                            setNewComment(prev => prev.slice(0, -1) + `@${users[0].username} `);
                                                        }
                                                        // Stocke les users à notifier
                                                        setMentionedUsers(users);
                                                    }}
                                                    onClose={() => setShowMentionPicker(false)}
                                                />
                                            )}

                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-xs text-gray-500">{newComment.length}/1000</span>
                                                <button
                                                    type="submit"
                                                    disabled={!newComment.trim() || commentLoading}
                                                    className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                                                >
                                                    <Send size={16} />
                                                    {commentLoading ? 'Envoi...' : 'Commenter'}
                                                </button>
                                            </div>
                                        </div>
                                    </form>
                                </div>
                            ) : (
                                <div className="mb-6 p-6 bg-gray-50 rounded-xl text-center border-2 border-dashed border-gray-300">
                                    <MessageCircle className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                                    <p className="text-gray-700 font-medium mb-3">Connectez-vous pour commenter</p>
                                    <button onClick={() => setShowLoginModal(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition font-medium">Se connecter</button>
                                </div>
                            )}

                            <div>
                                {comments.length === 0 ? (
                                    <div className="text-center py-12 text-gray-500">
                                        <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                                        <p className="font-medium">Aucun commentaire pour le moment</p>
                                    </div>
                                ) : (
                                    comments.map((comment, index) => (
                                        <CommentItem
                                            key={comment.id}
                                            comment={comment}
                                            isAuthenticated={isAuthenticated}
                                            userId={user?.id}
                                            onUserClick={handleUserClick}
                                            onReplyPosted={reloadComments}
                                            onDelete={async (id) => {
                                                await apiService.requestV2(`/videos/${videoId}/comments/${id}`, { method: 'DELETE' });
                                                reloadComments();
                                            }}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showSignalModal && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
                    onClick={(e) => { if (e.target === e.currentTarget && !signalLoading) setShowSignalModal(false); }}
                >
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                                <Flag size={18} className="text-red-500" /> Signaler la vidéo
                            </h2>
                            <button onClick={() => !signalLoading && setShowSignalModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {signalDone ? (
                            <div className="px-6 py-10 text-center">
                                <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-7 h-7 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                                    </svg>
                                </div>
                                <p className="text-gray-700 font-medium">Signalement envoyé</p>
                                <p className="text-sm text-gray-500 mt-1">Notre équipe va examiner ce contenu.</p>
                            </div>
                        ) : (
                            <div className="px-6 py-5 space-y-4">
                                <p className="text-sm text-gray-600">Pourquoi signalez-vous cette vidéo ?</p>

                                <div className="space-y-2">
                                    {RAISONS_SIGNALEMENT.map(({ value, label }) => (
                                        <label
                                            key={value}
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                                signalRaison === value
                                                    ? 'border-red-400 bg-red-50'
                                                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="raison"
                                                value={value}
                                                checked={signalRaison === value}
                                                onChange={() => setSignalRaison(value)}
                                                className="accent-red-500"
                                            />
                                            <span className="text-sm text-gray-700">{label}</span>
                                        </label>
                                    ))}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Détails <span className="text-gray-400 font-normal">(optionnel)</span>
                                    </label>
                                    <textarea
                                        value={signalDescription}
                                        onChange={(e) => setSignalDescription(e.target.value)}
                                        placeholder="Décrivez le problème..."
                                        rows={3}
                                        maxLength={500}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-transparent"
                                    />
                                </div>

                                <div className="flex gap-3 pt-1">
                                    <button
                                        onClick={() => setShowSignalModal(false)}
                                        disabled={signalLoading}
                                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                                    >
                                        Annuler
                                    </button>
                                    <button
                                        onClick={handleSignalSubmit}
                                        disabled={signalLoading || !signalRaison}
                                        className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {signalLoading ? 'Envoi...' : 'Envoyer le signalement'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {showLoginModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-gray-900">Connexion requise</h3>
                            <button onClick={() => setShowLoginModal(false)} className="text-gray-400 hover:text-gray-600 transition">
                                <X size={24} />
                            </button>
                        </div>
                        <p className="text-gray-600 mb-6">Vous devez être connecté pour interagir avec les vidéos.</p>
                        <div className="flex gap-3">
                            <button onClick={() => { setShowLoginModal(false); navigateTo('login'); }} className="flex-1 bg-blue-600 text-white px-4 py-2.5 rounded-xl hover:bg-blue-700 transition font-medium">Se connecter</button>
                            <button onClick={() => setShowLoginModal(false)} className="flex-1 bg-gray-200 text-gray-800 px-4 py-2.5 rounded-xl hover:bg-gray-300 transition font-medium">Annuler</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Video;