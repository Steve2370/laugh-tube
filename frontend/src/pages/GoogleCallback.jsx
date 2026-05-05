import { useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import LoadingPage from "../components/LoadingPage.jsx";

const GoogleCallback = () => {
    const { loginWithToken } = useAuth();

    useEffect(() => {
        const hash = window.location.hash;
        const queryString = hash.split('?')[1] || '';
        const params = new URLSearchParams(queryString);
        const token = params.get('token');

        if (token) {
            loginWithToken(token).then(() => {
                window.location.hash = '#/home';
            });
        } else {
            window.location.hash = '#/login';
        }
    }, []);

    return (
        <div className="min-h-screen flex items-center justify-center">
            <LoadingPage size={180} />
        </div>
    );
};

export default GoogleCallback;