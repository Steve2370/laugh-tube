import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import apiService from '../services/apiService.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let mounted = true;

        const init = async () => {
            try {
                setLoading(true);

                const authenticated = apiService.isAuthenticated();
                if (!authenticated) {
                    if (!mounted) return;
                    setUser(null);
                    setIsAuthenticated(false);
                    return;
                }

                const currentUser = await apiService.getCurrentUser();

                if (!mounted) return;

                if (currentUser) {
                    setUser(currentUser);
                    setIsAuthenticated(true);
                } else {
                    setUser(null);
                    setIsAuthenticated(false);
                }
            } catch (err) {
                console.error("Auth init error:", err);
                if (!mounted) return;
                setUser(null);
                setIsAuthenticated(false);
            } finally {
                if (mounted) setLoading(false);
            }
        };

        init();

        return () => {
            mounted = false;
        };
    }, []);

    const login = async (email, password) => {
        try {
            await apiService.login(email, password);

            const me = await apiService.getMe();

            setUser(me);
            setIsAuthenticated(true);

            return { success: true, user: me };
        } catch (error) {
            console.error("Login error:", error);
            setUser(null);
            setIsAuthenticated(false);
            return { success: false, message: error?.message ?? "Erreur login" };
        }
    };

    const register = async (username, email, password) => {
        try {
            await apiService.register(username, email, password);

            const me = await apiService.getMe();

            setUser(me);
            setIsAuthenticated(true);

            return { success: true, user: me };
        } catch (error) {
            console.error("Register error:", error);
            setUser(null);
            setIsAuthenticated(false);
            return { success: false, message: error?.message ?? "Erreur inscription" };
        }
    };

    const logout = async () => {
        try {
            await apiService.logout();
        } catch (e) {
            console.warn("Logout warning:", e);
        } finally {
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    const updateUser = (patch) => {
        setUser((prev) => {
            if (!prev) return prev;
            return { ...prev, ...patch };
        });
    };

    const refreshUser = async () => {
        try {
            const me = await apiService.getMe();
            setUser(me);
            setIsAuthenticated(true);
            return me;
        } catch (e) {
            console.error("refreshUser error:", e);
            setUser(null);
            setIsAuthenticated(false);
            return null;
        }
    };

    const value = useMemo(
        () => ({
            user,
            isAuthenticated,
            loading,
            login,
            register,
            logout,
            updateUser,
            refreshUser,
        }),
        [user, isAuthenticated, loading]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
    return ctx;
}