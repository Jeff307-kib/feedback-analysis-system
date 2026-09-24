import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { User, Lock, Moon, Sun, Monitor } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

export default function Settings() {
  const { user } = useAuth();
  
  // Profile Form State
  const [name, setName] = useState(user?.username || '');
  
  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Preferences State
  const [theme, setTheme] = useState('system');

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success('Profile updated successfully!');
  };

  const handleSecuritySave = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match.');
      return;
    }
    toast.success('Password updated successfully!');
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleThemeChange = (value: string) => {
    setTheme(value);
    toast.success(`Theme set to ${value}`);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p className="text-slate-500">Manage your account preferences and security.</p>
      </div>

      <div className="space-y-6">
        
        {/* Profile Settings */}
        <Card className="shadow-sm border-slate-200/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-blue-600" />
              Profile Settings
            </CardTitle>
            <CardDescription>Update your personal information.</CardDescription>
          </CardHeader>
          <form onSubmit={handleProfileSave}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input id="email" type="email" value={user?.email || ''} disabled className="bg-slate-50 text-slate-500" />
                <p className="text-xs text-slate-500">Your email address cannot be changed.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Enter your full name" />
              </div>
            </CardContent>
            <CardFooter className="border-t border-slate-100 mt-4 pt-4 flex justify-end">
              <Button type="submit">Save Changes</Button>
            </CardFooter>
          </form>
        </Card>

        {/* Security Settings */}
        <Card className="shadow-sm border-slate-200/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5 text-blue-600" />
              Security
            </CardTitle>
            <CardDescription>Update your password to keep your account secure.</CardDescription>
          </CardHeader>
          <form onSubmit={handleSecuritySave}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current_pwd">Current Password</Label>
                <Input id="current_pwd" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new_pwd">New Password</Label>
                <Input id="new_pwd" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_pwd">Confirm New Password</Label>
                <Input id="confirm_pwd" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>
            </CardContent>
            <CardFooter className="border-t border-slate-100 mt-4 pt-4 flex justify-end">
              <Button type="submit" variant="secondary">Update Password</Button>
            </CardFooter>
          </form>
        </Card>

        {/* Preferences */}
        <Card className="shadow-sm border-slate-200/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="h-5 w-5 text-blue-600" />
              Preferences
            </CardTitle>
            <CardDescription>Customize the appearance of your dashboard.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Label>Theme</Label>
              <RadioGroup value={theme} onValueChange={handleThemeChange} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className={`flex items-center justify-between space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${theme === 'light' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`} onClick={() => handleThemeChange('light')}>
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4 text-amber-500" />
                    <Label className="cursor-pointer font-normal">Light Mode</Label>
                  </div>
                  <RadioGroupItem value="light" id="theme-light" />
                </div>
                <div className={`flex items-center justify-between space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${theme === 'dark' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`} onClick={() => handleThemeChange('dark')}>
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4 text-slate-700" />
                    <Label className="cursor-pointer font-normal">Dark Mode</Label>
                  </div>
                  <RadioGroupItem value="dark" id="theme-dark" />
                </div>
                <div className={`flex items-center justify-between space-x-2 border rounded-lg p-4 cursor-pointer transition-colors ${theme === 'system' ? 'border-blue-600 bg-blue-50/50' : 'border-slate-200 hover:border-slate-300'}`} onClick={() => handleThemeChange('system')}>
                  <div className="flex items-center gap-2">
                    <Monitor className="h-4 w-4 text-slate-500" />
                    <Label className="cursor-pointer font-normal">System</Label>
                  </div>
                  <RadioGroupItem value="system" id="theme-system" />
                </div>
              </RadioGroup>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
