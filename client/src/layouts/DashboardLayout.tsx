import React from 'react';
import { Outlet, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { NotificationSystem } from '../components/NotificationSystem';
import { LogOut, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-border bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 max-w-screen-2xl items-center justify-between px-4 sm:px-8">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <LineChart size={18} />
            </div>
            <span className="font-bold hidden sm:inline-block tracking-tight text-slate-800">
              InsightRetail
            </span>
          </div>
          
          <div className="flex items-center gap-4">
            <NotificationSystem />
            
            <div className="hidden sm:flex flex-col items-end mr-2">
              <span className="text-sm font-medium leading-none">{user?.username}</span>
              <span className="text-xs text-muted-foreground mt-1 capitalize">{user?.role?.replace('_', ' ').toLowerCase()}</span>
            </div>
            
            <Button variant="ghost" size="icon" onClick={handleLogout} className="text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors rounded-full">
              <LogOut size={18} />
              <span className="sr-only">Log out</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 container max-w-screen-2xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
