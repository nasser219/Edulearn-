import { 
  LayoutDashboard, 
  BookOpen, 
  FileText, 
  GraduationCap, 
  Settings, 
  ShieldAlert,
  Users,
  CreditCard,
  BarChart3,
  Megaphone,
  HelpCircle,
  MessageCircle,
  BrainCircuit,
  Search,
  Bell
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { Button } from '../ui/Button';

const navItems = [
  { icon: LayoutDashboard, label: 'لوحة التحكم', href: '#', active: true, roles: ['STUDENT', 'TEACHER', 'ADMIN'] },
  { icon: Users, label: 'تصفح المدرسين', href: '#', roles: ['STUDENT'] },
  { icon: BookOpen, label: 'دوراتي التعليمية', href: '#', roles: ['STUDENT'] },
  { icon: BookOpen, label: 'إدارة الكورسات', href: '#', roles: ['TEACHER', 'ADMIN'] },
  { icon: FileText, label: 'المهام والواجبات', href: '#', roles: ['STUDENT', 'TEACHER'] },
  { icon: GraduationCap, label: 'بنك الامتحانات', href: '#', roles: ['STUDENT', 'TEACHER'] },
  { icon: Users, label: 'قائمة الطلاب', href: '#', roles: ['TEACHER', 'ADMIN'] },
  { icon: BarChart3, label: 'تقارير الأداء', href: '#', roles: ['STUDENT', 'TEACHER', 'ADMIN'] },
  { icon: BrainCircuit, label: 'تحليل الأداء الذكي', href: '#', roles: ['TEACHER', 'ADMIN'] },
  { icon: CreditCard, label: 'سجل المدفوعات', href: '#', roles: ['STUDENT', 'TEACHER', 'ADMIN'] },
  { icon: Megaphone, label: 'الإعلانات المستهدفة', href: '#', roles: ['ADMIN'] },
  { icon: Bell, label: 'مركز الإشعارات', href: '#', roles: ['STUDENT', 'TEACHER', 'ADMIN'] },
  { icon: ShieldAlert, label: 'مركز الأمان', href: '#', roles: ['ADMIN'] },
  { icon: MessageCircle, label: 'الرسائل', href: '#', roles: ['STUDENT', 'TEACHER', 'ADMIN'] },
  { icon: Settings, label: 'إعدادات الحساب', href: '#', roles: ['STUDENT', 'TEACHER', 'ADMIN'] },
];

import { collection, doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEffect, useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationList } from '../notifications/NotificationList';

export const Sidebar = ({ className, onNavigate, currentView }: { className?: string, onNavigate?: (view: any) => void, currentView?: string }) => {
  const { profile, isAdmin, isStudent } = useEducatorsAuth();
  const { unreadCount } = useNotifications();
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'system'), (snap) => {
      if (snap.exists()) {
        setWhatsappNumber(snap.data().whatsappNumber || '');
      }
    });
  }, []);
  
  const filteredItems = navItems.map(item => {
    let viewName: any = 'DASHBOARD';
    switch (item.label) {
      case 'لوحة التحكم': viewName = 'DASHBOARD'; break;
      case 'تصفح المدرسين': viewName = 'TEACHERS'; break;
      case 'دوراتي التعليمية': viewName = 'COURSES'; break;
      case 'إدارة الكورسات': viewName = 'MANAGE_COURSES'; break;
      case 'المهام والواجبات': viewName = 'HOMEWORK'; break;
      case 'بنك الامتحانات': viewName = 'QUIZZES'; break;
      case 'قائمة الطلاب': viewName = 'STUDENTS'; break;
      case 'تقارير الأداء': viewName = isStudent() ? 'STUDENT_RESULTS' : 'REPORTS'; break;
      case 'تحليل الأداء الذكي': viewName = 'PERFORMANCE_AI'; break;
      case 'سجل المدفوعات': viewName = 'PAYMENTS'; break;
      case 'الإعلانات المستهدفة': viewName = 'ANNOUNCEMENTS'; break;
      case 'مركز الإشعارات': viewName = 'NOTIFICATION_CENTER'; break;
      case 'مركز الأمان': viewName = 'SECURITY'; break;
      case 'الرسائل': viewName = 'MESSAGES'; break;
      case 'إعدادات الحساب': viewName = 'SETTINGS'; break;
    }
    
    const isActive = currentView === viewName;
    const label = item.label === 'دوراتي التعليمية' ? 'الكورسات' : item.label;

    return { ...item, label, isActive, viewName };
  }).filter(item => {
    if (isAdmin()) return true;
    return profile ? item.roles.includes(profile.role) : false;
  });

  // Mock data for subtitles and timestamps to fit the iOS style
  const getSubtext = (label: string) => {
    switch (label) {
      case 'لوحة التحكم': return 'نظرة عامة على الإحصائيات';
      case 'تصفح المدرسين': return 'ابحث عن معلمك المفضل';
      case 'الكورسات': return 'تابع تقدمك في الدورات';
      case 'إدارة الكورسات': return 'إضافة وتعديل المحتوى';
      case 'المهام والواجبات': return 'تم تسليم ٥ مهام جديدة';
      case 'بنك الامتحانات': return 'اختبارات تقييمية شاملة';
      case 'قائمة الطلاب': return 'متابعة سجلات حضور الطلاب';
      case 'تقارير الأداء': return 'تحليل مفصل لمستوى التقدم';
      case 'تحليل الأداء الذكي': return 'توقعات الذكاء الاصطناعي';
      case 'سجل المدفوعات': return 'الفواتير والاشتراكات النشطة';
      case 'الإعلانات المستهدفة': return 'إدارة الحملات الإعلانية';
      case 'مركز الإشعارات': return '٣ تنبيهات غير مقروءة';
      case 'مركز الأمان': return 'حماية الحساب والبيانات';
      case 'الرسائل': return 'محادثات فورية مع الطلاب';
      case 'إعدادات الحساب': return 'الملف الشخصي وكلمة المرور';
      default: return 'إدارة محتوى المنصة';
    }
  };

  const getIconColor = (index: number) => {
    const iconColors = ['bg-blue-500', 'bg-emerald-500', 'bg-rose-500', 'bg-amber-500', 'bg-indigo-500', 'bg-violet-500'];
    return iconColors[index % iconColors.length];
  };

  return (
    <div className={cn("hidden lg:flex flex-col h-[calc(100vh-5rem)] sticky top-[5rem] z-40 p-[1.5rem] pr-0 no-select transition-all duration-300", isCollapsed ? "w-[8rem]" : "w-[23.75rem]", className)} dir="rtl">
      <aside 
        className={cn(
          "h-full rounded-[1.75rem] flex flex-col relative border border-[rgba(255,255,255,0.6)] shadow-[inset_0_0_20px_rgba(255,255,255,0.2),0_20px_50px_rgba(0,0,0,0.1)] transition-all duration-300",
          isCollapsed ? "w-[5rem]" : "w-[21.25rem]",
          "before:content-[''] before:absolute before:-top-20 before:-right-20 before:w-64 before:h-64 before:bg-blue-400/20 before:rounded-full before:blur-[80px] before:-z-10",
          "after:content-[''] after:absolute after:-bottom-20 after:-left-20 after:w-64 after:h-64 after:bg-pink-400/20 after:rounded-full after:blur-[80px] after:-z-10"
        )}
        style={{
          background: 'rgba(255,255,255,0.72)',
          backdropFilter: 'blur(32px) saturate(180%)',
          WebkitBackdropFilter: 'blur(32px) saturate(180%)',
          fontFamily: "-apple-system, 'SF Pro Display', sans-serif",
          overflow: 'visible'
        }}
      >
        {/* Floating Arrow Toggle */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -left-[1.375rem] top-1/4 w-[2.75rem] h-[2.75rem] bg-white rounded-full border border-slate-200 shadow-md flex items-center justify-center text-slate-400 hover:text-blue-500 hover:scale-110 active:scale-95 transition-all z-20"
          style={{ transform: `rotate(${isCollapsed ? '180deg' : '0deg'})` }}
          aria-label={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

        {/* Top Bar: Bell + Search */}
        <div className={cn("px-6 pt-8 pb-4 space-y-6 transition-all", isCollapsed && "px-2")}>
          <div className="flex items-center justify-between">
            {!isCollapsed && <h1 className="text-2xl font-black text-slate-900 tracking-tight transition-all">التربويين</h1>}
            <div className={cn("relative group", isCollapsed && "mx-auto")}>
              {unreadCount > 0 && (
                <div className="absolute -top-1 -left-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-bold text-white z-10 transition-transform">
                  {unreadCount}
                </div>
              )}
              <div 
                className="p-2.5 bg-white/50 rounded-full border border-white/50 shadow-sm group-hover:bg-white transition-colors cursor-pointer"
                onClick={() => setShowNotifications(!showNotifications)}
              >
                <Bell className="h-5 w-5 text-slate-600" />
              </div>

              {/* Notification Dropdown/Panel */}
              {showNotifications && (
                <div className="absolute top-14 right-0 w-80 h-[500px] z-[200] animate-in slide-in-from-top-4 duration-300">
                  <NotificationList 
                    onClose={() => setShowNotifications(false)} 
                    onNavigate={onNavigate} 
                  />
                </div>
              )}
            </div>
          </div>
          
          <div className={cn("relative group transition-all duration-300 overflow-hidden", isCollapsed ? "h-0 opacity-0" : "h-11 opacity-100")}>
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
            <input 
              type="text" 
              placeholder="بحث سريع..." 
              className="w-full h-11 pr-12 pl-6 bg-white/40 border border-white/60 rounded-full text-sm font-bold focus:ring-4 focus:ring-blue-500/10 focus:bg-white/80 outline-none transition-all placeholder:text-slate-400" 
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-4 py-4 space-y-2 scrollbar-none">
          {filteredItems.map((item, index) => (
            <button
              key={item.label}
              onClick={() => onNavigate?.(item.viewName)}
              className={cn(
                "w-full flex items-center gap-4 p-3 rounded-[18px] transition-all duration-300 relative group",
                "hover:scale-[1.02] active:scale-[0.98]",
                item.isActive 
                  ? "bg-white shadow-[0_8px_24px_rgba(0,0,0,0.08)] border border-white" 
                  : "hover:bg-white/40 border border-transparent hover:border-white/60",
                isCollapsed && "justify-center p-2"
              )}
            >
              <div className={cn(
                "h-12 w-12 rounded-[14px] flex items-center justify-center shrink-0 transition-all group-hover:scale-110 shadow-sm",
                item.isActive ? getIconColor(index) : "bg-white/80 border border-white group-hover:bg-white"
              )}>
                <item.icon className={cn(
                  "h-6 w-6 transition-colors",
                  item.isActive ? "text-white" : "text-slate-500"
                )} />
              </div>
              
              <div className={cn(
                "flex-1 text-right overflow-hidden transition-all duration-300",
                isCollapsed ? "w-0 opacity-0" : "opacity-100"
              )}>
                <div className="flex items-center justify-between whitespace-nowrap">
                  <p className={cn(
                    "text-sm font-black tracking-tight transition-colors",
                    item.isActive ? "text-slate-900" : "text-slate-700 font-bold"
                  )}>{item.label}</p>
                  <span className="text-[10px] font-bold text-slate-300">12:45</span>
                </div>
                <p className="text-[11px] text-slate-400 font-medium mt-0.5 truncate leading-tight whitespace-nowrap">
                  {getSubtext(item.label)}
                </p>
              </div>

              {/* Tooltip for collapsed state */}
              {isCollapsed && (
                <div className="absolute right-full mr-4 bg-slate-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-all translate-x-2 group-hover:translate-x-0 z-[110] whitespace-nowrap shadow-xl">
                  {item.label}
                  <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-[4px] border-transparent border-l-slate-900" />
                </div>
              )}
            </button>
          ))}
        </nav>
        
        {/* Help Center Glass Box */}
        <div className={cn("p-6 transition-all", isCollapsed && "px-2")}>
          <div className="bg-white/40 border border-white rounded-[22px] p-5 shadow-sm relative overflow-hidden group">
            <div className="relative z-10">
              <div className={cn("flex items-center gap-4 mb-3", isCollapsed && "justify-center")}>
                <div className="h-10 w-10 rounded-xl bg-blue-500 shadow-lg shadow-blue-500/20 flex items-center justify-center shrink-0">
                  <HelpCircle className="h-6 w-6 text-white" />
                </div>
                {!isCollapsed && (
                  <div>
                    <p className="text-xs font-black text-slate-900 leading-none">مركز المساعدة</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-1">جاهزون لخدمتك ٢٤/٧</p>
                  </div>
                )}
              </div>
              {!isCollapsed ? (
                <Button 
                  variant="outline" 
                  className="w-full bg-white/80 border-white text-blue-600 font-black hover:bg-blue-600 hover:text-white rounded-[0.875rem] transition-all h-[2.75rem] text-xs shadow-sm hover:shadow-md"
                  onClick={() => whatsappNumber && window.open(`https://wa.me/${whatsappNumber}`, '_blank')}
                >
                  تواصل واتساب
                </Button>
              ) : (
                <button 
                  className="w-full h-[2.75rem] flex items-center justify-center bg-white/80 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                  onClick={() => whatsappNumber && window.open(`https://wa.me/${whatsappNumber}`, '_blank')}
                  aria-label="تواصل واتساب"
                >
                  <MessageCircle className="h-5 w-5" />
                </button>
              )}
            </div>
            {/* Soft decorative blob */}
            <div className="absolute -left-2 -bottom-2 w-12 h-12 bg-blue-400/10 rounded-full blur-lg group-hover:scale-150 transition-transform"></div>
          </div>
        </div>
      </aside>
    </div>
  );
};
