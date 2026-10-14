import React, { useState } from 'react';
import { Bell, AlertCircle, CheckCircle2, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

// Mock Data for the UX iteration
const initialNotifications = [
  {
    id: 1,
    title: 'Urgent Issue Detected',
    description: 'Multiple users reporting battery draining fast on Samsung Galaxy S23.',
    type: 'critical',
    isRead: false,
    timestamp: '2 mins ago',
  },
  {
    id: 2,
    title: 'Negative Sentiment Spike',
    description: 'Camera aspect sentiment dropped by 15% this week.',
    type: 'warning',
    isRead: false,
    timestamp: '1 hour ago',
  },
  {
    id: 3,
    title: 'Analysis Completed',
    description: 'Q3_Sales_Feedback.csv has been fully analyzed.',
    type: 'resolved',
    isRead: true,
    timestamp: '2 days ago',
  },
];

export function NotificationSystem() {
  const [notifications, setNotifications] = useState(initialNotifications);
  
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const markAsRead = (id: number) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'critical':
        return <AlertCircle className="h-4 w-4 text-rose-600" />;
      case 'warning':
        return <TrendingDown className="h-4 w-4 text-amber-600" />;
      case 'resolved':
        return <CheckCircle2 className="h-4 w-4 text-blue-600" />;
      default:
        return <Bell className="h-4 w-4 text-slate-600" />;
    }
  };

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'critical':
        return 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/50';
      case 'warning':
        return 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/50';
      case 'resolved':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/50';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-0 mr-4 mt-2 shadow-lg border-border bg-popover text-popover-foreground" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="font-semibold text-sm text-foreground">Notifications</h4>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              className="h-auto p-0 text-xs text-primary hover:text-primary/80 hover:bg-transparent"
              onClick={markAllAsRead}
            >
              Mark all as read
            </Button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground space-y-2 p-8">
              <Bell className="h-8 w-8 text-muted-foreground/40" />
              <p className="text-sm">No new notifications</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => markAsRead(notification.id)}
                  className={cn(
                    "flex items-start gap-3 p-4 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50 last:border-none",
                    !notification.isRead && "bg-primary/5 dark:bg-primary/10"
                  )}
                >
                  <div className="mt-1 flex-shrink-0">
                    {getIcon(notification.type)}
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                      <p className={cn(
                        "text-sm font-medium leading-none",
                        notification.isRead ? "text-muted-foreground" : "text-foreground"
                      )}>
                        {notification.title}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                      {notification.description}
                    </p>
                    <div className="flex items-center justify-between pt-1">
                      <Badge variant="outline" className={cn("text-[10px] font-normal px-2 py-0 h-4 border", getBadgeStyle(notification.type))}>
                        {notification.type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">{notification.timestamp}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        
        <div className="p-2 border-t border-border">
          <Button variant="ghost" className="w-full text-xs text-muted-foreground hover:text-foreground justify-center h-8">
            View all notifications
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
