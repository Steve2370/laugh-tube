import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { VideoProvider } from './contexts/VideoContext';
import AppLayout from './contexts/layout/AppLayout';
import {ToastProvider} from "./contexts/ToastContext.jsx";

function App() {
    return (
        <ToastProvider>
            <NotificationProvider>
                <AuthProvider>
                    <NavigationProvider>
                        <VideoProvider>
                            <AppLayout/>
                        </VideoProvider>
                    </NavigationProvider>
                </AuthProvider>
            </NotificationProvider>
        </ToastProvider>
    );
}

export default App;
