class UploadPage {
    constructor() {
        this.currentUser = Auth.getCurrentUser();
        this.selectedFile = null;
        this.tags = [];

        this.authRequired = document.getElementById('authRequired');
        this.uploadContent = document.getElementById('uploadContent');
        this.uploadForm = document.getElementById('uploadForm');
        this.fileUploadArea = document.getElementById('fileUploadArea');
        this.videoFileInput = document.getElementById('videoFile');
        this.filePreview = document.getElementById('filePreview');
        this.previewPlayer = document.getElementById('previewPlayer');
        this.fileName = document.getElementById('fileName');
        this.fileSize = document.getElementById('fileSize');
        this.fileDuration = document.getElementById('fileDuration');
        this.fileResolution = document.getElementById('fileResolution');
        this.changeFileBtn = document.getElementById('changeFileBtn');
        this.videoDetailsSection = document.getElementById('videoDetailsSection');
        this.uploadActions = document.getElementById('uploadActions');

        this.titleInput = document.getElementById('title');
        this.descriptionInput = document.getElementById('description');
        this.visibilitySelect = document.getElementById('visibility');
        this.tagInput = document.getElementById('tagInput');
        this.tagsList = document.getElementById('tagsList');

        this.titleCounter = document.getElementById('titleCounter');
        this.descriptionCounter = document.getElementById('descriptionCounter');
        this.titleError = document.getElementById('titleError');

        this.submitBtn = document.getElementById('submitBtn');
        this.cancelBtn = document.getElementById('cancelBtn');
        this.uploadAnotherBtn = document.getElementById('uploadAnotherBtn');
        this.btnText = this.submitBtn.querySelector('.btn-text');
        this.btnSpinner = this.submitBtn.querySelector('.btn-spinner');

        this.uploadProgress = document.getElementById('uploadProgress');
        this.uploadSuccess = document.getElementById('uploadSuccess');
        this.progressFill = document.getElementById('progressFill');
        this.progressPercent = document.getElementById('progressPercent');
        this.progressStatus = document.getElementById('progressStatus');

        this.init();
    }

    init() {
        if (!this.currentUser || !Auth.isAuthenticated()) {
            this.showAuthRequired();
            return;
        }

        this.showUploadContent();
        this.setupUserInterface();
        this.setupEventListeners();
    }

    setupUserInterface() {
        const userMenu = document.getElementById('userMenu');
        userMenu.innerHTML = `
            <div class="user-info">
                <i class="fas fa-user"></i>
                <span>${Utils.escapeHtml(this.currentUser.username)}</span>
            </div>
            <span class="logout-btn" onclick="Auth.logout()">
                <i class="fas fa-sign-out-alt"></i>
            </span>
        `;
    }

    setupEventListeners() {
        this.fileUploadArea.addEventListener('click', () => this.videoFileInput.click());
        this.videoFileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.changeFileBtn.addEventListener('click', () => this.changeFile());

        this.fileUploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.fileUploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.fileUploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        this.uploadForm.addEventListener('submit', (e) => this.handleSubmit(e));
        this.cancelBtn.addEventListener('click', () => this.resetForm());
        this.uploadAnotherBtn.addEventListener('click', () => this.resetForm());

        this.titleInput.addEventListener('input', () => this.updateTitleCounter());
        this.descriptionInput.addEventListener('input', () => this.updateDescriptionCounter());
        this.titleInput.addEventListener('blur', () => this.validateTitle());

        this.tagInput.addEventListener('keypress', (e) => this.handleTagInput(e));

        [this.titleInput, this.descriptionInput, this.visibilitySelect].forEach(input => {
            input.addEventListener('input', () => this.validateForm());
        });
    }

