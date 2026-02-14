
const API_URL = window.location.origin;

class ApiService {
    constructor() {
        this.baseURL = API_URL;
        this.isRefreshing = false;
        this.failedQueue = [];
        console.log('🌐 API initialisé avec:', this.baseURL);
    }

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
            console.error(`❌ API Error:`, error);
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
                throw new Error('Session expirée');
            }
        } finally {
            this.isRefreshing = false;
        }
    }

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

    async login(email, password) {
        const response = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            skipAuth: true,
        });

        console.log('🔍 Login response:', response);

        const accessToken = response.token || response.data?.token || response.access_token || response.data?.access_token;
        const refreshToken = response.refresh_token || response.data?.refresh_token;

        if (accessToken) {
            localStorage.setItem('access_token', accessToken);
            if (refreshToken) {
                localStorage.setItem('refresh_token', refreshToken);
            }
            console.log('✅ Tokens sauvegardés');
        } else {
            console.error('❌ Pas de token dans la réponse!', response);
        }

        return response;
    }

    async register(username, email, password) {
        const response = await this.request('/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password }),
            skipAuth: true,
        });

        console.log('🔍 Register response:', response);

        const accessToken = response.token || response.data?.token || response.access_token || response.data?.access_token;
        const refreshToken = response.refresh_token || response.data?.refresh_token;

        if (accessToken) {
            localStorage.setItem('access_token', accessToken);
            if (refreshToken) {
                localStorage.setItem('refresh_token', refreshToken);
            }
            console.log('✅ Tokens sauvegardés après inscription');
        } else {
            console.error('❌ Pas de token dans la réponse register!', response);
        }

        return response;
    }

    async refreshToken() {
        try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (!refreshToken) return false;

            const response = await this.request('/auth/refresh', {
                method: 'POST',
                body: JSON.stringify({ refresh_token: refreshToken }),
                skipAuth: true,
            });

            const accessToken = response.token || response.data?.token || response.access_token || response.data?.access_token;

            if (accessToken) {
                localStorage.setItem('access_token', accessToken);
                console.log('✅ Token rafraîchi');
                return true;
            }

            return false;
        } catch (error) {
            console.error('❌ Refresh failed:', error);
            return false;
        }
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuth();
        }
    }

    async getCurrentUser() {
        return this.getMe();
    }

    clearAuth() {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        console.log('🔓 Déconnecté');
    }

    isAuthenticated() {
        const token = localStorage.getItem('access_token');
        if (!token) return false;

        const payload = this.decodeToken(token);
        if (!payload) return false;

        return payload.exp > Date.now() / 1000;
    }

    decodeToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length !== 3) return null;
            return JSON.parse(atob(parts[1]));
        } catch (error) {
            return null;
        }
    }

    async getMe() {
        const response = await this.request('/me');
        return response.data || response.user || response;
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

    async verify2FA(userId, code) {
        const response = await this.request('/verify2faLogin.php', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, code }),
            skipAuth: true,
        });

        const accessToken = response.token || response.data?.token || response.access_token || response.data?.access_token;
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
            body: JSON.stringify({ token, password, confirm_password: confirmPassword }),
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

    async getVideos() {
        const response = await this.request('/videos');
        return response.data || response.videos || response;
    }

    async getTrendingVideos(period = 7, limit = 10) {
        const response = await this.request(`/videos/trending?period=${period}&limit=${limit}`);
        return response.data || response;
    }

    async getVideo(id) {
        const response = await this.request(`/videos/${id}`);
        return response.data || response;
    }

    getThumbnailUrl(video) {
        if (video?.thumbnail) {
            return `${this.baseURL}/uploads/thumbnails/${video.thumbnail}`;
        }
        return '/default-thumbnail.jpg';
    }

    async getUserVideos(userId) {
        const response = await this.request(`/users/${userId}/videos`);
        return response.data || response;
    }

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

    async recordView(videoId, data = {}) {
        return this.request(`/videos/${videoId}/record-view`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    getProfileImageUrl(userId) {
        return `${this.baseURL}/uploads/profiles/${userId}.jpg`;
    }

    getCoverImageUrl(userId) {
        return `${this.baseURL}/uploads/covers/${userId}.jpg`;
    }

    async getVideoViews(videoId) {
        const response = await this.request(`/videos/${videoId}/views`);
        return response.data || response;
    }

    async checkViewed(videoId) {
        const response = await this.request(`/videos/${videoId}/viewed`);
        return response.data || response;
    }

    async getVideoAnalytics(videoId, period = '7d') {
        const response = await this.request(`/videos/${videoId}/analytics?period=${period}`);
        return response.data || response;
    }

    async likeVideo(videoId) {
        const response = await this.request(`/videos/${videoId}/like`, { method: 'POST' });
        return response.data || response;
    }

    async dislikeVideo(videoId) {
        const response = await this.request(`/videos/${videoId}/dislike`, { method: 'POST' });
        return response.data || response;
    }

    async getMyReaction(videoId) {
        const response = await this.request(`/videos/${videoId}/my-reaction`);
        return response.data || response;
    }

    async getVideoReactions(videoId) {
        const response = await this.request(`/videos/${videoId}/reactions`);
        return response.data || response;
    }

    async getComments(videoId) {
        const response = await this.request(`/videos/${videoId}/comments`);
        return response.data || response;
    }

    async createComment(videoId, content) {
        return this.request(`/videos/${videoId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    }

    async replyToComment(commentId, content) {
        return this.request(`/comments/${commentId}/replies`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    }

    async getReplies(commentId) {
        const response = await this.request(`/comments/${commentId}/replies`);
        return response.data || response;
    }

    async likeComment(commentId) {
        return this.request(`/comments/${commentId}/like`, { method: 'POST' });
    }

    async getCommentLikeStatus(commentId) {
        const response = await this.request(`/comments/${commentId}/like-status`);
        return response.data || response;
    }

    async likeReply(replyId) {
        return this.request(`/replies/${replyId}/like`, { method: 'POST' });
    }

    async getReplyLikeStatus(replyId) {
        const response = await this.request(`/replies/${replyId}/like-status`);
        return response.data || response;
    }

    async getUserProfile(userId) {
        const response = await this.request(`/users/${userId}/profile`);
        return response.data || response;
    }

    async getUserStats(userId) {
        const response = await this.request(`/users/${userId}/stats`);
        return response.data || response;
    }

    async updateProfile(data) {
        return this.request('/profile', {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    async uploadAvatar(formData) {
        const token = localStorage.getItem('access_token');

        const response = await fetch(`${this.baseURL}/api/users/me/avatar`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });

        return this.handleResponse(response);
    }

    async uploadCover(formData) {
        const token = localStorage.getItem('access_token');

        const response = await fetch(`${this.baseURL}/api/users/me/cover`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData,
        });

        return this.handleResponse(response);
    }

    async updateBio(bio) {
        return this.request('/users/me/bio', {
            method: 'PUT',
            body: JSON.stringify({ bio }),
        });
    }

    async subscribe(userId) {
        return this.request(`/users/${userId}/subscribe`, { method: 'POST' });
    }

    async unsubscribe(userId) {
        return this.request(`/users/${userId}/unsubscribe`, { method: 'DELETE' });
    }

    async getSubscribeStatus(userId) {
        const response = await this.request(`/users/${userId}/subscribe-status`);
        return response.data || response;
    }

    async getSubscribersCount(userId) {
        const response = await this.request(`/users/${userId}/subscribers-count`);
        return response.count || 0;
    }

    async getWatchHistory(userId) {
        const response = await this.request(`/users/${userId}/watch-history`);
        return response.data || response;
    }

    async getNotifications(limit = 20, offset = 0) {
        const response = await this.request(`/notifications?limit=${limit}&offset=${offset}`);
        return response.data || response;
    }

    async getUnreadCount() {
        const response = await this.request('/notifications/unread-count');
        return response.data || response;
    }

    async markAsRead(notificationId) {
        return this.request(`/notifications/${notificationId}/read`, { method: 'PUT' });
    }

    async markAllAsRead() {
        return this.request('/notifications/mark-all-read', { method: 'PUT' });
    }

    async deleteNotification(notificationId) {
        return this.request(`/notifications/${notificationId}`, { method: 'DELETE' });
    }

    async search(query, filters = {}) {
        const params = new URLSearchParams({ q: query, ...filters });
        const response = await this.request(`/search?${params}`);
        return response.data || response;
    }
}

export default new ApiService();