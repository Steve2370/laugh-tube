import React from 'react';
import Navbar from '../common/Navbar';
import PageRouter from './PageRouter';
import NotificationContainer from '../common/NotificationContainer';
import AppStoreBanner from '../../components/AppstoreBanner';

const APP_STORE_URL = 'https://apps.apple.com/app/laughtube/id6771074500';

const AppLayout = () => {
    return (
        <div className="min-h-screen">
            <AppStoreBanner appStoreUrl={APP_STORE_URL} />
            <Navbar />
            <main className="min-h-screen">
                <PageRouter />
            </main>
            <NotificationContainer />
        </div>
    );
};

export default AppLayout;