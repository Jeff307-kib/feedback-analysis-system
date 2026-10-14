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
          <h2 className="px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Admin Menu
          </h2>
          
          <button 
            onClick={() => setActiveTab('plans')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'plans' 
                ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Package className={`h-5 w-5 ${activeTab === 'plans' ? 'text-primary dark:text-blue-300' : 'text-muted-foreground'}`} />
            Manage Plans
          </button>
          
          <button 
            onClick={() => setActiveTab('feedbacks')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'feedbacks' 
                ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <MessageSquareText className={`h-5 w-5 ${activeTab === 'feedbacks' ? 'text-primary dark:text-blue-300' : 'text-muted-foreground'}`} />
            Manage User Feedbacks
          </button>

          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'users' 
                ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <Users className={`h-5 w-5 ${activeTab === 'users' ? 'text-primary dark:text-blue-300' : 'text-muted-foreground'}`} />
            Manage Users
          </button>

          <button 
            onClick={() => setActiveTab('faqs')}
            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
              activeTab === 'faqs' 
                ? 'bg-primary/10 text-primary dark:bg-primary/20 dark:text-blue-300' 
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            <HelpCircle className={`h-5 w-5 ${activeTab === 'faqs' ? 'text-primary dark:text-blue-300' : 'text-muted-foreground'}`} />
            Manage FAQs
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 min-w-0 bg-card text-card-foreground p-6 rounded-xl shadow-xs border border-border">
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