    handleFileSelect(event) {
        const file = event.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    handleDragOver(event) {
        event.preventDefault();
        this.fileUploadArea.classList.add('drag-over');
    }

    handleDragLeave(event) {
        event.preventDefault();
        this.fileUploadArea.classList.remove('drag-over');
    }

    handleDrop(event) {
        event.preventDefault();
        this.fileUploadArea.classList.remove('drag-over');

        const files = event.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    async processFile(file) {
        if (!this.validateFile(file)) {
            return;
        }

        this.selectedFile = file;

        try {
            await this.showFilePreview(file);

            this.videoDetailsSection.style.display = 'block';
            this.uploadActions.style.display = 'block';

            this.titleInput.focus();

        } catch (error) {
            console.error('Erreur lors du traitement du fichier:', error);
            Utils.showToast('Erreur lors du traitement du fichier', 'error');
        }
    }

    validateFile(file) {
        if (!file.type.startsWith('video/')) {
            Utils.showToast('Veuillez sélectionner un fichier vidéo', 'error');
            return false;
        }

        const maxSize = 100 * 1024 * 1024;
        if (file.size > maxSize) {
            Utils.showToast('Le fichier ne peut pas dépasser 100 MB', 'error');
            return false;
        }

        const supportedFormats = ['video/mp4', 'video/avi', 'video/mov', 'video/quicktime'];
        if (!supportedFormats.includes(file.type)) {
            Utils.showToast('Format non supporté. Utilisez MP4, AVI ou MOV', 'error');
            return false;
        }

        return true;
    }

    async showFilePreview(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            this.previewPlayer.src = url;

            this.previewPlayer.addEventListener('loadedmetadata', () => {
                try {
                    this.fileName.textContent = file.name;
                    this.fileSize.textContent = this.formatFileSize(file.size);
                    this.fileDuration.textContent = Utils.formatDuration(this.previewPlayer.duration);
                    this.fileResolution.textContent = `${this.previewPlayer.videoWidth}x${this.previewPlayer.videoHeight}`;

                    this.fileUploadArea.style.display = 'none';
                    this.filePreview.style.display = 'block';

                    resolve();
                } catch (error) {
                    reject(error);
                }
            });

            this.previewPlayer.addEventListener('error', () => {
                URL.revokeObjectURL(url);
                reject(new Error('Impossible de lire le fichier vidéo'));
            });
        });
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    changeFile() {
        this.selectedFile = null;
        this.videoFileInput.value = '';
        this.fileUploadArea.style.display = 'block';
        this.filePreview.style.display = 'none';
        this.videoDetailsSection.style.display = 'none';
        this.uploadActions.style.display = 'none';

        if (this.previewPlayer.src) {
            URL.revokeObjectURL(this.previewPlayer.src);
        }
    }

    updateTitleCounter() {
        const length = this.titleInput.value.length;
        this.titleCounter.textContent = `${length}/100`;

        if (length > 90) {
            this.titleCounter.style.color = '#f44336';
        } else if (length > 80) {
            this.titleCounter.style.color = '#ff9800';
        } else {
            this.titleCounter.style.color = '#999';
        }

        this.validateForm();
    }

    updateDescriptionCounter() {
        const length = this.descriptionInput.value.length;
        this.descriptionCounter.textContent = `${length}/1000`;

        if (length > 950) {
            this.descriptionCounter.style.color = '#f44336';
        } else if (length > 900) {
            this.descriptionCounter.style.color = '#ff9800';
        } else {
            this.descriptionCounter.style.color = '#999';
        }
    }

    validateTitle() {
        const title = this.titleInput.value.trim();

        if (!title) {
            this.showError('title', 'Le titre est requis');
            return false;
        }

        if (title.length < 3) {
            this.showError('title', 'Le titre doit contenir au moins 3 caractères');
            return false;
        }

        this.clearError('title');
        return true;
    }

    validateForm() {
        const hasFile = this.selectedFile !== null;
        const hasValidTitle = this.titleInput.value.trim().length >= 3;

        this.submitBtn.disabled = !(hasFile && hasValidTitle);
    }

    showError(field, message) {
        const errorElement = document.getElementById(`${field}Error`);
        const inputElement = document.getElementById(field);

        errorElement.textContent = message;
        errorElement.classList.add('show');
        inputElement.style.borderColor = '#f44336';
    }

    clearError(field) {
        const errorElement = document.getElementById(`${field}Error`);
        const inputElement = document.getElementById(field);

        errorElement.classList.remove('show');
        inputElement.style.borderColor = '#e0e0e0';
    }

    handleTagInput(event) {
        if (event.key === 'Enter') {
            event.preventDefault();
            this.addTag();
        }
    }

    addTag() {
        const tagText = this.tagInput.value.trim().toLowerCase();

        if (!tagText) return;

        if (this.tags.length >= 5) {
            Utils.showToast('Maximum 5 tags autorisés', 'error');
            return;
        }

        if (this.tags.includes(tagText)) {
            Utils.showToast('Ce tag existe déjà', 'error');
            return;
        }

        if (tagText.length > 20) {
            Utils.showToast('Les tags ne peuvent pas dépasser 20 caractères', 'error');
            return;
        }

        this.tags.push(tagText);
        this.renderTags();
        this.tagInput.value = '';
    }

    removeTag(tagToRemove) {
        this.tags = this.tags.filter(tag => tag !== tagToRemove);
        this.renderTags();
    }

    renderTags() {
        this.tagsList.innerHTML = '';

        this.tags.forEach(tag => {
            const tagElement = Utils.createElement('span', 'tag-item');
            tagElement.innerHTML = `
                ${Utils.escapeHtml(tag)}
                <span class="tag-remove" onclick="uploadPage.removeTag('${tag}')">×</span>
            `;
            this.tagsList.appendChild(tagElement);
        });
    }

    async handleSubmit(event) {
        event.preventDefault();

        if (!this.validateTitle()) {
            return;
        }

        if (!this.selectedFile) {
            Utils.showToast('Veuillez sélectionner un fichier vidéo', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('video', this.selectedFile);
        formData.append('title', this.titleInput.value.trim());
        formData.append('description', this.descriptionInput.value.trim());
        formData.append('visibility', this.visibilitySelect.value);

        if (this.tags.length > 0) {
            formData.append('tags', JSON.stringify(this.tags));
        }

        try {
            this.setLoading(true);
            await this.uploadVideo(formData);
        } catch (error) {
            console.error('Erreur lors de l\'upload:', error);
            Utils.showToast('Erreur lors de l\'upload de la vidéo', 'error');
            this.setLoading(false);
        }
    }

    async uploadVideo(formData) {
        this.uploadContent.style.display = 'none';
        this.uploadProgress.style.display = 'block';

        try {
            this.simulateProgress();

            const response = await API.uploadVideo(formData);

            this.showSuccess();
            Utils.showToast('Vidéo uploadée avec succès !', 'success');

        } catch (error) {
            throw error;
        }
    }

    simulateProgress() {
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;

            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
            }

            this.updateProgress(progress);
        }, 200);
    }

