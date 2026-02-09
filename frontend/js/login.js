class LoginPage {
    constructor() {
        this.form = document.getElementById('loginForm');
        this.usernameInput = document.getElementById('username');
        this.passwordInput = document.getElementById('password');
        this.passwordToggle = document.getElementById('passwordToggle');
        this.submitBtn = document.getElementById('submitBtn');
        this.btnText = this.submitBtn.querySelector('.btn-text');
        this.btnSpinner = this.submitBtn.querySelector('.btn-spinner');
        this.rememberMe = document.getElementById('rememberMe');

        this.usernameError = document.getElementById('usernameError');
        this.passwordError = document.getElementById('passwordError');

        this.init();
    }

    init() {
        if (Auth.redirectIfAuthenticated()) {
            return;
        }

        this.setupEventListeners();
        this.loadRememberedCredentials();
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        this.passwordToggle.addEventListener('click', () => this.togglePasswordVisibility());

        this.usernameInput.addEventListener('blur', () => this.validateUsername());
        this.passwordInput.addEventListener('blur', () => this.validatePassword());

        this.usernameInput.addEventListener('input', () => this.clearError('username'));
        this.passwordInput.addEventListener('input', () => this.clearError('password'));

        this.usernameInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.passwordInput.focus();
            }
        });

        this.passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && this.isFormValid()) {
                this.form.requestSubmit();
            }
        });
    }

    async handleSubmit(event) {
        event.preventDefault();

        if (!this.validateForm()) {
            return;
        }

        const username = this.usernameInput.value.trim();
        const password = this.passwordInput.value;
        const remember = this.rememberMe.checked;

        try {
            this.setLoading(true);

            const success = await Auth.login(username, password);

            if (success) {
                if (remember) {
                    this.saveCredentials(username);
                } else {
                    this.clearSavedCredentials();
                }

                const returnUrl = Utils.getUrlParams().return || 'index.html';
                setTimeout(() => {
                    window.location.href = returnUrl;
                }, 1500);
            }

        } catch (error) {
            console.error('Erreur de connexion:', error);
        } finally {
            this.setLoading(false);
        }
    }

    validateForm() {
        let isValid = true;

        if (!this.validateUsername()) {
            isValid = false;
        }

        if (!this.validatePassword()) {
            isValid = false;
        }

        return isValid;
    }

    validateUsername() {
        const username = this.usernameInput.value.trim();

        if (!username) {
            this.showError('username', 'Le nom d\'utilisateur est requis');
            return false;
        }

        if (username.length < 3) {
            this.showError('username', 'Le nom d\'utilisateur doit contenir au moins 3 caractères');
            return false;
        }

        this.clearError('username');
        return true;
    }

    validatePassword() {
        const password = this.passwordInput.value;

        if (!password) {
            this.showError('password', 'Le mot de passe est requis');
            return false;
        }

        if (password.length < 6) {
            this.showError('password', 'Le mot de passe doit contenir au moins 6 caractères');
            return false;
        }

        this.clearError('password');
        return true;
    }

    isFormValid() {
        return this.usernameInput.value.trim().length >= 3 &&
            this.passwordInput.value.length >= 6;
    }

    togglePasswordVisibility() {
        const isPassword = this.passwordInput.type === 'password';
        this.passwordInput.type = isPassword ? 'text' : 'password';

        const icon = this.passwordToggle.querySelector('i');
        icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
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

    setLoading(loading) {
        this.submitBtn.disabled = loading;

        if (loading) {
            this.btnText.style.display = 'none';
            this.btnSpinner.style.display = 'inline-block';
        } else {
            this.btnText.style.display = 'inline-block';
            this.btnSpinner.style.display = 'none';
        }
    }

    saveCredentials(username) {
        try {
            localStorage.setItem('rememberedUsername', username);
        } catch (error) {
            console.warn('Impossible de sauvegarder les credentials:', error);
        }
    }

    loadRememberedCredentials() {
        try {
            const rememberedUsername = localStorage.getItem('rememberedUsername');
            if (rememberedUsername) {
                this.usernameInput.value = rememberedUsername;
                this.rememberMe.checked = true;
                this.passwordInput.focus();
            }
        } catch (error) {
            console.warn('Impossible de charger les credentials:', error);
        }
    }

    clearSavedCredentials() {
        try {
            localStorage.removeItem('rememberedUsername');
        } catch (error) {
            console.warn('Impossible de supprimer les credentials:', error);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new LoginPage();
});