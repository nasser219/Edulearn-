import { db, auth } from '../firebase';
import { collection, addDoc, serverTimestamp, query, orderBy, limit, onSnapshot, where } from 'firebase/firestore';
import { useEffect } from 'react';

export type SecurityEventType = 'SCREEN_RECORDING' | 'DEVTOOLS' | 'TAB_SWITCH' | 'MULTI_DEVICE' | 'SAVE_AS' | 'PRINT_SCREEN';

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
}

const getEventTitle = (type: SecurityEventType) => {
  switch (type) {
    case 'SCREEN_RECORDING': return 'رصد تسجيل شاشة';
    case 'DEVTOOLS': return 'فتح أدوات المطور (DevTools)';
    case 'TAB_SWITCH': return 'تغيير المتصفح/التبويب';
    case 'MULTI_DEVICE': return 'تسجيل دخول من أجهزة متعددة';
    case 'SAVE_AS': return 'محاولة حفظ المحتوى';
    case 'PRINT_SCREEN': return 'محاولة تصوير الشاشة (Screenshot)';
    default: return 'حدث أمني غير معروف';
  }
};

const getSeverity = (type: SecurityEventType): SecurityEvent['severity'] => {
  switch (type) {
    case 'SCREEN_RECORDING': return 'critical';
    case 'MULTI_DEVICE': return 'high';
    case 'DEVTOOLS': return 'medium';
    case 'PRINT_SCREEN': return 'medium';
    default: return 'low';
  }
};

export const logSecurityEvent = async (type: SecurityEventType, details?: string) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    // In a real environment, you'd use a cloud function or 
    // an external API like ipapi.co to get the IP.
    // For this demonstration, we'll use placeholder data 
    // but structure it for the monitor component.
    
    await addDoc(collection(db, 'security_logs'), {
      userId: user.uid,
      userName: user.displayName || 'طالب مجهول',
      userPhone: user.phoneNumber || 'بدون هاتف',
      event: getEventTitle(type),
      type,
      severity: getSeverity(type),
      timestamp: serverTimestamp(),
      ip: '197.34.XX.XX', // Placeholder
      location: 'القاهرة، مصر', // Placeholder
      userAgent: navigator.userAgent,
      details: details || ''
    });
  } catch (error) {
    console.error('Error logging security event:', error);
  }
};

export const useSecurityDetection = (
  onViolation: (type: SecurityEventType) => void, 
  active: boolean = true,
  config?: { disableTabSwitch?: boolean }
) => {
  useEffect(() => {
    if (!active) return;

    // 1. Detect DevTools (Simple check)
    const threshold = 160;
    const checkDevTools = () => {
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      if (widthThreshold || heightThreshold) {
        onViolation('DEVTOOLS');
      }
    };

    // 2. Detect Tab Switch / Exit
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && !config?.disableTabSwitch) {
        onViolation('TAB_SWITCH');
      }
    };

    // 3. Detect PrintScreen / Keyboard Shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'PrintScreen') {
        onViolation('PRINT_SCREEN');
      }
      if ((e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) || e.key === 'F12') {
        onViolation('DEVTOOLS');
      }
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        onViolation('SAVE_AS');
      }
    };

    // 4. Monitoring getDisplayMedia (Browser native sharing)
    // We proxy it to detect attempts
    const originalGetDisplayMedia = navigator.mediaDevices.getDisplayMedia;
    navigator.mediaDevices.getDisplayMedia = async (options) => {
      onViolation('SCREEN_RECORDING');
      throw new Error('Screen recording is disabled for this content');
    };

    window.addEventListener('resize', checkDevTools);
    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('resize', checkDevTools);
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibility);
      navigator.mediaDevices.getDisplayMedia = originalGetDisplayMedia;
    };
  }, [onViolation, active]);
};

export const subscribeToSecurityLogs = (callback: (logs: SecurityEvent[]) => void) => {
  const q = query(collection(db, 'security_logs'), orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as SecurityEvent[];
    callback(logs);
  });
};
