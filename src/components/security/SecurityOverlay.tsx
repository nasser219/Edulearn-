import React, { useState, useEffect } from 'react';
import { Shield } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEducatorsAuth } from '../auth/AuthProvider';

interface SecurityOverlayProps {
  children: React.ReactNode;
  active?: boolean;
  onViolation?: (type: string) => void;
  showViolationUI?: boolean;
}

export const SecurityOverlay = ({ children, active = true, onViolation, showViolationUI = true }: SecurityOverlayProps) => {
  const { profile } = useEducatorsAuth();
  const [isFocused, setIsFocused] = useState(true);
  const [watermarkPos, setWatermarkPos] = useState({ top: '10%', left: '10%' });
  const [showBanner, setShowBanner] = useState(true);

  // 1. Tab Switch / Window Blur Detection → triggers violation immediately
  useEffect(() => {
    if (!active) return;

    let wasFocused = true;
    const interval = setInterval(() => {
      const currentFocus = document.hasFocus() && !document.hidden;
      
      if (wasFocused && !currentFocus) {
        wasFocused = false;
        setIsFocused(false);
        if (showViolationUI) {
          onViolation?.('تم اكتشاف فتح تطبيق خارجي أو مغادرة الصفحة');
        }
      } else if (!wasFocused && currentFocus) {
        wasFocused = true;
        setIsFocused(true);
      }
    }, 500);

    return () => clearInterval(interval);
  }, [active, onViolation, showViolationUI]);

  // 1.1 Resize Detection (Commonly triggered by screen recording overlays or DevTools)
  useEffect(() => {
    if (!active) return;
    const handleResize = () => {
      // Small resizes are ignored, but significant ones trigger alert
      if (Math.abs(window.outerWidth - window.innerWidth) > 100 || Math.abs(window.outerHeight - window.innerHeight) > 100) {
         // Potential recording overlay or DevTools
         onViolation?.('تغيير في أبعاد الشاشة (قد يكون تسجيل شاشة)');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [active, onViolation]);

  // 2. Block Shortcuts, Context Menu & Clipboard
  useEffect(() => {
    if (!active) return;

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    const handleCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      e.clipboardData?.setData('text/plain', 'تم منع النسخ لأسباب أمنية.');
      return false;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // PrintScreen = violation
      if (e.key === 'PrintScreen' || e.keyCode === 44) {
        e.preventDefault();
        onViolation?.('محاولة تصوير الشاشة (PrintScreen)');
        return false;
      }
      // Block DevTools silently, no violation
      if (
        (e.ctrlKey && (e.key === 's' || e.key === 'u' || e.key === 'c' || e.key === 'x')) ||
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C'))
      ) {
        e.preventDefault();
        return false;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCopy);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCopy);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [active, onViolation]);

  // 3. Dynamic Watermark
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => {
      setWatermarkPos({
        top: Math.floor(Math.random() * 80 + 10) + '%',
        left: Math.floor(Math.random() * 80 + 10) + '%',
      });
    }, 5000); // More frequent movement
    return () => clearInterval(interval);
  }, [active]);

  // 4. Auto-hide Banner
  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => {
      setShowBanner(false);
    }, 3000);
    return () => clearTimeout(timer);
  }, [active]);

  if (!active) return <>{children}</>;

  return (
    <div className="relative w-full h-full no-select overflow-hidden group/security">

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-500 w-full h-full",
        !isFocused && showViolationUI && "blur-[40px] grayscale brightness-50 pointer-events-none scale-105",
        !isFocused && !showViolationUI && "blur-[60px] brightness-0 pointer-events-none bg-black"
      )}>
        {children}
      </div>

      {/* Violation Overlay - Al-Tarbawiyeen Design */}
      {!isFocused && showViolationUI && (
        <div className="absolute inset-0 z-[9999] bg-slate-900/85 backdrop-blur-[32px] flex flex-col items-center justify-center text-white text-center p-8 animate-in fade-in duration-500">
          <div className="h-20 w-20 bg-white/5 border-2 border-white/20 rounded-full flex items-center justify-center mb-6 shadow-2xl">
            <Shield className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-2xl font-black mb-2 tracking-tight">المحتوى محمي 🛡️</h2>
          <p className="text-white/60 font-bold max-w-xs leading-relaxed text-sm">
            تم اكتشاف محاولة تصوير الشاشة أو الخروج من الصفحة. يرجى العودة للمتابعة.
          </p>
        </div>
      )}

      {/* Floating Watermark */}
      <div
        className="absolute z-[50] pointer-events-none transition-all duration-2000 ease-in-out whitespace-nowrap opacity-[0.14]"
        style={{ top: watermarkPos.top, left: watermarkPos.left, transform: 'translate(-50%, -50%) rotate(-15deg)' }}
      >
        <div className="flex flex-col items-center text-center">
          <p className="text-[14px] font-black tracking-tight text-white drop-shadow-lg">{profile?.fullName}</p>
          <p className="text-[11px] font-bold mt-0.5 text-white/70">{profile?.phone || profile?.email}</p>
          <p className="text-[10px] font-medium mt-0.5 text-white/50 tracking-widest">{profile?.uid?.slice(0, 8)} · {new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      </div>

      {/* Static Micro-Watermarks */}
      <div className="absolute inset-0 z-[49] pointer-events-none grid grid-cols-4 grid-rows-4 opacity-[0.02]">
        {Array.from({ length: 16 }).map((_, i) => (
          <div key={i} className="flex items-center justify-center text-[8px] font-black rotate-[-30deg]">
            {profile?.phone || profile?.uid?.slice(0, 8)}
          </div>
        ))}
      </div>

      <div className="absolute inset-0 z-[100] pointer-events-none bg-gradient-to-tr from-transparent via-white/[0.01] to-transparent" />

      {/* Security Banner */}
      {showBanner && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[101] bg-red-600/10 backdrop-blur-md border border-red-500/20 px-4 py-2 rounded-full pointer-events-none animate-in fade-in slide-in-from-bottom-2 duration-1000">
          <p className="text-[10px] font-black text-red-600/80 animate-pulse whitespace-nowrap">
            ⚠️ تنبيه: يمنع منعا باتا تصوير الشاشة أو تسجيل الفيديو. المحتوى مراقب ومسجل باسم المستخدم.
          </p>
        </div>
      )}
    </div>
  );
};