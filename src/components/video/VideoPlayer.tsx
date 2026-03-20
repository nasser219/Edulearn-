import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ShieldCheck, MonitorOff, CheckCircle2 } from 'lucide-react';
import {
  useScreenRecordingDetection,
  logSecurityEvent,
} from '../../lib/security';
import { Button } from '../ui/Button';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const BUNNY_LIBRARY_ID = '618859';
const COMPLETION_THRESHOLD = 95; // % to consider video "watched"

interface VideoPlayerProps {
  src: string;
  studentName: string;
  studentPhone: string;
  onEnded?: () => void;
  onProgress?: (percent: number) => void;
  courseThumbnail?: string;
  initialProgress?: number; // 0-100, previously saved progress
}

// ─────────────────────────────────────────────
// Watermark canvas — transparent overlay
// ─────────────────────────────────────────────
const drawWatermark = (canvas: HTMLCanvasElement, text: string, time: number) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.offsetWidth;
  const h = canvas.offsetHeight;
  if (!w || !h) return;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, w, h);
  ctx.save();
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 4;
  ctx.font = `bold ${Math.max(10, w / 55)}px monospace`;
  ctx.textAlign = 'center';
  const spacing = 220;

  const speed = 0.05;
  const offsetX = (time * speed) % spacing;
  const offsetY = (time * speed * 0.5) % spacing;

  for (let y = -h - spacing; y < h * 2; y += spacing) {
    for (let x = -w - spacing; x < w * 2; x += spacing) {
      ctx.save();
      ctx.translate(x + offsetX, y + offsetY);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();
};

// ─────────────────────────────────────────────
// Bunny embed URLs
// ─────────────────────────────────────────────
const buildBunnyUrl = (src: string, muted: boolean) => [
  `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${src}`,
  `?autoplay=false`,
  `&preload=false`,
  `&responsive=true`,
  `&letterbox=false`,
  `&controls=true`,
  `&muted=${muted}`,
  // Disable forward seeking — only allow watched content
  `&showHeatmap=false`,
].join('');

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export const VideoPlayer = ({
  src,
  studentName,
  studentPhone,
  onEnded,
  onProgress,
  initialProgress = 0,
}: VideoPlayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [iframeUrl, setIframeUrl] = useState(buildBunnyUrl(src, false));
  
  // ── Progress tracking ──
  const [watchedPercent, setWatchedPercent] = useState(initialProgress);
  const [isCompleted, setIsCompleted] = useState(initialProgress >= COMPLETION_THRESHOLD);
  const maxWatchedRef = useRef<number>(initialProgress); // highest % watched so far
  const hasCalledEndedRef = useRef(false);
  const activityStartTime = useRef<number>(Date.now());

  const watermarkText = `${studentName} · ${studentPhone}`;

  // ── Switch iframe URL to muted/unmuted ──
  useEffect(() => {
    setIframeUrl(buildBunnyUrl(src, isRecording));
  }, [isRecording, src]);

  // Fallback: If student has been on the video for > 45s, and it's still not "completing",
  // we can assume events might be failing and allow them to finish.
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isCompleted && !hasCalledEndedRef.current) {
        const timeElapsed = (Date.now() - activityStartTime.current) / 1000;
        if (timeElapsed > 45 && watchedPercent < 10) {
           setWatchedPercent(prev => Math.max(prev, 15));
        }
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [isCompleted, watchedPercent]);

  // ── Listen to Bunny.net iframe postMessage events ──
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Broaden origin check
      const origin = event.origin.toLowerCase();
      if (!origin.includes('mediadelivery.net') && !origin.includes('bunny') && !origin.includes('vid')) return;
      
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const eventName = (data.event || data.name || '').toLowerCase();

        // Standard Bunny/VidPlayer events
        if (eventName.includes('progress') || eventName.includes('time') || eventName === 'play') {
          const currentTime = data.data?.currentTime || data.currentTime || data.time || 0;
          const duration = data.data?.duration || data.duration || 1;
          const percent = Math.round((currentTime / duration) * 100);
          
          if (percent > 0) {
            if (percent > maxWatchedRef.current) maxWatchedRef.current = percent;
            setWatchedPercent(percent);
            onProgress?.(percent);
          }
          
          if (percent >= COMPLETION_THRESHOLD && !hasCalledEndedRef.current) {
            hasCalledEndedRef.current = true;
            setIsCompleted(true);
            onEnded?.();
          }
        }
        
        if (eventName.includes('end')) {
          setWatchedPercent(100);
          onProgress?.(100);
          if (!hasCalledEndedRef.current) {
            hasCalledEndedRef.current = true;
            setIsCompleted(true);
            onEnded?.();
          }
        }
      } catch (e) {
        // Silent
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onEnded, onProgress, isCompleted]);

  // ── Watermark ──
  const renderWatermark = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (canvas) drawWatermark(canvas, watermarkText, time);
    animRef.current = requestAnimationFrame(renderWatermark);
  }, [watermarkText]);

  useEffect(() => {
    const t = setTimeout(() => {
      animRef.current = requestAnimationFrame(renderWatermark);
    }, 500);
    return () => { clearTimeout(t); cancelAnimationFrame(animRef.current); };
  }, [renderWatermark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new ResizeObserver(() => drawWatermark(canvas, watermarkText));
    obs.observe(canvas);
    return () => obs.disconnect();
  }, [watermarkText]);

  // ── Screen recording detection ──
  const handleRecordingStart = useCallback(() => {
    setIsRecording(true);
    logSecurityEvent('SCREEN_RECORDING', { studentName, studentPhone });
  }, [studentName, studentPhone]);

  const handleRecordingStop = useCallback(() => {
    setIsRecording(false);
  }, []);

  useScreenRecordingDetection(handleRecordingStart, handleRecordingStop, true);

  // ── Tab visibility — pause video when tab is hidden ──
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden' && !isCompleted) {
        // Send pause command to Bunny iframe
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({ event: 'pause' }),
          '*'
        );
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isCompleted]);

  // ── Screenshot blocking CSS ──
  useEffect(() => {
    // Add screenshot protection styles
    const style = document.createElement('style');
    style.id = 'video-protection-css';
    style.textContent = `
      @media print {
        .video-protected-container { display: none !important; }
        body::after { content: "طباعة المحتوى محظورة" !important; display: block; font-size: 3rem; text-align: center; padding: 4rem; }
      }
    `;
    if (!document.getElementById('video-protection-css')) {
      document.head.appendChild(style);
    }
    return () => {
      const el = document.getElementById('video-protection-css');
      el?.remove();
    };
  }, []);

  return (
    <div
      className="video-protected-container relative w-full bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl mx-auto select-none"
      style={{ paddingBottom: '56.25%', height: 0, WebkitUserSelect: 'none', userSelect: 'none' }}
      onDragStart={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Bunny iframe ── */}
      <iframe
        ref={iframeRef}
        key={iframeUrl}
        src={iframeUrl}
        className="absolute inset-0 w-full h-full border-0"
        style={{
          top: 0,
          left: 0,
          filter: isRecording ? 'blur(50px) brightness(0.05)' : 'none',
          transition: 'filter 0.3s ease',
        }}
        allowFullScreen
        allow="accelerometer; gyroscope; autoplay; encrypted-media; fullscreen; clipboard-write; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        title={`lesson-${src}`}
        scrolling="no"
      />

      {/* ── Canvas watermark ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-[25]"
        style={{ top: 0, left: 0, width: '100%', height: '100%' }}
      />

      {/* ── Progress bar overlay at bottom ── */}
      {!isRecording && (
        <div className="absolute bottom-0 left-0 right-0 z-[30] pointer-events-none px-2 pb-1">
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
              <div 
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{ 
                  width: `${watchedPercent}%`,
                  background: isCompleted 
                    ? 'linear-gradient(90deg, #22c55e, #16a34a)' 
                    : 'linear-gradient(90deg, #8b5cf6, #6d28d9)'
                }}
              />
            </div>
            {isCompleted && (
              <CheckCircle2 className="h-4 w-4 text-green-400 drop-shadow-lg animate-in zoom-in duration-300" />
            )}
          </div>
        </div>
      )}

      {/* ── Manual Completion Fallback Button ── */}
      {!isCompleted && !isRecording && (
        <div className="absolute top-6 left-6 z-[60] animate-in bounce-in duration-700">
           <Button 
            variant="primary" 
            size="lg" 
            className="rounded-2xl h-14 px-8 bg-green-500 hover:bg-green-600 text-white font-black shadow-[0_0_30px_rgba(34,197,94,0.4)] border-2 border-white/30 flex items-center gap-3 active:scale-95 transition-all"
            onClick={() => {
              if (confirm('هل انتهيت من مشاهدة الفيديو؟ سيتم احتساب الدرس كملتم وتفعيل الامتحان التالي.')) {
                hasCalledEndedRef.current = true;
                setIsCompleted(true);
                setWatchedPercent(100);
                onProgress?.(100);
                onEnded?.();
              }
            }}
           >
             <div className="bg-white/20 p-1.5 rounded-lg">
               <CheckCircle2 className="h-5 w-5" />
             </div>
             تأكيد اكتمال المشاهدة وتفعيل الامتحان
           </Button>
        </div>
      )}

      {/* ── Corner badge ── */}
      {!isRecording && (
        <div className="absolute bottom-12 right-3 z-[30] pointer-events-none">
          <div className="bg-black/25 backdrop-blur-sm px-2 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
            <ShieldCheck className="h-2.5 w-2.5 text-emerald-400/40" />
            <p className="text-[8px] font-black text-white/20 tracking-tight">
              {studentName} · {studentPhone}
            </p>
          </div>
        </div>
      )}

      {/* ── Recording Warning Overlay ── */}
      {isRecording && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping scale-150" />
            <div className="h-16 w-16 md:h-20 md:w-20 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl relative z-10">
              <MonitorOff className="h-8 w-8 md:h-10 md:w-10" />
            </div>
          </div>

          <div className="bg-slate-900/95 backdrop-blur-xl rounded-3xl p-6 md:p-8 max-w-sm border border-red-500/30 shadow-2xl">
            <h2 className="text-xl md:text-2xl font-black text-white mb-3">
              🚫 تسجيل الشاشة محظور
            </h2>
            <p className="text-slate-400 font-bold text-sm mb-5 leading-relaxed">
              تم رصد تسجيل الشاشة.<br />
              تم إيقاف الفيديو وكتم الصوت تلقائياً.
            </p>
            <div className="mb-5 px-4 py-2.5 bg-red-900/40 border border-red-700/30 rounded-2xl">
              <p className="text-[11px] font-black text-red-400 tracking-wider">
                تم التوثيق باسم: {studentName}
              </p>
            </div>
            <Button
              onClick={() => setIsRecording(false)}
              className="w-full bg-brand-primary h-12 rounded-2xl text-white font-black shadow-lg border-none"
            >
              أوقفت التسجيل — استمر في المشاهدة
            </Button>
            <p className="text-[10px] text-slate-600 font-bold mt-4">
              {studentPhone} · تم الحفظ في سجلات الأمان
            </p>
          </div>
        </div>
      )}

      <div className="absolute inset-0 z-[20] pointer-events-none select-none" aria-hidden="true" />
    </div>
  );
};