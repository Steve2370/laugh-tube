export default function AdminRoute({ children }) {
    const user = apiService.getCurrentUser();
    console.log('AdminRoute user:', user);

    if (!user) {
        console.log('AdminRoute: pas de user, redirect login');
        window.location.hash = '#/login';
        return null;
    }

    const isAdmin = user.role === 'admin' || user.is_admin === true;
    console.log('AdminRoute isAdmin:', isAdmin);

    if (!isAdmin) {
        console.log('AdminRoute: pas admin, redirect home');
        window.location.hash = '#/home';
        return null;
    }

    return children;
}