    updateProgress(percent) {
        this.progressFill.style.width = `${percent}%`;
        this.progressPercent.textContent = `${Math.round(percent)}%`;

        if (percent < 30) {
            this.progressStatus.textContent = 'Upload en cours...';
        } else if (percent < 70) {
            this.progressStatus.textContent = 'Traitement...';
        } else if (percent < 100) {
            this.progressStatus.textContent = 'Finalisation...';
        } else {
            this.progressStatus.textContent = 'Terminé !';
        }
    }

    showAuthRequired() {
        this.authRequired.style.display = 'flex';
        this.uploadContent.style.display = 'none';
    }

    showUploadContent() {
        this.authRequired.style.display = 'none';
        this.uploadContent.style.display = 'block';
    }

    showSuccess() {
        this.uploadProgress.style.display = 'none';
        this.uploadSuccess.style.display = 'block';
    }

    setLoading(loading) {
        this.submitBtn.disabled = loading;

        if (loading) {
            this.btnText.style.display = 'none';
            this.btnSpinner.style.display = 'flex';
        } else {
            this.btnText.style.display = 'flex';
            this.btnSpinner.style.display = 'none';
        }
    }

    resetForm() {
        this.changeFile();

        this.titleInput.value = '';
        this.descriptionInput.value = '';
        this.visibilitySelect.value = 'publique';
        this.tagInput.value = '';
        this.tags = [];
        this.renderTags();

        this.updateTitleCounter();
        this.updateDescriptionCounter();

        this.uploadProgress.style.display = 'none';
        this.uploadSuccess.style.display = 'none';
        this.uploadContent.style.display = 'block';

        this.progressFill.style.width = '0%';
        this.progressPercent.textContent = '0%';
        this.progressStatus.textContent = 'Préparation...';
    }
}

let uploadPage;
document.addEventListener('DOMContentLoaded', () => {
    uploadPage = new UploadPage();
    window.uploadPage = uploadPage;
});