import React, { useState, useEffect, useRef } from 'react';
import {
    Bell,
    Heart,
    MessageCircle,
    UserPlus,
    AtSign,
    Video,
    Check,
    Trash2
} from 'lucide-react';
import { useNotifications } from '../../hooks/useNotification';
import { useToast } from '../ToastContext.jsx';
import apiService from '../../services/apiService';

const NotificationDropdown = () => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const toast = useToast();

    const {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        deleteNotification
    } = useNotifications();

    const navigateTo = (route) => {
        window.location.hash = `#/${route}`;
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleNotificationClick = async (notification) => {
        if (!notification.is_read) {
            await markAsRead(notification.id);
        }

        if (notification.video_id) {
            try {
                const video = await apiService.getVideoById(notification.video_id);
                localStorage.setItem('selectedVideo', JSON.stringify(video));
                navigateTo('video');
            } catch (error) {
                toast.error('Erreur lors du chargement de la vidéo');
            }
        } else if (notification.type === 'subscribe' && notification.actor_id) {
            navigateTo(`chaine/${notification.actor_id}`);
        }

        setIsOpen(false);
    };

    const handleMarkAllAsRead = async () => {
        await markAllAsRead();
        toast.success('Toutes les notifications marquées comme lues');
    };

    const handleDeleteNotification = async (notificationId, e) => {
        e.stopPropagation();
        await deleteNotification(notificationId);
    };

    const getNotificationIcon = (type) => {
        const icons = {
            like: Heart,
            comment: MessageCircle,
            subscribe: UserPlus,
            mention: AtSign,
            reply: MessageCircle,
            video_upload: Video
        };
        const IconComponent = icons[type] || Bell;
        return <IconComponent size={16} />;
    };

    const getNotificationColor = (type) => {
        const colors = {
            like: 'text-red-500 bg-red-50',
            comment: 'text-blue-500 bg-blue-50',
            subscribe: 'text-green-500 bg-green-50',
            mention: 'text-purple-500 bg-purple-50',
            reply: 'text-indigo-500 bg-indigo-50',
            video_upload: 'text-orange-500 bg-orange-50'
        };
        return colors[type] || 'text-gray-500 bg-gray-50';
    };

    const getNotificationText = (type) => {
        const texts = {
            like: 'a aimé votre vidéo',
            comment: 'a commenté votre vidéo',
            subscribe: 's\'est abonné à votre chaîne',
            mention: 'vous a mentionné',
            reply: 'a répondu à votre commentaire',
            video_upload: 'a publié une nouvelle vidéo'
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

        if (minutes < 1) return 'À l\'instant';
        if (minutes < 60) return `Il y a ${minutes}min`;
        if (heures < 24) return `Il y a ${heures}h`;
        if (jours < 7) return `Il y a ${jours}j`;

        return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative text-black hover:text-gray-600 p-2 rounded-full hover:bg-gray-200 hover:bg-opacity-50 transition-all duration-300"
            >
                <Bell size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[32rem] overflow-hidden flex flex-col">
                    <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <Bell size={18} />
                            Notifications
                            {unreadCount > 0 && (
                                <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
                                    {unreadCount}
                                </span>
                            )}
                        </h3>
                        {notifications.length > 0 && unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllAsRead}
                                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                            >
                                <Check size={14} />
                                Tout marquer comme lu
                            </button>
                        )}
                    </div>

                    <div className="overflow-y-auto flex-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-12 px-4">
                                <Bell size={48} className="mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500 font-medium">Aucune notification</p>
                                <p className="text-sm text-gray-400 mt-1">
                                    Vous serez notifié des nouvelles activités
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`px-4 py-3 hover:bg-gray-50 cursor-pointer transition-colors relative group ${
                                            !notification.is_read ? 'bg-blue-50 bg-opacity-30' : ''
                                        }`}
                                    >
                                        <div className="flex gap-3">
                                            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${getNotificationColor(notification.type)}`}>
                                                {getNotificationIcon(notification.type)}
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm text-gray-900 line-clamp-2">
                                                    <span className="font-semibold">{notification.actor_name}</span>
                                                    {' '}
                                                    {getNotificationText(notification.type)}
                                                </p>

                                                {notification.video_title && (
                                                    <p className="text-xs text-gray-600 truncate mt-1">
                                                        "{notification.video_title}"
                                                    </p>
                                                )}

                                                {notification.comment_preview && (
                                                    <p className="text-xs text-gray-500 italic truncate mt-1">
                                                        "{notification.comment_preview}"
                                                    </p>
                                                )}

                                                <p className="text-xs text-gray-400 mt-1">
                                                    {formatTimeAgo(notification.created_at)}
                                                </p>
                                            </div>

                                            {!notification.is_read && (
                                                <div className="flex-shrink-0">
                                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                                </div>
                                            )}

                                            <button
                                                onClick={(e) => handleDeleteNotification(notification.id, e)}
                                                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                                            >
                                                <Trash2 size={14} className="text-gray-400 hover:text-red-500" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
                            <button
                                onClick={() => {
                                    setIsOpen(false);
                                    navigateTo('notifications');
                                }}
                                className="w-full text-center text-sm text-blue-600 hover:text-blue-700 font-medium"
                            >
                                Voir toutes les notifications
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;