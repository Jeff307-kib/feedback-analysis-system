import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plansApi } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

export default function AdminDashboard() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', price: '', maxStorageMb: '', durationDays: '30' });

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['adminPlans'],
    queryFn: plansApi.getAll,
  });

  const createMutation = useMutation({
    mutationFn: plansApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPlans'] });
      toast.success('Plan created successfully');
      setIsCreating(false);
      setNewPlan({ name: '', price: '', maxStorageMb: '', durationDays: '30' });
    },
    onError: (error: any) => toast.error(error.message)
  });

  const deleteMutation = useMutation({
    mutationFn: plansApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPlans'] });
      toast.success('Plan deactivated');
    },
    onError: (error: any) => toast.error(error.message)
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newPlan);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Admin Management</h1>
          <p className="text-slate-500">System overview and subscription plan configuration.</p>
        </div>
        <Button onClick={() => setIsCreating(!isCreating)} variant={isCreating ? "outline" : "default"}>
          {isCreating ? 'Cancel' : 'Create New Plan'}
        </Button>
      </div>

      {isCreating && (
        <Card className="border-blue-200 shadow-sm bg-blue-50/50">
          <CardHeader>
            <CardTitle className="text-lg">Create Subscription Plan</CardTitle>
            <CardDescription>Configure pricing and storage limits.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Plan Name</label>
                <Input required value={newPlan.name} onChange={e => setNewPlan({...newPlan, name: e.target.value})} placeholder="e.g. Pro Tier" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Price ($)</label>
                <Input required type="number" step="0.01" value={newPlan.price} onChange={e => setNewPlan({...newPlan, price: e.target.value})} placeholder="29.99" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Max Storage (MB)</label>
                <Input required type="number" value={newPlan.maxStorageMb} onChange={e => setNewPlan({...newPlan, maxStorageMb: e.target.value})} placeholder="1024" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration (Days)</label>
                <Input required type="number" value={newPlan.durationDays} onChange={e => setNewPlan({...newPlan, durationDays: e.target.value})} placeholder="30" />
              </div>
              <div className="sm:col-span-2 pt-2">
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? 'Saving...' : 'Save Plan'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="shadow-sm border-slate-200/50 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-100">
              <tr>
                <th className="px-6 py-4">Plan Name</th>
                <th className="px-6 py-4">Price</th>
                <th className="px-6 py-4">Storage Quota</th>
                <th className="px-6 py-4">Duration</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">Loading plans...</td></tr>
              ) : plans.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No active plans found.</td></tr>
              ) : (
                plans.map((plan: any) => (
                  <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{plan.name}</td>
                    <td className="px-6 py-4">${plan.price}</td>
                    <td className="px-6 py-4">{plan.maxStorageMb} MB</td>
                    <td className="px-6 py-4">{plan.durationDays} Days</td>
                    <td className="px-6 py-4">
                      {plan.isActive ? (
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {plan.isActive && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                          onClick={() => deleteMutation.mutate(plan.id)}
                          disabled={deleteMutation.isPending}
                        >
                          Deactivate
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
