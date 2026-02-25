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

    async markAsRead(notificationId) {
        try {
            await apiService.request(`/notifications/${notificationId}/read`, {
                method: 'PUT'
            });

            this._updateCacheNotification(notificationId, { is_read: true });
            if (this.cache.unreadCount > 0) {
                this.cache.unreadCount--;
            }

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
    }

    stopPolling() {
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
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
}

const notificationService = new NotificationService();
export default notificationService;