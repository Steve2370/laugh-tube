import React, { useState } from 'react';
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
    EyeOff
} from 'lucide-react';

const Settings = () => {
    const { user, updateUser } = useAuth();
    const { success, error } = useNotification();

    const [activeTab, setActiveTab] = useState('profile');
    const [username, setUsername] = useState(user?.username || '');
    const [email, setEmail] = useState(user?.email || '');

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showCurrentPassword, setShowCurrentPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const handleProfileUpdate = (e) => {
        e.preventDefault();
        updateUser({ username, email });
        success('Profil mis à jour avec succès !');
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();

        if (!currentPassword || !newPassword) {
            error("Mot de passe actuel et nouveau mot de passe requis");
            return;
        }

        if (newPassword !== confirmPassword) {
            error('Les mots de passe ne correspondent pas');
            return;
        }

        if (newPassword.length < 6) {
            error('Le mot de passe doit contenir au moins 6 caractères');
            return;
        }

        try {
            const res = await apiService.request('/auth/change-password', {
                method: 'POST',
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                }),
            });

            if (res?.success !== true) {
                error(res?.error || res?.message || "Impossible de changer le mot de passe");
                return;
            }

            success(res?.message || 'Mot de passe changé avec succès !');
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
        } catch (err) {
            error(err?.message || "Erreur lors du changement de mot de passe");
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
                                            ? 'border-b-3 border-blue-600 text-blue-600 bg-white'
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
                                                {username.charAt(0).toUpperCase()}
                                            </div>
                                            <button
                                                type="button"
                                                className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border-2 border-gray-200 hover:bg-gray-50 transition-colors"
                                            >
                                                <Camera size={18} className="text-gray-600" />
                                            </button>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-1">
                                                Photo de profil
                                            </h3>
                                            <p className="text-sm text-gray-600">
                                                Cliquez pour changer votre photo
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
                                                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
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
                                                className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                                    >
                                        Enregistrer les modifications
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
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Mot de passe actuel
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Lock size={20} className="text-gray-400" />
                                            </div>
                                            <input
                                                type={showCurrentPassword ? "text" : "password"}
                                                value={currentPassword}
                                                onChange={(e) => setCurrentPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                                            >
                                                {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Nouveau mot de passe
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Lock size={20} className="text-gray-400" />
                                            </div>
                                            <input
                                                type={showNewPassword ? "text" : "password"}
                                                value={newPassword}
                                                onChange={(e) => setNewPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowNewPassword(!showNewPassword)}
                                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                                            >
                                                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            Confirmer le nouveau mot de passe
                                        </label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                <Lock size={20} className="text-gray-400" />
                                            </div>
                                            <input
                                                type={showConfirmPassword ? "text" : "password"}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                placeholder="••••••••"
                                                className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600"
                                            >
                                                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                            </button>
                                        </div>
                                    </div>

                                    <div className="pt-4">
                                        <button
                                            type="submit"
                                            className="bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                                        >
                                            Changer le mot de passe
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6 text-gray-900">
                                    Préférences de notifications
                                </h2>
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                                    <p className="text-blue-900">
                                        Fonctionnalité à venir : Gérez vos préférences de notifications
                                        (email, push, etc.)
                                    </p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'privacy' && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6 text-gray-900">
                                    Confidentialité et données
                                </h2>
                                <div className="bg-purple-50 border border-purple-200 rounded-xl p-6">
                                    <p className="text-purple-900">
                                        Fonctionnalité à venir : Contrôlez qui peut voir vos vidéos,
                                        vos commentaires et vos activités
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