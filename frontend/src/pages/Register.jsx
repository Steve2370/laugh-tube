import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext.jsx';
import { UserPlus, Mail, Lock, User, Eye, EyeOff, Check, X } from 'lucide-react';

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-pink-50 pt-16">
            <div className="w-full max-w-md px-6">
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