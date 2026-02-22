import React from 'react';
import { AuthProvider } from './contexts/AuthContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { NavigationProvider } from './contexts/NavigationContext';
import { VideoProvider } from './contexts/VideoContext';
import Admin      from './pages/Admin.jsx';
import AdminRoute from './components/admin/AdminRoute.jsx';
import AppLayout from './contexts/layout/AppLayout';
import { ToastProvider } from "./contexts/ToastContext.jsx";

// NOTE: La route /admin est gérée dans AppLayout ou NavigationContext.
// Si tu utilises un système de routing basé sur window.location.hash,
// ajoute le cas 'admin' dans ton switch/router interne.
//
// Si tu utilises React Router <Routes>, ajoute dans ton fichier de routing:
//
//   <Route
//     path="/admin"
//     element={
//       <AdminRoute>
//         <Admin />
//       </AdminRoute>
//     }
//   />

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