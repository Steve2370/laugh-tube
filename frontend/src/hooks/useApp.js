import { useAuth } from '../contexts/AuthContext';
import { useNotification } from '../contexts/NotificationContext';
import { useNavigation } from '../contexts/NavigationContext';

export const useApp = () => {
    const auth = useAuth();
    const notification = useNotification();
    const navigation = useNavigation();

    return {
        user: auth.user,
        isAuthenticated: auth.isAuthenticated,
        login: auth.login,
        logout: auth.logout,
        register: auth.register,

        notify: notification.addNotification,
        success: notification.success,
        error: notification.error,
        info: notification.info,
        warning: notification.warning,

        currentPage: navigation.currentPage,
        navigateTo: navigation.navigateTo,
        navigateToVideo: navigation.navigateToVideo,
        goBack: navigation.goBack,
        goHome: navigation.goHome,
    };
};
