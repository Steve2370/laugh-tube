import apiService from './apiService.js';

class VideoService {
    constructor() {
        this.cache = new Map();
        this.cacheDuration = 5 * 60 * 1000;
        this.uploadQueue = [];
    }

    async getVideos(filters = {}) {
        try {
            const cacheKey = 'videos_' + JSON.stringify(filters);
            const cached = this._getFromCache(cacheKey);

            if (cached) {
                return cached;
            }

            const response = await apiService.getVideos();
            const videos = Array.isArray(response) ? response : (response.videos || []);

            this._setInCache(cacheKey, videos);

            return videos;

        } catch (error) {
            console.error('VideoService.getVideos:', error);
            throw error;
        }
    }

    async getVideo(id) {
        try {
            if (!id) {
                throw new Error('ID de vidéo requis');
            }

            const cacheKey = `video_${id}`;
            const cached = this._getFromCache(cacheKey);

            if (cached) {
                return cached;
            }

            const response = await apiService.getVideoById(id);

            this._setInCache(cacheKey, response);

            return response;

        } catch (error) {
            console.error('VideoService.getVideo:', error);
            throw error;
        }
    }

    async getTrendingVideos(options = {}) {
        try {
            const { limit = 10, period = 7 } = options;

            const response = await apiService.request(
                `/videos/trending?limit=${limit}&period=${period}`
            );

            return {
                success: true,
                videos: response.videos || []
            };

        } catch (error) {
            console.error('VideoService.getTrendingVideos:', error);
            return {
                success: false,
                videos: []
            };
        }
    }

    async searchVideos(query, options = {}) {
        try {
            if (!query || query.trim().length < 2) {
                return { success: false, videos: [] };
            }

            const { limit = 20, offset = 0 } = options;

            const response = await apiService.request(
                `/videos/search?q=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}`
            );

            return {
                success: true,
                videos: response.videos || [],
                total: response.total || 0
            };

        } catch (error) {
            console.error('VideoService.searchVideos:', error);
            return {
                success: false,
                videos: [],
                total: 0
            };
        }
    }

    async uploadVideo(file, metadata = {}, onProgress = null) {
        try {
            if (!file) {
                throw new Error('Fichier vidéo requis');
            }

            this._validateVideoFile(file);

            const title = this._validateTitle(metadata?.title);
            const description = this._validateDescription(metadata?.description);

            if (!title) {
                throw new Error('Le titre est requis');
            }

            console.log('VideoService.uploadVideo - Données:', {
                fileName: file.name,
                fileSize: this._formatFileSize(file.size),
                fileType: file.type,
                title,
                description: description ? description.substring(0, 50) + '...' : 'Aucune',
                hasProgress: typeof onProgress === 'function'
            });

            const formData = new FormData();
            formData.append('video', file);
            formData.append('title', title);
            if (description) {
                formData.append('description', description);
            }

            const response = await this._uploadWithProgress(
                '/videos/upload',
                formData,
                onProgress
            );

            console.log('VideoService.uploadVideo - Succès:', response);

            this._invalidateCache('videos');

            return {
                success: true,
                video: response.video || response,
                message: 'Vidéo uploadée avec succès'
            };

        } catch (error) {
            console.error('VideoService.uploadVideo error:', error);
            throw error;
        }
    }

