import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { authApi } from '../services/api';
import { LogIn, LineChart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const [adminRedirectPrompt, setAdminRedirectPrompt] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAdminRedirectPrompt(false);

    try {
      const data = await authApi.login({ email, password });
      login(data.user, data.token);
      toast.success('Welcome back!');
      navigate('/dashboard');
    } catch (err: any) {
      const msg = err.message || 'Failed to login';
      toast.error(msg);
      if (msg.includes('/admin/login') || msg.toLowerCase().includes('admin')) {
        setAdminRedirectPrompt(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 py-8">
      <Link to="/" className="flex items-center gap-2 mb-6 group">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground shadow-xs group-hover:scale-105 transition-transform">
          <LineChart size={18} />
        </div>
        <span className="font-extrabold text-xl tracking-tight text-foreground">
          InsightRetail
        </span>
      </Link>
      <Card className="w-full max-w-md shadow-sm border-slate-200/50">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-3 bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400 rounded-full">
              <LogIn size={28} />
            </div>
          </div>
          <div className="space-y-1">
            <CardTitle className="text-2xl font-bold tracking-tight">Retail Manager Sign In</CardTitle>
            <CardDescription>Sign in to your Retail Manager account to manage customer sentiment</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          {adminRedirectPrompt && (
            <div className="mb-4 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/50 dark:border-amber-800 dark:text-amber-200 text-xs flex items-center justify-between">
              <span>Looking for the administrator portal?</span>
              <Link to="/admin/login" className="font-semibold text-amber-900 dark:text-amber-100 underline hover:no-underline">
                Go to Admin Login &rarr;
              </Link>
            </div>
          )}
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="email">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                required
                placeholder="manager@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="password">
                Password
              </label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 justify-center text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-primary hover:underline transition-all">
              Register here
            </Link>
          </p>
          <div className="pt-2 border-t border-border/60 w-full">
            <Link to="/admin/login" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              System Administrator? Sign in at Admin Portal
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
