const Auth = {
    TOKEN_KEY: 'authToken',
    USER_KEY: 'user',

    async login(email, password) {
        try {
            const response = await API.login(email, password);

            if (response.token) {
                this.setToken(response.token);
                this.setUser(response.user);
                Utils.showToast('Connexion réussie !', 'success');
                return true;
            }

            throw new Error('Token manquant dans la réponse');

        } catch (error) {
            console.error('Erreur de connexion:', error);
            Utils.showToast(error.message || 'Erreur de connexion', 'error');
            return false;
        }
    },

    async register(userData) {
        try {
            const response = await API.register(userData);
            Utils.showToast('Inscription réussie ! Vous pouvez maintenant vous connecter.', 'success');
            return true;

        } catch (error) {
            console.error('Erreur d\'inscription:', error);
            Utils.showToast(error.message || 'Erreur lors de l\'inscription', 'error');
            return false;
        }
    },

    logout() {
        this.removeToken();
        this.removeUser();
        Utils.showToast('Déconnexion réussie', 'success');

        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
    },

    isAuthenticated() {
        const token = this.getToken();
        if (!token) return false;

        try {
            const payload = this.decodeToken(token);
            const now = Date.now() / 1000;

            if (payload.exp < now) {
                this.logout();
                return false;
            }

            return true;
        } catch (error) {
            console.error('Token invalide:', error);
            this.logout();
            return false;
        }
    },

    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    setToken(token) {
        localStorage.setItem(this.TOKEN_KEY, token);
    },

    removeToken() {
        localStorage.removeItem(this.TOKEN_KEY);
    },

    getCurrentUser() {
        try {
            const userData = localStorage.getItem(this.USER_KEY);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Erreur lecture données utilisateur:', error);
            return null;
        }
    },

    setUser(user) {
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },

    removeUser() {
        localStorage.removeItem(this.USER_KEY);
    },

    decodeToken(token) {
        try {
            const base64Url = token.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
                atob(base64)
                    .split('')
                    .map(function(c) {
                        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
                    })
                    .join('')
            );

            return JSON.parse(jsonPayload);
        } catch (error) {
            throw new Error('Token JWT invalide');
        }
    },

    getTokenInfo() {
        const token = this.getToken();
        if (!token) return null;

        try {
            return this.decodeToken(token);
        } catch (error) {
            console.error('Erreur décodage token:', error);
            return null;
        }
    },

    hasRole(role) {
        const tokenInfo = this.getTokenInfo();
        return tokenInfo && tokenInfo.role === role;
    },

    requireAuth(redirectUrl = 'login.html') {
        if (!this.isAuthenticated()) {
            Utils.showToast('Vous devez être connecté pour accéder à cette page', 'error');
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 2000);
            return false;
        }
        return true;
    },

    redirectIfAuthenticated(redirectUrl = 'index.html') {
        if (this.isAuthenticated()) {
            Utils.showToast('Vous êtes déjà connecté', 'info');
            setTimeout(() => {
                window.location.href = redirectUrl;
            }, 1000);
            return true;
        }
        return false;
    },

    initAutoCheck() {
        setInterval(() => {
            if (this.getToken() && !this.isAuthenticated()) {
                Utils.showToast('Votre session a expiré', 'error');
                this.logout();
            }
        }, 5 * 60 * 1000);
    },

    async refreshToken() {
        try {
            const response = await API.request('/refresh-token', {
                method: 'POST'
            });

            if (response.token) {
                this.setToken(response.token);
                return true;
            }

            return false;
        } catch (error) {
            console.error('Erreur renouvellement token:', error);
            return false;
        }
    },

    getAuthHeaders() {
        const token = this.getToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }
};

document.addEventListener('DOMContentLoaded', () => {
    Auth.initAutoCheck();
});

window.LaughTaleAuth = Auth;