    async _uploadWithProgress(endpoint, formData, onProgress) {
        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            const token = apiService.getToken();
            if (token) {
                xhr.setRequestHeader('Authorization', `Bearer ${token}`);
            }

            if (typeof onProgress === 'function') {
                xhr.upload.addEventListener('progress', (event) => {
                    if (event.lengthComputable) {
                        const percentComplete = Math.round((event.loaded / event.total) * 100);
                        onProgress(percentComplete, event.loaded, event.total);
                    }
                });
            }

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } catch (e) {
                        resolve({ success: true });
                    }
                } else {
                    try {
                        const error = JSON.parse(xhr.responseText);
                        reject(new Error(error.message || error.error || `Erreur HTTP ${xhr.status}`));
                    } catch (e) {
                        reject(new Error(`Erreur HTTP ${xhr.status}`));
                    }
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Erreur réseau lors de l\'upload'));
            });

            xhr.addEventListener('timeout', () => {
                reject(new Error('Timeout lors de l\'upload'));
            });

            const baseUrl = apiService.baseUrl || import.meta.env.VITE_API_URL || 'http://localhost';
            xhr.open('POST', `${baseUrl}${endpoint}`);
            xhr.send(formData);
        });
    }

    async updateVideo(videoId, metadata) {
        try {
            if (!videoId) {
                throw new Error('ID de vidéo requis');
            }

            const response = await apiService.request(`/videos/${videoId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    title: metadata.title,
                    description: metadata.description
                })
            });

            this._invalidateCache(`video_${videoId}`);
            this._invalidateCache('videos');

            return response;

        } catch (error) {
            console.error('VideoService.updateVideo:', error);
            throw error;
        }
    }

    async deleteVideo(id) {
        try {
            if (!id) {
                throw new Error('ID de vidéo requis');
            }

            const response = await apiService.deleteVideo(id);

            this._invalidateCache(`video_${id}`);
            this._invalidateCache('videos');

            return response;

        } catch (error) {
            console.error('VideoService.deleteVideo:', error);
            throw error;
        }
    }

    async recordView(videoId, watchData = {}) {
        try {
            if (!videoId) {
                throw new Error('ID de vidéo requis');
            }

            const response = await apiService.request(`/videos/${videoId}/record-view`, {
                method: 'POST',
                body: JSON.stringify({
                    watch_time: watchData.watchTime || 0,
                    completed: watchData.completed || false
                })
            });

            return response;

        } catch (error) {
            console.error('VideoService.recordView:', error);
            return { success: false };
        }
    }

    async getViews(videoId) {
        try {
            const response = await apiService.request(`/videos/${videoId}/views`);
            return response.views || response.count || 0;

        } catch (error) {
            console.error('VideoService.getViews:', error);
            return 0;
        }
    }

    async getAnalytics(videoId, period = '7d') {
        try {
            const response = await apiService.request(
                `/videos/${videoId}/analytics?period=${period}`
            );

            return {
                success: true,
                analytics: response
            };

        } catch (error) {
            console.error('VideoService.getAnalytics:', error);
            return {
                success: false,
                analytics: null
            };
        }
    }

    async getComments(videoId, options = {}) {
        try {
            const { limit = 20, offset = 0 } = options;

            const response = await apiService.request(
                `/videos/${videoId}/comments?limit=${limit}&offset=${offset}`
            );

            return {
                success: true,
                comments: response.comments || response.commentaires || [],
                total: response.total || 0
            };

        } catch (error) {
            console.error('VideoService.getComments:', error);
            return {
                success: false,
                comments: [],
                total: 0
            };
        }
    }

    async postComment(videoId, content) {
        try {
            if (!videoId || !content) {
                throw new Error('Vidéo ID et contenu requis');
            }

            if (content.length > 2000) {
                throw new Error('Le commentaire ne peut pas dépasser 2000 caractères');
            }

            const response = await apiService.request(`/videos/${videoId}/comments`, {
                method: 'POST',
                body: JSON.stringify({ content: content.trim() })
            });

            return response;

        } catch (error) {
            console.error('VideoService.postComment:', error);
            throw error;
        }
    }

    async likeVideo(videoId) {
        try {
            const response = await apiService.request(`/videos/${videoId}/like`, {
                method: 'POST'
            });

            this._invalidateCache(`video_${videoId}`);

            return response;

        } catch (error) {
            console.error('VideoService.likeVideo:', error);
            throw error;
        }
    }

    async dislikeVideo(videoId) {
        try {
            const response = await apiService.request(`/videos/${videoId}/dislike`, {
                method: 'POST'
            });

            this._invalidateCache(`video_${videoId}`);

            return response;

        } catch (error) {
            console.error('VideoService.dislikeVideo:', error);
            throw error;
        }
    }

    async getReactions(videoId) {
        try {
            const response = await apiService.request(`/videos/${videoId}/reactions`);

            return {
                likes: response.likes || 0,
                dislikes: response.dislikes || 0,
                userReaction: response.user_reaction || response.userReaction || null
            };

        } catch (error) {
            console.error('VideoService.getReactions:', error);
            return {
                likes: 0,
                dislikes: 0,
                userReaction: null
            };
        }
    }

    getStreamUrl(id) {
        if (!id) {
            throw new Error('ID de vidéo requis');
        }
        return apiService.getVideoStreamUrl(id);
    }

    getThumbnailUrl(id) {
        if (!id) {
            throw new Error('ID de vidéo requis');
        }
        return apiService.getThumbnailUrl(id);
    }

    _validateVideoFile(file) {
        const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg'];
        const maxSize = 500 * 1024 * 1024; // 500 MB

        if (!allowedTypes.includes(file.type)) {
            throw new Error(
                'Format de vidéo non supporté. Utilisez MP4, WebM ou OGG.'
            );
        }

        if (file.size > maxSize) {
            throw new Error(
                `La vidéo est trop volumineuse. Taille maximale: ${maxSize / 1024 / 1024}MB`
            );
        }

        return true;
    }

    _validateTitle(title) {
        if (!title || typeof title !== 'string') {
            return '';
        }
        const cleaned = title.trim();
        if (cleaned.length < 3) {
            throw new Error('Le titre doit contenir au moins 3 caractères');
        }
        if (cleaned.length > 100) {
            throw new Error('Le titre ne peut pas dépasser 100 caractères');
        }
        return cleaned;
    }

    _validateDescription(description) {
        if (!description || typeof description !== 'string') {
            return '';
        }
        const cleaned = description.trim();
        if (cleaned.length > 5000) {
            throw new Error('La description ne peut pas dépasser 5000 caractères');
        }
        return cleaned;
    }

    _getFromCache(key) {
        const cached = this.cache.get(key);
        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        if (age > this.cacheDuration) {
            this.cache.delete(key);
            return null;
        }

        return cached.data;
    }

    _setInCache(key, data) {
        this.cache.set(key, {
            data,
            timestamp: Date.now()
        });
    }

    _invalidateCache(prefix) {
        for (const key of this.cache.keys()) {
            if (key.startsWith(prefix)) {
                this.cache.delete(key);
            }
        }
    }

    clearCache() {
        this.cache.clear();
    }

    _formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    }

    getStatus() {
        return {
            cacheSize: this.cache.size,
            cacheDuration: this.cacheDuration,
            uploadQueueLength: this.uploadQueue.length
        };
    }
}

export default new VideoService();