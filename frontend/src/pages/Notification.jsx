import React, { useState } from 'react';
import {
    Bell, Heart, MessageCircle, UserPlus, AtSign,
    Video, Check, Trash2, RefreshCw, Filter
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotification';
import { useToast } from '../contexts/ToastContext.jsx';
import apiService from '../services/apiService.js';

const getNotificationIcon = (type) => {
    const icons = {
        like: Heart,
        comment: MessageCircle,
        subscribe: UserPlus,
        mention: AtSign,
        reply: MessageCircle,
        video_upload: Video,
    };
    const Icon = icons[type] || Bell;
    return <Icon size={18} />;
};

const getNotificationColor = (type) => {
    const colors = {
        like: 'text-red-500 bg-red-50',
        comment: 'text-blue-500 bg-blue-50',
        subscribe: 'text-green-500 bg-green-50',
        mention: 'text-purple-500 bg-purple-50',
        reply: 'text-indigo-500 bg-indigo-50',
        video_upload: 'text-orange-500 bg-orange-50',
    };
    return colors[type] || 'text-gray-500 bg-gray-50';
};

const getNotificationText = (type) => {
    const texts = {
        like: 'a aimé votre vidéo',
        comment: 'a commenté votre vidéo',
        subscribe: "s'est abonné à votre chaîne",
        mention: 'vous a mentionné',
        reply: 'a répondu à votre commentaire',
        video_upload: 'a publié une nouvelle vidéo',
    };
    return texts[type] || 'vous a notifié';
};

const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const heures = Math.floor(diff / 3600000);
    const jours = Math.floor(diff / 86400000);
    if (minutes < 1) return "À l'instant";
    if (minutes < 60) return `Il y a ${minutes}min`;
    if (heures < 24) return `Il y a ${heures}h`;
    if (jours < 7) return `Il y a ${jours}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
};

const FILTERS = [
    { id: 'all', label: 'Toutes' },
    { id: 'unread', label: 'Non lues' },
    { id: 'like', label: 'J\'aime' },
    { id: 'comment', label: 'Commentaires' },
    { id: 'subscribe', label: 'Abonnements' },
    { id: 'video_upload', label: 'Vidéos' },
];

const Notifications = () => {
    const toast = useToast();
    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllRead,
        reload,
    } = useNotifications();

    const [filter, setFilter] = useState('all');

    const handleNotificationClick = async (notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }

        if (notification.video_id) {
            try {
                const video = await apiService.getVideoById(notification.video_id);
                localStorage.setItem('selectedVideo', JSON.stringify(video));
                window.location.hash = '#/video';
            } catch {
                toast.error('Erreur lors du chargement de la vidéo');
            }
        } else if (notification.type === 'subscribe' && notification.actor_id) {
            localStorage.setItem('channelUser', JSON.stringify({ id: notification.actor_id, username: notification.actor_name }));
            window.location.hash = `#/chaine/${notification.actor_id}`;
        }
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
        toast.success('Toutes les notifications marquées comme lues');
    };

    const handleDeleteAllRead = async () => {
        await deleteAllRead();
        toast.success('Notifications lues supprimées');
    };

    const filtered = notifications.filter(n => {
        if (filter === 'all') return true;
        if (filter === 'unread') return !n.is_read;
        return n.type === filter;
    });

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-50 via-white to-blue-50">
            <div className="max-w-3xl mx-auto px-4 py-8">

                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl shadow-lg">
                            <Bell size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
                            {unreadCount > 0 && (
                                <p className="text-sm text-gray-500 mt-0.5">
                                    <span className="font-semibold text-blue-600">{unreadCount}</span> non lue{unreadCount > 1 ? 's' : ''}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => reload()}
                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                            title="Rafraîchir"
                        >
                            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                        </button>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-all font-medium"
                            >
                                <Check size={16} />
                                Tout marquer lu
                            </button>
                        )}
                        {notifications.some(n => n.is_read) && (
                            <button
                                onClick={handleDeleteAllRead}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-lg transition-all font-medium"
                            >
                                <Trash2 size={16} />
                                Supprimer lues
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                    {FILTERS.map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                                filter === f.id
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600'
                            }`}
                        >
                            {f.label}
                            {f.id === 'unread' && unreadCount > 0 && (
                                <span className="ml-1.5 bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                    {loading ? (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center py-20 px-4">
                            <Bell size={56} className="mx-auto text-gray-200 mb-4" />
                            <p className="text-gray-500 font-semibold text-lg">
                                {filter === 'all' ? 'Aucune notification' : 'Aucune notification dans cette catégorie'}
                            </p>
                            <p className="text-sm text-gray-400 mt-1">Vous serez notifié des nouvelles activités</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {filtered.map((notification) => (
                                <div
                                    key={notification.id}
                                    onClick={() => handleNotificationClick(notification)}
                                    className={`px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors relative group ${
                                        !notification.is_read ? 'bg-blue-50 bg-opacity-40' : ''
                                    }`}
                                >
                                    <div className="flex gap-4 items-start">
                                        <div className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                                            {getNotificationIcon(notification.type)}
                                        </div>

                                        <div className="flex-1 min-w-0 pr-8">
                                            <p className="text-sm text-gray-900 leading-snug">
                                                <span className="font-semibold">{notification.actor_name}</span>
                                                {' '}
                                                {getNotificationText(notification.type)}
                                            </p>

                                            {notification.video_title && (
                                                <p className="text-xs text-gray-600 truncate mt-1 font-medium">
                                                    "{notification.video_title}"
                                                </p>
                                            )}
                                            {notification.comment_preview && (
                                                <p className="text-xs text-gray-500 italic truncate mt-1">
                                                    "{notification.comment_preview}"
                                                </p>
                                            )}

                                            <p className="text-xs text-gray-400 mt-1.5">
                                                {formatTimeAgo(notification.created_at)}
                                            </p>
                                        </div>

                                        {!notification.is_read && (
                                            <div className="flex-shrink-0 mt-1">
                                                <div className="w-2.5 h-2.5 bg-blue-500 rounded-full" />
                                            </div>
                                        )}

                                        <button
                                            onClick={(e) => { e.stopPropagation(); deleteNotification(notification.id); }}
                                            className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 hover:bg-gray-200 rounded-lg"
                                        >
                                            <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Notifications;