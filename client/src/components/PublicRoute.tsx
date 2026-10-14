import React from 'react';
import { Navigate, Outlet } from 'react-router';
import { useAuth } from '../contexts/AuthContext';

/**
 * PublicRoute guard:
 * Restricts authenticated users from accessing anonymous authentication routes (e.g. /login, /register).
 * If the user has a valid authenticated session, they are redirected to their main dashboard.
 * If unauthenticated, access to the route is granted.
 */
export default function PublicRoute() {
  const { isAuthenticated, user } = useAuth();

  if (isAuthenticated) {
    return user?.role === 'ADMIN' ? (
      <Navigate to="/admin" replace />
    ) : (
      <Navigate to="/dashboard" replace />
    );
  }

  return <Outlet />;
}
