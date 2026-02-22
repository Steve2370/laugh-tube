import apiService from '../../services/apiService.js';

export default function AdminRoute({ children }) {
    const user = apiService.getCurrentUser();

    if (!user) {
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