import React from 'react';
import { 
  Bell, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Megaphone, 
  MessageSquare, 
  Trash2,
  Clock,
  ExternalLink
} from 'lucide-react';
import { useNotifications, Notification } from '../../hooks/useNotifications';
import { cn } from '../../lib/utils';
import { Button } from '../ui/Button';

interface NotificationListProps {
  onClose: () => void;
  onNavigate?: (view: string) => void;
}

export const NotificationList: React.FC<NotificationListProps> = ({ onClose, onNavigate }) => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification, loading } = useNotifications();

  const getIcon = (type: Notification['type']) => {
    switch (type) {
      case 'QUIZ_GRADED': return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case 'ENROLLMENT': return <AlertCircle className="h-5 w-5 text-blue-500" />;
      case 'ANNOUNCEMENT': return <Megaphone className="h-5 w-5 text-amber-500" />;
      case 'MESSAGE': return <MessageSquare className="h-5 w-5 text-indigo-500" />;
      default: return <Bell className="h-5 w-5 text-slate-400" />;
    }
  };

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'الآن';
    if (diff < 3600000) return `منذ ${Math.floor(diff / 60000)} دقيقة`;
    if (diff < 86400000) return `منذ ${Math.floor(diff / 3600000)} ساعة`;
    return date.toLocaleDateString('ar-EG');
  };

  return (
    <div className="flex flex-col h-full bg-white/80 backdrop-blur-2xl rounded-[2.5rem] border border-white/60 shadow-2xl relative overflow-hidden" dir="rtl">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/50">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-brand-primary/10 rounded-xl flex items-center justify-center text-brand-primary">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900 leading-tight">الإشعارات</h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">
              لديك {unreadCount} إشعار جديد
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
             <Button variant="ghost" size="sm" className="h-8 px-3 text-[10px] font-black hover:bg-slate-100 rounded-lg text-brand-primary" onClick={markAllAsRead}>
               تحديد الكل كمقروء
             </Button>
          )}
          <button onClick={onClose} className="h-8 w-8 hover:bg-slate-100 rounded-lg flex items-center justify-center transition-colors">
            <X className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
             <div className="h-8 w-8 border-2 border-brand-primary border-t-transparent rounded-full animate-spin" />
             <p className="text-xs font-black text-slate-400">جاري تحميل الإشعارات...</p>
          </div>
        ) : notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 opacity-50">
            <div className="h-16 w-16 bg-slate-50 rounded-full flex items-center justify-center">
              <Bell className="h-8 w-8 text-slate-300" />
            </div>
            <p className="text-sm font-bold text-slate-400">لا توجد إشعارات حالياً</p>
          </div>
        ) : (
          notifications.map((n) => (
            <div 
              key={n.id}
              className={cn(
                "p-4 rounded-3xl border transition-all relative group",
                n.read 
                  ? "bg-white/40 border-slate-50 hover:bg-white/60" 
                  : "bg-white border-brand-primary/10 shadow-sm border-r-4 border-r-brand-primary"
              )}
            >
              <div className="flex gap-4">
                <div className="h-10 w-10 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                  {getIcon(n.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h4 className="font-black text-sm text-slate-900 truncate">{n.title}</h4>
                    <span className="text-[9px] font-bold text-slate-400 whitespace-nowrap flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(n.createdAt)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
                    {n.message}
                  </p>
                  
                  <div className="mt-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {!n.read && (
                        <button 
                          onClick={() => markAsRead(n.id)}
                          className="text-[9px] font-black text-brand-primary hover:underline"
                        >
                          تحديد كمقروء
                        </button>
                      )}
                      {n.link && (
                        <button 
                          onClick={() => {
                            onNavigate?.(n.link!);
                            onClose();
                          }}
                          className="text-[9px] font-black text-slate-500 hover:text-brand-primary flex items-center gap-1"
                        >
                          عرض <ExternalLink className="h-2.5 w-2.5" />
                        </button>
                      )}
                    </div>
                    <button 
                      onClick={() => deleteNotification(n.id)}
                      className="text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-4 bg-slate-50/50 text-center border-t border-slate-100">
        <p className="text-[9px] text-slate-400 font-bold">يتم تحديث الإشعارات لحظياً ✨</p>
      </div>
    </div>
  );
};
