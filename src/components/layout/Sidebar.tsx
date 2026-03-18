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
  Bell,
  ChevronLeft,
  ChevronRight
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
    <div className={cn("hidden lg:flex flex-col h-[calc(100vh-1rem)] sticky top-[0.5rem] z-40 p-1 pr-0 no-select transition-all duration-200 will-change-[width]", isCollapsed ? "w-[7rem]" : "w-[28.5rem]", className)} dir="rtl">
      <aside 
        className={cn(
          "h-full rounded-[2.5rem] flex flex-col relative transition-all duration-300 overflow-visible glass-mauve shadow-[0_20px_50px_rgba(139,92,246,0.3)] will-change-transform",
          isCollapsed ? "w-[5rem]" : "w-[26.5rem]"
        )}
        style={{
          fontFamily: "-apple-system, 'SF Pro Display', 'Inter', sans-serif"
        }}
      >
        {/* Header/Brand Section */}
        <div className={cn("px-8 pt-6 pb-2 flex flex-col gap-6 transition-all duration-300", isCollapsed && "px-0 items-center")}>
          <div className={cn("flex items-center justify-between", isCollapsed ? "flex-col gap-6" : "flex-row")}>
            <div className={cn("flex items-center gap-5", isCollapsed && "flex-col")}>
              <div className="h-16 w-16 bg-white/20 backdrop-blur-xl rounded-[1.5rem] border border-white/20 flex items-center justify-center shadow-2xl shrink-0 group hover:scale-110 transition-transform cursor-pointer">
                <GraduationCap className="h-9 w-9 text-white" />
              </div>
              {!isCollapsed && (
                <h1 className="text-4xl font-black font-black-force text-white tracking-tight text-shadow-sm">التربويين</h1>
              )}
            </div>

            {/* Neon White Toggle Button - "Inside" the sidebar */}
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                "h-12 w-12 rounded-2xl border-2 border-white/60 bg-white/5 flex items-center justify-center transition-all active:scale-90 group/toggle z-50",
                "shadow-[0_0_15px_rgba(255,255,255,0.3)] hover:shadow-[0_0_25px_rgba(255,255,255,0.6)] hover:bg-white/10 hover:border-white",
                isCollapsed && "mt-2"
              )}
              aria-label={isCollapsed ? "توسيع القائمة" : "طي القائمة"}
            >
              {isCollapsed ? (
                <ChevronLeft className="h-7 w-7 text-white animate-pulse" />
              ) : (
                <ChevronRight className="h-7 w-7 text-white" />
              )}
            </button>
          </div>

          
          <div className={cn("relative group transition-all duration-200 overflow-hidden", isCollapsed ? "h-0 opacity-0" : "h-11 opacity-100 px-1")}>
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/50 group-focus-within:text-white transition-colors" />
            <input 
              type="text" 
              placeholder="بحث سريع..." 
              className="w-full h-11 pr-12 pl-6 bg-white/10 border border-white/20 rounded-xl text-base font-bold text-white focus:bg-white/20 outline-none transition-all placeholder:text-white/40" 
            />
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-0 py-4 space-y-1 overflow-y-auto scrollbar-none overflow-x-hidden">
          {filteredItems.map((item, index) => (
            <button
              key={item.label}
              onClick={() => onNavigate?.(item.viewName)}
              className={cn(
                "w-full flex items-center gap-4 py-2 px-8 relative group transition-all duration-200 will-change-[background,transform] active:scale-[0.98]",
                item.isActive 
                  ? "glass-item-active text-white rounded-l-[2rem] ml-4 scale-105" 
                  : "text-white/70 hover:text-white hover:bg-white/5",
                isCollapsed && "justify-center px-0 h-[3.5rem] w-[3.5rem] mx-auto rounded-2xl ml-0",
                item.isActive && isCollapsed && "glass-item-active"
              )}
            >
              {/* Modern Visual Link Connection */}
              {item.isActive && !isCollapsed && (
                <>
                  <div className="absolute -top-6 left-0 w-6 h-6 bg-transparent shadow-[4px_4px_0_0_rgba(255,255,255,0.2)] rounded-br-full pointer-events-none" />
                  <div className="absolute -bottom-6 left-0 w-6 h-6 bg-transparent shadow-[4px_-4px_0_0_rgba(255,255,255,0.2)] rounded-tr-full pointer-events-none" />
                </>
              )}

              <item.icon className={cn(
                "h-6 w-6 shrink-0 transition-all duration-200",
                item.isActive ? "text-white scale-110 drop-shadow-[0_0_8px_rgba(255,255,255,0.5)]" : "text-white/70 group-hover:text-white"
              )} />
              
              {!isCollapsed && (
                <span className="text-[1.1rem] font-black font-black-force tracking-tight whitespace-nowrap overflow-hidden">
                  {item.label}
                </span>
              )}

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
        
        {/* Upgrade/Help Box */}
        <div className={cn("p-3 mt-auto transition-all", isCollapsed && "px-2")}>
          {!isCollapsed ? (
            <div className="bg-white/10 rounded-2xl p-4 border border-white/10 relative overflow-hidden group">
              <div className="relative z-10">
                <div className="h-10 w-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center mb-2">
                  <BrainCircuit className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xs font-black text-white mb-0.5">طور حسابك الآن!</h3>
                <p className="text-[9px] text-white/60 font-bold mb-2 leading-tight">احصل على وصول كامل لجميع المميزات المتقدمة والتحليلات الذكية.</p>
                <Button 
                  className="w-full bg-white/20 backdrop-blur-xl text-white border border-white/20 font-black hover:bg-white/30 py-2.5 rounded-2xl h-auto text-xs shadow-xl"
                  onClick={() => whatsappNumber && window.open(`https://wa.me/${whatsappNumber}`, '_blank')}
                >
                  ترقية الحساب
                </Button>
              </div>
            </div>
          ) : (
            <button 
              className="w-12 h-12 flex items-center justify-center bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all mx-auto"
              onClick={() => whatsappNumber && window.open(`https://wa.me/${whatsappNumber}`, '_blank')}
            >
              <MessageCircle className="h-6 w-6" />
            </button>
          )}
        </div>
      </aside>
    </div>
  );
};
