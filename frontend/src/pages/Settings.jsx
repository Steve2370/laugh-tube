import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../contexts/ToastContext';
import {
    Settings as SettingsIcon,
    User,
    Lock,
    Bell,
    Shield,
    Eye,
    EyeOff,
    Check,
    X,
    AlertCircle,
    Smartphone,
    Key,
    Save
} from 'lucide-react';
import apiService from '../services/apiService';

const Settings = () => {
    const { user, changePassword, reload } = useAuth();
    const toast = useToast();

    const [activeTab, setActiveTab] = useState('profile');
    const [loading, setLoading] = useState(false);
    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');
    const [bio, setBio] = useState('');
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [twoFactorEnabled, setTwoFactorEnabled] = useState(false);
    const [show2FASetup, setShow2FASetup] = useState(false);
    const [qrCodeUrl, setQrCodeUrl] = useState('');
    const [secret, setSecret] = useState('');
    const [verificationCode, setVerificationCode] = useState('');

    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setEmail(user.email || '');
            loadUserProfile();
            check2FAStatus();
        }
    }, [user]);

    const loadUserProfile = async () => {
        try {
            const response = await apiService.getUserProfile();
            if (response.success && response.data) {
                setBio(response.data.bio || '');
            }
        } catch (err) {
            console.error('Erreur chargement profil:', err);
        }
    };

    const check2FAStatus = async () => {
        try {
            const response = await apiService.check2FAStatus();
            setTwoFactorEnabled(response.enabled || false);
        } catch (err) {
            console.error('Erreur vérification 2FA:', err);
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await apiService.updateUserProfile({
                username,
                email,
                bio
            });

            if (response.success) {
                toast.success('Profil mis à jour avec succès');
                await reload();
            } else {
                toast.error(response.error || 'Erreur lors de la mise à jour');
            }
        } catch (err) {
            toast.error('Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const passwordRequirements = [
        { label: 'Au moins 8 caractères', test: (pwd) => pwd.length >= 8 },
        { label: 'Une majuscule', test: (pwd) => /[A-Z]/.test(pwd) },
        { label: 'Une minuscule', test: (pwd) => /[a-z]/.test(pwd) },
        { label: 'Un chiffre', test: (pwd) => /[0-9]/.test(pwd) }
    ];

    const validatePassword = () => {
        return passwordRequirements.every(req => req.test(newPassword));
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (!validatePassword()) {
            toast.error('Le nouveau mot de passe ne respecte pas les critères de sécurité');
            return;
        }

        if (newPassword !== confirmPassword) {
            toast.error('Les mots de passe ne correspondent pas');
            return;
        }

        setLoading(true);

        try {
            const result = await changePassword(currentPassword, newPassword);

            if (result.success) {
                toast.success('Mot de passe modifié avec succès');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
            } else {
                toast.error(result.error || 'Erreur lors du changement de mot de passe');
            }
        } catch (err) {
            toast.error('Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const handleEnable2FA = async () => {
        setLoading(true);
        try {
            const response = await apiService.enable2FA();

            if (response.success) {
                setQrCodeUrl(response.qrcode);
                setSecret(response.secret);
                setShow2FASetup(true);
            } else {
                toast.error(response.error || 'Erreur lors de l\'activation 2FA');
            }
        } catch (err) {
            toast.error('Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const handleVerify2FA = async (e) => {
        e.preventDefault();

        if (verificationCode.length !== 6) {
            toast.error('Le code doit contenir 6 chiffres');
            return;
        }

        setLoading(true);

        try {
            const response = await apiService.verify2FASetup(verificationCode);

            if (response.success) {
                toast.success('2FA activé avec succès');
                setTwoFactorEnabled(true);
                setShow2FASetup(false);
                setVerificationCode('');
            } else {
                toast.error(response.error || 'Code invalide');
            }
        } catch (err) {
            toast.error('Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    const handleDisable2FA = async () => {
        if (!window.confirm('Êtes-vous sûr de vouloir désactiver l\'authentification à deux facteurs ?')) {
            return;
        }

        setLoading(true);

        try {
            const response = await apiService.disable2FA();

            if (response.success) {
                toast.success('2FA désactivé avec succès');
                setTwoFactorEnabled(false);
            } else {
                toast.error(response.error || 'Erreur lors de la désactivation');
            }
        } catch (err) {
            toast.error('Une erreur est survenue');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen pt-20 bg-gray-50">
            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="flex items-center gap-3 mb-6">
                    <SettingsIcon size={32} className="text-gray-700" />
                    <h1 className="text-3xl font-bold">Paramètres</h1>
                </div>

                <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="flex border-b overflow-x-auto">
                        <button
                            onClick={() => setActiveTab('profile')}
                            className={`flex items-center gap-2 px-6 py-4 font-medium transition whitespace-nowrap ${
                                activeTab === 'profile'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <User size={20} />
                            Profil
                        </button>
                        <button
                            onClick={() => setActiveTab('security')}
                            className={`flex items-center gap-2 px-6 py-4 font-medium transition whitespace-nowrap ${
                                activeTab === 'security'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <Lock size={20} />
                            Sécurité
                        </button>
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`flex items-center gap-2 px-6 py-4 font-medium transition whitespace-nowrap ${
                                activeTab === 'notifications'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <Bell size={20} />
                            Notifications
                        </button>
                        <button
                            onClick={() => setActiveTab('privacy')}
                            className={`flex items-center gap-2 px-6 py-4 font-medium transition whitespace-nowrap ${
                                activeTab === 'privacy'
                                    ? 'border-b-2 border-blue-600 text-blue-600'
                                    : 'text-gray-600 hover:text-gray-800'
                            }`}
                        >
                            <Shield size={20} />
                            Confidentialité
                        </button>
                    </div>

                    <div className="p-8">
                        {/* ONGLET PROFIL */}
                        {activeTab === 'profile' && (
                            <div>
                                <h2 className="text-xl font-semibold mb-6">Informations du profil</h2>
                                <form onSubmit={handleProfileUpdate} className="space-y-4 max-w-lg">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Nom d'utilisateur
                                        </label>
                                        <input
                                            type="text"
                                            value={username}
                                            onChange={(e) => setUsername(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            minLength={3}
                                            maxLength={30}
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Email
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Biographie
                                        </label>
                                        <textarea
                                            value={bio}
                                            onChange={(e) => setBio(e.target.value)}
                                            rows={4}
                                            maxLength={500}
                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                            placeholder="Parlez-nous de vous..."
                                        />
                                        <div className="mt-1 text-xs text-gray-500 text-right">
                                            {bio.length}/500
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Save size={20} />
                                        {loading ? 'Enregistrement...' : 'Enregistrer les modifications'}
                                    </button>
                                </form>
                            </div>
                        )}

                        {/* ONGLET SÉCURITÉ */}
                        {activeTab === 'security' && (
                            <div className="space-y-8">
                                {/* Changement de mot de passe */}
                                <div>
                                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                        <Key size={24} />
                                        Changer le mot de passe
                                    </h2>
                                    <form onSubmit={handlePasswordChange} className="space-y-4 max-w-lg">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Mot de passe actuel
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showCurrentPassword ? "text" : "password"}
                                                    value={currentPassword}
                                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Nouveau mot de passe
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? "text" : "password"}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>

                                            {newPassword && (
                                                <div className="mt-2 space-y-1">
                                                    {passwordRequirements.map((req, index) => (
                                                        <div key={index} className="flex items-center gap-2 text-xs">
                                                            {req.test(newPassword) ? (
                                                                <Check size={14} className="text-green-500" />
                                                            ) : (
                                                                <X size={14} className="text-gray-300" />
                                                            )}
                                                            <span className={req.test(newPassword) ? 'text-green-600' : 'text-gray-500'}>
                                                                {req.label}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                                Confirmer le nouveau mot de passe
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showConfirmPassword ? "text" : "password"}
                                                    value={confirmPassword}
                                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                                    className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>

                                            {confirmPassword && newPassword !== confirmPassword && (
                                                <p className="mt-1 text-xs text-red-500 flex items-center gap-1">
                                                    <X size={14} />
                                                    Les mots de passe ne correspondent pas
                                                </p>
                                            )}
                                            {confirmPassword && newPassword === confirmPassword && (
                                                <p className="mt-1 text-xs text-green-500 flex items-center gap-1">
                                                    <Check size={14} />
                                                    Les mots de passe correspondent
                                                </p>
                                            )}
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {loading ? 'Modification...' : 'Changer le mot de passe'}
                                        </button>
                                    </form>
                                </div>

                                {/* Authentification à deux facteurs */}
                                <div className="border-t pt-8">
                                    <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                                        <Smartphone size={24} />
                                        Authentification à deux facteurs (2FA)
                                    </h2>

                                    {!twoFactorEnabled ? (
                                        <div className="max-w-lg">
                                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                                <div className="flex items-start gap-3">
                                                    <AlertCircle className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
                                                    <div className="text-sm text-blue-900">
                                                        <p className="font-medium mb-1">Renforcez votre sécurité</p>
                                                        <p>L'authentification à deux facteurs ajoute une couche de sécurité supplémentaire en demandant un code unique à chaque connexion.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {!show2FASetup ? (
                                                <button
                                                    onClick={handleEnable2FA}
                                                    disabled={loading}
                                                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {loading ? 'Chargement...' : 'Activer la 2FA'}
                                                </button>
                                            ) : (
                                                <div className="bg-white border border-gray-200 rounded-lg p-6">
                                                    <h3 className="font-semibold mb-4">Configuration de la 2FA</h3>

                                                    <div className="space-y-4">
                                                        <div>
                                                            <p className="text-sm text-gray-700 mb-2">1. Scannez ce QR code avec votre application d'authentification (Google Authenticator, Authy, etc.)</p>
                                                            <div className="bg-white p-4 border rounded-lg inline-block">
                                                                <img src={qrCodeUrl} alt="QR Code 2FA" className="w-48 h-48" />
                                                            </div>
                                                        </div>

                                                        <div>
                                                            <p className="text-sm text-gray-700 mb-2">2. Ou entrez manuellement cette clé secrète :</p>
                                                            <code className="block bg-gray-100 p-3 rounded font-mono text-sm break-all">
                                                                {secret}
                                                            </code>
                                                        </div>

                                                        <form onSubmit={handleVerify2FA} className="space-y-4">
                                                            <div>
                                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                                    3. Entrez le code à 6 chiffres généré par votre application
                                                                </label>
                                                                <input
                                                                    type="text"
                                                                    value={verificationCode}
                                                                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                                    placeholder="000000"
                                                                    maxLength={6}
                                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest font-mono"
                                                                    required
                                                                />
                                                            </div>

                                                            <div className="flex gap-3">
                                                                <button
                                                                    type="submit"
                                                                    disabled={loading || verificationCode.length !== 6}
                                                                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                                                >
                                                                    {loading ? 'Vérification...' : 'Vérifier et activer'}
                                                                </button>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => setShow2FASetup(false)}
                                                                    className="bg-gray-200 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-300 transition font-medium"
                                                                >
                                                                    Annuler
                                                                </button>
                                                            </div>
                                                        </form>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="max-w-lg">
                                            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                                <div className="flex items-start gap-3">
                                                    <Check className="text-green-600 flex-shrink-0 mt-0.5" size={20} />
                                                    <div className="text-sm text-green-900">
                                                        <p className="font-medium mb-1">2FA activée</p>
                                                        <p>Votre compte est protégé par l'authentification à deux facteurs.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            <button
                                                onClick={handleDisable2FA}
                                                disabled={loading}
                                                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                {loading ? 'Désactivation...' : 'Désactiver la 2FA'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div>
                                <h2 className="text-xl font-semibold mb-6">Notifications</h2>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                                    <p className="text-gray-600">
                                        Paramètres de notifications à venir...
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'privacy' && (
                            <div>
                                <h2 className="text-xl font-semibold mb-6">Confidentialité</h2>
                                <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
                                    <p className="text-gray-600">
                                        Paramètres de confidentialité à venir...
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;