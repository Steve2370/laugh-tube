import React, { Suspense, lazy } from 'react';
import { useNavigation } from '../NavigationContext.jsx';
import LoadingSpinner from '../common/LoadingSpinner';
import Chaine from "../../pages/Chaine.jsx";
import Admin from "../../pages/Admin.jsx";
import AdminRoute from "../../components/admin/AdminRoute.jsx";

const Home = lazy(() => import('../../pages/Home'));
const Search = lazy(() => import('../../pages/Search'));
const Login = lazy(() => import('../../pages/Login'));
const Register = lazy(() => import('../../pages/Register'));
const Upload = lazy(() => import('../../pages/Upload'));
const Settings = lazy(() => import('../../pages/Settings'));
const Video = lazy(() => import('../../pages/Video'));
const Profile = lazy(() => import('../../pages/Profile'));
const CGU = lazy(() => import('../../pages/CGU'));
const Contact = lazy(() => import('../../pages/Contact'));
const ForgotPassword = lazy(() => import('../../pages/ForgotPassword'));
const ResetPassword  = lazy(() => import('../../pages/ResetPassword'));

const PageRouter = () => {
    const { currentPage } = useNavigation();

    const renderPage = () => {
        switch (currentPage) {
            case 'home':
                return <Home/>;
            case 'login':
                return <Login/>;
            case 'register':
                return <Register/>;
            case 'cgu':
                return <CGU />;
            case 'upload':
                return <Upload/>;
            case 'settings':
                return <Settings/>;
            case 'video':
                return <Video/>;
            case 'profile':
                return <Profile/>;
            case 'chaine':
                return <Chaine/>;
            case 'search':
                return <Search/>;
            case 'contact':
                return <Contact />;
            case 'forgot-password':
                return <ForgotPassword />;
            case 'reset-password':
                return <ResetPassword />;
            case 'admin':
                return (
                    <AdminRoute>
                        <Admin/>
                    </AdminRoute>
                );
            default:
                return <Home/>;
        }
    };

    return (
        <Suspense fallback={<LoadingSpinner />}>
            {renderPage()}
        </Suspense>
    );
};

export default PageRouter;