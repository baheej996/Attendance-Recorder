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

import ErrorBoundary from './components/ErrorBoundary';

import { UIProvider } from './contexts/UIContext';
import { useData } from './contexts/DataContext'; // Import useData
import InstallPrompt from './components/pwa/InstallPrompt'; // Import InstallPrompt

function App() {
  return (
    <ErrorBoundary>
      <DataProvider>
        <UIProvider>
          <AppContent />
        </UIProvider>
      </DataProvider>
    </ErrorBoundary>
  );
}

// Extract content to use hooks inside DataProvider
const AppContent = () => {
  const { institutionSettings } = useData();

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
      <InstallPrompt />
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
        <Routes>
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
            <ProtectedRoute allowedRole="student">
              <StudentDashboard />
            </ProtectedRoute>
          } />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
