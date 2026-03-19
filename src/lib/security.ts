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
// Helpers
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
// FIX 1: Real IP + location via ipapi.co
// Cached so we don't hammer the API on every event
// ─────────────────────────────────────────────
interface GeoInfo { ip: string; location: string }

let geoCache: GeoInfo | null = null;

const getGeoInfo = async (): Promise<GeoInfo> => {
  if (geoCache) return geoCache;
  try {
    const res  = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    geoCache = {
      ip:       data.ip       ?? 'غير معروف',
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
// FIX 2: logSecurityEvent now gets real IP
// and accepts optional studentName/Phone
// (so VideoPlayer can pass them directly)
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
      details:   extra?.details ?? '',
    });
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

// ─────────────────────────────────────────────
// FIX 3: useSecurityDetection
//  - Debounced DevTools check (avoids spam)
//  - getDisplayMedia proxy moved inside effect
//  - useCallback on onViolation to prevent loops
//  - Cleanup is now guaranteed
// ─────────────────────────────────────────────
export const useSecurityDetection = (
  onViolation: (type: SecurityEventType) => void,
  active: boolean = true,
  config?: { disableTabSwitch?: boolean }
) => {
  // Debounce ref: prevent the same event firing more than once per 3 seconds
  const lastFired   = useRef<Partial<Record<SecurityEventType, number>>>({});
  const originalGDM = useRef<typeof navigator.mediaDevices.getDisplayMedia | null>(null);

  const fire = useCallback((type: SecurityEventType) => {
    const now  = Date.now();
    const last = lastFired.current[type] ?? 0;
    if (now - last < 3000) return;          // debounce 3 s
    lastFired.current[type] = now;
    onViolation(type);
  }, [onViolation]);

  useEffect(() => {
    if (!active) return;

    // ── 1. DevTools via dimension diff (debounced on resize) ──
    let devToolsTimer: ReturnType<typeof setTimeout>;
    const checkDevTools = () => {
      clearTimeout(devToolsTimer);
      devToolsTimer = setTimeout(() => {
        const W = window.outerWidth  - window.innerWidth  > 160;
        const H = window.outerHeight - window.innerHeight > 160;
        if (W || H) fire('DEVTOOLS');
      }, 500);
    };

    // ── 2. Tab visibility ──
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && !config?.disableTabSwitch) {
        fire('TAB_SWITCH');
      }
    };

    // ── 3. Keyboard shortcuts ──
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        fire('PRINT_SCREEN');
        return;
      }
      const devToolsShortcut =
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
        e.key === 'F12';
      if (devToolsShortcut) { fire('DEVTOOLS'); return; }

      if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        fire('SAVE_AS');
      }

      // Meta key (Mac) equivalents
      if (e.metaKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        fire('SAVE_AS');
      }
    };

    // ── 4. Proxy getDisplayMedia ──
    originalGDM.current = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getDisplayMedia = async () => {
      fire('SCREEN_RECORDING');
      throw new DOMException('Screen recording is disabled for this content.', 'NotAllowedError');
    };

    // ── 5. Right-click / context menu ──
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();

    window.addEventListener('resize',           checkDevTools);
    window.addEventListener('keydown',          handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibility);
    document.addEventListener('contextmenu',    handleContextMenu);

    return () => {
      clearTimeout(devToolsTimer);
      window.removeEventListener('resize',            checkDevTools);
      window.removeEventListener('keydown',           handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibility);
      document.removeEventListener('contextmenu',     handleContextMenu);
      // Restore original getDisplayMedia
      if (originalGDM.current) {
        navigator.mediaDevices.getDisplayMedia = originalGDM.current;
      }
    };
  }, [active, fire, config?.disableTabSwitch]);
};

// ─────────────────────────────────────────────
// FIX 4: Watermark canvas utility
// Burns student info into a canvas overlay
// ─────────────────────────────────────────────
export const drawWatermark = (
  canvas: HTMLCanvasElement,
  text: string,
  opacity = 0.18
) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width  = canvas.offsetWidth  || 640;
  canvas.height = canvas.offsetHeight || 360;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();

  ctx.globalAlpha = opacity;
  ctx.fillStyle   = 'white';
  ctx.font        = `bold ${Math.max(12, canvas.width / 40)}px monospace`;
  ctx.textAlign   = 'center';

  // Diagonal tiling
  const spacing = 180;
  for (let y = -canvas.height; y < canvas.height * 2; y += spacing) {
    for (let x = -canvas.width; x < canvas.width * 2; x += spacing) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 6);        // –30°
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }

  ctx.restore();
};

// ─────────────────────────────────────────────
// subscribeToSecurityLogs (unchanged API)
// ─────────────────────────────────────────────
export const subscribeToSecurityLogs = (
  callback: (logs: SecurityEvent[]) => void
) => {
  const q = query(
    collection(db, 'security_logs'),
    orderBy('timestamp', 'desc'),
    limit(50)
  );
  return onSnapshot(q, (snapshot) => {
    callback(
      snapshot.docs.map(d => ({ id: d.id, ...d.data() } as SecurityEvent))
    );
  });
};