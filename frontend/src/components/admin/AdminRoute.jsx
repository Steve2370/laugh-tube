import { useNavigation } from '../../contexts/NavigationContext.jsx';
import apiService from '../../services/apiService.js';

export default function AdminRoute({ children }) {
    const { navigateTo } = useNavigation();
    const user = apiService.getCurrentUser();

    if (!user) {
        navigateTo('login');
        return null;
    }

    const isAdmin = user.role === 'admin' || user.is_admin === true;

    if (!isAdmin) {
        navigateTo('home');
        return null;
    }

    return children;
}