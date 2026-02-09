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

    const initialzeAuth = () => {
        try {
            const authenticated = apiService.isAuthenticated();
            const currentUser = apiService.getCurrentUser();

            if (authenticated && currentUser) {
                setUser(currentUser);
                setIsAuthenticated(true);
            }
        } catch (err) {
            console.error('Erreur initialisation auth:', err);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        try {
            const response = await apiService.login(email, password);
            setUser(response.user);
            setIsAuthenticated(true);
            return { success: true, user: response.user };
        } catch (error) {
            return { success: false, message: error.message };
        }
    };

    const register = async (username, email, password) => {
        try {
            const response = await apiService.register(username, email, password);
            setUser(response.user);
            setIsAuthenticated(true);
            return { success: true, user: response.user };
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