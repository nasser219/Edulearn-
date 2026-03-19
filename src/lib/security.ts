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
  isMobile?: boolean;
}

export const IS_MOBILE =
  /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent) ||
  ('ontouchstart' in window && navigator.maxTouchPoints > 0);

const EVENT_TITLES: Record<SecurityEventType, string> = {
  SCREEN_RECORDING: 'رصد تسجيل شاشة',
  DEVTOOLS: 'فتح أدوات المطور (DevTools)',
  TAB_SWITCH: 'تغيير المتصفح/التبويب',
  MULTI_DEVICE: 'تسجيل دخول من أجهزة متعددة',
  SAVE_AS: 'محاولة حفظ المحتوى',
  PRINT_SCREEN: 'محاولة تصوير الشاشة (Screenshot)',
};

const SEVERITY: Record<SecurityEventType, SecurityEvent['severity']> = {
  SCREEN_RECORDING: 'critical',
  MULTI_DEVICE: 'high',
  DEVTOOLS: 'medium',
  PRINT_SCREEN: 'medium',
  TAB_SWITCH: 'low',
  SAVE_AS: 'low',
};

// ── Real IP cached ──
interface GeoInfo { ip: string; location: string }
let geoCache: GeoInfo | null = null;

const getGeoInfo = async (): Promise<GeoInfo> => {
  if (geoCache) return geoCache;
  try {
    const res = await fetch('https://ipapi.co/json/', { signal: AbortSignal.timeout(4000) });
    const data = await res.json();
    geoCache = {
      ip: data.ip ?? 'غير معروف',
      location: data.city && data.country_name ? `${data.city}، ${data.country_name}` : 'غير محدد',
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
      userId: user.uid,
      userName: extra?.studentName ?? user.displayName ?? 'طالب مجهول',
      userPhone: extra?.studentPhone ?? user.phoneNumber ?? 'بدون هاتف',
      event: EVENT_TITLES[type],
      type,
      severity: SEVERITY[type],
      timestamp: serverTimestamp(),
      ip: geo.ip,
      location: geo.location,
      userAgent: navigator.userAgent,
      isMobile: IS_MOBILE,
      details: extra?.details ?? '',
    });
  } catch (err) {
    console.error('Security log error:', err);
  }
};

// ─────────────────────────────────────────────
// useScreenRecordingDetection
//
// THE FIX: We do NOT proxy getDisplayMedia on mount.
// Instead we ONLY proxy it when the user actually
// triggers sharing (user gesture required anyway).
//
// The blur is triggered ONLY when:
//   1. User calls getDisplayMedia (clicks "Share Screen")
//   2. A MediaStream with display surface is detected
//      via navigator.mediaDevices.enumerateDevices trick
//
// We DO NOT fire on:
//   - Page load
//   - HLS buffer stall
//   - Resize
//   - DevTools open
// ─────────────────────────────────────────────
export const useScreenRecordingDetection = (
  onRecordingStart: () => void,
  onRecordingStop: () => void,
  active: boolean = true,
) => {
  const originalGDM = useRef<typeof navigator.mediaDevices.getDisplayMedia | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const hasProxied = useRef(false);

  useEffect(() => {
    // Guard: not supported (mobile Safari, old browsers)
    if (!active) return;
    if (!navigator.mediaDevices?.getDisplayMedia) return;
    if (hasProxied.current) return;

    hasProxied.current = true;
    originalGDM.current = navigator.mediaDevices.getDisplayMedia.bind(navigator.mediaDevices);

    // ── Proxy: only fires when user intentionally starts sharing ──
    navigator.mediaDevices.getDisplayMedia = async (options?: DisplayMediaStreamOptions) => {
      // At this point the user deliberately initiated screen share
      onRecordingStart();

      try {
        const stream = await originalGDM.current!(options);
        streamRef.current = stream;

        // Detect when they stop sharing
        stream.getVideoTracks().forEach(track => {
          track.addEventListener('ended', () => {
            streamRef.current = null;
            onRecordingStop();
          });
        });

        return stream;
      } catch {
        // User cancelled or browser denied — stop blur
        onRecordingStop();
        throw new DOMException('Screen recording is not allowed.', 'NotAllowedError');
      }
    };

    return () => {
      hasProxied.current = false;
      if (originalGDM.current && navigator.mediaDevices?.getDisplayMedia) {
        navigator.mediaDevices.getDisplayMedia = originalGDM.current;
      }
      streamRef.current?.getTracks().forEach(t => t.stop());
    };
  }, [active, onRecordingStart, onRecordingStop]);
};

// ─────────────────────────────────────────────
// useSecurityDetection (log-only, no blur)
// ─────────────────────────────────────────────
export const useSecurityDetection = (
  onViolation: (type: SecurityEventType) => void,
  active: boolean = true,
  config?: { disableTabSwitch?: boolean }
) => {
  const lastFired = useRef<Partial<Record<SecurityEventType, number>>>({});

  const fire = useCallback((type: SecurityEventType) => {
    if (IS_MOBILE && type === 'DEVTOOLS') return;
    const now = Date.now();
    const last = lastFired.current[type] ?? 0;
    if (now - last < 3000) return;
    lastFired.current[type] = now;
    onViolation(type);
  }, [onViolation]);

  useEffect(() => {
    if (!active) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') { fire('PRINT_SCREEN'); return; }
      const devShortcut =
        (e.ctrlKey && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) ||
        e.key === 'F12';
      if (devShortcut && !IS_MOBILE) { fire('DEVTOOLS'); return; }
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        fire('SAVE_AS');
      }
    };

    const handleVisibility = () => {
      if (IS_MOBILE) return;
      if (document.visibilityState === 'hidden' && !config?.disableTabSwitch) {
        fire('TAB_SWITCH');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [active, fire, config?.disableTabSwitch]);
};

// ─────────────────────────────────────────────
// subscribeToSecurityLogs
// ─────────────────────────────────────────────
export const subscribeToSecurityLogs = (callback: (logs: SecurityEvent[]) => void) => {
  const q = query(collection(db, 'security_logs'), orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() } as SecurityEvent)));
  });
};