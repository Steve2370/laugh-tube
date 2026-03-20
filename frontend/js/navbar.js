class Navbar {
    constructor() {
        this.currentUser = null;
        this.currentPage = this.getCurrentPage();
        this.init();
    }

    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setup());
        } else {
            this.setup();
        }
    }

    setup() {
        this.updateAuthState();
        this.setActivePage();
        this.setupEventListeners();
        this.setupScrollBehavior();
    }

    getCurrentPage() {
        const path = window.location.pathname;
        const filename = path.split('/').pop() || 'index.html';
        return filename.replace('.html', '') || 'index';
    }

    updateAuthState() {
        if (typeof Auth === 'undefined') {
            setTimeout(() => this.updateAuthState(), 100);
            return;
        }

        this.currentUser = Auth.getCurrentUser();
        const isAuthenticated = Auth.isAuthenticated();

        const authButtons = document.getElementById('authButtons');
        const userMenu = document.getElementById('userMenu');
        const authNav = document.getElementById('authNav');
        const guestNav = document.getElementById('guestNav');
        const mobileAuthButtons = document.getElementById('mobileAuthButtons');
        const mobileUserInfo = document.getElementById('mobileUserInfo');
        const mobileUploadLink = document.getElementById('mobileUploadLink');

        if (isAuthenticated && this.currentUser) {
            this.showElement(authNav);
            this.showElement(userMenu);
            this.showElement(mobileUserInfo);
            this.showElement(mobileUploadLink);

            this.hideElement(guestNav);
            this.hideElement(authButtons);
            this.hideElement(mobileAuthButtons);

            this.updateUserInfo();
        } else {
            this.showElement(guestNav);
            this.showElement(authButtons);
            this.showElement(mobileAuthButtons);

            this.hideElement(authNav);
            this.hideElement(userMenu);
            this.hideElement(mobileUserInfo);
            this.hideElement(mobileUploadLink);
        }
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        const username = this.currentUser.username || 'Utilisateur';
        const role = this.currentUser.role || 'membre';
        const initials = this.getInitials(username);

        const userAvatar = document.getElementById('userAvatar');
        const userName = document.getElementById('userName');
        const userRole = document.getElementById('userRole');
        const profileLinkText = document.getElementById('profileLinkText');

        if (userAvatar) userAvatar.textContent = initials;
        if (userName) userName.textContent = username;
        if (userRole) userRole.textContent = role;
        if (profileLinkText) profileLinkText.textContent = username;

        this.updateMobileUserInfo();
    }

    updateMobileUserInfo() {
        const mobileUserInfo = document.getElementById('mobileUserInfo');
        if (!mobileUserInfo || !this.currentUser) return;

        const username = this.currentUser.username || 'Utilisateur';
        const role = this.currentUser.role || 'membre';
        const initials = this.getInitials(username);

        mobileUserInfo.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem; margin-bottom: 1.5rem; padding: 1rem; background: rgba(102, 126, 234, 0.1); border-radius: 15px;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: linear-gradient(135deg, #667eea, #764ba2); display: flex; align-items: center; justify-content: center; color: white; font-weight: 600; font-size: 1rem;">
                    ${initials}
                </div>
                <div style="flex: 1;">
                    <div style="font-weight: 600; color: #333; margin-bottom: 0.25rem;">${username}</div>
                    <div style="font-size: 0.8rem; color: #999; text-transform: uppercase; letter-spacing: 0.5px;">${role}</div>
                </div>
            </div>
            <button onclick="simpleNavbar.handleLogout()" style="display: flex; align-items: center; justify-content: center; gap: 0.75rem; padding: 0.75rem 1.5rem; background: #f44336; color: white; border: none; border-radius: 25px; font-weight: 500; cursor: pointer; transition: all 0.3s ease; width: 100%;">
                <i class="fas fa-sign-out-alt"></i>
                Déconnexion
            </button>
        `;
    }

    getInitials(name) {
        return name
            .split(' ')
            .map(word => word.charAt(0))
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }

    setActivePage() {
        const navLinks = document.querySelectorAll('.nav-link, .mobile-nav-link');
        navLinks.forEach(link => link.classList.remove('active'));

        const currentLinks = document.querySelectorAll(`[data-page="${this.currentPage}"]`);
        currentLinks.forEach(link => link.classList.add('active'));

        const mobileLinks = document.querySelectorAll('.mobile-nav-link');
        mobileLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href && href.includes(this.currentPage)) {
                link.classList.add('active');
            }
        });
    }

    setupEventListeners() {
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        const mobileToggle = document.getElementById('mobileToggle');
        const mobileNav = document.getElementById('mobileNav');
        if (mobileToggle && mobileNav) {
            mobileToggle.addEventListener('click', () => {
                mobileToggle.classList.toggle('active');
                mobileNav.classList.toggle('active');

                if (mobileNav.classList.contains('active')) {
                    document.body.style.overflow = 'hidden';
                } else {
                    document.body.style.overflow = '';
                }
            });
        }

        const searchForm = document.getElementById('searchForm');
        if (searchForm) {
            searchForm.addEventListener('submit', (e) => this.handleSearch(e));
        }

        const mobileSearchForm = document.getElementById('mobileSearchForm');
        if (mobileSearchForm) {
            mobileSearchForm.addEventListener('submit', (e) => this.handleMobileSearch(e));
        }

        document.addEventListener('click', (e) => {
            const navbar = document.querySelector('.navbar');
            if (mobileNav && navbar && !navbar.contains(e.target) && mobileNav.classList.contains('active')) {
                mobileToggle.classList.remove('active');
                mobileNav.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && mobileNav && mobileNav.classList.contains('active')) {
                mobileToggle.classList.remove('active');
                mobileNav.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        window.addEventListener('auth-state-changed', () => {
            this.updateAuthState();
        });

        window.addEventListener('storage', (e) => {
            if (e.key === 'authToken' || e.key === 'user') {
                this.updateAuthState();
            }
        });
    }

    setupScrollBehavior() {
        const navbar = document.querySelector('.navbar');
        if (!navbar) return;

        let lastScrollY = window.scrollY;

        window.addEventListener('scroll', () => {
            const currentScrollY = window.scrollY;

            if (currentScrollY > 50) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.remove('scrolled');
            }

            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                navbar.style.transform = 'translateY(-100%)';
            } else {
                navbar.style.transform = 'translateY(0)';
            }

            lastScrollY = currentScrollY;
        });
    }

    handleSearch(event) {
        event.preventDefault();
        const searchInput = document.getElementById('searchInput');
        const query = searchInput ? searchInput.value.trim() : '';

        if (!query) {
            this.showToast('Veuillez saisir un terme de recherche', 'error');
            return;
        }

        window.location.href = `search.html?q=${encodeURIComponent(query)}`;
    }

    handleMobileSearch(event) {
        event.preventDefault();
        const mobileSearchInput = document.getElementById('mobileSearchInput');
        const query = mobileSearchInput ? mobileSearchInput.value.trim() : '';

        if (!query) {
            this.showToast('Veuillez saisir un terme de recherche', 'error');
            return;
        }

        const mobileToggle = document.getElementById('mobileToggle');
        const mobileNav = document.getElementById('mobileNav');
        if (mobileToggle && mobileNav) {
            mobileToggle.classList.remove('active');
            mobileNav.classList.remove('active');
            document.body.style.overflow = '';
        }

        window.location.href = `search.html?q=${encodeURIComponent(query)}`;
    }

    handleLogout() {
        if (confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
            if (typeof Auth !== 'undefined') {
                Auth.logout();
                window.dispatchEvent(new CustomEvent('auth-state-changed'));
            }
        }
    }

    showElement(element) {
        if (element) {
            element.style.display = '';
            element.classList.remove('hidden');
        }
    }

    hideElement(element) {
        if (element) {
            element.style.display = 'none';
            element.classList.add('hidden');
        }
    }

    showToast(message, type = 'info') {
        if (typeof Utils !== 'undefined' && Utils.showToast) {
            Utils.showToast(message, type);
        } else {
            alert(message);
        }
    }

    refresh() {
        this.updateAuthState();
        this.setActivePage();
    }

    updateUser(user) {
        this.currentUser = user;
        this.updateUserInfo();
    }
}

let simpleNavbar;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        simpleNavbar = new Navbar();
        window.simpleNavbar = simpleNavbar;
    });
} else {
    simpleNavbar = new Navbar();
    window.simpleNavbar = simpleNavbar;
}