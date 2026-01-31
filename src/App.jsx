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

function App() {
  return (
    <ErrorBoundary>
      <DataProvider>
        <UIProvider>
          <Router>
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
        </UIProvider>
      </DataProvider>
    </ErrorBoundary>
  );
}

export default App;
