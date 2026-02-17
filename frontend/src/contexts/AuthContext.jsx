import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import apiService from '../services/apiService.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const checkAuth = useCallback(async () => {
        try {
            const authenticated = apiService.isAuthenticated();
            if (authenticated) {
                const currentUser = await apiService.getMe();
                setUser(currentUser);
                setIsAuthenticated(true);
            } else {
                setUser(null);
                setIsAuthenticated(false);
            }
        } catch (err) {
            setUser(null);
            setIsAuthenticated(false);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        checkAuth();
    }, [checkAuth]);

    const updateUser = useCallback((patch) => {
        setUser((prev) => (prev ? { ...prev, ...patch } : prev));
    }, []);

    const login = useCallback(async (email, password) => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiService.login(email, password);
            if (response.requires_2fa) {
                return { success: true, requires_2fa: true, user_id: response.user_id };
            }
            await checkAuth();
            return { success: true, requires_2fa: false };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [checkAuth]);

    const verify2FA = useCallback(async (userId, code) => {
        try {
            setLoading(true);
            setError(null);
            await apiService.verify2FA(userId, code);
            await checkAuth();
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [checkAuth]);

    const register = useCallback(async (username, email, password) => {
        try {
            setLoading(true);
            setError(null);
            const response = await apiService.register({ username, email, password });
            if (response?.token) {
                apiService.setToken(response.token);
                if (response.user) apiService.setUser(response.user);
            } else if (!response?.requires_verification) {
                try {
                    const loginResp = await apiService.login(email, password);
                    if (loginResp?.token) {
                        apiService.setToken(loginResp.token);
                        if (loginResp.user) apiService.setUser(loginResp.user);
                    }
                } catch (_) {}
            }
            await new Promise(resolve => setTimeout(resolve, 100));
            await checkAuth();
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, [checkAuth]);

    const logout = useCallback(async () => {
        try {
            await apiService.logout();
            setUser(null);
            setIsAuthenticated(false);
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        }
    }, []);

    const changePassword = useCallback(async (currentPassword, newPassword) => {
        try {
            setLoading(true);
            setError(null);
            await apiService.changePassword(currentPassword, newPassword);
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const requestPasswordReset = useCallback(async (email) => {
        try {
            setLoading(true);
            setError(null);
            await apiService.requestPasswordReset(email);
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const resetPassword = useCallback(async (token, password, confirmPassword) => {
        try {
            setLoading(true);
            setError(null);
            await apiService.resetPassword(token, password, confirmPassword);
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const resendVerification = useCallback(async (email) => {
        try {
            setLoading(true);
            setError(null);
            await apiService.resendVerification(email);
            return { success: true };
        } catch (err) {
            setError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    }, []);

    const value = {
        user,
        isAuthenticated,
        loading,
        error,
        login,
        verify2FA,
        register,
        logout,
        changePassword,
        requestPasswordReset,
        resetPassword,
        resendVerification,
        reload: checkAuth,
        updateUser,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth doit être utilisé dans <AuthProvider>');
    return context;
};