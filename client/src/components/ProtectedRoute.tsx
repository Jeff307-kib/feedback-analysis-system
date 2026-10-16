import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({ allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    const isAdminRoute = allowedRoles && allowedRoles.length === 1 && allowedRoles.includes('ADMIN');
    return <Navigate to={isAdminRoute ? '/admin/login' : '/login'} replace />;
  }

  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // If user is logged in but doesn't have the right role (e.g. Retail Manager trying to access Admin route)
    // Redirect them to their own dashboard or a forbidden page
    return user.role === 'ADMIN' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
