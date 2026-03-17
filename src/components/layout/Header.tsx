import { LogOut, User as UserIcon, Bell, Menu, Search, Accessibility, UserPlus } from 'lucide-react';
import { Button } from '../ui/Button';
import { useEducatorsAuth } from '../auth/AuthProvider';

export const Header = ({ onMenuClick, onNavigate }: { onMenuClick?: () => void, onNavigate?: (view: any) => void }) => {
  const { user, logout, profile } = useEducatorsAuth();
  
  const getRoleLabel = () => {
    if (profile?.role === 'ADMIN') return 'Super Admin 🛡️';
    if (profile?.role === 'TEACHER') return 'معلم قدير 👨‍🏫';
    if (profile?.role === 'STUDENT') return 'طالب متميز 🎓';
    return profile ? 'عضو المنصة' : 'جاري إعداد الحساب...';
  };

  return (
    <header className="h-[5rem] border-b border-slate-100 bg-white px-4 flex items-center justify-between sticky top-0 z-50 shadow-premium">
      <div className="flex items-center gap-6">
        <Button variant="ghost" className="lg:hidden h-11 w-11 flex items-center justify-center rounded-xl" onClick={onMenuClick} aria-label="القائمة">
          <Menu className="h-6 w-6 text-brand-primary" />
        </Button>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-primary rounded-xl flex items-center justify-center shadow-lg shadow-brand-primary/20 transition-transform hover:scale-105 active:scale-95">
            <span className="text-white font-black text-2xl">T</span>
          </div>
          <span className="font-black text-3xl text-brand-primary hidden sm:inline-block tracking-tight brand-text">التربويين</span>
        </div>
      </div>

      <div className="flex-1 max-w-lg mx-8 hidden md:block">
        <div className="relative group">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-brand-primary transition-colors" />
          <input 
            type="text" 
            placeholder="ابحث عن دروسك، معلمك، أو امتحاناتك..." 
            className="w-full h-11 pr-12 pl-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
          />
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-4">
        {!user ? (
          <>
            <Button variant="ghost" className="text-slate-600 font-bold hover:text-brand-primary">
              <Accessibility className="h-5 w-5 ml-2 text-brand-secondary" />
              سجل دخولك
            </Button>
            <Button variant="primary" className="rounded-2xl px-6 font-black shadow-lg shadow-brand-primary/30">
              <UserPlus className="h-5 w-5 ml-2" />
              اعمل حساب جديد!
            </Button>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <Button variant="ghost" className="relative h-11 w-11 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
              <Bell className="h-5 w-5 text-slate-600" />
              <span className="absolute top-2.5 left-2.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white animate-pulse"></span>
            </Button>
            
            <div 
              className="flex items-center gap-3 pl-2 border-l border-slate-100 cursor-pointer group"
              onClick={() => onNavigate?.('SETTINGS')}
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-black text-slate-900 leading-none group-hover:text-brand-primary transition-colors">{profile?.fullName || user?.displayName || 'مستخدم'}</p>
                <p className="text-[10px] text-slate-500 mt-1 font-bold">{getRoleLabel()}</p>
              </div>
              <div className="h-10 w-10 rounded-2xl bg-brand-primary/5 flex items-center justify-center border-2 border-white shadow-md overflow-hidden ring-2 ring-slate-50 group-hover:ring-brand-primary/20 transition-all">
                {profile?.photoURL || user?.photoURL ? (
                  <img src={profile?.photoURL || user?.photoURL || ''} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserIcon className="h-6 w-6 text-brand-primary" />
                )}
              </div>
              <Button 
                variant="ghost" 
                title="تسجيل الخروج" 
                onClick={(e) => {
                  e.stopPropagation();
                  logout();
                }} 
                className="h-11 w-11 flex items-center justify-center rounded-xl hover:bg-red-50 hover:text-red-600 transition-colors"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
