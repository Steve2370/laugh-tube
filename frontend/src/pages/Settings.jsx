import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import apiService from '../services/apiService.js';
import {
    Settings as SettingsIcon,
    User,
    Lock,
    Bell,
    Shield,
    Camera,
    Mail,
    Eye,
    EyeOff,
    Save,
    Loader
} from 'lucide-react';

const Settings = () => {
    const { user, updateUser } = useAuth();
    const { success, error } = useNotification();

    const [activeTab, setActiveTab] = useState('profile');

    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [savingProfile, setSavingProfile] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setEmail(user.email || '');
        }
    }, [user?.id]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        if (!user?.id) {
            error('Utilisateur non connecté');
            return;
        }

        const trimmed = username.trim();
        if (trimmed.length < 3 || trimmed.length > 30) {
            error("Le nom d'utilisateur doit contenir entre 3 et 30 caractères");
            return;
        }

        setSavingProfile(true);
        try {
            const response = await apiService.updateProfile({
                username: trimmed,
                email: email.trim(),
            });

            const updatedUser = response.user || response.data?.user || response;
            if (updatedUser?.username) {
                updateUser({ username: updatedUser.username, email: updatedUser.email });
            } else {
                updateUser({ username: trimmed, email: email.trim() });
            }

            success('Profil mis à jour avec succès !');
        } catch (err) {
            console.error('Erreur mise à jour profil:', err);
            error(err.message || 'Erreur lors de la mise à jour du profil');
        } finally {
            setSavingProfile(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            error('Les mots de passe ne correspondent pas');
            return;
        }

        if (newPassword.length < 8) {
            error('Le mot de passe doit contenir au moins 8 caractères');
            return;
        }

        setSavingPassword(true);
        try {
            await apiService.changePassword(currentPassword, newPassword);
            success('Mot de passe changé avec succès !');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            console.error('Erreur changement mot de passe:', err);
            error(err.message || 'Erreur lors du changement de mot de passe');
        } finally {
            setSavingPassword(false);
        }
    };

    const tabs = [
        { id: 'profile', label: 'Profil', icon: User },
        { id: 'security', label: 'Sécurité', icon: Lock },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'privacy', label: 'Confidentialité', icon: Shield },
    ];

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-50 via-white to-blue-50">
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="p-3 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl shadow-lg">
                            <SettingsIcon size={32} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900">Paramètres</h1>
                            <p className="text-gray-600 mt-1">
                                Gérez vos préférences et votre compte
                            </p>
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                    <div className="flex border-b bg-gray-50 overflow-x-auto">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'border-b-2 border-blue-600 text-blue-600 bg-white'
                                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                                    }`}
                                >
                                    <Icon size={20} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>

                    <div className="p-8">
                        {activeTab === 'profile' && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6 text-gray-900">
                                    Informations du profil
                                </h2>

                                <form onSubmit={handleProfileUpdate} className="space-y-6 max-w-2xl">
                                    <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-xl">
                                        <div className="relative">
                                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                                {username.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => window.location.hash = '#/profile'}
                                                className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border-2 border-gray-200 hover:bg-gray-50 transition-colors"
                                                title="Changer la photo dans le profil"
                                            >
                                                <Camera size={18} className="text-gray-600" />
                                            </button>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-1">
                                                Photo de profil
                                            </h3>
                                            <p className="text-sm text-gray-500">
                                                Modifiez votre photo depuis la page Profil
                                            </p>
                                        </div>
                                    </div>

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
                                                value={username}
                                                onChange={(e) => setUsername(e.target.value)}
                                                placeholder="Votre nom d'utilisateur"
                                                minLength={3}
                                                maxLength={30}
                                                required
                                                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 mt-1">3 à 30 caractères</p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Adresse email
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Mail size={20} className="text-gray-400" />
                                            </div>
                                            <input
                                                type="email"
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="votre@email.com"
                                                required
                                                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={savingProfile}
                                        className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                                    >
                                        {savingProfile ? (
                                            <><Loader size={18} className="animate-spin" /> Enregistrement...</>
                                        ) : (
                                            <><Save size={18} /> Enregistrer les modifications</>
                                        )}
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6 text-gray-900">
                                    Sécurité et mot de passe
                                </h2>

                                <form onSubmit={handlePasswordChange} className="space-y-6 max-w-2xl">
                                    {[
                                        { label: 'Mot de passe actuel', value: currentPassword, setter: setCurrentPassword, show: showCurrentPassword, toggleShow: () => setShowCurrentPassword(p => !p) },
                                        { label: 'Nouveau mot de passe', value: newPassword, setter: setNewPassword, show: showNewPassword, toggleShow: () => setShowNewPassword(p => !p) },
                                        { label: 'Confirmer le nouveau mot de passe', value: confirmPassword, setter: setConfirmPassword, show: showConfirmPassword, toggleShow: () => setShowConfirmPassword(p => !p) },
                                    ].map(({ label, value, setter, show, toggleShow }) => (
                                        <div key={label}>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                    <Lock size={20} className="text-gray-400" />
                                                </div>
                                                <input
                                                    type={show ? "text" : "password"}
                                                    value={value}
                                                    onChange={(e) => setter(e.target.value)}
                                                    placeholder="••••••••"
                                                    className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                                />
                                                <button type="button" onClick={toggleShow} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600">
                                                    {show ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            disabled={savingPassword}
                                            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-60 disabled:cursor-not-allowed"
                                        >
                                            {savingPassword ? (
                                                <><Loader size={18} className="animate-spin" /> Changement...</>
                                            ) : (
                                                <><Save size={18} /> Changer le mot de passe</>
                                            )}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6 text-gray-900">Préférences de notifications</h2>
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                                    <p className="text-blue-900">Fonctionnalité à venir : Gérez vos préférences de notifications (email, push, etc.)</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'privacy' && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6 text-gray-900">Confidentialité et données</h2>
                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                                    <p className="text-purple-900">Fonctionnalité à venir : Contrôlez qui peut voir vos vidéos, vos commentaires et vos activités</p>
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