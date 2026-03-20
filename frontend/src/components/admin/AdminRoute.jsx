import React from 'react';
import { useAuth } from '../../hooks/useAuth.js';

export default function AdminRoute({ children }) {
    const { user, isAuthenticated } = useAuth();

    if (!isAuthenticated || !user) {
        window.location.hash = '#/login';
        return null;
    }

    const isAdmin = user.role === 'admin' || user.is_admin === true;

    if (!isAdmin) {
        window.location.hash = '#/home';
        return null;
    }

    return children;
}