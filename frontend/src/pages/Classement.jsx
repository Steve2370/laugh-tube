import React, { useState, useEffect, useCallback } from 'react';
import { Trophy, Eye, Heart, RefreshCw, Crown, Medal, Award, Star, TrendingUp } from 'lucide-react';
import apiService from '../services/apiService.js';
import { useAuth } from '../hooks/useAuth';

const getMedal = (rang) => {
    if (rang === 1) return { icon: Crown, color: 'text-yellow-500', bg: 'bg-yellow-50', border: 'border-yellow-300', label: '🥇' };
    if (rang === 2) return { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-50', border: 'border-gray-300', label: '🥈' };
    if (rang === 3) return { icon: Award, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-300', label: '🥉' };
    if (rang <= 5) return { icon: Star, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', label: `#${rang}` };
    return null;
};

const formatNumber = (num) => {
    if (!num) return '0';
    if (num < 1000) return num.toString();
    if (num < 1000000) return `${(num / 1000).toFixed(1)}k`;
    return `${(num / 1000000).toFixed(1)}M`;
};

const getAvatarUrl = (avatarUrl) => {
    if (!avatarUrl || avatarUrl.includes('default')) return null;
    if (avatarUrl.startsWith('http')) return avatarUrl;
    if (avatarUrl.startsWith('/')) return avatarUrl;
    return `/uploads/profiles/${avatarUrl}`;
};

const TopCard = ({ user, rang }) => {
    const medal = getMedal(rang);
    const avatarUrl = getAvatarUrl(user.avatar_url);

    const cardStyles = {
        1: 'bg-gradient-to-b from-yellow-50 to-white border-2 border-yellow-300 shadow-xl shadow-yellow-100 scale-105',
        2: 'bg-gradient-to-b from-gray-50 to-white border-2 border-gray-300 shadow-lg',
        3: 'bg-gradient-to-b from-amber-50 to-white border-2 border-amber-300 shadow-lg',
    };

    const sizes = {
        1: 'w-20 h-20',
        2: 'w-16 h-16',
        3: 'w-16 h-16',
    };

    return (
        <div className={`flex flex-col items-center p-5 rounded-2xl transition-all ${cardStyles[rang] || 'bg-white border border-gray-200'}`}>
            <span className="text-3xl mb-2">{medal.label}</span>
            <div className={`${sizes[rang] || 'w-14 h-14'} rounded-full overflow-hidden border-4 ${rang === 1 ? 'border-yellow-400' : rang === 2 ? 'border-gray-300' : 'border-amber-400'} shadow-md mb-3`}>
                {avatarUrl ? (
                    <img src={avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                    <div className={`w-full h-full flex items-center justify-center font-bold text-white text-xl ${rang === 1 ? 'bg-yellow-500' : rang === 2 ? 'bg-gray-400' : 'bg-amber-500'}`}>
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>
            <p className={`font-bold text-gray-900 truncate max-w-[120px] ${rang === 1 ? 'text-lg' : 'text-base'}`}>{user.username}</p>
            <p className={`text-2xl font-black mt-1 ${rang === 1 ? 'text-yellow-600' : rang === 2 ? 'text-gray-500' : 'text-amber-600'}`}>
                {formatNumber(user.score)}
            </p>
            <p className="text-xs text-gray-400 mb-2">pts</p>
            <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Eye size={12} />{formatNumber(user.vues)}</span>
                <span className="flex items-center gap-1"><Heart size={12} />{formatNumber(user.likes)}</span>
            </div>
        </div>
    );
};

const RankRow = ({ user, isCurrentUser }) => {
    const medal = getMedal(user.rang);
    const avatarUrl = getAvatarUrl(user.avatar_url);

    const navigateToChaine = () => {
        localStorage.setItem('channelUser', JSON.stringify({ id: user.id, username: user.username }));
        window.location.hash = '#/chaine';
    };

    return (
        <div
            onClick={navigateToChaine}
            className={`flex items-center gap-4 px-6 py-4 hover:bg-gray-50 cursor-pointer transition-colors relative ${
                isCurrentUser ? 'bg-blue-50 border-l-4 border-blue-500' : ''
            } ${user.rang <= 5 ? 'bg-gradient-to-r from-blue-50/30 to-transparent' : ''}`}
        >
            <div className="w-8 text-center">
                {medal ? (
                    <span className="text-lg">{medal.label}</span>
                ) : (
                    <span className="text-sm font-bold text-gray-400">#{user.rang}</span>
                )}
            </div>

            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-gray-200 flex-shrink-0">
                {avatarUrl ? (
                    <img src={avatarUrl} alt={user.username} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
                        {user.username.charAt(0).toUpperCase()}
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-0">
                <p className={`font-semibold truncate ${isCurrentUser ? 'text-blue-700' : 'text-gray-900'}`}>
                    {user.username}
                    {isCurrentUser && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">Vous</span>}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-400 mt-0.5">
                    <span className="flex items-center gap-1"><Eye size={11} />{formatNumber(user.vues)} vues</span>
                    <span className="flex items-center gap-1"><Heart size={11} />{formatNumber(user.likes)} likes</span>
                </div>
            </div>

            <div className="text-right flex-shrink-0">
                <p className={`font-black text-lg ${user.rang <= 5 ? 'text-blue-600' : 'text-gray-700'}`}>
                    {formatNumber(user.score)}
                </p>
                <p className="text-xs text-gray-400">pts</p>
            </div>
        </div>
    );
};

const Classement = () => {
    const { user: currentUser } = useAuth();
    const [classement, setClassement] = useState([]);
    const [loading, setLoading] = useState(true);
    const [periode, setPeriode] = useState('');
    const [misAJour, setMisAJour] = useState('');

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const response = await apiService.requestV2('/classement');
            setClassement(response.classement || []);
            setPeriode(response.periode || '');
            setMisAJour(response.mise_a_jour || '');
        } catch (err) {
            console.error('Erreur classement:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    const top3 = classement.slice(0, 3);
    const reste = classement.slice(3);
    const currentUserRank = currentUser ? classement.find(u => u.id === currentUser.id) : null;

    return (
        <div className="min-h-screen pt-20 bg-gradient-to-br from-gray-50 via-white to-blue-50">
            <div className="max-w-3xl mx-auto px-4 py-8">

                <div className="mb-8 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-500 rounded-xl shadow-lg">
                            <Trophy size={28} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Classement</h1>
                            <p className="text-sm text-gray-500 mt-0.5">
                                <span className="font-semibold text-blue-600">{periode}</span>
                                {misAJour && <span className="ml-2 text-gray-400">· Mis à jour le {new Date(misAJour).toLocaleDateString('fr-FR')}</span>}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={load}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
                        title="Rafraîchir"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>

                {currentUserRank && (
                    <div className="mb-6 bg-blue-600 rounded-2xl p-4 flex items-center gap-4 shadow-lg">
                        <div className="p-2 bg-blue-500 rounded-xl">
                            <TrendingUp size={20} className="text-white" />
                        </div>
                        <div className="flex-1">
                            <p className="text-blue-100 text-sm">Votre position ce mois</p>
                            <p className="text-white font-bold text-lg">#{currentUserRank.rang} — {formatNumber(currentUserRank.score)} pts</p>
                        </div>
                        <div className="text-right">
                            <p className="text-blue-100 text-xs">{formatNumber(currentUserRank.vues)} vues</p>
                            <p className="text-blue-100 text-xs">{formatNumber(currentUserRank.likes)} likes</p>
                        </div>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <LoadingPage size={280} />
                    </div>
                ) : classement.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-xl border border-gray-100">
                        <Trophy size={56} className="mx-auto text-gray-200 mb-4" />
                        <p className="text-gray-500 font-semibold text-lg">Aucun classement ce mois</p>
                        <p className="text-sm text-gray-400 mt-1">Les scores se calculent à partir des vues et likes</p>
                    </div>
                ) : (
                    <>
                        {top3.length > 0 && (
                            <div className="mb-8">
                                <div className={`grid gap-4 ${top3.length === 1 ? 'grid-cols-1 max-w-xs mx-auto' : top3.length === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
                                    {top3.length === 3 ? (
                                        <>
                                            <div className="mt-8"><TopCard user={top3[1]} rang={2} /></div>
                                            <TopCard user={top3[0]} rang={1} />
                                            <div className="mt-8"><TopCard user={top3[2]} rang={3} /></div>
                                        </>
                                    ) : (
                                        top3.map((user) => <TopCard key={user.id} user={user} rang={user.rang} />)
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                                <h2 className="font-bold text-gray-700 flex items-center gap-2">
                                    <TrendingUp size={18} className="text-blue-500" />
                                    Classement complet
                                </h2>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {classement.map((user) => (
                                    <RankRow
                                        key={user.id}
                                        user={user}
                                        isCurrentUser={currentUser?.id === user.id}
                                    />
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default Classement;