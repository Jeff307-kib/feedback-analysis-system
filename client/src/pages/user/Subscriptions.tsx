import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { subscriptionsApi, plansApi } from '../../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { Crown, CheckCircle2, CreditCard, Receipt } from 'lucide-react';

export default function Subscriptions() {
  const queryClient = useQueryClient();

  const { data: mySub, isLoading: loadingSub } = useQuery({
    queryKey: ['mySubscription'],
    queryFn: subscriptionsApi.getMe,
  });

  const { data: plans = [], isLoading: loadingPlans } = useQuery({
    queryKey: ['plans'],
    queryFn: plansApi.getAll,
  });

  const purchaseMutation = useMutation({
    mutationFn: subscriptionsApi.purchase,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['mySubscription'] });
      toast.success(`Successfully subscribed to ${data.plan.name}!`);
    },
    onError: (error: any) => toast.error(error.message)
  });

  if (loadingSub || loadingPlans) {
    return <div className="p-8 text-center text-slate-500">Loading subscriptions...</div>;
  }

  const { subscription, plan: currentPlan, hasUsedFreeTrial } = mySub || {};
  const isFreeTier = !subscription && !hasUsedFreeTrial;

  // Mock billing history
  const mockBillingHistory = [
    { id: 'INV-001', date: '2023-10-01', amount: '$49.00', status: 'Paid', plan: 'Pro Plan' },
    { id: 'INV-002', date: '2023-09-01', amount: '$49.00', status: 'Paid', plan: 'Pro Plan' },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Subscription & Plans</h1>
        <p className="text-slate-500">Manage your active plan and billing history.</p>
      </div>

      {/* Current Plan Details */}
      <Card className="shadow-sm border-slate-200/50 bg-gradient-to-br from-slate-900 to-slate-800 text-white">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-blue-400" />
                <h3 className="text-lg font-medium text-slate-300">Current Active Plan</h3>
              </div>
              <div className="text-4xl font-bold text-white flex items-center gap-3">
                {currentPlan ? currentPlan.name : (isFreeTier ? 'Free Trial' : 'No Active Plan')}
                {currentPlan && <Badge className="bg-blue-500/20 text-blue-300 hover:bg-blue-500/20">Active</Badge>}
              </div>
              {subscription && (
                <p className="text-slate-400 mt-2">
                  Renews automatically on <span className="text-slate-200 font-medium">{new Date(subscription.endDate).toLocaleDateString()}</span>
                </p>
              )}
            </div>
            {subscription && (
              <Button variant="secondary" className="bg-white text-slate-900 hover:bg-slate-100">
                Cancel Subscription
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4">Available Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((p: any) => (
            <Card key={p.id} className={`shadow-sm border-slate-200/50 relative overflow-hidden transition-all hover:shadow-md ${currentPlan?.id === p.id ? 'ring-2 ring-blue-600' : ''}`}>
              {currentPlan?.id === p.id && (
                <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                  CURRENT
                </div>
              )}
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Crown className="h-4 w-4 text-amber-500" />
                  {p.name}
                </CardTitle>
                <CardDescription>Best for retail analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-3xl font-bold text-slate-900">
                  ${p.price} <span className="text-sm font-normal text-slate-500">/ {p.durationDays} days</span>
                </p>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    {p.maxStorageMb} MB Storage Quota
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    Priority Support
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600" />
                    Advanced Export Options
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  variant={currentPlan?.id === p.id ? "outline" : "default"}
                  disabled={currentPlan?.id === p.id || purchaseMutation.isPending}
                  onClick={() => purchaseMutation.mutate(p.id)}
                >
                  {currentPlan?.id === p.id ? 'Active Plan' : 'Purchase / Upgrade'}
                </Button>
              </CardFooter>
            </Card>
          ))}
          {plans.length === 0 && (
            <p className="text-slate-500 italic">No plans available at the moment.</p>
          )}
        </div>
      </div>

      {/* Billing History */}
      <div>
        <h2 className="text-xl font-semibold text-slate-900 mb-4 flex items-center gap-2">
          <Receipt className="h-5 w-5 text-slate-500" /> Billing History
        </h2>
        <Card className="shadow-sm border-slate-200/50 overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Invoice ID</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Download</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockBillingHistory.map((inv) => (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium text-slate-900">{inv.id}</TableCell>
                  <TableCell className="text-slate-500">{inv.date}</TableCell>
                  <TableCell className="text-slate-700">{inv.plan}</TableCell>
                  <TableCell className="text-slate-900">{inv.amount}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                      {inv.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-blue-600" onClick={() => alert('Mock Download PDF')}>
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </div>

    </div>
  );
}
