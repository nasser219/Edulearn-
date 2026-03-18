import { 
  LayoutDashboard, 
  BookOpen, 
  FileText,
  GraduationCap, 
  Users, 
  Settings, 
  MessageCircle, 
  ShieldAlert, 
  BrainCircuit, 
  Search, 
  Bell, 
  ChevronLeft, 
  ChevronRight, 
  X,
  CreditCard,
  BarChart3,
  Megaphone,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEffect, useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';

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

const viewMap: Record<string, string> = {
  'لوحة التحكم': 'DASHBOARD',
  'تصفح المدرسين': 'TEACHERS',
  'دوراتي التعليمية': 'COURSES',
  'إدارة الكورسات': 'MANAGE_COURSES',
  'المهام والواجبات': 'HOMEWORK',
  'بنك الامتحانات': 'QUIZZES',
  'قائمة الطلاب': 'STUDENTS',
  'تقارير الأداء': 'REPORTS',
  'تحليل الأداء الذكي': 'PERFORMANCE_AI',
  'سجل المدفوعات': 'PAYMENTS',
  'الإعلانات المستهدفة': 'ANNOUNCEMENTS',
  'مركز الإشعارات': 'NOTIFICATION_CENTER',
  'مركز الأمان': 'SECURITY',
  'الرسائل': 'MESSAGES',
  'إعدادات الحساب': 'SETTINGS',
};

const itemGradients = [
  'from-blue-400 to-blue-600',
  'from-emerald-400 to-teal-600',
  'from-rose-400 to-pink-600',
  'from-amber-400 to-orange-500',
  'from-indigo-400 to-violet-600',
  'from-cyan-400 to-sky-600',
  'from-purple-400 to-fuchsia-600',
  'from-lime-400 to-green-500',
];

const SidebarBackground = () => (
  <div className="absolute inset-0 rounded-[2rem] lg:rounded-[2.5rem] overflow-hidden pointer-events-none">
    <div className="absolute inset-0 bg-gradient-to-b from-[#1a0533] via-[#2d1058] to-[#1a0533]" />
    <motion.div
      className="absolute -top-20 -right-20 w-72 h-72 rounded-full opacity-30"
      style={{ background: 'radial-gradient(circle, #a855f7 0%, transparent 70%)' }}
      animate={{ scale: [1, 1.2, 1], opacity: [0.25, 0.4, 0.25] }}
      transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
    />
    <motion.div
      className="absolute bottom-20 -left-16 w-56 h-56 rounded-full opacity-20"
      style={{ background: 'radial-gradient(circle, #6366f1 0%, transparent 70%)' }}
      animate={{ scale: [1, 1.15, 1], opacity: [0.15, 0.3, 0.15] }}
      transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
    />
    <div
      className="absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage: `linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px),
                          linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)`,
        backgroundSize: '40px 40px',
      }}
    />
    <div className="absolute top-0 left-8 right-8 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent" />
  </div>
);

const NavItem = ({
  item,
  index,
  isCollapsed,
  onNavigate,
}: {
  item: any;
  index: number;
  isCollapsed: boolean;
  onNavigate?: (view: string) => void;
}) => {
  const gradient = itemGradients[index % itemGradients.length];

  return (
    <motion.button
      key={item.label}
      onClick={() => onNavigate?.(item.viewName)}
      className={cn(
        'w-full relative flex items-center gap-3 py-2.5 transition-all duration-200 group select-none',
        isCollapsed
          ? 'justify-center px-0 mx-auto w-12 h-12 rounded-2xl'
          : 'px-4 rounded-2xl mx-2',
        item.isActive
          ? 'bg-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_4px_24px_rgba(0,0,0,0.25)]'
          : 'hover:bg-white/8'
      )}
      whileHover={{ scale: item.isActive ? 1 : 1.02, x: item.isActive ? 0 : -2 }}
      whileTap={{ scale: 0.97 }}
      layout
    >
      {item.isActive && !isCollapsed && (
        <motion.div
          layoutId="activeIndicator"
          className="absolute right-0 top-2 bottom-2 w-1 rounded-full bg-gradient-to-b from-purple-300 to-pink-400"
          transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        />
      )}

      <div
        className={cn(
          'shrink-0 flex items-center justify-center rounded-xl transition-all duration-200',
          isCollapsed ? 'h-10 w-10' : 'h-9 w-9',
          item.isActive
            ? `bg-gradient-to-br ${gradient} shadow-lg shadow-purple-900/30`
            : 'bg-white/10 group-hover:bg-white/15'
        )}
      >
        <item.icon
          className={cn(
            'transition-all duration-200',
            item.isActive ? 'text-white' : 'text-white/60 group-hover:text-white'
          )}
          style={{ width: isCollapsed ? 20 : 18, height: isCollapsed ? 20 : 18 }}
        />
      </div>

      <AnimatePresence>
        {!isCollapsed && (
          <motion.span
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.15 }}
            className={cn(
              'text-sm font-bold tracking-tight whitespace-nowrap overflow-hidden text-right flex-1',
              item.isActive ? 'text-white' : 'text-white/60 group-hover:text-white/90'
            )}
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>

      {item.badge && !isCollapsed && (
        <span className="shrink-0 text-[10px] font-black bg-gradient-to-r from-rose-400 to-pink-500 text-white rounded-full px-2 py-0.5 shadow-md">
          {item.badge}
        </span>
      )}
      {item.badge && isCollapsed && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-rose-400 rounded-full border border-[#2d1058]" />
      )}

      {isCollapsed && (
        <motion.div
          initial={{ opacity: 0, x: 8 }}
          whileHover={{ opacity: 1, x: 0 }}
          className="absolute right-full mr-3 bg-slate-900/95 backdrop-blur text-white text-xs font-bold px-3 py-1.5 rounded-lg pointer-events-none z-[200] whitespace-nowrap shadow-xl border border-white/10"
        >
          {item.label}
          <div className="absolute top-1/2 -right-1 -translate-y-1/2 border-[4px] border-transparent border-l-slate-900/95" />
        </motion.div>
      )}
    </motion.button>
  );
};

export const Sidebar = ({
  className,
  onNavigate,
  currentView,
  isOpen,
  onClose,
}: {
  className?: string;
  onNavigate?: (view: any) => void;
  currentView?: string;
  isOpen?: boolean;
  onClose?: () => void;
}) => {
  const { profile, isAdmin, isStudent } = useEducatorsAuth();
  const { unreadCount } = useNotifications();
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('sidebar_collapsed');
      return saved ? JSON.parse(saved) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    localStorage.setItem('sidebar_collapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed]);

  useEffect(() => {
    return onSnapshot(doc(db, 'settings', 'system'), (snap) => {
      if (snap.exists()) setWhatsappNumber(snap.data().whatsappNumber || '');
    });
  }, []);

  const filteredItems = navItems
    .map((item) => {
      const viewName: string =
        item.label === 'تقارير الأداء'
          ? isStudent()
            ? 'STUDENT_RESULTS'
            : 'REPORTS'
          : viewMap[item.label] || 'DASHBOARD';

      const displayLabel = item.label === 'دوراتي التعليمية' ? 'الكورسات' : item.label;
      const isActive = currentView === viewName;
      const badge = item.label === 'مركز الإشعارات' && unreadCount > 0 ? unreadCount : undefined;

      return { ...item, label: displayLabel, isActive, viewName, badge };
    })
    .filter((item) => {
      const roleMatch = isAdmin()
        ? true
        : profile
        ? item.roles.includes(profile.role)
        : false;

      const searchMatch =
        !searchQuery ||
        item.label.includes(searchQuery) ||
        item.label.toLowerCase().includes(searchQuery.toLowerCase());

      return roleMatch && searchMatch;
    });

  const sidebarContent = (
    <aside
      className="h-full flex flex-col relative overflow-hidden rounded-[2rem] lg:rounded-[2.5rem]"
      style={{ fontFamily: "-apple-system, 'SF Pro Display', 'Tajawal', 'Cairo', sans-serif" }}
      dir="rtl"
    >
      <SidebarBackground />

      {/* Header */}
      <div className={cn('relative z-10 pt-4 pb-3', isCollapsed ? 'px-2' : 'px-4 sm:px-5')}>
        <div className="flex items-center justify-between mb-4">
          <div className={cn('flex items-center gap-3', isCollapsed && 'justify-center w-full')}>
            <motion.div
              whileHover={{ rotate: -5, scale: 1.05 }}
              className={cn(
                'flex items-center justify-center rounded-2xl bg-gradient-to-br from-purple-400/30 to-indigo-500/30 border border-white/20 backdrop-blur-xl shadow-2xl shrink-0',
                isCollapsed ? 'h-11 w-11' : 'h-12 w-12'
              )}
            >
              <GraduationCap
                style={{ width: isCollapsed ? 22 : 26, height: isCollapsed ? 22 : 26 }}
                className="text-white"
              />
            </motion.div>

            <AnimatePresence>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex flex-col text-right overflow-hidden"
                >
                  <span className="text-lg font-black text-white tracking-tight whitespace-nowrap">
                    التربويين
                  </span>
                  <span className="text-[9px] font-bold text-white/40 tracking-widest uppercase whitespace-nowrap">
                    EduLearn DRM v3.0
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Desktop collapse toggle */}
          {!isOpen && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsCollapsed(!isCollapsed)}
              className={cn(
                'hidden lg:flex h-8 w-8 items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white transition-all border border-white/10',
                isCollapsed && 'mx-auto mt-1'
              )}
            >
              {isCollapsed ? (
                <ChevronLeft className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </motion.button>
          )}

          {/* Mobile close btn inside sidebar header */}
          {isOpen && (
            <button
              onClick={onClose}
              className="lg:hidden h-8 w-8 flex items-center justify-center rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/10"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Search bar */}
        <AnimatePresence>
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 40 }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="relative overflow-hidden"
            >
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث سريع..."
                className="w-full h-10 pr-9 pl-4 bg-white/10 border border-white/10 hover:border-white/20 focus:border-purple-400/50 rounded-xl text-sm font-semibold text-white outline-none transition-all placeholder:text-white/30 focus:bg-white/15"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="relative z-10 mx-5 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent mb-2" />

      {/* Navigation */}
      <nav
        className={cn(
          'relative z-10 flex-1 overflow-y-auto overflow-x-hidden py-1 space-y-0.5',
          isCollapsed ? 'px-1 flex flex-col items-center' : 'px-1'
        )}
        style={{ scrollbarWidth: 'none' }}
      >
        <AnimatePresence>
          {filteredItems.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-white/30 text-xs font-bold text-center py-6"
            >
              لا توجد نتائج
            </motion.div>
          )}

          {filteredItems.map((item, index) => (
            <motion.div
              key={item.viewName}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03, duration: 0.2 }}
            >
              <NavItem
                item={item}
                index={index}
                isCollapsed={isCollapsed}
                onNavigate={onNavigate}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </nav>

      <div className="relative z-10 mx-5 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent mt-2" />

      {/* Upgrade box */}
      <div className={cn('relative z-10 p-3', isCollapsed && 'flex justify-center')}>
        <AnimatePresence mode="wait">
          {!isCollapsed ? (
            <motion.div
              key="upgrade-box"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="relative overflow-hidden bg-gradient-to-br from-purple-500/20 to-indigo-600/20 rounded-2xl p-4 border border-white/10"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-2xl" />
              <div className="relative z-10 flex items-start gap-3">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center shadow-lg shrink-0">
                  <BrainCircuit className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1 text-right min-w-0">
                  <p className="text-xs font-black text-white mb-0.5">طور حسابك الآن!</p>
                  <p className="text-[10px] text-white/50 font-semibold leading-tight mb-2.5">
                    وصول كامل للمميزات المتقدمة
                  </p>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() =>
                      whatsappNumber && window.open(`https://wa.me/${whatsappNumber}`, '_blank')
                    }
                    className="w-full py-2 rounded-xl bg-gradient-to-r from-purple-400 to-indigo-500 text-white text-xs font-black shadow-lg hover:shadow-purple-500/30 transition-shadow"
                  >
                    ترقية الحساب
                  </motion.button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.button
              key="upgrade-icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() =>
                whatsappNumber && window.open(`https://wa.me/${whatsappNumber}`, '_blank')
              }
              className="h-11 w-11 flex items-center justify-center bg-gradient-to-br from-purple-500/30 to-indigo-600/30 border border-white/10 rounded-2xl text-white hover:from-purple-500/50 hover:to-indigo-600/50 transition-all shadow-lg"
            >
              <MessageCircle className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <motion.div
        className={cn(
          'hidden lg:block sticky top-0 z-40 shrink-0 self-start',
          // ✅ FIX: use h-screen minus header height, not calc(100vh-1rem)
          'h-[calc(100vh-5rem)]',
          isCollapsed ? 'w-[5.5rem]' : 'w-[17rem]',
          className
        )}
        animate={{ width: isCollapsed ? 88 : 272 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {sidebarContent}
      </motion.div>

      {/* Mobile overlay + drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              key="overlay"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] lg:hidden"
              onClick={onClose}
            />

            <motion.div
              key="drawer"
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 220 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.3 }}
              onDragEnd={(_, info) => {
                if (info.offset.x > 80) onClose?.();
              }}
              // ✅ FIX: use safe width that fits small screens
              className="fixed inset-y-0 right-0 z-[101] lg:hidden w-[min(18rem,85vw)] p-2"
              dir="rtl"
            >
              {sidebarContent}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};