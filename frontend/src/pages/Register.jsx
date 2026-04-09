import React, { useState, useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext.jsx';
import { UserPlus, Mail, Lock, User, Eye, EyeOff, Check, X } from 'lucide-react';


const BUBBLE_TEXTS = ['LOL', 'MDR', '😂', 'HAHA', '💀', '😭', 'XD', 'lmao', '🤣', 'ptdr', '😆', '👏'];

const FloatingBubbles = () => {
    const bubbles = useMemo(() =>
            Array.from({ length: 12 }, (_, i) => ({
                id: i,
                text: BUBBLE_TEXTS[i % BUBBLE_TEXTS.length],
                left: `${(i * 8.3 + 2) % 92}%`,
                delay: `${(i * 0.7) % 6}s`,
                duration: `${9 + (i % 4) * 1.5}s`,
                size: 0.75 + (i % 3) * 0.2,
            }))
        , []);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
            <style>{`
                @keyframes bubbleRise {
                    0%   { transform: translateY(100vh) scale(0.8); opacity: 0; }
                    8%   { opacity: 1; }
                    85%  { opacity: 1; }
                    100% { transform: translateY(-200px) scale(1.05); opacity: 0; }
                }
                @keyframes bubbleWobble {
                    0%,100% { margin-left: 0; }
                    25%     { margin-left: 14px; }
                    75%     { margin-left: -14px; }
                }
                .bubble-item {
                    animation: bubbleRise var(--dur) ease-in var(--delay) infinite,
                               bubbleWobble calc(var(--dur) * 0.5) ease-in-out var(--delay) infinite;
                }
            `}</style>
            {bubbles.map(b => (
                <div
                    key={b.id}
                    className="bubble-item absolute bottom-0 flex items-center justify-center bg-white bg-opacity-80 rounded-full shadow-md font-bold text-gray-700 border border-gray-200"
                    style={{
                        left: b.left,
                        '--dur': b.duration,
                        '--delay': b.delay,
                        width: `${b.size * 56}px`,
                        height: `${b.size * 56}px`,
                        fontSize: `${b.size * 0.85}rem`,
                    }}
                >
                    {b.text}
                </div>
            ))}
        </div>
    );
};

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [acceptCGU, setAcceptCGU] = useState(false);

    const { register } = useAuth();
    const toast = useToast();

    const passwordRequirements = [
        { label: 'Au moins 8 caractères', test: (pwd) => pwd.length >= 8 },
        { label: 'Une majuscule', test: (pwd) => /[A-Z]/.test(pwd) },
        { label: 'Une minuscule', test: (pwd) => /[a-z]/.test(pwd) },
        { label: 'Un chiffre', test: (pwd) => /[0-9]/.test(pwd) }
    ];

    const validatePassword = () => {
        return passwordRequirements.every(req => req.test(password));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (username.length < 3) {
            toast.error("Le nom d'utilisateur doit contenir au moins 3 caractères");
            return;
        }

        if (username.length > 30) {
            toast.error("Le nom d'utilisateur ne peut pas dépasser 30 caractères");
            return;
        }

        if (!acceptCGU) {
            toast.error("Vous devez accepter les conditions d'utilisation");
            return;
        }

        if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
            toast.error("Le nom d'utilisateur ne peut contenir que des lettres, chiffres, _ et -");
            return;
        }

        if (!validatePassword()) {
            toast.error("Le mot de passe ne respecte pas les critères de sécurité");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Les mots de passe ne correspondent pas");
            return;
        }

        setLoading(true);

        try {
            const result = await register(username, email, password);

            if (result.success) {
                toast.success('Inscription réussie ! Bienvenue sur Laugh Tube');
                window.location.hash = '#/home';
            } else {
                toast.error(result.error || "Erreur lors de l'inscription");
            }
        } catch (err) {
            toast.error('Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const navigateTo = (page) => {
        window.location.hash = `#/${page}`;
    };

    const handleGoogleLogin = async () => {
        try {
            setLoading(true);
            const response = await fetch('/api/v2/auth/google', {
                headers: { 'Accept': 'application/json' }
            });
            const data = await response.json();
            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err) {
            toast.error('Erreur lors de la connexion Google');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-16">
            <FloatingBubbles />
            <div className="w-full max-w-md px-6 relative" style={{ zIndex: 1 }}>
                <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                    <div className="flex flex-col items-center mb-8">
                        <div className="mb-2 flex justify-center">
                            <img
                                src="/Laugh Tale Version2.png"
                                alt="Laugh Tube Logo"
                                className="h-12 w-auto scale-125 object-contain"
                            />
                        </div>
                        <h2 className="mt-2 text-3xl font-bold text-gray-900 mb-2">
                            Inscription
                        </h2>
                        <p className="text-gray-500">
                            Rejoignez la communauté
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Nom d'utilisateur
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <User size={20} className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="LaughTale"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    minLength={3}
                                    maxLength={30}
                                    required
                                />
                            </div>
                            {username && (username.length < 3 || username.length > 30 || !/^[a-zA-Z0-9_-]+$/.test(username)) && (
                                <p className="mt-1 text-xs text-red-500">
                                    3-30 caractères (lettres, chiffres, _ et - uniquement)
                                </p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Email
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail size={20} className="text-gray-400" />
                                </div>
                                <input
                                    type="email"
                                    placeholder="laughtale@email.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Mot de passe
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock size={20} className="text-gray-400" />
                                </div>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>

                            {password && (
                                <div className="mt-2 space-y-1">
                                    {passwordRequirements.map((req, index) => (
                                        <div key={index} className="flex items-center gap-2 text-xs">
                                            {req.test(password) ? (
                                                <Check size={14} className="text-green-500" />
                                            ) : (
                                                <X size={14} className="text-gray-300" />
                                            )}
                                            <span className={req.test(password) ? 'text-green-600' : 'text-gray-500'}>
                                                {req.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Confirmer le mot de passe
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Lock size={20} className="text-gray-400" />
                                </div>
                                <input
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {confirmPassword && password !== confirmPassword && (
                                <p className="mt-1 text-xs text-red-500">
                                    Les mots de passe ne correspondent pas
                                </p>
                            )}
                            {confirmPassword && password === confirmPassword && (
                                <p className="mt-1 text-xs text-green-500 flex items-center gap-1">
                                    <Check size={14} />
                                    Les mots de passe correspondent
                                </p>
                            )}
                        </div>

                        <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl border border-gray-200">
                            <input
                                type="checkbox"
                                id="acceptCGU"
                                checked={acceptCGU}
                                onChange={(e) => setAcceptCGU(e.target.checked)}
                                className="mt-0.5 w-4 h-4 accent-gray-900 cursor-pointer flex-shrink-0"
                                required
                            />
                            <label htmlFor="acceptCGU" className="text-sm text-gray-600 leading-relaxed cursor-pointer">
                                J'accepte les{' '}
                                <button
                                    type="button"
                                    onClick={() => { window.location.hash = '#/cgu'; }}
                                    className="text-gray-900 font-semibold underline underline-offset-2 hover:text-gray-700 transition-colors"
                                >
                                    Conditions Générales d'Utilisation
                                </button>
                                ,{' '}
                                <button
                                    type="button"
                                    onClick={() => { window.location.hash = '#/cgu'; }}
                                    className="text-gray-900 font-semibold underline underline-offset-2 hover:text-gray-700 transition-colors"
                                >
                                    la Politique de Confidentialité
                                </button>
                                {' '}et les{' '}
                                <button
                                    type="button"
                                    onClick={() => { window.location.hash = '#/cgu'; }}
                                    className="text-gray-900 font-semibold underline underline-offset-2 hover:text-gray-700 transition-colors"
                                >
                                    Règles de la communauté
                                </button>
                                {' '}de LaughTube.
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Inscription...
                                </span>
                            ) : (
                                'S\'inscrire'
                            )}
                        </button>
                    </form>

                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-3 bg-white text-gray-500 font-medium">ou continuer avec</span>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-3 px-4 py-3.5 border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all duration-200 disabled:opacity-50"
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Continuer avec Google
                    </button>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            Déjà un compte ?{' '}
                            <button
                                type="button"
                                onClick={() => navigateTo('login')}
                                className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
                            >
                                Se connecter
                            </button>
                        </p>
                    </div>

                </div>

                <p className="text-center text-gray-500 text-sm mt-6">
                    En vous inscrivant, vous acceptez nos conditions d'utilisation
                </p>
            </div>
        </div>
    );
};

export default Register;