import React from 'react';
import Navbar from '../common/Navbar';
import PageRouter from './PageRouter';
import NotificationContainer from '../common/NotificationContainer';

const AppLayout = () => {
    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="min-h-screen">
                <PageRouter />
            </main>
            <NotificationContainer />
        </div>
    );
};

export default AppLayout;