import React, { useEffect, useRef, useState } from 'react';
import { Shield, Lock, Maximize, AlertCircle } from 'lucide-react';
import { useSecurityDetection, logSecurityEvent, SecurityEventType } from '../../lib/security';
import { Button } from '../ui/Button';

interface VideoPlayerProps {
  src: string;
  studentName: string;
  studentPhone: string;
  ipAddress: string;
  courseThumbnail?: string;
  onEnded?: () => void;
}

export const VideoPlayer = ({ src, studentName, studentPhone, ipAddress, courseThumbnail, onEnded }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isViolation, setIsViolation] = useState(false);
  const [violationType, setViolationType] = useState<SecurityEventType | null>(null);
  const [maxWatchedTime, setMaxWatchedTime] = useState(0);

  useSecurityDetection((type) => {
    setIsViolation(true);
    setViolationType(type);
    logSecurityEvent(type);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  }, !isViolation, { disableTabSwitch: true });

  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault();
    
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  return (
    <div className="relative aspect-video bg-black rounded-xl overflow-hidden shadow-2xl no-select group">
      <video
        ref={videoRef}
        src={src}
        className={`w-full h-full object-contain bg-black transition-all ${isViolation ? 'blur-2xl grayscale' : ''}`}
        controls={!isViolation}
        playsInline={true}
        preload="auto"
        controlsList="nodownload"
        onTimeUpdate={() => {
          if (!videoRef.current) return;
          const current = videoRef.current.currentTime;
          // Prevent seeking forward by more than 2 seconds (allow natural playback)
          if (current > maxWatchedTime + 2) {
            videoRef.current.currentTime = maxWatchedTime;
          } else {
            setMaxWatchedTime(Math.max(maxWatchedTime, current));
          }
        }}
        onEnded={onEnded}
        onContextMenu={(e) => e.preventDefault()}
      >
        Your browser does not support the video tag.
      </video>

      {/* Internal Redundant Watermark */}
      <div className="absolute top-4 right-4 z-[30] pointer-events-none opacity-20 bg-black/40 backdrop-blur-sm px-3 py-1 rounded-lg border border-white/10">
        <p className="text-[8px] font-black text-white/50 tracking-tighter uppercase">{studentName} | {studentPhone}</p>
      </div>

      {/* Security Violation Overlay */}
      {isViolation && (
        <div className="absolute inset-0 z-[100] bg-slate-900/95 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in duration-300">
          <div className="h-20 w-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center mb-6 shadow-2xl animate-bounce">
            <AlertCircle className="h-10 w-10" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4">تم رصد محاولة تسجيل! 👋</h2>
          <p className="text-slate-400 font-bold text-lg mb-8 max-w-md leading-relaxed">
             يرجى إيقاف برنامج التسجيل أو مشاركة الشاشة لتتمكن من متابعة المشاهدة. هذا الإجراء تم رصده وتوثيقه في سجلات الأمان.
          </p>
          <Button 
            onClick={() => {
              setIsViolation(false);
              setViolationType(null);
            }}
            className="bg-brand-primary h-14 px-10 rounded-2xl text-white font-black hover:bg-brand-accent transition-all shadow-lg shadow-brand-primary/20"
          >
            نعم، قمت بالإيقاف للاستمرار
          </Button>
        </div>
      )}

      {/* Protective Overlay Layer */}
      <div className="absolute inset-0 z-[20] pointer-events-none select-none touch-none"></div>
    </div>
  );
};
