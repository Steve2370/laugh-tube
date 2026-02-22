import React from 'react';
import apiService from '../../services/apiService.js';
import { useNavigation } from '../../contexts/NavigationContext.jsx';

export default function AdminRoute({ children }) {
    const { navigateTo } = useNavigation();
    const user = apiService.getCurrentUser();

    if (!user) {
        navigateTo('login');
        return null;
    }

    if (!user.is_admin && !user.isAdmin) {
        navigateTo('home');
        return null;
    }

    return children;
}