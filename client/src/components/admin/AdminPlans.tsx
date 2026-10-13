import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { plansApi } from '@/services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { AlertTriangle, Trash2, Users } from 'lucide-react';

export default function AdminPlans() {
  const queryClient = useQueryClient();
  const [isCreating, setIsCreating] = useState(false);
  const [newPlan, setNewPlan] = useState({ name: '', price: '', maxStorageMb: '', durationDays: '30' });
  const [warningPlan, setWarningPlan] = useState<any | null>(null);
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<any | null>(null);

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
      toast.success('Plan permanently deleted');
      setDeleteConfirmPlan(null);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const deactivateMutation = useMutation({
    mutationFn: plansApi.deactivate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPlans'] });
      toast.success('Plan deactivated');
      setWarningPlan(null);
    },
    onError: (error: any) => toast.error(error.message)
  });

  const activateMutation = useMutation({
    mutationFn: plansApi.activate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPlans'] });
      toast.success('Plan activated');
    },
    onError: (error: any) => toast.error(error.message)
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(newPlan);
  };

  const handleDeleteClick = (plan: any) => {
    if (plan.activeSubscribers && plan.activeSubscribers > 0) {
      setWarningPlan(plan);
    } else {
      setDeleteConfirmPlan(plan);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Manage Plans</h2>
          <p className="text-slate-500">Configure subscription tiers and pricing.</p>
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
                <th className="px-6 py-4">Subscribers</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">Loading plans...</td></tr>
              ) : plans.length === 0 ? (
                <tr><td colSpan={7} className="px-6 py-8 text-center text-slate-500">No active plans found.</td></tr>
              ) : (
                plans.map((plan: any) => (
                  <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900">{plan.name}</td>
                    <td className="px-6 py-4">${plan.price}</td>
                    <td className="px-6 py-4">{plan.maxStorageMb} MB</td>
                    <td className="px-6 py-4">{plan.durationDays} Days</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Users className="h-4 w-4 text-slate-400" />
                        <span className="font-medium">{plan.activeSubscribers || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {plan.status === 'ACTIVE' ? (
                        <Badge className="bg-emerald-50 text-emerald-700 hover:bg-emerald-50 border-emerald-200">Active</Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-500">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right flex justify-end gap-2">
                      {plan.status === 'ACTIVE' ? (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                          onClick={() => deactivateMutation.mutate(plan.id)}
                          disabled={deactivateMutation.isPending}
                        >
                          Deactivate
                        </Button>
                      ) : (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                          onClick={() => activateMutation.mutate(plan.id)}
                          disabled={activateMutation.isPending}
                        >
                          Activate
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        onClick={() => handleDeleteClick(plan)}
                        disabled={deleteMutation.isPending}
                      >
                        Delete
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Warning Dialog when deleting plan with active subscribers */}
      <Dialog open={!!warningPlan} onOpenChange={(open) => !open && setWarningPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-amber-600 mb-1">
              <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg">Subscribers Active on Plan</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 pt-2 text-sm leading-relaxed">
              This plan has <span className="font-semibold text-slate-900">{warningPlan?.activeSubscribers}</span> active subscriber{warningPlan?.activeSubscribers === 1 ? '' : 's'}. You cannot delete it while users are subscribed.
              <br /><br />
              Would you like to <span className="font-semibold text-amber-700">deactivate</span> the plan instead? Existing subscribers will retain access until their current billing period ends, after which they will transition to the Free plan.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-4 pt-3 border-t">
            <Button variant="outline" onClick={() => setWarningPlan(null)}>
              Cancel
            </Button>
            <Button 
              className="bg-amber-600 hover:bg-amber-700 text-white"
              onClick={() => {
                if (warningPlan) {
                  deactivateMutation.mutate(warningPlan.id);
                }
              }}
              disabled={deactivateMutation.isPending}
            >
              {deactivateMutation.isPending ? 'Deactivating...' : 'Deactivate Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog for plans with 0 subscribers */}
      <Dialog open={!!deleteConfirmPlan} onOpenChange={(open) => !open && setDeleteConfirmPlan(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-3 text-rose-600 mb-1">
              <div className="h-10 w-10 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                <Trash2 className="h-5 w-5" />
              </div>
              <DialogTitle className="text-lg">Delete Plan</DialogTitle>
            </div>
            <DialogDescription className="text-slate-600 pt-2 text-sm">
              Are you sure you want to permanently delete <span className="font-semibold text-slate-900">{deleteConfirmPlan?.name}</span>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end gap-3 mt-4 pt-3 border-t">
            <Button variant="outline" onClick={() => setDeleteConfirmPlan(null)}>
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={() => {
                if (deleteConfirmPlan) {
                  deleteMutation.mutate(deleteConfirmPlan.id);
                }
              }}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? 'Deleting...' : 'Delete Plan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
