import { db, auth } from '../firebase';
import {
  collection, addDoc, serverTimestamp,
  query, orderBy, limit, onSnapshot
} from 'firebase/firestore';
import { useEffect, useRef, useCallback } from 'react';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
export type SecurityEventType =
  | 'SCREEN_RECORDING'
  | 'DEVTOOLS'
  | 'TAB_SWITCH'
  | 'MULTI_DEVICE'
  | 'SAVE_AS'
  | 'PRINT_SCREEN';

export interface SecurityEvent {
  id?: string;
  userId: string;
  userName: string;
  userPhone: string;
  event: string;
  type: SecurityEventType;
  timestamp: any;
  ip: string;
  location: string;
  userAgent: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: string;
}

// ─────────────────────────────────────────────
// FIX 1: Mobile detection helper
// Dimension-based DevTools check causes constant
// false positives on mobile (address bar resizing etc.)
// ─────────────────────────────────────────────
const IS_MOBILE =
  /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) ||
  ('ontouchstart' in window && navigator.maxTouchPoints > 0);

// ─────────────────────────────────────────────
// Event metadata
// ─────────────────────────────────────────────
const EVENT_TITLES: Record<SecurityEventType, string> = {
  SCREEN_RECORDING: 'رصد تسجيل شاشة',
  DEVTOOLS:         'فتح أدوات المطور (DevTools)',
  TAB_SWITCH:       'تغيير المتصفح/التبويب',
  MULTI_DEVICE:     'تسجيل دخول من أجهزة متعددة',
  SAVE_AS:          'محاولة حفظ المحتوى',
  PRINT_SCREEN:     'محاولة تصوير الشاشة (Screenshot)',
};

const SEVERITY: Record<SecurityEventType, SecurityEvent['severity']> = {
  SCREEN_RECORDING: 'critical',
  MULTI_DEVICE:     'high',
  DEVTOOLS:         'medium',
  PRINT_SCREEN:     'medium',
  TAB_SWITCH:       'low',
  SAVE_AS:          'low',
};

// ─────────────────────────────────────────────
// FIX 2: Real IP via ipapi.co — cached
// ─────────────────────────────────────────────
interface GeoInfo { ip: string; location: string }
let geoCache: GeoInfo | null = null;

const getGeoInfo = async (): Promise<GeoInfo> => {
  if (geoCache) return geoCache;
  try {
    const res  = await fetch('https://ipapi.co/json/', {
      signal: AbortSignal.timeout(4000)
    });
    const data = await res.json();
    geoCache = {
      ip:       data.ip ?? 'غير معروف',
      location: data.city && data.country_name
                  ? `${data.city}، ${data.country_name}`
                  : 'غير محدد',
    };
  } catch {
    geoCache = { ip: 'غير متاح', location: 'غير متاح' };
  }
  return geoCache;
};

// ─────────────────────────────────────────────
// logSecurityEvent
// ─────────────────────────────────────────────
export const logSecurityEvent = async (
  type: SecurityEventType,
  extra?: { studentName?: string; studentPhone?: string; details?: string }
) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const geo = await getGeoInfo();
    await addDoc(collection(db, 'security_logs'), {
      userId:    user.uid,
      userName:  extra?.studentName  ?? user.displayName ?? 'طالب مجهول',
      userPhone: extra?.studentPhone ?? user.phoneNumber  ?? 'بدون هاتف',
      event:     EVENT_TITLES[type],
      type,
      severity:  SEVERITY[type],
      timestamp: serverTimestamp(),
      ip:        geo.ip,
      location:  geo.location,
      userAgent: navigator.userAgent,
      isMobile:  IS_MOBILE,
      details:   extra?.details ?? '',
    });
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

// ─────────────────────────────────────────────
// useSecurityDetection
// ─────────────────────────────────────────────
export const useSecurityDetection = (
  onViolation: (type: SecurityEventType) => void,
  active: boolean = true,
  config?: { disableTabSwitch?: boolean }
) => {
  const lastFired   = useRef<Partial<Record<SecurityEventType, number>>>({});
  const originalGDM = useRef<typeof navigator.mediaDevices.getDisplayMedia | null>(null);

  const fire = useCallback((type: SecurityEventType) => {
    // FIX 3: Never fire DEVTOOLS on mobile — guaranteed false positive
    if (IS_MOBILE && type === 'DEVTOOLS') return;

    const now  = Date.now();
    const last = lastFired.current[type] ?? 0;
    if (now - last < 3000) return;     // debounce 3s per event type
    lastFired.current[type] = now;
    onViolation(type);
  }, [onViolation]);

  useEffect(() => {
    if (!active) return;

    // ── 1. DevTools via dimension diff ──
    // FIX 4: COMPLETELY disabled on mobile
    // Mobile Chrome/Safari resize window constantly (address bar, keyboard etc.)
    let devToolsTimer: ReturnType<typeof setTimeout>;
    const checkDevTools = () => {
      if (IS_MOBILE) return;   // ← key fix
      clearTimeout(devToolsTimer);
      devToolsTimer = setTimeout(() => {
        const W = window.outerWidth  - window.innerWidth  > 160;
        const H = window.outerHeight - window.innerHeight > 160;
        if (W || H) fire('DEVTOOLS');
      }, 800);                  // longer debounce for desktop too
    };

    // ── 2. Tab/app switch ──
    // FIX 5: On mobile this fires every time keyboard appears or
    // user checks a notification. Only use on desktop.
    const handleVisibility = () => {
      if (IS_MOBILE) return;   // ← key fix
      if (document.visibilityState === 'hidden' && !config?.disableTabSwitch) {
        fire('TAB_SWITCH');
      }
    };

    // ── 3. Keyboard shortcuts (desktop only — no physical keyboard on mobile) ──
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        fire('PRINT_SCREEN');
        return;
      }
      const devToolsShortcut =
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
        e.key === 'F12';
      if (devToolsShortcut) { fire('DEVTOOLS'); return; }

      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        fire('SAVE_AS');
      }
    };

    // ── 4. Screen sharing proxy ──
    // FIX 6: Guard against browsers that don't support getDisplayMedia
    if (navigator.mediaDevices?.getDisplayMedia) {
      originalGDM.current = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
      navigator.mediaDevices.getDisplayMedia = async () => {
        fire('SCREEN_RECORDING');
        throw new DOMException('Screen recording is disabled.', 'NotAllowedError');
      };
    }

    // ── 5. Context menu ──
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('resize',              checkDevTools);
    window.addEventListener('keydown',             handleKeyDown);
    document.addEventListener('visibilitychange',  handleVisibility);
    document.addEventListener('contextmenu',       handleContextMenu);

    return () => {
      clearTimeout(devToolsTimer);
      window.removeEventListener('resize',             checkDevTools);
      window.removeEventListener('keydown',            handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('contextmenu',      handleContextMenu);
      if (originalGDM.current && navigator.mediaDevices?.getDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia = originalGDM.current;
      }
    };
  }, [active, fire, config?.disableTabSwitch]);
};

// ─────────────────────────────────────────────
// subscribeToSecurityLogs
// ─────────────────────────────────────────────
export const subscribeToSecurityLogs = (
  callback: (logs: SecurityEvent[]) => void
) => {
  const q = query(
    collection(db, 'security_logs'),
    orderBy('timestamp', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as SecurityEvent)));
  });
};