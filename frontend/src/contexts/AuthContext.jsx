import React, { createContext, useContext, useState, useEffect } from 'react';
import apiService from "../services/apiService.js";

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        initialzeAuth();
    }, []);

    const initialzeAuth = async () => {
        try {
            const authenticated = apiService.isAuthenticated();

            if (authenticated) {
                const currentUser = await apiService.getMe();
                setUser(currentUser);
                setIsAuthenticated(true);
            }
        } catch (err) {
            console.error('Erreur initialisation auth:', err);
            setIsAuthenticated(false);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await apiService.login(email, password);

            // ✅ Récupérer l'utilisateur après login
            const currentUser = await apiService.getMe();
            setUser(currentUser);
            setIsAuthenticated(true);

            return { success: true, user: currentUser };
        } catch (error) {
            return { success: false, message: error.message };
        }
    };

    const register = async (username, email, password) => {
        try {
            const response = await apiService.register(username, email, password);

            // ✅ Récupérer l'utilisateur après register
            const currentUser = await apiService.getMe();
            setUser(currentUser);
            setIsAuthenticated(true);

            return { success: true, user: currentUser };
        } catch (error) {
            return { success: false, message: error.message };
        }
    };

    const logout = async () => {
        try {
            await apiService.logout();
        } catch (error) {
            console.error('Erreur logout:', error);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    const updateUser = (userData) => {
        setUser(prev => ({ ...prev, ...userData }));
    };

    const value = {
        user,
        isAuthenticated,
        loading,
        login,
        register,
        logout,
        updateUser
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}