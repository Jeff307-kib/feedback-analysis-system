import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import { DashboardLayout } from './layouts/DashboardLayout';
import { UserDashboardLayout } from './layouts/UserDashboardLayout';
import { Toaster } from '@/components/ui/sonner';

const queryClient = new QueryClient();

import Overview from './pages/user/Overview';
import Datasets from './pages/user/Datasets';
import Reports from './pages/user/Reports';
import Subscriptions from './pages/user/Subscriptions';
import Settings from './pages/user/Settings';
import HelpSupport from './pages/user/HelpSupport';
import AdminDashboard from './pages/AdminDashboard';

function RootRedirect() {
  const { isAuthenticated, user } = useAuth();
  if (isAuthenticated) {
    return user?.role === 'ADMIN' ? <Navigate to="/admin" replace /> : <Navigate to="/dashboard" replace />;
  }
  return <Navigate to="/login" replace />;
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Auth Routes - Restricted from Authenticated Users */}
              <Route element={<PublicRoute />}>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Route>

              {/* Protected Routes - Retail Manager */}
              <Route element={<ProtectedRoute allowedRoles={['RETAIL_MANAGER']} />}>
                <Route element={<UserDashboardLayout />}>
                  <Route path="/dashboard" element={<Overview />} />
                  <Route path="/dashboard/datasets" element={<Datasets />} />
                  <Route path="/dashboard/reports" element={<Reports />} />
                  <Route path="/dashboard/subscriptions" element={<Subscriptions />} />
                  <Route path="/dashboard/settings" element={<Settings />} />
                  <Route path="/dashboard/help" element={<HelpSupport />} />
                </Route>
              </Route>

              {/* Protected Routes - Admin */}
              <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
                <Route element={<DashboardLayout />}>
                  <Route path="/admin" element={<AdminDashboard />} />
                </Route>
              </Route>

              {/* Default Route */}
              <Route path="/" element={<RootRedirect />} />
              <Route path="*" element={<RootRedirect />} />
            </Routes>
          </BrowserRouter>
          <Toaster richColors position="top-right" />
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
