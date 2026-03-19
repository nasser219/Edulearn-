import { LogOut, User as UserIcon, Bell, Menu, Search, Accessibility, UserPlus, GraduationCap, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { useEducatorsAuth } from '../auth/AuthProvider';
import { useState } from 'react';
import { useNotifications } from '../../hooks/useNotifications';
import { NotificationList } from '../notifications/NotificationList';

export const Header = ({ onMenuClick, onNavigate }: { onMenuClick?: () => void, onNavigate?: (view: any) => void }) => {
  const { user, logout, profile } = useEducatorsAuth();
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  
  const { unreadCount } = useNotifications();

  const getRoleLabel = () => {
    if (profile?.role === 'ADMIN') return 'Super Admin 🛡️';
    if (profile?.role === 'TEACHER') return 'معلم قدير 👨‍🏫';
    if (profile?.role === 'STUDENT') return 'طالب متميز 🎓';
    return profile ? 'عضو المنصة' : 'جاري إعداد الحساب...';
  };

  return (
    <>
      <header className="h-[4.5rem] sm:h-[5rem] border-b border-white/10 bg-white/40 backdrop-blur-md px-3 sm:px-6 flex items-center justify-between sticky top-0 z-50 gap-2">

        {/* Right side: Menu + Logo */}
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <button
            className="lg:hidden h-11 w-11 flex items-center justify-center rounded-full bg-white border border-slate-200 shadow-md text-slate-800 hover:bg-slate-50 active:scale-95 transition-all shrink-0"
            onClick={onMenuClick}
            aria-label="القائمة الجانبية"
            title="القائمة الجانبية"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="w-9 h-9 sm:w-11 sm:h-11 bg-white/20 backdrop-blur-xl rounded-xl sm:rounded-[1.25rem] border border-white/20 flex items-center justify-center shadow-xl transition-transform hover:scale-110 active:scale-95 cursor-pointer shrink-0">
              <GraduationCap className="h-5 w-5 sm:h-6 sm:w-6 text-brand-primary" />
            </div>
            <span className="font-black text-xl sm:text-3xl text-brand-primary hidden sm:inline-block tracking-tight brand-text">التربويين</span>
          </div>
        </div>

        {/* Center: Search bar — desktop only */}
        <div className="flex-1 max-w-lg mx-4 sm:mx-8 hidden lg:block">
          <div className="relative group">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
            <input
              type="text"
              placeholder="بحث سريع..."
              className="w-full h-11 pr-12 pl-4 bg-white/40 backdrop-blur-xl border border-white/30 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Left side: Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {!user ? (
            <>
              <Button variant="ghost" className="hidden sm:flex text-slate-600 font-bold hover:text-brand-primary text-sm px-3">
                تسجيل الدخول
              </Button>
              <Button variant="primary" className="rounded-2xl px-3 sm:px-6 font-black shadow-lg shadow-brand-primary/20 bg-brand-primary text-white text-sm h-10">
                <span className="hidden sm:inline">حساب جديد</span>
                <UserPlus className="h-4 w-4 sm:hidden" />
              </Button>
            </>
          ) : (
            <div className="flex items-center gap-2 sm:gap-3">

              {/* Mobile search toggle */}
              <button
                className="lg:hidden h-10 w-10 flex items-center justify-center rounded-2xl bg-white/20 backdrop-blur-xl border border-white/20 text-slate-700 hover:bg-white/30 transition-all"
                onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
                aria-label="بحث"
              >
                {mobileSearchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
              </button>

              {/* Notifications */}
              <div className="relative">
                <Button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  variant="ghost" 
                  className="relative h-10 w-10 rounded-2xl bg-white/20 backdrop-blur-xl border border-white/20 flex items-center justify-center hover:bg-white/30 transition-all p-0"
                >
                  <Bell className="h-5 w-5 text-slate-700" />
                  {unreadCount > 0 && (
                    <span className="absolute top-2.5 left-2.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white/40 animate-pulse"></span>
                  )}
                </Button>

                {showNotifications && (
                  <>
                    <div 
                      className="fixed inset-0 z-40 bg-transparent" 
                      onClick={() => setShowNotifications(false)}
                    />
                    <div className="absolute top-14 left-0 w-[360px] max-w-[calc(100vw-2rem)] h-[500px] max-h-[calc(100vh-100px)] z-50 animate-in slide-in-from-top-4 duration-300 shadow-2xl rounded-[2.5rem]">
                      <NotificationList 
                        onClose={() => setShowNotifications(false)}
                        onNavigate={(view) => {
                          setShowNotifications(false);
                          onNavigate?.(view);
                        }}
                      />
                    </div>
                  </>
                )}
              </div>

              {/* Profile */}
              <div
                className="flex items-center gap-2 sm:gap-3 cursor-pointer group"
                onClick={() => onNavigate?.('SETTINGS')}
              >
                <div className="text-right hidden md:block">
                  <p className="text-sm font-black text-slate-900 leading-none group-hover:text-brand-primary transition-colors truncate max-w-[120px]">
                    {profile?.fullName || user?.displayName || 'مستخدم'}
                  </p>
                  <p className="text-[10px] text-slate-500 mt-1 font-bold">{getRoleLabel()}</p>
                </div>
                <div className="h-10 w-10 rounded-2xl bg-white/30 backdrop-blur-xl flex items-center justify-center border-2 border-white/50 shadow-lg overflow-hidden ring-2 ring-white/10 group-hover:ring-brand-primary/20 transition-all shrink-0">
                  {profile?.photoURL || user?.photoURL ? (
                    <img src={profile?.photoURL || user?.photoURL || ''} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon className="h-5 w-5 text-brand-primary" />
                  )}
                </div>
                <button
                  title="تسجيل الخروج"
                  onClick={(e) => { e.stopPropagation(); logout(); }}
                  className="h-10 w-10 flex items-center justify-center rounded-2xl bg-gradient-to-tr from-brand-primary to-mauve-accent text-white shadow-lg shadow-brand-primary/20 hover:scale-110 active:scale-95 transition-all shrink-0"
                  aria-label="تسجيل الخروج"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Mobile Search Bar — slides down */}
      {mobileSearchOpen && (
        <div className="lg:hidden sticky top-[4.5rem] z-40 bg-white/80 backdrop-blur-md border-b border-white/20 px-4 py-3 animate-in slide-in-from-top-2 duration-200">
          <div className="relative">
            <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="بحث سريع..."
              autoFocus
              className="w-full h-11 pr-12 pl-4 bg-white/60 border border-white/40 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all placeholder:text-slate-400"
            />
          </div>
        </div>
      )}
    </>
  );
};