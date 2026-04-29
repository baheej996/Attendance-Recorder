import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { DataProvider } from './contexts/DataContext';
import Landing from './pages/Landing';
import PublicHome from './pages/PublicHome';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import MentorDashboard from './pages/MentorDashboard';
import StudentDashboard from './pages/StudentDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import StudentLoginPage from './pages/StudentLoginPage'; // Import StudentLoginPage

import ErrorBoundary from './components/ErrorBoundary';

import { UIProvider } from './contexts/UIContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { useData } from './contexts/DataContext';
import InstallPrompt from './components/pwa/InstallPrompt';
import NotificationPrompt from './components/pwa/NotificationPrompt';
import UpdateNotification from './components/system/UpdateNotification';

function App() {
  return (
    <ErrorBoundary>
      <DataProvider>
        <UIProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </UIProvider>
      </DataProvider>
    </ErrorBoundary>
  );
}

import { requestFirebaseNotificationPermission, onMessageListener } from './utils/fcm';
import { useUI } from './contexts/UIContext';

// Extract content to use hooks inside DataProvider
const AppContent = () => {
  const { institutionSettings, currentUser } = useData();
  const { showAlert } = useUI();

  // FCM Management
  React.useEffect(() => {
    if (currentUser?.id) {
      requestFirebaseNotificationPermission(currentUser.id);
    }
  }, [currentUser?.id]);

  // Handle Foreground Messages
  React.useEffect(() => {
    const unsub = onMessageListener().then((payload) => {
      console.log('Received foreground message:', payload);
      showAlert(payload.notification.title, payload.notification.body, 'info');
    });
    return () => {}; // No direct unsub for this specific listener which is promise-based
  }, []);

  React.useEffect(() => {
    if (institutionSettings?.favicon) {
      const link = document.querySelector("link[rel~='icon']");
      if (!link) {
        const newLink = document.createElement('link');
        newLink.rel = 'icon';
        document.head.appendChild(newLink);
        newLink.href = institutionSettings.favicon;
      } else {
        link.href = institutionSettings.favicon;
      }
    }
  }, [institutionSettings?.favicon]);

  return (
    <Router>
      <UpdateNotification />
      <InstallPrompt />
      <NotificationPrompt />
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
          {/* Dedicated Student Login - Moved to top for priority */}
          <Route path="/student-login" element={<StudentLoginPage />} />

          {/* Public Routes */}
          <Route path="/" element={<PublicHome />} />
          <Route path="/login" element={<Landing />} />

          {/* Legacy Login Route Redirect */}
          <Route path="/login-portal" element={<LoginPage />} />

          {/* Protected Routes - Admin */}
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRole="admin">
              <AdminDashboard />
            </ProtectedRoute>
          } />

          {/* Protected Routes - Mentor */}
          <Route path="/mentor/*" element={
            <ProtectedRoute allowedRole="mentor">
              <MentorDashboard />
            </ProtectedRoute>
          } />

          {/* Protected Routes - Student */}
          <Route path="/student/*" element={
            <ProtectedRoute allowedRole="student" redirectPath="/student-login">
              <StudentDashboard />
            </ProtectedRoute>
          } />

          {/* Debug 404 Page */}
          <Route path="*" element={
            <div className="min-h-screen flex items-center justify-center flex-col text-center p-4">
              <h1 className="text-4xl font-bold text-gray-800 mb-2">404 Not Found</h1>
              <p className="text-gray-600 mb-4">The page you are looking for does not exist.</p>
              <p className="text-xs text-gray-400 font-mono mb-6">Current Path: {window.location.pathname}</p>
              <a href="/" className="px-4 py-2 bg-indigo-600 text-white rounded-lg">Go Home</a>
            </div>
          } />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
