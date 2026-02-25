import apiService from './apiService.js';

class UserService {
    constructor() {
        this.cache = new Map();
        this.cacheDuration = 5 * 60 * 1000;
    }

    async getUserProfile(userId = null) {
        try {
            const cached = this._getFromCache(`profile_${userId}`);
            if (cached) {
                return cached;
            }

            const response = await apiService.getUserProfile(userId);

            const result = response.success
                ? response.data
                : response;

            this._setInCache(`profile_${userId}`, result);

            return result;

        } catch (error) {
            console.error('UserService.getUserProfile:', error);
            throw error;
        }
    }

    async updateProfile(profileData) {
        try {
            const response = await apiService.request('/profile', {
                method: 'PUT',
                body: JSON.stringify(profileData)
            });

            this._invalidateCache('profile');

            return response;

        } catch (error) {
            console.error('UserService.updateProfile:', error);
            throw error;
        }
    }

    async updateBio(bio) {
        try {
            if (typeof bio !== 'string') {
                throw new Error('La bio doit être une chaîne de caractères');
            }

            if (bio.length > 500) {
                throw new Error('La bio ne peut pas dépasser 500 caractères');
            }

            const response = await apiService.request('/profile/bio', {
                method: 'PUT',
                body: JSON.stringify({ bio: bio.trim() })
            });

            this._invalidateCache('profile');

            return response;

        } catch (error) {
            console.error('UserService.updateBio:', error);
            throw error;
        }
    }

    async uploadAvatar(imageFile) {
        try {
            if (!imageFile) {
                throw new Error('Fichier image requis');
            }

            this._validateImageFile(imageFile);

            const formData = new FormData();
            formData.append('avatar', imageFile);

            const response = await apiService.request('/users/me/avatar', {
                method: 'POST',
                body: formData
            });

            this._invalidateCache('profile');

            return response;

        } catch (error) {
            console.error('UserService.uploadAvatar:', error);
            throw error;
        }
    }

    async uploadCover(imageFile) {
        try {
            if (!imageFile) {
                throw new Error('Fichier image requis');
            }

            this._validateImageFile(imageFile);

            const formData = new FormData();
            formData.append('cover', imageFile);

            const response = await apiService.request('/users/me/cover', {
                method: 'POST',
                body: formData
            });

            this._invalidateCache('profile');

            return response;

        } catch (error) {
            console.error('UserService.uploadCover:', error);
            throw error;
        }
    }

    getAvatarUrl(userId) {
        return apiService.getProfileImageUrl(userId);
    }

    async getUserVideos(userId, options = {}) {
        try {
            const { limit = 20, offset = 0 } = options;

            const cacheKey = `videos_${userId}_${limit}_${offset}`;
            const cached = this._getFromCache(cacheKey);
            if (cached) {
                return cached;
            }

            const response = await apiService.getUserVideos(userId);

            const videos = response.success
                ? response.videos
                : (Array.isArray(response) ? response : (response.videos || []));

            this._setInCache(cacheKey, videos);

            return videos;

        } catch (error) {
            console.error('UserService.getUserVideos:', error);
            return [];
        }
    }

    async getUserStats(userId) {
        try {
            const cached = this._getFromCache(`stats_${userId}`);
            if (cached) {
                return cached;
            }

            const response = await apiService.getUserStats(userId);

            this._setInCache(`stats_${userId}`, response, 120000);

            return response;

        } catch (error) {
            console.error('UserService.getUserStats:', error);
            return {
                videos_count: 0,
                subscribers_count: 0,
                total_views: 0
            };
        }
    }

    async subscribe(creatorId) {
        try {
            if (!creatorId) {
                throw new Error('ID du créateur requis');
            }

            const response = await apiService.request(`/users/${creatorId}/subscribe`, {
                method: 'POST'
            });

            this._invalidateCache('profile');
            this._invalidateCache('stats');
            this._invalidateCache('subscriptions');

            return response;

        } catch (error) {
            console.error('UserService.subscribe:', error);
            throw error;
        }
    }

    async unsubscribe(creatorId) {
        try {
            if (!creatorId) {
                throw new Error('ID du créateur requis');
            }

            const response = await apiService.request(`/users/${creatorId}/unsubscribe`, {
                method: 'DELETE'
            });

            this._invalidateCache('profile');
            this._invalidateCache('stats');
            this._invalidateCache('subscriptions');

            return response;

        } catch (error) {
            console.error('UserService.unsubscribe:', error);
            throw error;
        }
    }

    _validateImageFile(file) {
        const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        const maxSize = 5 * 1024 * 1024; // 5 MB

        if (!allowedTypes.includes(file.type)) {
            throw new Error(
                'Format d\'image non supporté. Utilisez JPG, PNG, WEBP ou GIF.'
            );
        }

        if (file.size > maxSize) {
            throw new Error(
                `L'image est trop volumineuse. Taille maximale: ${maxSize / 1024 / 1024}MB`
            );
        }

        return true;
    }

    _getFromCache(key) {
        const cached = this.cache.get(key);

        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        const duration = cached.duration || this.cacheDuration;

        if (age > duration) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    _setInCache(key, data, duration = null) {
        this.cache.set(key, {
            data,
            timestamp: Date.now(),
            duration: duration || this.cacheDuration
        });
    }

    _invalidateCache(prefix) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }
}

export default new UserService();