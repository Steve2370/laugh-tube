class RegisterPage {
    constructor() {
        this.form = document.getElementById('registerForm');
        this.usernameInput = document.getElementById('username');
        this.emailInput = document.getElementById('email');
        this.passwordInput = document.getElementById('password');
        this.confirmPasswordInput = document.getElementById('confirmPassword');
        this.acceptTerms = document.getElementById('acceptTerms');
        this.submitBtn = document.getElementById('submitBtn');
        this.btnText = this.submitBtn.querySelector('.btn-text');
        this.btnSpinner = this.submitBtn.querySelector('.btn-spinner');

        this.passwordToggle = document.getElementById('passwordToggle');
        this.confirmPasswordToggle = document.getElementById('confirmPasswordToggle');

        this.passwordStrength = document.getElementById('passwordStrength');
        this.strengthFill = this.passwordStrength.querySelector('.strength-fill');
        this.strengthText = this.passwordStrength.querySelector('.strength-text');

        this.usernameError = document.getElementById('usernameError');
        this.emailError = document.getElementById('emailError');
        this.passwordError = document.getElementById('passwordError');
        this.confirmPasswordError = document.getElementById('confirmPasswordError');
        this.termsError = document.getElementById('termsError');

        this.init();
    }

    init() {
        if (Auth.redirectIfAuthenticated()) {
            return;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));

        this.passwordToggle.addEventListener('click', () => this.togglePasswordVisibility('password'));
        this.confirmPasswordToggle.addEventListener('click', () => this.togglePasswordVisibility('confirmPassword'));

        this.usernameInput.addEventListener('blur', () => this.validateUsername());
        this.emailInput.addEventListener('blur', () => this.validateEmail());
        this.passwordInput.addEventListener('input', () => this.handlePasswordChange());
        this.passwordInput.addEventListener('blur', () => this.validatePassword());
        this.confirmPasswordInput.addEventListener('blur', () => this.validateConfirmPassword());
        this.acceptTerms.addEventListener('change', () => this.validateTerms());

        this.usernameInput.addEventListener('input', () => this.clearError('username'));
        this.emailInput.addEventListener('input', () => this.clearError('email'));
        this.passwordInput.addEventListener('input', () => this.clearError('password'));
        this.confirmPasswordInput.addEventListener('input', () => this.clearError('confirmPassword'));

        [this.usernameInput, this.emailInput, this.passwordInput, this.confirmPasswordInput, this.acceptTerms]
            .forEach(input => {
                input.addEventListener('input', () => this.updateSubmitButton());
                input.addEventListener('change', () => this.updateSubmitButton());
            });
    }

    async handleSubmit(event) {
        event.preventDefault();

        if (!this.validateForm()) {
            return;
        }

        const userData = {
            username: this.usernameInput.value.trim(),
            email: this.emailInput.value.trim(),
            password: this.passwordInput.value
        };

        try {
            this.setLoading(true);

            const success = await Auth.register(userData);

            if (success) {
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            }

        } catch (error) {
            console.error('Erreur d\'inscription:', error);
        } finally {
            this.setLoading(false);
        }
    }

    validateForm() {
        let isValid = true;

        if (!this.validateUsername()) isValid = false;
        if (!this.validateEmail()) isValid = false;
        if (!this.validatePassword()) isValid = false;
        if (!this.validateConfirmPassword()) isValid = false;
        if (!this.validateTerms()) isValid = false;

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

        if (username.length > 30) {
            this.showError('username', 'Le nom d\'utilisateur ne peut pas dépasser 30 caractères');
            return false;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.showError('username', 'Le nom d\'utilisateur ne peut contenir que des lettres, chiffres et underscores');
            return false;
        }

        this.clearError('username');
        return true;
    }

    validateEmail() {
        const email = this.emailInput.value.trim();

        if (!email) {
            this.showError('email', 'L\'adresse email est requise');
            return false;
        }

        if (!Utils.isValidEmail(email)) {
            this.showError('email', 'Veuillez saisir une adresse email valide');
            return false;
        }

        this.clearError('email');
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

    validateConfirmPassword() {
        const password = this.passwordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;

        if (!confirmPassword) {
            this.showError('confirmPassword', 'Veuillez confirmer votre mot de passe');
            return false;
        }

        if (password !== confirmPassword) {
            this.showError('confirmPassword', 'Les mots de passe ne correspondent pas');
            return false;
        }

        this.clearError('confirmPassword');
        return true;
    }

    validateTerms() {
        if (!this.acceptTerms.checked) {
            this.showError('terms', 'Vous devez accepter les conditions d\'utilisation');
            return false;
        }

        this.clearError('terms');
        return true;
    }

    handlePasswordChange() {
        this.updatePasswordStrength();
        this.clearError('password');

        if (this.confirmPasswordInput.value) {
            this.validateConfirmPassword();
        }
    }

    updatePasswordStrength() {
        const password = this.passwordInput.value;
        let strength = 0;
        let strengthText = '';
        let strengthClass = '';

        if (password.length === 0) {
            strengthText = 'Saisissez un mot de passe';
            strengthClass = '';
        } else if (password.length < 6) {
            strengthText = 'Trop court';
            strengthClass = 'strength-weak';
            strength = 1;
        } else {
            if (password.length >= 8) strength++;
            if (/[a-z]/.test(password)) strength++;
            if (/[A-Z]/.test(password)) strength++;
            if (/[0-9]/.test(password)) strength++;
            if (/[^a-zA-Z0-9]/.test(password)) strength++;

            switch (strength) {
                case 1:
                case 2:
                    strengthText = 'Faible';
                    strengthClass = 'strength-weak';
                    break;
                case 3:
                    strengthText = 'Moyen';
                    strengthClass = 'strength-fair';
                    break;
                case 4:
                    strengthText = 'Bon';
                    strengthClass = 'strength-good';
                    break;
                case 5:
                    strengthText = 'Très bon';
                    strengthClass = 'strength-strong';
                    break;
            }
        }

        this.passwordStrength.className = `password-strength ${strengthClass}`;
        this.strengthText.textContent = strengthText;
    }

    togglePasswordVisibility(field) {
        const input = document.getElementById(field);
        const toggle = document.getElementById(`${field}Toggle`);
        const icon = toggle.querySelector('i');

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';
        icon.className = isPassword ? 'fas fa-eye-slash' : 'fas fa-eye';
    }

    showError(field, message) {
        const errorElement = document.getElementById(`${field}Error`);
        const inputElement = document.getElementById(field);

        errorElement.textContent = message;
        errorElement.classList.add('show');

        if (inputElement) {
            inputElement.style.borderColor = '#f44336';
        }
    }

    clearError(field) {
        const errorElement = document.getElementById(`${field}Error`);
        const inputElement = document.getElementById(field);

        errorElement.classList.remove('show');

        if (inputElement) {
            inputElement.style.borderColor = '#e0e0e0';
        }
    }

    updateSubmitButton() {
        const isValid = this.isFormValid();
        this.submitBtn.disabled = !isValid;
    }

    isFormValid() {
        const username = this.usernameInput.value.trim();
        const email = this.emailInput.value.trim();
        const password = this.passwordInput.value;
        const confirmPassword = this.confirmPasswordInput.value;
        const termsAccepted = this.acceptTerms.checked;

        return username.length >= 3 &&
            Utils.isValidEmail(email) &&
            password.length >= 6 &&
            password === confirmPassword &&
            termsAccepted;
    }

    setLoading(loading) {
        this.submitBtn.disabled = loading;

        if (loading) {
            this.btnText.style.display = 'none';
            this.btnSpinner.style.display = 'inline-block';
        } else {
            this.btnText.style.display = 'inline-block';
            this.btnSpinner.style.display = 'none';
            this.updateSubmitButton();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new RegisterPage();
});