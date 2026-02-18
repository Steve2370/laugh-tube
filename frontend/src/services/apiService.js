const API_URL = window.location.origin;

class ApiService {
    constructor() {
        this.baseURL = API_URL;
        this.isRefreshing = false;
        this.failedQueue = [];
        console.log('API Service initialisé:', this.baseURL);
    }

    /**
     *
     * @param {string} endpoint
     * @param {object} options
     * @returns {Promise<any>}
     */
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}/api${endpoint}`;
        const token = localStorage.getItem('access_token');

        const headers = { ...options.headers };

        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        if (token && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        try {
            const response = await fetch(url, { ...options, headers });

            if (response.status === 401 && token && !options.skipAuth) {
                return this.handleTokenExpired(endpoint, options);
            }

            return this.handleResponse(response);
        } catch (error) {
            console.error(`Erreur requête ${endpoint}:`, error);
            throw error;
        }
    }

    async handleTokenExpired(endpoint, options) {
        if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
                this.failedQueue.push({ resolve, reject, endpoint, options });
            });
        }

        this.isRefreshing = true;

        try {
            const refreshed = await this.refreshToken();

            if (refreshed) {
                this.failedQueue.forEach(({ resolve, endpoint, options }) => {
                    resolve(this.request(endpoint, options));
                });
                this.failedQueue = [];

                return this.request(endpoint, options);
            } else {
                this.clearAuth();
                window.location.hash = '#/login';
                throw new Error('Session expirée - veuillez vous reconnecter');
            }
        } finally {
            this.isRefreshing = false;
        }
    }

    /**
     *
     * @private
     */
    async handleResponse(response) {
        const contentType = response.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || data.error || `Erreur ${response.status}`);
            }

            return data;
        }

        if (!response.ok) {
            throw new Error(`Erreur ${response.status}`);
        }

        return response;
    }

    /**
     *
     * @param {string} email
     * @param {string} password
     * @returns {Promise<object>}
     */
    async login(email, password) {
        const response = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            skipAuth: true,
        });


        const accessToken = response.token || response.data?.token ||
            response.access_token || response.data?.access_token;
        const refreshToken = response.refresh_token || response.data?.refresh_token;

        if (accessToken) {
            localStorage.setItem('access_token', accessToken);
            if (refreshToken) {
                localStorage.setItem('refresh_token', refreshToken);
            }
        } else {
            console.error('Aucun token dans la réponse:', response);
        }

        return response;
    }

    /**
     *
     * @param {string} username
     * @param {string} email
     * @param {string} password
     * @returns {Promise<object>}
     */
    async register(username, email, password) {
        const response = await this.request('/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password }),
            skipAuth: true,
        });

        const accessToken = response.token || response.data?.token ||
            response.access_token || response.data?.access_token;
        const refreshToken = response.refresh_token || response.data?.refresh_token;

        if (accessToken) {
            localStorage.setItem('access_token', accessToken);
            if (refreshToken) {
                localStorage.setItem('refresh_token', refreshToken);
            }
        } else {
            console.error('Aucun token dans la réponse register:', response);
        }

        return response;
    }

    /**
     *
     * @returns {Promise<boolean>}
     */
    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) {
                console.warn('Aucun refresh token disponible');
                return false;
            }

            const response = await this.request('/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({ refresh_token: refreshToken }),
                skipAuth: true,
            });

            const accessToken = response.token || response.data?.token ||
                response.access_token || response.data?.access_token;

            if (accessToken) {
                localStorage.setItem('access_token', accessToken);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Échec du refresh:', error);
            return false;
        }
    }

    async logout() {
        const token = localStorage.getItem('access_token');
        if (token) {
            fetch(`${this.baseURL}/api/auth/logout`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            }).catch(() => {});
        }
        this.clearAuth();
    }

    /**
     *
     * @returns {Promise<object|null>}
     */
    async getCurrentUser() {
        const token = localStorage.getItem('access_token');
        if (!token) return null;

        try {
            return await this.getMe();
        } catch (error) {
            console.error('Erreur getCurrentUser:', error);
            this.clearAuth();
            return null;
        }
    }

    async getMe() {
        const response = await this.request('/me');
        return response.data || response.user || response;
    }

    clearAuth() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
    }

    /**
     *
     * @returns {boolean}
     */
    isAuthenticated() {
        const token = localStorage.getItem('access_token');
        if (!token) return false;

        const payload = this.decodeToken(token);
        if (!payload) return false;

        return payload.exp > Date.now() / 1000;
    }

    decodeToken(token) {
        try {
            if (!token || typeof token !== "string") return null;
            const parts = token.split(".");
            if (parts.length !== 3) return null;
            const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
            return payload ?? null;
        } catch (e) {
            console.warn("Erreur décodage token:", e);
            return null;
        }
    }

    async changePassword(currentPassword, newPassword) {
        return this.request('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword,
            }),
        });
    }

    async check2FAStatus() {
        try {
            const token = localStorage.getItem('access_token');
            if (!token) return { enabled: false };

            const response = await fetch(`${this.baseURL}/api/auth/2fa/status`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok || response.status === 404) return { enabled: false };

            const text = await response.text();
            if (!text || text.trim() === '') return { enabled: false };

            const data = JSON.parse(text);
            return data.data || data;
        } catch (error) {
            console.warn('2FA status non disponible:', error.message);
            return { enabled: false };
        }
    }

    async verify2FA(userId, code) {
        const response = await this.request('/verify2faLogin.php', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, code }),
            skipAuth: true,
        });

        const accessToken = response.token || response.data?.token ||
            response.access_token || response.data?.access_token;
        const refreshToken = response.refresh_token || response.data?.refresh_token;

        if (accessToken) {
            localStorage.setItem('access_token', accessToken);
            if (refreshToken) {
                localStorage.setItem('refresh_token', refreshToken);
            }
        }

        return response;
    }

    async requestPasswordReset(email) {
        return this.request('/resetPasswordRequest.php', {
            method: 'POST',
            body: JSON.stringify({ email }),
            skipAuth: true,
        });
    }

    async resetPassword(token, password, confirmPassword) {
        return this.request('/resetPassword.php', {
            method: 'POST',
            body: JSON.stringify({
                token,
                password,
                confirm_password: confirmPassword
            }),
            skipAuth: true,
        });
    }

    async resendVerification(email) {
        return this.request('/resendVerification.php', {
            method: 'POST',
            body: JSON.stringify({ email }),
            skipAuth: true,
        });
    }

    /**
     *
     * @returns {Promise<Array>}
     */
    async getVideos() {
        const response = await this.request('/videos');
        return response.data || response.videos || response;
    }

    /**
     *
     * @param {number} period
     * @param {number} limit
     */
    async getTrendingVideos(period = 7, limit = 10) {
        const response = await this.request(`/videos/trending?period=${period}&limit=${limit}`);
        return response.data || response.videos || response;
    }

    /**
     *
     * @param {number} id
     */
    async getVideo(id) {
        const response = await this.request(`/videos/${id}`);
        return response.data || response.video || response;
    }

    async getVideoById(id) {
        try {
            return await this.getVideo(id);
        } catch (error) {
            console.error('Erreur getVideoById:', error);
            throw error;
        }
    }

    /**
     *
     * @param {number|object} videoOrId
     * @returns {string}
     */
    getThumbnailUrl(videoOrId) {
        if (typeof videoOrId === 'object' && videoOrId?.thumbnail) {
            return `${this.baseURL}/uploads/thumbnails/${videoOrId.thumbnail}`;
        }

        if (typeof videoOrId === 'number' || typeof videoOrId === 'string') {
            return `${this.baseURL}/api/videos/${videoOrId}/thumbnail`;
        }

        return '/images/placeholder-video.png';
    }

    getVideoStreamUrl(videoId) {
        return `${this.baseURL}/api/videos/${videoId}/play`;
    }

    /**
     *
     * @param {FormData} formData
     */
    async uploadVideo(formData) {
        const token = localStorage.getItem('access_token');
        if (!token) throw new Error('Non authentifié');

        const response = await fetch(`${this.baseURL}/api/videos/upload`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });

        return this.handleResponse(response);
    }

    async deleteVideo(id) {
        return this.request(`/videos/${id}`, { method: 'DELETE' });
    }

    /**
     *
     * @param {number} videoId
     * @param {object} data
     */
    async recordView(videoId, data = {}) {
        try {
            const sessionId = this.getOrCreateSessionId();
            const payload = {
                session_id:       data.session_id      ?? sessionId,
                user_id:          data.user_id          ?? null,
                watch_time:       data.watch_time       ?? 0,
                watch_percentage: data.watch_percentage ?? 0,
                completed:        data.completed        ?? false,
            };
            return await this.request(`/videos/${videoId}/record-view`, {
                method: 'POST',
                body: JSON.stringify(payload),
            });
        } catch (error) {
            console.warn('Erreur enregistrement vue:', error);
            return null;
        }
    }

    /**
     *
     * @param {number} videoId
     */
    async incrementVideoView(videoId) {
        try {
            return await this.request(`/videos/${videoId}/view`, {
                method: 'POST',
            });
        } catch (error) {
            console.warn('Erreur increment view:', error);
            return null;
        }
    }

    async getVideoViews(videoId) {
        const response = await this.request(`/videos/${videoId}/views`);
        return response.data || response.views || response;
    }

    async checkViewed(videoId) {
        const response = await this.request(`/videos/${videoId}/viewed`);
        return response.data || response.viewed || response;
    }

    /**
     *
     * @param {number} videoId
     * @param {string} period
     */
    async getVideoAnalytics(videoId, period = '7d') {
        const response = await this.request(`/videos/${videoId}/analytics?period=${period}`);
        return response.data || response;
    }

    async likeVideo(videoId) {
        const response = await this.request(`/videos/${videoId}/like`, {
            method: 'POST'
        });
        return response.data || response;
    }

    async dislikeVideo(videoId) {
        const response = await this.request(`/videos/${videoId}/dislike`, {
            method: 'POST'
        });
        return response.data || response;
    }

    async getMyReaction(videoId) {
        if (!this.isAuthenticated()) return null;

        const response = await this.request(`/videos/${videoId}/my-reaction`);
        return response.data || response.reaction || response;
    }

    async getVideoReactions(videoId) {
        const response = await this.request(`/videos/${videoId}/reactions`);
        return response.data || response;
    }

    async getUserReactionStatus(videoId) {
        if (!this.isAuthenticated()) return null;

        try {
            return await this.getMyReaction(videoId);
        } catch (error) {
            console.warn('Status réaction non disponible:', error.message);
            return null;
        }
    }

    async getComments(videoId) {
        const response = await this.request(`/videos/${videoId}/comments`);
        return response.data || response.comments || response.commentaires || response;
    }

    async createComment(videoId, content) {
        if (!videoId) throw new Error('ID de la vidéo manquant');
        const trimmed = (content || '').trim();
        if (trimmed.length === 0) throw new Error('Le commentaire ne peut pas être vide');
        return this.request(`/videos/${videoId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content: trimmed }),
        });
    }

    async replyToComment(commentId, content) {
        if (!commentId) throw new Error('ID du commentaire manquant');
        const trimmed = (content || '').trim();
        if (trimmed.length === 0) throw new Error('La réponse ne peut pas être vide');
        return this.request(`/comments/${commentId}/replies`, {
            method: 'POST',
            body: JSON.stringify({ content: trimmed }),
        });
    }

    async likeComment(commentId) {
        return this.request(`/comments/${commentId}/like`, { method: 'POST' });
    }

    async toggleReplyLike(replyId) {
        return this.request(`/replies/${replyId}/like`, {
            method: 'POST'
        });
    }

    async toggleCommentLike(commentId) {
        return this.request(`/comments/${commentId}/like`, {
            method: 'POST'
        });
    }

    async getCommentLikeStatus(commentId) {
        return this.request(`/comments/${commentId}/like-status`);
    }

    async postReply(commentId, content) {
        if (!commentId) throw new Error('ID du commentaire manquant');
        const trimmed = (content || '').trim();
        if (trimmed.length === 0) throw new Error('La réponse ne peut pas être vide');
        return this.request(`/comments/${commentId}/replies`, {
            method: 'POST',
            body: JSON.stringify({ content: trimmed })
        });
    }

    async getReplies(commentId) {
        return this.request(`/comments/${commentId}/replies`);
    }

    async toggleReplyDislike(replyId) {
        return this.request(`/replies/${replyId}/dislike`, {
            method: 'POST'
        });
    }

    async likeReply(replyId) {
        return this.request(`/replies/${replyId}/like`, { method: 'POST' });
    }

    async getReplyLikeStatus(replyId) {
        const response = await this.request(`/replies/${replyId}/like-status`);
        return response.data || response;
    }

    /**
     *
     * @param {number} userId
     */
    async getUserProfile(userId) {
        if (!userId) {
            console.warn('getUserProfile appelé sans userId');
            return { success: false, data: null, error: 'userId manquant' };
        }
        try {
            const response = await this.request(`/users/${userId}/profile`);
            const data = response.data || response.profile || response;
            return { success: true, data };
        } catch (error) {
            console.error('getUserProfile erreur:', error.message);
            return { success: false, data: null, error: error.message };
        }
    }

    async getUserStats(userId) {
        const response = await this.request(`/users/${userId}/stats`);
        return response.data || response.stats || response;
    }

    async getUserVideos(userId) {
        const response = await this.request(`/users/${userId}/videos`);
        const raw = response.data || response.videos || response;
        const list = Array.isArray(raw) ? raw : [];

        return list.map(v => ({
            ...v,
            views:    v.views    ?? v.nb_vues           ?? v.view_count    ?? v.views_count    ?? 0,
            likes:    v.likes    ?? v.nb_likes           ?? v.likes_count   ?? v.like_count     ?? 0,
            comments: v.comments ?? v.nb_commentaires    ?? v.comments_count ?? v.comment_count ?? 0,
            user_id:  v.user_id  ?? v.userId             ?? v.author_id     ?? v.authorId       ?? null,
        }));
    }

    async updateProfile(data) {
        return this.request('/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    /**
     *
     * @param {FormData} formData
     */
    async uploadAvatar(formData) {
        const token = localStorage.getItem('access_token');
        if (!token) throw new Error('Non authentifié');

        const response = await fetch(`${this.baseURL}/api/users/me/avatar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });

        return this.handleResponse(response);
    }

    /**
     *
     * @param {FormData} formData
     */
    async uploadCover(formData) {
        const token = localStorage.getItem('access_token');
        if (!token) throw new Error('Non authentifié');

        const response = await fetch(`${this.baseURL}/api/users/me/cover`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });

        return this.handleResponse(response);
    }

    /**
     *
     * @param {number|object} userOrId
     * @returns {string}
     */
    getProfileImageUrl(userOrId) {
        if (typeof userOrId === 'object' && userOrId?.avatar_url) {
            return userOrId.avatar_url.startsWith('http')
                ? userOrId.avatar_url
                : `${this.baseURL}${userOrId.avatar_url}`;
        }

        if (typeof userOrId === 'number' || typeof userOrId === 'string') {
            return `${this.baseURL}/api/users/${userOrId}/profile-image`;
        }

        return '/images/default-avatar.png';
    }

    /**
     *
     * @param {number|object} userOrId
     * @returns {string}
     */
    getCoverImageUrl(userOrId) {
        if (typeof userOrId === 'object' && userOrId?.cover_url) {
            return userOrId.cover_url.startsWith('http')
                ? userOrId.cover_url
                : `${this.baseURL}${userOrId.cover_url}`;
        }

        if (typeof userOrId === 'number' || typeof userOrId === 'string') {
            return `${this.baseURL}/api/users/${userOrId}/cover-image`;
        }

        return '/images/default-cover.png';
    }

    async updateBio(bio) {
        return this.request('/users/me/bio', {
            method: 'PUT',
            body: JSON.stringify({ bio }),
        });
    }

    async getWatchHistory(userId) {
        const response = await this.request(`/users/${userId}/watch-history`);
        return response.data || response.history || response;
    }

    async subscribe(userId) {
        return this.request(`/users/${userId}/subscribe`, { method: 'POST' });
    }

    async unsubscribe(userId) {
        return this.request(`/users/${userId}/unsubscribe`, { method: 'DELETE' });
    }

    async getSubscribeStatus(userId) {
        const response = await this.request(`/users/${userId}/subscribe-status`);
        return response.data || response.subscribed || response;
    }

    async getSubscribersCount(userId) {
        const response = await this.request(`/users/${userId}/subscribers-count`);
        return response;
    }

    async getSubscribersCountValue(userId) {
        const response = await this.request(`/users/${userId}/subscribers-count`);
        return response.count ?? response.subscribers_count ?? response.data?.count ?? response.data?.subscribers_count ?? 0;
    }

    async getNotifications(limit = 20, offset = 0) {
        const response = await this.request(`/notifications?limit=${limit}&offset=${offset}`);
        return response.data || response.notifications || response;
    }

    async getUnreadCount() {
        const response = await this.request('/notifications/unread-count');
        return response.data || response.count || response.unread_count || 0;
    }

    async markAsRead(notificationId) {
        return this.request(`/notifications/${notificationId}/read`, {
            method: 'PUT'
        });
    }

    async markAllAsRead() {
        return this.request('/notifications/mark-all-read', {
            method: 'PUT'
        });
    }

    async deleteNotification(notificationId) {
        return this.request(`/notifications/${notificationId}`, {
            method: 'DELETE'
        });
    }

    /**
     *
     * @param {string} query - Terme de recherche
     * @param {object} filters - Filtres additionnels
     */
    async search(query, filters = {}) {
        const params = new URLSearchParams({ q: query, ...filters });
        const response = await this.request(`/search?${params}`);
        return response.data || response.results || response;
    }

    generateSessionId() {
        return 'anon_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    getOrCreateSessionId() {
        let sessionId = localStorage.getItem('session_id');
        if (!sessionId) {
            sessionId = this.generateSessionId();
            localStorage.setItem('session_id', sessionId);
        }
        return sessionId;
    }

    hasViewedVideo(videoId, userId = null) {
        const sessionId = this.getOrCreateSessionId();
        const viewedKey = userId
            ? `video_viewed_${videoId}_${userId}`
            : `video_viewed_${videoId}_${sessionId}`;
        return localStorage.getItem(viewedKey) === 'true';
    }

    markVideoAsViewed(videoId, userId = null) {
        const sessionId = this.getOrCreateSessionId();
        const viewedKey = userId
            ? `video_viewed_${videoId}_${userId}`
            : `video_viewed_${videoId}_${sessionId}`;
        localStorage.setItem(viewedKey, 'true');
    }

    formatViewCount(count) {
        if (!count) return '0';
        if (count >= 1000000) {
            return `${(count / 1000000).toFixed(1)}M`;
        } else if (count >= 1000) {
            return `${(count / 1000).toFixed(1)}K`;
        }
        return count.toString();
    }

    formatWatchTime(milliseconds) {
        if (!milliseconds) return '0s';
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);

        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    formatDate(date) {
        if (!date) return 'Date inconnue';
        return new Date(date).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }
}

export default new ApiService();