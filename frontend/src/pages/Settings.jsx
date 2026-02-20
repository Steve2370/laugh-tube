import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext.jsx';
import apiService from '../services/apiService.js';
import {
    Settings as SettingsIcon,
    User, Lock, Bell, Shield, Camera, Mail,
    Eye, EyeOff, Save, Loader, Smartphone, QrCode,
    CheckCircle, XCircle, Trash2, AlertTriangle, Users, ExternalLink,
} from 'lucide-react';

const Settings = () => {
    const { user, updateUser, logout } = useAuth();
    const toast = useToast();
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
    const [twoFAEnabled, setTwoFAEnabled] = useState(false);
    const [twoFALoading, setTwoFALoading] = useState(false);
    const [twoFASetupData, setTwoFASetupData] = useState(null);
    const [twoFACode, setTwoFACode] = useState('');
    const [twoFAPassword, setTwoFAPassword] = useState('');
    const [twoFAStep, setTwoFAStep] = useState('idle');
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletePassword, setDeletePassword] = useState('');
    const [deleteReason, setDeleteReason] = useState('');
    const [deletingAccount, setDeletingAccount] = useState(false);
    const [subscribers, setSubscribers] = useState([]);
    const [subscribersLoading, setSubscribersLoading] = useState(false);

    useEffect(() => {
        if (user) {
            setUsername(user.username || '');
            setEmail(user.email || '');
            setTwoFAEnabled(user.two_fa_enabled || false);
        }
    }, [user?.id]);

    useEffect(() => {
        if (activeTab === 'privacy' && user?.id) loadSubscribers();
    }, [activeTab, user?.id]);

    const loadSubscribers = useCallback(async () => {
        setSubscribersLoading(true);
        try {
            const res = await apiService.request(`/users/${user.id}/subscribers`);
            setSubscribers(res.subscribers || res.data || []);
        } catch { setSubscribers([]); }
        finally { setSubscribersLoading(false); }
    }, [user?.id]);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        if (!user?.id) { toast.error('Non connecté'); return; }
        setSavingProfile(true);
        try {
            await apiService.updateProfile({ username, email });
            updateUser({ username, email });
            toast.success('Profil mis à jour !');
        } catch (err) { toast.error(err.message || 'Erreur'); }
        finally { setSavingProfile(false); }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }
        if (newPassword.length < 8) { toast.error('Minimum 8 caractères'); return; }
        setSavingPassword(true);
        try {
            await apiService.changePassword(currentPassword, newPassword);
            toast.success('Mot de passe changé avec succès !');
            setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        } catch (err) { toast.error(err.message || 'Erreur lors du changement'); }
        finally { setSavingPassword(false); }
    };

    const handleEnable2FA = async () => {
        setTwoFALoading(true);
        try {
            const res = await apiService.request('/auth/2fa/enable', { method: 'POST' });
            setTwoFASetupData(res);
            setTwoFAStep('setup');
        } catch (err) { toast.error(err.message || 'Erreur'); }
        finally { setTwoFALoading(false); }
    };

    const handleVerify2FASetup = async () => {
        if (!twoFACode.trim()) { toast.error('Entrez le code'); return; }
        setTwoFALoading(true);
        try {
            await apiService.request('/auth/2fa/verify', { method: 'POST', body: JSON.stringify({ code: twoFACode }) });
            setTwoFAEnabled(true); setTwoFAStep('idle'); setTwoFASetupData(null); setTwoFACode('');
            updateUser({ two_fa_enabled: true });
            toast.success('2FA activée !');
        } catch (err) { toast.error(err.message || 'Code invalide'); }
        finally { setTwoFALoading(false); }
    };

    const handleDisable2FA = async () => {
        if (!twoFAPassword.trim()) { toast.error('Entrez votre mot de passe'); return; }
        setTwoFALoading(true);
        try {
            await apiService.request('/auth/2fa/disable', { method: 'POST', body: JSON.stringify({ password: twoFAPassword }) });
            setTwoFAEnabled(false); setTwoFAStep('idle'); setTwoFAPassword('');
            updateUser({ two_fa_enabled: false });
            toast.success('2FA désactivée');
        } catch (err) { toast.error(err.message || 'Mot de passe incorrect'); }
        finally { setTwoFALoading(false); }
    };

    const handleDeleteAccount = async () => {
        if (!deletePassword.trim()) { toast.error('Mot de passe requis'); return; }
        setDeletingAccount(true);
        try {
            await apiService.request('/auth/delete-account', { method: 'POST', body: JSON.stringify({ password: deletePassword, reason: deleteReason }) });
            toast.success('Compte supprimé');
            await logout();
        } catch (err) { toast.error(err.message || 'Erreur'); }
        finally { setDeletingAccount(false); }
    };

    const tabs = [
        { id: 'profile', label: 'Profil', icon: User },
        { id: 'security', label: 'Sécurité', icon: Lock },
        { id: 'twofa', label: '2FA', icon: Smartphone },
        { id: 'notifications', label: 'Notifications', icon: Bell },
        { id: 'privacy', label: 'Confidentialité', icon: Shield },
    ];

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-50 via-white to-blue-50">
            <div className="container mx-auto px-4 py-8 max-w-5xl">
                <div className="mb-8 flex items-center gap-4">
                    <div className="p-3 bg-gradient-to-br from-gray-600 to-gray-700 rounded-xl shadow-lg">
                        <SettingsIcon size={32} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-bold text-gray-900">Paramètres</h1>
                        <p className="text-gray-600 mt-1">Gérez vos préférences et votre compte</p>
                    </div>
                </div>

                <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
                    <div className="flex border-b bg-gray-50 overflow-x-auto">
                        {tabs.map(({ id, label, icon: Icon }) => (
                            <button key={id} onClick={() => setActiveTab(id)}
                                    className={`flex items-center gap-2 px-6 py-4 font-semibold transition-all whitespace-nowrap ${activeTab === id ? 'border-b-2 border-blue-600 text-blue-600 bg-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'}`}>
                                <Icon size={20} />{label}
                            </button>
                        ))}
                    </div>

                    <div className="p-8">

                        {activeTab === 'profile' && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6 text-gray-900">Informations du profil</h2>
                                <form onSubmit={handleProfileUpdate} className="space-y-6 max-w-2xl">
                                    <div className="flex items-center gap-6 p-6 bg-gray-50 rounded-xl">
                                        <div className="relative">
                                            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                                                {username.charAt(0).toUpperCase() || '?'}
                                            </div>
                                            <button type="button" onClick={() => window.location.hash = '#/profile'}
                                                    className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border-2 border-gray-200 hover:bg-gray-50">
                                                <Camera size={18} className="text-gray-600" />
                                            </button>
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-gray-900 mb-1">Photo de profil</h3>
                                            <p className="text-sm text-gray-500">Modifiez votre photo depuis la page Profil</p>
                                        </div>
                                    </div>
                                    {[
                                        { label: "Nom d\'utilisateur", value: username, setter: setUsername, type: 'text', icon: User, placeholder: "Votre nom d\'utilisateur" },
                                        { label: 'Adresse email', value: email, setter: setEmail, type: 'email', icon: Mail, placeholder: 'votre@email.com' },
                                    ].map(({ label, value, setter, type, icon: Icon, placeholder }) => (
                                        <div key={label}>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Icon size={20} className="text-gray-400" /></div>
                                                <input type={type} value={value} onChange={e => setter(e.target.value)} placeholder={placeholder}
                                                       className="w-full pl-12 pr-4 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                                            </div>
                                        </div>
                                    ))}
                                    <button type="submit" disabled={savingProfile}
                                            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
                                        {savingProfile ? <><Loader size={18} className="animate-spin" /> Enregistrement...</> : <><Save size={18} /> Enregistrer</>}
                                    </button>
                                </form>

                                <div className="mt-12 pt-8 border-t border-red-100">
                                    <h3 className="text-lg font-bold text-red-700 mb-2 flex items-center gap-2"><AlertTriangle size={20} /> Zone dangereuse</h3>
                                    <p className="text-gray-500 text-sm mb-4">La suppression est irréversible. Toutes vos données seront perdues.</p>
                                    <button onClick={() => setShowDeleteModal(true)}
                                            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg">
                                        <Trash2 size={18} /> Supprimer mon compte
                                    </button>
                                </div>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6 text-gray-900">Sécurité et mot de passe</h2>
                                <form onSubmit={handlePasswordChange} className="space-y-6 max-w-2xl">
                                    {[
                                        { label: 'Mot de passe actuel', value: currentPassword, setter: setCurrentPassword, show: showCurrentPassword, toggleShow: () => setShowCurrentPassword(p => !p) },
                                        { label: 'Nouveau mot de passe', value: newPassword, setter: setNewPassword, show: showNewPassword, toggleShow: () => setShowNewPassword(p => !p) },
                                        { label: 'Confirmer le nouveau mot de passe', value: confirmPassword, setter: setConfirmPassword, show: showConfirmPassword, toggleShow: () => setShowConfirmPassword(p => !p) },
                                    ].map(({ label, value, setter, show, toggleShow }) => (
                                        <div key={label}>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">{label}</label>
                                            <div className="relative">
                                                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Lock size={20} className="text-gray-400" /></div>
                                                <input type={show ? 'text' : 'password'} value={value} onChange={e => setter(e.target.value)} placeholder="••••••••"
                                                       className="w-full pl-12 pr-12 py-3.5 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all" />
                                                <button type="button" onClick={toggleShow} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600">
                                                    {show ? <EyeOff size={20} /> : <Eye size={20} />}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                    <button type="submit" disabled={savingPassword}
                                            className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white px-8 py-3.5 rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
                                        {savingPassword ? <><Loader size={18} className="animate-spin" /> Changement...</> : <><Save size={18} /> Changer le mot de passe</>}
                                    </button>
                                </form>
                            </div>
                        )}

                        {activeTab === 'twofa' && (
                            <div className="max-w-2xl">
                                <h2 className="text-2xl font-bold mb-2 text-gray-900">Authentification à deux facteurs</h2>
                                <p className="text-gray-500 mb-8">Ajoutez une couche de sécurité supplémentaire à votre compte.</p>
                                <div className={`flex items-center gap-3 p-4 rounded-xl mb-8 ${twoFAEnabled ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                                    {twoFAEnabled ? <><CheckCircle size={24} className="text-green-600" /><span className="font-semibold text-green-800">2FA activée</span></> : <><XCircle size={24} className="text-gray-400" /><span className="font-semibold text-gray-600">2FA désactivée</span></>}
                                </div>

                                {twoFAStep === 'idle' && !twoFAEnabled && (
                                    <button onClick={handleEnable2FA} disabled={twoFALoading}
                                            className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg disabled:opacity-60">
                                        {twoFALoading ? <Loader size={18} className="animate-spin" /> : <Smartphone size={18} />} Activer la 2FA
                                    </button>
                                )}

                                {twoFAStep === 'setup' && twoFASetupData && (
                                    <div className="space-y-6">
                                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                                            <h3 className="font-bold text-blue-900 mb-3 flex items-center gap-2"><QrCode size={20} /> Scannez le QR code</h3>
                                            <p className="text-sm text-blue-700 mb-4">Ouvrez Google Authenticator ou Authy et scannez ce code.</p>
                                            {twoFASetupData.qr_code && <div className="bg-white p-4 rounded-lg inline-block" dangerouslySetInnerHTML={{ __html: twoFASetupData.qr_code }} />}
                                            {twoFASetupData.secret && (
                                                <div className="mt-4">
                                                    <p className="text-xs text-blue-600 mb-1">Code manuel :</p>
                                                    <code className="bg-blue-100 px-3 py-1 rounded text-sm font-mono text-blue-900 select-all">{twoFASetupData.secret}</code>
                                                </div>
                                            )}
                                        </div>
                                        {twoFASetupData.backup_codes?.length > 0 && (
                                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                                <h4 className="font-bold text-yellow-900 mb-2">Codes de secours — conservez-les !</h4>
                                                <div className="grid grid-cols-2 gap-2">
                                                    {twoFASetupData.backup_codes.map((code, i) => (
                                                        <code key={i} className="bg-white border border-yellow-200 px-2 py-1 rounded text-xs font-mono text-center">{code}</code>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Code de vérification</label>
                                            <input type="text" value={twoFACode} onChange={e => setTwoFACode(e.target.value)} placeholder="123456" maxLength={6}
                                                   className="w-48 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-xl font-mono tracking-widest" />
                                        </div>
                                        <div className="flex gap-3">
                                            <button onClick={handleVerify2FASetup} disabled={twoFALoading}
                                                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg disabled:opacity-60">
                                                {twoFALoading ? <Loader size={18} className="animate-spin" /> : <CheckCircle size={18} />} Vérifier et activer
                                            </button>
                                            <button onClick={() => { setTwoFAStep('idle'); setTwoFASetupData(null); }}
                                                    className="px-6 py-3 rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold">Annuler</button>
                                        </div>
                                    </div>
                                )}

                                {twoFAStep === 'idle' && twoFAEnabled && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">Mot de passe pour désactiver</label>
                                            <input type="password" value={twoFAPassword} onChange={e => setTwoFAPassword(e.target.value)} placeholder="Votre mot de passe"
                                                   className="w-full max-w-sm px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500" />
                                        </div>
                                        <button onClick={handleDisable2FA} disabled={twoFALoading}
                                                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-xl font-semibold transition-all shadow-lg disabled:opacity-60">
                                            {twoFALoading ? <Loader size={18} className="animate-spin" /> : <XCircle size={18} />} Désactiver la 2FA
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6 text-gray-900">Préférences de notifications</h2>
                                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                                    <p className="text-blue-900">Fonctionnalité à venir.</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'privacy' && (
                            <div>
                                <h2 className="text-2xl font-bold mb-6 text-gray-900">Confidentialité et abonnés</h2>
                                <div className="mb-6 flex items-center gap-3">
                                    <Users size={20} className="text-gray-500" />
                                    <h3 className="text-lg font-semibold text-gray-800">
                                        Vos abonnés
                                        {subscribers.length > 0 && <span className="ml-2 text-sm bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{subscribers.length}</span>}
                                    </h3>
                                </div>
                                {subscribersLoading ? (
                                    <div className="flex items-center justify-center py-12"><Loader size={32} className="animate-spin text-gray-400" /></div>
                                ) : subscribers.length === 0 ? (
                                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-100">
                                        <Users size={48} className="mx-auto text-gray-300 mb-3" />
                                        <p className="text-gray-500 font-medium">Aucun abonné pour l\'instant</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
                                        {subscribers.map((sub) => (
                                            <div key={sub.id || sub.user_id} className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold flex-shrink-0">
                                                    {(sub.username || '?').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-semibold text-gray-900 truncate">{sub.username}</p>
                                                    {sub.subscribed_at && <p className="text-xs text-gray-400">Abonné depuis le {new Date(sub.subscribed_at).toLocaleDateString('fr-FR')}</p>}
                                                </div>
                                                <button onClick={() => window.location.hash = `#/chaine/${sub.id || sub.user_id}`}
                                                        className="text-gray-400 hover:text-blue-600 transition-colors p-1"><ExternalLink size={16} /></button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                    </div>
                </div>
            </div>

            {showDeleteModal && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-red-100 rounded-xl"><AlertTriangle size={28} className="text-red-600" /></div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-900">Supprimer le compte</h3>
                                <p className="text-sm text-gray-500">Action irréversible</p>
                            </div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
                            <p className="text-sm text-red-800">Toutes vos vidéos, commentaires et données seront définitivement supprimés.</p>
                        </div>
                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Mot de passe de confirmation</label>
                                <input type="password" value={deletePassword} onChange={e => setDeletePassword(e.target.value)} placeholder="Votre mot de passe actuel"
                                       className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500" />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Raison (optionnel)</label>
                                <textarea value={deleteReason} onChange={e => setDeleteReason(e.target.value)} placeholder="Pourquoi supprimez-vous votre compte ?" rows={3}
                                          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none" />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={handleDeleteAccount} disabled={deletingAccount}
                                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-semibold transition-all disabled:opacity-60">
                                {deletingAccount ? <Loader size={18} className="animate-spin" /> : <Trash2 size={18} />} Supprimer définitivement
                            </button>
                            <button onClick={() => { setShowDeleteModal(false); setDeletePassword(''); setDeleteReason(''); }}
                                    className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold">Annuler</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Settings;