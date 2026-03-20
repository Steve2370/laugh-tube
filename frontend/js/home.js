class HomePage {
    constructor() {
        this.videoGrid = document.getElementById('videoGrid');
        this.loading = document.getElementById('loading');
        this.errorMessage = document.getElementById('errorMessage');
        this.emptyState = document.getElementById('emptyState');
        this.retryButton = document.getElementById('retryButton');
        this.searchForm = document.getElementById('searchForm');
        this.mobileSearchForm = document.getElementById('mobileSearchForm');
        this.searchInput = document.getElementById('searchInput');
        this.mobileSearchInput = document.getElementById('mobileSearchInput');

        this.currentUser = null;
        this.isAuthenticated = false;
        this.allVideos = [];
        this.filteredVideos = [];

        this.API_BASE_URL = 'http://localhost';

        this.init();
    }

    async init() {
        try {
            console.log('🎬 Initialisation de la page d\'accueil');

            await this.checkAuthState();

            await this.loadVideos();

            this.setupEventListeners();

            this.markPageAsActive();

            console.log('✅ Page d\'accueil initialisée avec succès');
        } catch (error) {
            console.error('❌ Erreur lors de l\'initialisation:', error);
            this.showError();
        }
    }

    async checkAuthState() {
        let attempts = 0;
        while (typeof Auth === 'undefined' && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }

        if (typeof Auth !== 'undefined') {
            this.currentUser = Auth.getCurrentUser();
            this.isAuthenticated = Auth.isAuthenticated();
            console.log('🔐 État d\'authentification:', this.isAuthenticated ? 'Connecté' : 'Anonyme');
        } else {
            console.warn('⚠️ Auth non disponible, mode anonyme');
        }
    }

    setupEventListeners() {
        if (this.retryButton) {
            this.retryButton.addEventListener('click', () => {
                this.loadVideos();
            });
        }

        if (this.searchForm) {
            this.searchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = this.searchInput?.value || '';
                this.handleSearch(query);
            });
        }

        if (this.mobileSearchForm) {
            this.mobileSearchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const query = this.mobileSearchInput?.value || '';
                this.handleSearch(query);
            });
        }

        if (this.searchInput && this.mobileSearchInput) {
            this.searchInput.addEventListener('input', (e) => {
                this.mobileSearchInput.value = e.target.value;
            });

            this.mobileSearchInput.addEventListener('input', (e) => {
                this.searchInput.value = e.target.value;
            });
        }

        window.addEventListener('auth-state-changed', () => {
            console.log('🔄 État d\'authentification changé');
            this.checkAuthState().then(() => {
                this.loadVideos();
            });
        });

        window.addEventListener('storage', (e) => {
            if (e.key === 'authToken' || e.key === 'user') {
                this.checkAuthState().then(() => {
                    this.loadVideos();
                });
            }
        });

        setInterval(() => {
            console.log('🔄 Actualisation automatique des vidéos');
            this.loadVideos();
        }, 5 * 60 * 1000);
    }

    markPageAsActive() {
        const homeLinks = document.querySelectorAll('[data-page="index"]');
        homeLinks.forEach(link => link.classList.add('active'));
    }

    async loadVideos() {
        try {
            console.log('📥 Chargement des vidéos...');
            this.showLoading();

            let videos = [];

            if (typeof Api !== 'undefined') {
                try {
                    const response = await Api.getVideos();
                    videos = response.videos || response || [];
                } catch (error) {
                    console.warn('⚠️ Erreur avec Api.getVideos:', error);
                    const response = await fetch(`${this.API_BASE_URL}/videos`);
                    if (!response.ok) {
                        throw new Error(`Erreur HTTP: ${response.status}`);
                    }
                    const data = await response.json();
                    videos = data.videos || data || [];
                }
            } else {
                const response = await fetch(`${this.API_BASE_URL}/videos`);
                if (!response.ok) {
                    throw new Error(`Erreur HTTP: ${response.status}`);
                }
                const data = await response.json();
                videos = data.videos || data || [];
            }

            const filteredVideos = this.filterVideosByAuth(videos);

            this.allVideos = filteredVideos;
            this.filteredVideos = filteredVideos;

            console.log(`📊 ${filteredVideos.length} vidéo(s) chargée(s)`);

            if (filteredVideos.length > 0) {
                this.renderVideos(filteredVideos);
                this.showVideoGrid();
            } else {
                this.showEmptyState();
            }

        } catch (error) {
            console.error('❌ Erreur lors du chargement des vidéos:', error);
            this.showError();
        }
    }

    filterVideosByAuth(videos) {
        if (!videos || !Array.isArray(videos)) return [];

        if (!this.isAuthenticated) {
            return videos.filter(video =>
                video.visibility === 'publique' ||
                video.visibility === 'public' ||
                !video.visibility
            );
        } else {
            return videos.filter(video =>
                video.visibility === 'publique' ||
                video.visibility === 'public' ||
                !video.visibility ||
                (video.visibility === 'privee' && video.user_id === this.currentUser?.id)
            );
        }
    }

    renderVideos(videos) {
        if (!this.videoGrid) return;

        this.videoGrid.innerHTML = '';

        videos.forEach(video => {
            const videoCard = this.createVideoCard(video);
            this.videoGrid.appendChild(videoCard);
        });
    }

    createVideoCard(video) {
        const card = document.createElement('div');
        card.className = 'video-card';

        card.addEventListener('click', (e) => {
            if (!e.target.closest('button')) {
                this.goToVideo(video.id);
            }
        });

        const indicators = this.createVideoIndicators(video);

        const thumbnailUrl = this.getThumbnailUrl(video);

        const formattedDate = this.formatDate(video.created_at);

        card.innerHTML = `
            <div class="video-thumbnail-container">
                <div class="video-thumbnail">
                    <img 
                        src="${thumbnailUrl}" 
                        alt="${this.escapeHtml(video.title)}"
                        onerror="this.onerror=null; this.src='https://via.placeholder.com/320x200/95a5a6/white?text=Video+${video.id}'"
                        loading="lazy"
                    >
                    <div class="video-overlay">
                        <button class="play-btn" onclick="event.stopPropagation();">
                            <i class="fas fa-play"></i>
                        </button>
                    </div>
                    ${video.duration ? `<div class="video-duration">${this.formatDuration(video.duration)}</div>` : ''}
                </div>
                ${indicators}
            </div>
            <div class="video-info">
                <h3 class="video-title">${this.escapeHtml(video.title || 'Vidéo sans titre')}</h3>
                <p class="video-author">
                    <i class="fas fa-user"></i>
                    ${this.escapeHtml(video.auteur || video.username || 'Anonyme')}
                </p>
                <div class="video-meta">
                    <div class="video-stats">
                        <span class="stat">
                            <i class="fas fa-heart"></i> 
                            ${this.formatNumber(video.likes || 0)}
                        </span>
                        <span class="stat">
                            <i class="fas fa-thumbs-down"></i> 
                            ${this.formatNumber(video.dislikes || 0)}
                        </span>
                        <span class="stat">
                            <i class="fas fa-eye"></i> 
                            ${this.formatNumber(video.views || 0)}
                        </span>
                    </div>
                    <span class="video-date">
                        <i class="fas fa-calendar"></i>
                        ${formattedDate}
                    </span>
                </div>
                ${video.description ? `<p class="video-description">${this.escapeHtml(video.description)}</p>` : ''}
            </div>
        `;

        return card;
    }

    createVideoIndicators(video) {
        let indicators = '';

        if (this.isAuthenticated && video.visibility === 'privee') {
            indicators += '<span class="visibility-indicator private"><i class="fas fa-lock"></i> Privé</span>';
        }

        if (this.isAuthenticated && this.currentUser && video.user_id === this.currentUser.id) {
            indicators += '<span class="owner-indicator"><i class="fas fa-video"></i> Votre vidéo</span>';
        }

        return indicators ? `<div class="video-indicators">${indicators}</div>` : '';
    }

    getThumbnailUrl(video) {
        console.log('🖼️ Génération miniature pour vidéo:', video.id, 'thumbnail:', video.thumbnail);

        if (video.thumbnail_url && video.thumbnail_url.startsWith('http')) {
            console.log('✅ Utilisation thumbnail_url:', video.thumbnail_url);
            return video.thumbnail_url;
        }

        if (video.thumbnail && video.thumbnail.trim()) {
            const url = `${this.API_BASE_URL}/videos/${video.id}/thumbnail`;
            console.log('✅ Utilisation endpoint API:', url);
            return url;
        }

        if (video.id) {
            const url = `${this.API_BASE_URL}/videos/${video.id}/thumbnail`;
            console.log('⚠️ Fallback vers endpoint API:', url);
            return url;
        }

        const colors = ['667eea', 'e74c3c', '27ae60', 'f39c12', '9b59b6', '1abc9c'];
        const color = colors[(video.id || 0) % colors.length];
        const placeholderUrl = `https://via.placeholder.com/320x200/${color}/white?text=Video+${video.id || 'X'}`;
        console.log('🎨 Utilisation placeholder:', placeholderUrl);
        return placeholderUrl;
    }

    handleSearch(query) {
        if (!query || !query.trim()) {
            this.filteredVideos = this.allVideos;
            this.renderVideos(this.filteredVideos);
            this.clearNoResultsMessage();
            return;
        }

        const searchTerm = query.toLowerCase().trim();

        this.filteredVideos = this.allVideos.filter(video => {
            const title = (video.title || '').toLowerCase();
            const description = (video.description || '').toLowerCase();
            const author = (video.auteur || video.username || '').toLowerCase();

            return title.includes(searchTerm) ||
                description.includes(searchTerm) ||
                author.includes(searchTerm);
        });

        console.log(`🔍 Recherche "${query}": ${this.filteredVideos.length} résultat(s)`);

        if (this.filteredVideos.length > 0) {
            this.renderVideos(this.filteredVideos);
            this.showVideoGrid();
            this.clearNoResultsMessage();
        } else {
            this.showNoResults(query);
        }
    }

    showNoResults(query) {
        this.videoGrid.innerHTML = `
            <div class="no-results" id="noResultsMessage">
                <div class="no-results-content">
                    <i class="fas fa-search fa-3x"></i>
                    <h3>Aucune vidéo trouvée</h3>
                    <p>Aucun résultat pour "${this.escapeHtml(query)}"</p>
                    <button class="btn btn-secondary" onclick="window.homePage.clearSearch()">
                        Voir toutes les vidéos
                    </button>
                </div>
            </div>
        `;
        this.showVideoGrid();
    }

    clearNoResultsMessage() {
        const noResultsMsg = document.getElementById('noResultsMessage');
        if (noResultsMsg) {
            noResultsMsg.remove();
        }
    }

    clearSearch() {
        if (this.searchInput) this.searchInput.value = '';
        if (this.mobileSearchInput) this.mobileSearchInput.value = '';

        this.filteredVideos = this.allVideos;
        this.renderVideos(this.filteredVideos);
        this.clearNoResultsMessage();

        console.log('🧹 Recherche effacée');
    }

    goToVideo(videoId) {
        console.log(`🎥 Navigation vers la vidéo ${videoId}`);
        window.location.href = `video.html?id=${videoId}`;
    }

    formatNumber(num) {
        if (!num || num === 0) return '0';
        if (num < 1000) return num.toString();
        if (num < 1000000) return Math.floor(num / 100) / 10 + 'k';
        return Math.floor(num / 100000) / 10 + 'M';
    }

    formatDate(dateString) {
        if (!dateString) return 'Date inconnue';

        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 0) {
                const diffHours = Math.ceil(diffTime / (1000 * 60 * 60));
                if (diffHours < 1) {
                    const diffMinutes = Math.ceil(diffTime / (1000 * 60));
                    return `Il y a ${diffMinutes} min`;
                }
                return `Il y a ${diffHours}h`;
            } else if (diffDays === 1) {
                return 'Hier';
            } else if (diffDays < 7) {
                return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;
            } else if (diffDays < 30) {
                const weeks = Math.floor(diffDays / 7);
                return `Il y a ${weeks} semaine${weeks > 1 ? 's' : ''}`;
            } else if (diffDays < 365) {
                const months = Math.floor(diffDays / 30);
                return `Il y a ${months} mois`;
            } else {
                return date.toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
            }
        } catch (error) {
            console.error('❌ Erreur lors du formatage de la date:', error);
            return 'Date inconnue';
        }
    }

    formatDuration(seconds) {
        if (!seconds || seconds === 0) return '00:00';

        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);

        return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    showLoading() {
        if (this.loading) this.loading.style.display = 'block';
        if (this.videoGrid) this.videoGrid.style.display = 'none';
        if (this.errorMessage) this.errorMessage.style.display = 'none';
        if (this.emptyState) this.emptyState.style.display = 'none';
    }

    showVideoGrid() {
        if (this.loading) this.loading.style.display = 'none';
        if (this.videoGrid) this.videoGrid.style.display = 'grid';
        if (this.errorMessage) this.errorMessage.style.display = 'none';
        if (this.emptyState) this.emptyState.style.display = 'none';
    }

    showError() {
        if (this.loading) this.loading.style.display = 'none';
        if (this.videoGrid) this.videoGrid.style.display = 'none';
        if (this.errorMessage) this.errorMessage.style.display = 'block';
        if (this.emptyState) this.emptyState.style.display = 'none';
    }

    showEmptyState() {
        if (this.loading) this.loading.style.display = 'none';
        if (this.videoGrid) this.videoGrid.style.display = 'none';
        if (this.errorMessage) this.errorMessage.style.display = 'none';
        if (this.emptyState) this.emptyState.style.display = 'block';

        const emptyMessage = this.emptyState?.querySelector('p');
        if (emptyMessage) {
            if (this.isAuthenticated) {
                emptyMessage.textContent = '📹 Aucune vidéo disponible pour le moment';
            } else {
                emptyMessage.textContent = '📹 Aucune vidéo publique disponible pour le moment';
            }
        }
    }

    async refresh() {
        console.log('🔄 Actualisation manuelle des vidéos');
        await this.loadVideos();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Initialisation de Laugh Tale Homepage');
    window.homePage = new HomePage();
});

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HomePage;
}