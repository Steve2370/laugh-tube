class ApiService {
    constructor() {
        this.baseUrl = "/api";
        this.tokenKey = 'access_token';
        this.refreshTokenKey = 'refresh_token';
        this.userKey = 'user';

        this.requestQueue = new Map();
        this.retryAttempts = 3;
        this.retryDelay = 1000;

        this.requestCounts = new Map();
        this.rateLimitWindow = 60000;
        this.maxRequestsPerWindow = 100;
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;

        const token = this.getToken();
        const headers = {
            ...(options.headers || {}),
        };

        if (token) {
            headers["Authorization"] = `Bearer ${token}`;
        }

        const body = options.body;
        const isFormData = typeof FormData !== "undefined" && body instanceof FormData;
        const isPlainObjectBody =
            body &&
            !isFormData &&
            typeof body === "object" &&
            !(body instanceof Blob) &&
            !(body instanceof ArrayBuffer);

        const finalOptions = {
            ...options,
            headers,
            body,
        };

        if (isPlainObjectBody) {
            finalOptions.body = JSON.stringify(body);
            finalOptions.headers["Content-Type"] = "application/json";
        } else if (!body && !finalOptions.headers["Content-Type"]) {
            finalOptions.headers["Content-Type"] = "application/json";
        }

        console.log("⏳ Requête en cours, attente...", finalOptions.method || "GET", endpoint);

        const response = await fetch(url, finalOptions);

        console.log("✅ Réponse reçue:", response.status);

        const contentType = response.headers.get("content-type") || "";

        if (!response.ok) {
            const raw = await response.text();

            let msg = `HTTP ${response.status}`;
            try {
                const parsed = JSON.parse(raw);
                msg = parsed.error || parsed.message || msg;
            } catch {
                msg = raw?.slice(0, 200) || msg;
            }

            throw new Error(msg);
        }

        if (contentType.includes("application/json")) {
            return await response.json();
        }

        return await response.text();
    }

    async _executeRequest(endpoint, options = {}, retryCount = 0) {
        const url = `${this.baseUrl}${endpoint}`;
        const method = (options.method || 'GET').toUpperCase();

        const headers = {
            ...(options.headers || {}),
        };

        const isFormData = options.body instanceof FormData;
        if (!isFormData && !headers['Content-Type'] && !headers['content-type']) {
            headers['Content-Type'] = 'application/json';
        }

        const token = this.getToken();
        if (token && !this.isPublicEndpoint(endpoint, method)) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        const finalOptions = {
            ...options,
            method,
            headers,
        };

        try {
            const response = await fetch(url, finalOptions);

            if (response.status === 401) {
                console.log('401 Unauthorized - Tentative refresh token');

                const refreshed = await this.tryRefreshToken();

                if (refreshed) {
                    console.log('Token rafraîchi, nouvelle tentative');
                    const newToken = this.getToken();
                    return await this._executeRequest(endpoint, {
                        ...options,
                        headers: {
                            ...(options.headers || {}),
                            Authorization: `Bearer ${newToken}`,
                        },
                    });
                }

                this.clearAuth();
                throw new Error('Session expirée, veuillez vous reconnecter');
            }

            if (response.status === 429) {
                const retryAfter = response.headers.get('Retry-After');
                const waitTime = retryAfter ? parseInt(retryAfter) * 1000 : 5000;

                console.warn(`Rate limit atteint, attente ${waitTime}ms`);

                if (retryCount < this.retryAttempts) {
                    await this._sleep(waitTime);
                    return await this._executeRequest(endpoint, options, retryCount + 1);
                }

                throw new Error('Trop de requêtes, veuillez réessayer plus tard');
            }

            if (response.status >= 500 && retryCount < this.retryAttempts) {
                const backoffDelay = this.retryDelay * Math.pow(2, retryCount);
                console.warn(`Erreur serveur ${response.status}, retry ${retryCount + 1}/${this.retryAttempts} dans ${backoffDelay}ms`);

                await this._sleep(backoffDelay);
                return await this._executeRequest(endpoint, options, retryCount + 1);
            }

            if (!response.ok) {
                const contentType = response.headers.get('content-type') || '';
                let message = `Erreur HTTP: ${response.status}`;

                if (contentType.includes('application/json')) {
                    const errorData = await response.json().catch(() => ({}));
                    message = errorData.message || errorData.error || message;
                } else {
                    const text = await response.text().catch(() => '');
                    if (text) message = text.slice(0, 160);
                }

                throw new Error(message);
            }

            const contentType = response.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
                return await response.json();
            }

            return response;

        } catch (error) {
            if (error.name === 'TypeError' && retryCount < this.retryAttempts) {
                const backoffDelay = this.retryDelay * Math.pow(2, retryCount);
                console.warn(`Erreur réseau, retry ${retryCount + 1}/${this.retryAttempts} dans ${backoffDelay}ms`);

                await this._sleep(backoffDelay);
                return await this._executeRequest(endpoint, options, retryCount + 1);
            }

            console.error(`Erreur API ${endpoint}:`, error);
            throw error;
        }
    }

    async uploadFile(endpoint, formData) {
        return await this.request(endpoint, {
            method: 'POST',
            body: formData
        });
    }

    async login(email, password) {
        console.log('Tentative de connexion...');

        const response = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });

        const accessToken = response.access_token || response.token;
        const refreshToken = response.refresh_token || response.refreshToken;

        if (accessToken) {
            this.setToken(accessToken);
            this.setRefreshToken(refreshToken);
            this.setUser(response.user);
            console.log('Authentification réussie');
        }

        if (response.requires_2fa) {
            return {
                ...response,
                requires_2fa: true,
                user_id: response.user_id
            };
        }

        return response;
    }

    async verify2FA(userId, code) {
        console.log('Vérification 2FA...');

        const response = await this.request('/verify2faLogin.php', {
            method: 'POST',
            body: JSON.stringify({ user_id: userId, code })
        });

        if (response.token) {
            this.setToken(response.token);
            this.setUser(response.user);
            console.log('2FA vérifié');
        }

        return response;
    }

    async register(username, email, password) {
        console.log('Tentative d\'inscription...');

        const response = await this.request('/register', {
            method: 'POST',
            body: JSON.stringify({ username, email, password }),
        });

        const accessToken = response.access_token || response.token;
        const refreshToken = response.refresh_token || response.refreshToken;

        if (accessToken) {
            this.setToken(accessToken);
            this.setRefreshToken(refreshToken);
            const me = await this.request('/me', { method: 'GET' });
            this.setUser(me.user ?? me.data?.user ?? me.data ?? me);

            console.log('Inscription réussie');
        }

        return response;
    }

    async refreshToken() {
        const refreshToken = this.getRefreshToken();

        if (!refreshToken) {
            return null;
        }

        try {
            const response = await this.request('/refresh', {
                method: 'POST',
                body: JSON.stringify({ refresh_token: refreshToken }),
            });

            if (response.access_token) {
                this.setToken(response.access_token);
                return response;
            }

            return null;
        } catch (error) {
            console.error('Erreur renouvellement token:', error);
            return null;
        }
    }

    async tryRefreshToken() {
        const result = await this.refreshToken();
        return !!result;
    }

    async logout() {
        try {
            await this.request('/logout', { method: 'POST' });
        } catch (error) {
            console.error('Erreur logout:', error);
        } finally {
            this.clearAuth();
        }
    }

    async resendVerification(email) {
        return await this.request('/resendVerification.php', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    async requestPasswordReset(email) {
        return await this.request('/resetPasswordRequest.php', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    async resetPassword(token, password, confirmPassword) {
        return await this.request('/resetPassword.php', {
            method: 'POST',
            body: JSON.stringify({
                token,
                password,
                confirm_password: confirmPassword
            })
        });
    }

    async changePassword(currentPassword, newPassword) {
        return await this.request('/change-password', {
            method: 'POST',
            body: JSON.stringify({
                current_password: currentPassword,
                new_password: newPassword
            }),
        });
    }

    async getMe() {
        const data = await this.request("/me");
        return data.user ?? data;
    }

    async getUserProfile(userId) {
        return await this.request(`/users/${userId}/profile`);
    }

    async getUserStats(userId) {
        return await this.request(`/users/${userId}/stats`);
    }

    async updateProfile(username, email) {
        return await this.request('/profile', {
            method: 'PUT',
            body: JSON.stringify({ username, email }),
        });
    }

    async updateBio(bio) {
        return await this.request('/profile/bio', {
            method: 'PUT',
            body: JSON.stringify({ bio }),
        });
    }

    async uploadAvatar(imageFile) {
        const formData = new FormData();
        formData.append('avatar', imageFile);
        return await this.uploadFile('/users/me/avatar', formData);
    }

    async uploadProfileCover(imageFile) {
        const formData = new FormData();
        formData.append('cover', imageFile);
        return await this.uploadFile('/users/me/cover', formData);
    }

    async getUserWatchHistory(userId, limit = 20, offset = 0) {
        return await this.request(`/users/${userId}/watch-history?limit=${limit}&offset=${offset}`);
    }

    async getNombreAbonnes(userId) {
        return await this.request(`/users/${userId}/subscribers-count`);
    }

    async getStatusAbonnes(userId) {
        return await this.request(`/users/${userId}/subscribe-status`);
    }

    async abonneAUnUser(userId) {
        return await this.request(`/users/${userId}/subscribe`, {
            method: 'POST'
        });
    }

    async desabonneDUnUser(userId) {
        return await this.request(`/users/${userId}/unsubscribe`, {
            method: 'DELETE'
        });
    }

    async getVideos() {
        const response = await this.request('/videos');
        return response.videos || response;
    }

    async getVideoById(videoId) {
        return await this.request(`/videos/${videoId}`);
    }

    async getUserVideos(userId) {
        const response = await this.request(`/users/${userId}/videos`);
        return response.videos || response;
    }

    async getTrendingVideos(limit = 10, period = 7) {
        const response = await this.request(`/videos/trending?limit=${limit}&period=${period}`);
        return response.videos || response;
    }

    async uploadVideo(file, title, description) {
        const formData = new FormData();
        formData.append('video', file);
        formData.append('title', String(title ?? ''));
        formData.append('description', String(description ?? ''));

        return await this.request('/videos/upload', {
            method: 'POST',
            body: formData
        });
    }

    async deleteVideo(videoId) {
        return await this.request(`/videos/${videoId}`, {
            method: 'DELETE',
        });
    }

    async getVideoVues(videoId) {
        return await this.request(`/videos/${videoId}/views`);
    }

    async recordVideoVue(videoId, viewData) {
        const data = {
            watchTime: Number(viewData.watchTime) || 0,
            watchPercentage: Number(viewData.watchPercentage) || 0,
            completed: Boolean(viewData.completed),
            sessionId: this.getOrCreateSessionId(),
        };

        return await this.request(`/videos/${videoId}/record-view`, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async getVideoAnalytics(videoId, period = '7d') {
        return await this.request(`/videos/${videoId}/analytics?period=${period}`);
    }

    async likeVideo(videoId) {
        return await this.request(`/videos/${videoId}/like`, { method: 'POST' });
    }

    async dislikeVideo(videoId) {
        return await this.request(`/videos/${videoId}/dislike`, { method: 'POST' });
    }

    async getUserReaction(videoId) {
        return await this.request(`/videos/${videoId}/my-reaction`);
    }

    async getVideoReactions(videoId) {
        return await this.request(`/videos/${videoId}/reactions`);
    }

    async getComments(videoId) {
        const response = await this.request(`/videos/${videoId}/comments`);
        return response.commentaires || response.comments || [];
    }

    async postCommentaire(videoId, content, created_at = new Date().toISOString()) {
        return await this.request(`/videos/${videoId}/comments`, {
            method: 'POST',
            body: JSON.stringify({ content, created_at }),
        });
    }

    async replyToComment(commentId, content) {
        return await this.request(`/comments/${commentId}/replies`, {
            method: 'POST',
            body: JSON.stringify({ content }),
        });
    }

    async getCommentLikeStatus(commentId) {
        return await this.request(`/comments/${commentId}/like-status`);
    }

    async toggleCommentLike(commentId) {
        return await this.request(`/comments/${commentId}/like`, {
            method: 'POST',
        });
    }

    async toggleReplyLike(replyId) {
        return await this.request(`/replies/${replyId}/like`, {
            method: 'POST',
        });
    }

    async getReplyLikeStatus(replyId) {
        return await this.request(`/replies/${replyId}/like-status`);
    }

    async cleanupOldSessions() {
        return await this.request('/videos/cleanup-sessions', {
            method: 'POST',
        });
    }

    getToken() {
        return localStorage.getItem(this.tokenKey);
    }

    setToken(token) {
        localStorage.setItem(this.tokenKey, token);
    }

    getRefreshToken() {
        return localStorage.getItem(this.refreshTokenKey);
    }

    setRefreshToken(refreshToken) {
        if (refreshToken) {
            localStorage.setItem(this.refreshTokenKey, refreshToken);
        }
    }

    setUser(user) {
        localStorage.setItem(this.userKey, JSON.stringify(user));
    }

    getCurrentUser() {
        try {
            const userData = localStorage.getItem(this.userKey);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            return null;
        }
    }

    clearAuth() {
        console.log('🗑️ Nettoyage authentification');
        localStorage.removeItem(this.tokenKey);
        localStorage.removeItem(this.refreshTokenKey);
        localStorage.removeItem(this.userKey);
    }

    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;

        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            const now = Date.now() / 1000;
            return payload.exp > now;
        } catch (error) {
            this.clearAuth();
            return false;
        }
    }

    _checkRateLimit(endpoint) {
        const now = Date.now();
        const key = this.normalizeEndpoint(endpoint);

        if (!this.requestCounts.has(key)) {
            this.requestCounts.set(key, []);
        }

        const requests = this.requestCounts.get(key);
        const recent = requests.filter(time => now - time < this.rateLimitWindow);

        if (recent.length >= this.maxRequestsPerWindow) {
            console.warn(`⚠️ Rate limit atteint pour ${key}`);
            return false;
        }

        recent.push(now);
        this.requestCounts.set(key, recent);

        return true;
    }

    normalizeEndpoint(endpoint) {
        return endpoint.split('?')[0];
    }

    isPublicEndpoint(endpoint, method = 'GET') {
        const m = method.toUpperCase();
        const ep = this.normalizeEndpoint(endpoint);

        if (ep === '/login') return true;
        if (ep === '/register') return true;
        if (ep === '/refresh') return true;
        if (ep === '/resendVerification.php') return true;
        if (ep === '/resetPasswordRequest.php') return true;
        if (ep === '/resetPassword.php') return true;

        if (m === 'GET' && ep === '/videos') return true;
        if (m === 'GET' && ep.startsWith('/videos/trending')) return true;
        if (m === 'GET' && /^\/videos\/\d+$/.test(ep)) return true;
        if (m === 'POST' && /^\/videos\/\d+\/record-view$/.test(ep)) return true;

        return false;
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

    getVideoStreamUrl(videoId) {
        return `${this.baseUrl}/videos/${videoId}/play`;
    }

    getThumbnailUrl(videoId) {
        return `${this.baseUrl}/videos/${videoId}/thumbnail`;
    }

    getProfileImageUrl(userId) {
        return `${this.baseUrl}/users/${userId}/profile-image`;
    }

    getProfileCoverUrl(userId) {
        return `${this.baseUrl}/users/${userId}/profile-cover`;
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
        const secondes = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(secondes / 60);
        const heures = Math.floor(minutes / 60);

        if (heures > 0) return `${heures}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${secondes % 60}s`;
        return `${secondes}s`;
    }

    formatDate(date) {
        if (!date) return 'Date inconnue';
        return new Date(date).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    formatDuration(secondes) {
        if (!secondes) return '00:00';
        const minutes = Math.floor(secondes / 60);
        const secs = secondes % 60;
        return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    getStatus() {
        return {
            isAuthenticated: this.isAuthenticated(),
            baseUrl: this.baseUrl,
            queueSize: this.requestQueue.size,
            retryAttempts: this.retryAttempts,
            rateLimit: {
                maxRequestsPerWindow: this.maxRequestsPerWindow,
                window: this.rateLimitWindow
            }
        };
    }

    clearCache() {
        this.requestQueue.clear();
        this.requestCounts.clear();
    }
}

const apiService = new ApiService();
export default apiService;
export { ApiService };