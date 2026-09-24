import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { NotificationSystem } from '../components/NotificationSystem';
import { 
  LogOut, 
  LineChart, 
  LayoutDashboard, 
  FolderOpen, 
  BarChart3, 
  CreditCard, 
  Settings, 
  HelpCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';

export function UserDashboardLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Dataset Management', path: '/dashboard/datasets', icon: FolderOpen },
    { name: 'Analysis Reports', path: '/dashboard/reports', icon: BarChart3 },
    { name: 'Subscription & Plans', path: '/dashboard/subscriptions', icon: CreditCard },
    { name: 'Settings', path: '/dashboard/settings', icon: Settings },
    { name: 'Help & Support', path: '/dashboard/help', icon: HelpCircle },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed inset-y-0 left-0 z-50">
        <div className="h-16 flex items-center px-6 border-b border-slate-100">
          <div className="flex items-center gap-2 text-blue-600">
            <LineChart size={24} />
            <span className="font-bold text-lg tracking-tight text-slate-900">
              InsightRetail
            </span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              end={item.path === '/dashboard'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium ${
                  isActive
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`
              }
            >
              <item.icon size={18} />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <Button
            variant="ghost"
            className="w-full justify-start text-slate-600 hover:text-rose-600 hover:bg-rose-50"
            onClick={handleLogout}
          >
            <LogOut size={18} className="mr-3" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col ml-64 min-h-screen">
        {/* Top Header */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
          <h2 className="text-lg font-semibold text-slate-800">
            Retail Manager
          </h2>
          
          <div className="flex items-center gap-4">
            <NotificationSystem />
            
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium leading-none text-slate-900">{user?.username}</span>
              <span className="text-xs text-slate-500 mt-1 capitalize">{user?.role?.replace('_', ' ').toLowerCase()}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
