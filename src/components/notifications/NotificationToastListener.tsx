import React, { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, limit, Timestamp } from 'firebase/firestore';
import { db } from '../../firebase';
import { useEducatorsAuth } from '../auth/AuthProvider';
import toast from 'react-hot-toast';
import { Bell, CreditCard, BookOpen, GraduationCap } from 'lucide-react';

interface NotificationToastListenerProps {
  onNavigate: (view: any) => void;
}

export const NotificationToastListener: React.FC<NotificationToastListenerProps> = ({ onNavigate }) => {
  const { user, isTeacher, isAdmin } = useEducatorsAuth();
  const mountedTime = useRef(Timestamp.now());
  const lastProcessedId = useRef<string | null>(null);

  useEffect(() => {
    if (!user?.uid || (!isTeacher() && !isAdmin())) return;

    // We only want to notify about NEW unread notifications created AFTER the app loaded
    const q = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;

      const doc = snapshot.docs[0];
      const data = doc.data();
      const notificationId = doc.id;

      // Skip if already processed or if it's an old notification from a previous session
      if (notificationId === lastProcessedId.current) return;
      
      // Ensure it's truly a recent notification (within the last 30 seconds of app being open)
      const createdAt = data.createdAt?.toMillis() || 0;
      const now = Date.now();
      if (now - createdAt > 30000) return;

      lastProcessedId.current = notificationId;

      // Trigger Toast
      toast.custom((t) => (
        <div
          className={`${
            t.visible ? 'animate-enter' : 'animate-leave'
          } max-w-md w-full bg-white shadow-2xl rounded-[2rem] pointer-events-auto flex ring-1 ring-black ring-opacity-5 border-2 border-brand-primary/10 overflow-hidden`}
          dir="rtl"
        >
          <div className="flex-1 w-0 p-5">
            <div className="flex items-start">
              <div className="flex-shrink-0 pt-0.5">
                <div className="h-12 w-12 rounded-2xl bg-brand-primary/10 flex items-center justify-center text-brand-primary">
                  {data.type === 'ENROLLMENT' ? <CreditCard className="h-6 w-6" /> : 
                   data.type === 'QUIZ_GRADED' ? <GraduationCap className="h-6 w-6" /> :
                   <Bell className="h-6 w-6" />}
                </div>
              </div>
              <div className="mr-4 flex-1">
                <p className="text-sm font-black text-slate-900 leading-tight">
                  {data.title}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500 leading-relaxed line-clamp-2">
                  {data.message}
                </p>
              </div>
            </div>
          </div>
          <div className="flex border-r border-slate-100 bg-slate-50/50">
            <button
              onClick={() => {
                if (data.link) onNavigate(data.link);
                toast.dismiss(t.id);
              }}
              className="w-full border border-transparent rounded-none rounded-l-lg p-4 flex items-center justify-center text-xs font-black text-brand-primary hover:bg-white hover:text-brand-primary-dark transition-all"
            >
              عرض الآن
            </button>
          </div>
        </div>
      ), {
        duration: 6000,
        position: 'top-right'
      });
    }, (error) => {
      console.error("Error in NotificationToastListener:", error);
    });

    return () => unsubscribe();
  }, [user?.uid, isTeacher, isAdmin]);

  return null; // This component doesn't render anything itself
};
