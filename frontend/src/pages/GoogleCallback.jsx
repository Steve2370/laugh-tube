import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import LoadingPage from "../components/LoadingPage.jsx";
import apiService from '../services/apiService.js';
import { ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';

const GoogleCallback = () => {
    const { loginWithToken } = useAuth();
    const [show2FA, setShow2FA] = useState(false);
    const [code, setCode] = useState('');
    const [tempToken, setTempToken] = useState('');
    const [userId, setUserId] = useState('');
    const [error, setError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    useEffect(() => {
        const hash = window.location.hash;
        const queryString = hash.split('?')[1] || '';
        const params = new URLSearchParams(queryString);
        const token = params.get('token');
        const requires2fa = params.get('requires_2fa');
        const temp = params.get('temp_token');
        const uid = params.get('user_id');

        if (requires2fa === 'true' && temp && uid) {
            setTempToken(temp);
            setUserId(uid);
            setShow2FA(true);
        } else if (token) {
            loginWithToken(token).then(() => {
                window.location.hash = '#/home';
            });
        } else {
            window.location.hash = '#/login';
        }
    }, []);

    const verify2FA = async () => {
        if (code.length !== 6) return;
        setIsVerifying(true);
        setError('');
        try {
            const response = await apiService.requestV2('/auth/2fa/verify-login', {
                method: 'POST',
                body: JSON.stringify({ code, temp_token: tempToken, user_id: parseInt(userId) }),
            });
            if (response?.token) {
                await loginWithToken(response.token);
                window.location.hash = '#/home';
            }
        } catch (e) {
            setError('Code invalide. Réessaie.');
        }
        setIsVerifying(false);
    };

    if (show2FA) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900">
                <div className="bg-gray-800 p-8 rounded-2xl shadow-xl w-full max-w-sm text-center">
                    <ShieldCheck size={48} className="text-orange-500 mx-auto mb-4" />
                    <h2 className="text-white text-xl font-bold mb-2">Vérification 2FA</h2>
                    <p className="text-gray-400 text-sm mb-6">Entre le code de ton Authenticator</p>
                    <input
                        type="text"
                        maxLength={6}
                        value={code}
                        onChange={e => setCode(e.target.value.replace(/\D/g, ''))}
                        placeholder="000000"
                        className="w-full text-center text-2xl font-mono tracking-widest bg-gray-700 text-white rounded-xl px-4 py-3 mb-4 outline-none border border-gray-600 focus:border-orange-500"
                    />
                    {error && (
                        <div className="flex items-center gap-2 text-red-400 text-sm mb-4 justify-center">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}
                    <button
                        onClick={verify2FA}
                        disabled={code.length !== 6 || isVerifying}
                        className="w-full bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-bold py-3 rounded-xl transition-colors"
                    >
                        {isVerifying ? <><Loader2 size={16} className="animate-spin inline mr-2" />Vérification...</> : 'Confirmer'}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center">
            <LoadingPage size={280} />
        </div>
    );
};

export default GoogleCallback;