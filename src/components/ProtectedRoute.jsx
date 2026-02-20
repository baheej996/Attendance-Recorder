import React from 'react';
import { Navigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';

const ProtectedRoute = ({ children, allowedRole, redirectPath = "/login" }) => {
    const { currentUser } = useData();

    if (!currentUser) {
        return <Navigate to={redirectPath} replace />;
    }

    if (allowedRole && currentUser.role !== allowedRole) {
        // Redirect to their allowed dashboard if they try to access another
        return <Navigate to={`/${currentUser.role}`} replace />;
    }

    return children;
};

export default ProtectedRoute;
