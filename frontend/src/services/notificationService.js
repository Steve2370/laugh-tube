import apiService from './apiService.js';

class NotificationService {
    constructor() {
        this.listeners = new Set();
        this.pollingInterval = null;
        this.pollingDelay = 30000;
        this.lastCheck = null;
        this.cache = {
            notifications: [],
            unreadCount: 0,
            timestamp: null
        };
    }

    async getNotifications(limit = 20, offset = 0) {
        try {
            const response = await apiService.request(
                `/notifications?limit=${limit}&offset=${offset}`
            );

            const result = {
                success: true,
                notifications: response.notifications || [],
                unreadCount: response.unread_count || 0,
                total: response.total || 0
            };

            if (offset === 0) {
                this.cache = {
                    notifications: result.notifications,
                    unreadCount: result.unreadCount,
                    timestamp: Date.now()
                };
            }

            return result;

        } catch (error) {
            console.error('NotificationService.getNotifications:', error);
            return {
                success: false,
                notifications: [],
                unreadCount: 0,
                error: error.message
            };
        }
    }

    async getUnreadCount() {
        try {
            const response = await apiService.request('/notifications/unread-count');
            const count = response.unread_count || response.count || 0;

            this.cache.unreadCount = count;

            return count;

        } catch (error) {
            console.error('NotificationService.getUnreadCount:', error);
            return this.cache.unreadCount || 0;
        }
    }

    async getNotificationsByType(type, limit = 20, offset = 0) {
        try {
            const response = await apiService.request(
                `/notifications?type=${type}&limit=${limit}&offset=${offset}`
            );

            return {
                success: true,
                notifications: response.notifications || [],
                unreadCount: response.unread_count || 0
            };

        } catch (error) {
            console.error('NotificationService.getNotificationsByType:', error);
            return {
                success: false,
                notifications: [],
                unreadCount: 0
            };
        }
    }

    async markAsRead(notificationId) {
        try {
            await apiService.request(`/notifications/${notificationId}/read`, {
                method: 'PUT'
            });

            // Mettre à jour le cache
            this._updateCacheNotification(notificationId, { is_read: true });
            if (this.cache.unreadCount > 0) {
                this.cache.unreadCount--;
            }

            // Notifier les listeners
            this._notifyListeners('read', notificationId);

            return { success: true };

        } catch (error) {
            console.error('NotificationService.markAsRead:', error);
            return { success: false, error: error.message };
        }
    }

