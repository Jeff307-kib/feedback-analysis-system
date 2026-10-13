import { useState } from 'react';
import AdminPlans from '@/components/admin/AdminPlans';
import AdminFeedbacks from '@/components/admin/AdminFeedbacks';
import AdminUsers from '@/components/admin/AdminUsers';
import AdminFaqs from '@/components/admin/AdminFaqs';
import { Package, MessageSquareText, Users, HelpCircle } from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'plans' | 'feedbacks' | 'users' | 'faqs'>('plans');
  const [targetFeedbackId, setTargetFeedbackId] = useState<number | null>(null);

  const handleNavigateToFeedback = (feedbackId: number) => {
    setTargetFeedbackId(feedbackId);
    setActiveTab('feedbacks');
  };

  return (
    <div className="flex flex-col md:flex-row gap-8">
      {/* Sidebar Navigation */}
      <aside className="w-full md:w-64 shrink-0">
        <div className="sticky top-24 space-y-1">
          <h2 className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Admin Menu
          </h2>
          
          <button 
            onClick={() => setActiveTab('plans')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'plans' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Package className={`h-5 w-5 ${activeTab === 'plans' ? 'text-blue-600' : 'text-slate-400'}`} />
            Manage Plans
          </button>
          
          <button 
            onClick={() => setActiveTab('feedbacks')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'feedbacks' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <MessageSquareText className={`h-5 w-5 ${activeTab === 'feedbacks' ? 'text-blue-600' : 'text-slate-400'}`} />
            Manage User Feedbacks
          </button>

          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'users' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Users className={`h-5 w-5 ${activeTab === 'users' ? 'text-blue-600' : 'text-slate-400'}`} />
            Manage Users
          </button>

          <button 
            onClick={() => setActiveTab('faqs')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'faqs' 
                ? 'bg-blue-50 text-blue-700' 
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <HelpCircle className={`h-5 w-5 ${activeTab === 'faqs' ? 'text-blue-600' : 'text-slate-400'}`} />
            Manage FAQs
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        {activeTab === 'plans' && <AdminPlans />}
        {activeTab === 'feedbacks' && (
          <AdminFeedbacks
            initialFeedbackId={targetFeedbackId}
            onClearInitialFeedback={() => setTargetFeedbackId(null)}
          />
        )}
        {activeTab === 'users' && (
          <AdminUsers onNavigateToFeedback={handleNavigateToFeedback} />
        )}
        {activeTab === 'faqs' && <AdminFaqs />}
      </main>
    </div>
  );
}
