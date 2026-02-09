class VideoPage {
    constructor() {
        this.videoId = this.getVideoIdFromUrl();
        this.currentUser = Auth.getCurrentUser();
        this.videoData = null;
        this.userReactionStatus = { liked_by_me: false, disliked_by_me: false };

        this.loadingContainer = document.getElementById('loadingContainer');
        this.errorContainer = document.getElementById('errorContainer');
        this.videoContent = document.getElementById('videoContent');
        this.videoPlayer = document.getElementById('videoPlayer');
        this.videoTitle = document.getElementById('videoTitle');
        this.videoAuthor = document.getElementById('videoAuthor');
        this.videoDate = document.getElementById('videoDate');
        this.videoDescription = document.getElementById('videoDescription');
        this.likeBtn = document.getElementById('likeBtn');
        this.dislikeBtn = document.getElementById('dislikeBtn');
        this.likeCount = document.getElementById('likeCount');
        this.dislikeCount = document.getElementById('dislikeCount');
        this.shareBtn = document.getElementById('shareBtn');
        this.copyLinkBtn = document.getElementById('copyLinkBtn');
        this.commentForm = document.getElementById('commentForm');
        this.commentText = document.getElementById('commentText');
        this.commentsList = document.getElementById('commentsList');
        this.commentCount = document.getElementById('commentCount');
        this.charCount = document.getElementById('charCount');
        this.submitCommentBtn = document.getElementById('submitCommentBtn');
        this.cancelCommentBtn = document.getElementById('cancelCommentBtn');
        this.commentFormContainer = document.getElementById('commentFormContainer');
        this.loginPrompt = document.getElementById('loginPrompt');
        this.emptyComments = document.getElementById('emptyComments');

        this.init();
    }

    getVideoIdFromUrl() {
        const params = Utils.getUrlParams();
        return params.id;
    }

    async init() {
        if (!this.videoId) {
            this.showError();
            return;
        }

        this.setupUserInterface();
        this.setupEventListeners();

        try {
            await this.loadVideo();
        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            this.showError();
        }
    }

    setupUserInterface() {
        if (this.currentUser) {
            this.commentFormContainer.style.display = 'block';
            this.loginPrompt.style.display = 'none';
        } else {
            this.commentFormContainer.style.display = 'none';
            this.loginPrompt.style.display = 'block';
        }

        const userMenu = document.getElementById('userMenu');
        if (this.currentUser) {
            userMenu.innerHTML = `
                <div class="user-info">
                    <i class="fas fa-user"></i>
                    <span>${Utils.escapeHtml(this.currentUser.username)}</span>
                </div>
                <span class="logout-btn" onclick="Auth.logout()">
                    <i class="fas fa-sign-out-alt"></i>
                </span>
            `;
        } else {
            userMenu.innerHTML = `
                <a href="login.html" class="nav-link">
                    <i class="fas fa-sign-in-alt"></i> Connexion
                </a>
            `;
        }
    }

    setupEventListeners() {
        this.likeBtn.addEventListener('click', () => this.toggleReaction('like'));
        this.dislikeBtn.addEventListener('click', () => this.toggleReaction('dislike'));

        this.shareBtn.addEventListener('click', () => this.shareVideo());
        this.copyLinkBtn.addEventListener('click', () => this.copyVideoLink());

        this.commentForm.addEventListener('submit', (e) => this.handleCommentSubmit(e));
        this.commentText.addEventListener('input', () => this.updateCharCount());
        this.commentText.addEventListener('focus', () => this.expandCommentForm());
        this.cancelCommentBtn.addEventListener('click', () => this.collapseCommentForm());
    }

    async loadVideo() {
        this.showLoading();

        try {
            const videoResponse = await API.getVideo(this.videoId);
            this.videoData = videoResponse.video;

            if (this.currentUser) {
                try {
                    const reactionResponse = await API.getUserReactionStatus(this.videoId);
                    this.userReactionStatus = reactionResponse;
                } catch (error) {
                    console.warn('Impossible de charger le statut de réaction:', error);
                }
            }

            this.renderVideoData();
            this.renderComments(videoResponse.comments || []);
            this.showVideoContent();

        } catch (error) {
            console.error('Erreur lors du chargement de la vidéo:', error);
            this.showError();
        }
    }

    renderVideoData() {
        this.videoTitle.textContent = this.videoData.title;
        this.videoAuthor.textContent = `par ${this.videoData.auteur}`;
        this.videoDate.textContent = Utils.formatRelativeDate(this.videoData.created_at);
        this.videoDescription.textContent = this.videoData.description || 'Aucune description disponible.';

        this.videoPlayer.src = API.getVideoStreamUrl(this.videoId);

        this.updateReactionCounts();
        this.updateReactionButtons();
    }

    updateReactionCounts() {
        this.likeCount.textContent = Utils.formatNumber(this.videoData.likes || 0);
        this.dislikeCount.textContent = Utils.formatNumber(this.videoData.dislikes || 0);
    }

    updateReactionButtons() {
        this.likeBtn.classList.toggle('active', this.userReactionStatus.liked_by_me);
        this.dislikeBtn.classList.toggle('active', this.userReactionStatus.disliked_by_me);
    }

    async toggleReaction(type) {
        if (!this.currentUser) {
            Utils.showToast('Connectez-vous pour réagir à cette vidéo', 'error');
            return;
        }

        try {
            if (type === 'like') {
                await API.likeVideo(this.videoId);
            } else {
                await API.dislikeVideo(this.videoId);
            }

            await this.loadVideo();
            Utils.showToast('Réaction enregistrée !', 'success');

        } catch (error) {
            console.error('Erreur lors de la réaction:', error);
            Utils.showToast('Erreur lors de l\'enregistrement de votre réaction', 'error');
        }
    }

    renderComments(comments) {
        this.commentCount.textContent = comments.length;

        if (comments.length === 0) {
            this.commentsList.style.display = 'none';
            this.emptyComments.style.display = 'block';
            return;
        }

        this.commentsList.style.display = 'block';
        this.emptyComments.style.display = 'none';

        this.commentsList.innerHTML = '';

        comments.forEach(comment => {
            const commentElement = this.createCommentElement(comment);
            this.commentsList.appendChild(commentElement);
        });
    }

    createCommentElement(comment) {
        const commentDiv = Utils.createElement('div', 'comment-item');

        commentDiv.innerHTML = `
            <div class="comment-header">
                <span class="comment-author">${Utils.escapeHtml(comment.username)}</span>
                <span class="comment-date">${Utils.formatRelativeDate(comment.created_at)}</span>
            </div>
            <div class="comment-content">${Utils.escapeHtml(comment.content)}</div>
        `;

        return commentDiv;
    }

    expandCommentForm() {
        this.commentForm.style.background = 'white';
        this.commentForm.style.borderColor = '#667eea';
    }

    collapseCommentForm() {
        this.commentText.value = '';
        this.updateCharCount();
        this.commentForm.style.background = '#f8f9fa';
        this.commentForm.style.borderColor = 'transparent';
    }

    updateCharCount() {
        const length = this.commentText.value.length;
        this.charCount.textContent = `${length}/1000`;
        this.submitCommentBtn.disabled = length === 0;

        if (length > 900) {
            this.charCount.style.color = '#f44336';
        } else if (length > 800) {
            this.charCount.style.color = '#ff9800';
        } else {
            this.charCount.style.color = '#999';
        }
    }

    async handleCommentSubmit(event) {
        event.preventDefault();

        if (!this.currentUser) {
            Utils.showToast('Connectez-vous pour commenter', 'error');
            return;
        }

        const content = this.commentText.value.trim();
        if (!content) {
            Utils.showToast('Veuillez saisir un commentaire', 'error');
            return;
        }

        try {
            this.submitCommentBtn.disabled = true;
            this.submitCommentBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Envoi...';

            await API.postComment(this.videoId, content);

            this.collapseCommentForm();
            await this.loadVideo();

            Utils.showToast('Commentaire publié !', 'success');

        } catch (error) {
            console.error('Erreur lors de l\'envoi du commentaire:', error);
            Utils.showToast('Erreur lors de la publication du commentaire', 'error');
        } finally {
            this.submitCommentBtn.disabled = false;
            this.submitCommentBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Commenter';
        }
    }

    async shareVideo() {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: this.videoData.title,
                    text: `Regardez cette vidéo : ${this.videoData.title}`,
                    url: window.location.href
                });
            } catch (error) {
                console.log('Partage annulé');
            }
        } else {
            this.copyVideoLink();
        }
    }

    async copyVideoLink() {
        try {
            await Utils.copyToClipboard(window.location.href);
        } catch (error) {
            console.error('Erreur lors de la copie:', error);
        }
    }

    showLoading() {
        this.loadingContainer.style.display = 'flex';
        this.errorContainer.style.display = 'none';
        this.videoContent.style.display = 'none';
    }

    showError() {
        this.loadingContainer.style.display = 'none';
        this.errorContainer.style.display = 'flex';
        this.videoContent.style.display = 'none';
    }

    showVideoContent() {
        this.loadingContainer.style.display = 'none';
        this.errorContainer.style.display = 'none';
        this.videoContent.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new VideoPage();
});