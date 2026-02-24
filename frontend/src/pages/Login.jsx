import React, {useEffect, useState} from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext.jsx';
import { LogIn, Mail, Lock, Eye, EyeOff, Shield } from 'lucide-react';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [show2FA, setShow2FA] = useState(false);
    const [twoFactorCode, setTwoFactorCode] = useState('');
    const [userId2FA, setUserId2FA] = useState(null);
    const [loginDelay, setLoginDelay] = useState(0);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [countdown, setCountdown] = useState(0);

    const { login, verify2FA } = useAuth();
    const toast = useToast();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await login(email, password);

            if (result.success) {
                if (result.requires_2fa) {
                    setUserId2FA(result.user_id);
                    setShow2FA(true);
                    toast.info('Veuillez entrer votre code 2FA');
                } else {
                    toast.success('Connexion réussie !');
                    window.location.hash = '#/home';
                }
            } else {
                toast.error(result.error || 'Email ou mot de passe incorrect');
            }
        } catch (err) {
            const delay = Math.min(2 * (failedAttempts + 1), 30);
            setFailedAttempts(prev => prev + 1);
            setCountdown(delay);
            toast.error('Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const handle2FASubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const result = await verify2FA(userId2FA, twoFactorCode);

            if (result.success) {
                toast.success('Authentification réussie !');
                window.location.hash = '#/home';
            } else {
                toast.error(result.error || 'Code 2FA invalide');
            }
        } catch (err) {
            toast.error('Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const delay = Math.min(2 * (loginDelay + 1), 30);
    setLoginDelay(prev => prev + 1);
    setCountdown(delay);

    useEffect(() => {
        if (countdown <= 0) return;
        const timer = setTimeout(() => setCountdown(prev => prev - 1), 1000);
        return () => clearTimeout(timer);
    }, [countdown]);

    const navigateTo = (page) => {
        window.location.hash = `#/${page}`;
    };

    if (show2FA) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-16">
                <div className="w-full max-w-md px-6">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 border border-gray-100">
                        <div className="text-center mb-8">
                            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                                <Shield size={32} className="text-blue-600" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-2">
                                Authentification 2FA
                            </h2>
                            <p className="text-gray-500">
                                Entrez le code à 6 chiffres de votre application
                            </p>
                        </div>

                        <form onSubmit={handle2FASubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Code 2FA
                                </label>
                                <input
                                    type="text"
                                    placeholder="000000"
                                    value={twoFactorCode}
                                    onChange={(e) => setTwoFactorCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    className="w-full px-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center text-2xl tracking-widest font-mono"
                                    maxLength={6}
                                    pattern="[0-9]{6}"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || twoFactorCode.length !== 6}
                                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 text-white py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                        Vérification...
                                    </span>
                                ) : (
                                    'Vérifier'
                                )}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={() => {
                                    setShow2FA(false);
                                    setTwoFactorCode('');
                                    setUserId2FA(null);
                                }}
                                className="text-gray-600 hover:text-gray-700 font-semibold hover:underline transition-colors"
                            >
                                ← Retour à la connexion
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-purple-50 pt-16">
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
                            Connexion
                        </h2>
                        <p className="text-gray-500">
                            Connectez-vous à votre compte
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                Email ou nom d'utilisateur
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                    <Mail size={20} className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Email ou nom d'utilisateur"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-sm font-semibold text-gray-700">
                                    Mot de passe
                                </label>
                                <button
                                    type="button"
                                    onClick={() => navigateTo('forgot-password')}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                                >
                                    Mot de passe oublié ?
                                </button>
                            </div>
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
                        </div>

                        <button
                            type="submit"
                            disabled={loading || countdown > 0}
                            className="w-full bg-gray-900 text-white py-3.5 rounded-xl font-semibold hover:bg-gray-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                                    Connexion...
                                </span>
                            ) : countdown > 0 ? (
                                <span className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"/>
                                Réessayez dans {countdown}s
                                </span>
                                ) : (
                                'Se connecter'
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-gray-600">
                            Pas encore de compte ?{' '}
                            <button
                                type="button"
                                onClick={() => navigateTo('register')}
                                className="text-blue-600 hover:text-blue-700 font-semibold hover:underline transition-colors"
                            >
                                S'inscrire
                            </button>
                        </p>
                    </div>
                </div>

                <p className="text-center text-gray-500 text-sm mt-6">
                    En vous connectant, vous acceptez nos conditions d'utilisation
                </p>
            </div>
        </div>
    );
};

export default Login;