    async markAllAsRead() {
        try {
            await apiService.request('/notifications/mark-all-read', {
                method: 'PUT'
            });
            this.cache.notifications = this.cache.notifications.map(n => ({
                ...n,
                is_read: true
            }));
            this.cache.unreadCount = 0;
            this._notifyListeners('all_read');

            return { success: true };

        } catch (error) {
            console.error('NotificationService.markAllAsRead:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteNotification(notificationId) {
        try {
            await apiService.request(`/notifications/${notificationId}`, {
                method: 'DELETE'
            });

            const notification = this._findInCache(notificationId);
            if (notification && !notification.is_read) {
                this.cache.unreadCount = Math.max(0, this.cache.unreadCount - 1);
            }

            this.cache.notifications = this.cache.notifications.filter(
                n => n.id !== notificationId
            );

            this._notifyListeners('deleted', notificationId);
            return { success: true };

        } catch (error) {
            console.error('NotificationService.deleteNotification:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteAllRead() {
        try {
            await apiService.request('/notifications/delete-read', {
                method: 'DELETE'
            });

            this.cache.notifications = this.cache.notifications.filter(
                n => !n.is_read
            );
            this._notifyListeners('deleted_read');

            return { success: true };

        } catch (error) {
            console.error('NotificationService.deleteAllRead:', error);
            return { success: false, error: error.message };
        }
    }

    startPolling(callback) {
        if (!apiService.isAuthenticated()) {
            console.log('Non authentifié, pas de polling');
            return;
        }

        this.checkForNewNotifications(callback);

        this.pollingInterval = setInterval(() => {
            this.checkForNewNotifications(callback);
        }, this.pollingDelay);

        console.log('Polling des notifications démarré');
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
            console.log('🛑 Polling des notifications arrêté');
        }
    }

    async checkForNewNotifications(callback) {
        try {
            const result = await this.getNotifications(10, 0);

            if (result.success) {
                this.lastCheck = Date.now();

                if (callback && typeof callback === 'function') {
                    callback(result.notifications, result.unreadCount);
                }

                this._notifyListeners('update', result);
            }

        } catch (error) {
            console.error('NotificationService.checkForNewNotifications:', error);
        }
    }

    setPollingDelay(milliseconds) {
        this.pollingDelay = Math.max(5000, milliseconds); // Min 5 secondes

        if (this.pollingInterval) {
            const wasPolling = true;
            this.stopPolling();
            if (wasPolling) {
                this.startPolling();
            }
        }
    }

    addListener(callback) {
        if (typeof callback === 'function') {
            this.listeners.add(callback);
        }
        return () => this.removeListener(callback);
    }

    removeListener(callback) {
        this.listeners.delete(callback);
    }

    _notifyListeners(event, data) {
        this.listeners.forEach(listener => {
            try {
                listener({ event, data, timestamp: Date.now() });
            } catch (error) {
                console.error('Erreur listener notification:', error);
            }
        });
    }

    formatNotificationMessage(notification) {
        const { type, actor_name, video_title, comment_preview } = notification;

        switch (type) {
            case 'like':
                return `${actor_name} a aimé votre vidéo "${video_title}"`;

            case 'comment':
                return comment_preview
                    ? `${actor_name} a commenté : "${comment_preview}"`
                    : `${actor_name} a commenté votre vidéo "${video_title}"`;

            case 'subscribe':
                return `${actor_name} s'est abonné à votre chaîne`;

            case 'mention':
                return `${actor_name} vous a mentionné dans un commentaire`;

            case 'reply':
                return `${actor_name} a répondu à votre commentaire`;

            case 'video_upload':
                return `${actor_name} a publié une nouvelle vidéo : "${video_title}"`;

            default:
                return notification.message || 'Nouvelle notification';
        }
    }

    getNotificationIcon(type) {
        const icons = {
            like: '❤️',
            comment: '💬',
            subscribe: '👤',
            mention: '@',
            reply: '↩️',
            video_upload: '🎬'
        };
        return icons[type] || '🔔';
    }

    getNotificationColor(type) {
        const colors = {
            like: 'text-red-500',
            comment: 'text-blue-500',
            subscribe: 'text-green-500',
            mention: 'text-purple-500',
            reply: 'text-indigo-500',
            video_upload: 'text-orange-500'
        };
        return colors[type] || 'text-gray-500';
    }

    formatRelativeTime(date) {
        const now = new Date();
        const notifDate = new Date(date);
        const diffMs = now - notifDate;
        const diffSec = Math.floor(diffMs / 1000);
        const diffMin = Math.floor(diffSec / 60);
        const diffHour = Math.floor(diffMin / 60);
        const diffDay = Math.floor(diffHour / 24);

        if (diffSec < 60) return 'À l\'instant';
        if (diffMin < 60) return `Il y a ${diffMin} min`;
        if (diffHour < 24) return `Il y a ${diffHour}h`;
        if (diffDay < 7) return `Il y a ${diffDay}j`;

        return notifDate.toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short'
        });
    }

    getCached() {
        const age = this.cache.timestamp
            ? Date.now() - this.cache.timestamp
            : Infinity;

        if (age < 60000) {
            return this.cache;
        }

        return null;
    }

    invalidateCache() {
        this.cache = {
            notifications: [],
            unreadCount: 0,
            timestamp: null
        };
    }

    _updateCacheNotification(notificationId, updates) {
        const index = this.cache.notifications.findIndex(n => n.id === notificationId);
        if (index !== -1) {
            this.cache.notifications[index] = {
                ...this.cache.notifications[index],
                ...updates
            };
        }
    }

    _findInCache(notificationId) {
        return this.cache.notifications.find(n => n.id === notificationId);
    }

    cleanup() {
        this.stopPolling();
        this.listeners.clear();
        this.invalidateCache();
    }

    getStatus() {
        return {
            isPolling: this.pollingInterval !== null,
            pollingDelay: this.pollingDelay,
            lastCheck: this.lastCheck,
            listenersCount: this.listeners.size,
            cacheAge: this.cache.timestamp
                ? Date.now() - this.cache.timestamp
                : null
        };
    }
}

const notificationService = new NotificationService();
export default notificationService;