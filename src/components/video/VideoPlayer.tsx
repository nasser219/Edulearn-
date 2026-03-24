import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, CheckCircle2, MonitorOff } from 'lucide-react';
import {
  useScreenRecordingDetection,
  logSecurityEvent,
} from '../../lib/security';
import { Button } from '../ui/Button';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const BUNNY_LIBRARY_ID = '618859';
const COMPLETION_THRESHOLD = 80; // % to consider video watched (Lowered for maximum reliability)

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
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
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
const buildBunnyUrl = (src: string, isSecured: boolean) => [
  `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${src}`,
  `?autoplay=false`,
  `&preload=false`,
  `&responsive=true`,
  `&letterbox=false`,
  `&controls=true`,
  `&muted=${isSecured}`,
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
  const maxWatchedRef = useRef<number>(initialProgress);
  const hasCalledEndedRef = useRef(false);
  const activityStartTime = useRef<number>(Date.now());

  const watermarkText = `${studentName} · ${studentPhone}`;

  // ── Sync iframe URL to detection state ──
  useEffect(() => {
    setIframeUrl(buildBunnyUrl(src, isRecording));
  }, [isRecording, src]);

  // ── Fallback Progress ──
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

  // ── Event Listener for Bunny ──
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const origin = event.origin.toLowerCase();
      if (!origin.includes('mediadelivery.net') && !origin.includes('bunny') && !origin.includes('vid')) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        const eventName = (data.event || data.name || '').toLowerCase();

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
      } catch (e) { }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onEnded, onProgress, isCompleted]);

  // ── Watermark Rendering ──
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
    const obs = new ResizeObserver(() => drawWatermark(canvas, watermarkText, 0));
    obs.observe(canvas);
    return () => obs.disconnect();
  }, [watermarkText]);

  // ── Recording Detection ──
  const handleRecordingStart = useCallback(() => {
    setIsRecording(true);
    logSecurityEvent('SCREEN_RECORDING', { studentName, studentPhone });
  }, [studentName, studentPhone]);

  const handleRecordingStop = useCallback(() => {
    setIsRecording(false);
  }, []);

  useScreenRecordingDetection(handleRecordingStart, handleRecordingStop, true);

  // ── Cleanup Overlay UI ──
  return (
    <div
      className="video-protected-container relative w-full bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl mx-auto select-none"
      style={{ paddingBottom: '56.25%', height: 0 }}
      onDragStart={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <iframe
        ref={iframeRef}
        key={iframeUrl}
        src={iframeUrl}
        className="absolute inset-0 w-full h-full border-0"
        style={{
          top: 0,
          left: 0,
          filter: isRecording ? 'blur(50px) brightness(0.1)' : 'none',
          transition: 'filter 0.3s ease',
        }}
        allowFullScreen
        allow="accelerometer; gyroscope; autoplay; encrypted-media; fullscreen; clipboard-write; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        title={`lesson-${src}`}
        scrolling="no"
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-[25]"
        style={{ top: 0, left: 0, width: '100%', height: '100%' }}
      />

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

      {/* Recording Warning Overlay - Al-Tarbawiyeen Premium Design */}
      {isRecording && (
        <div className="absolute inset-0 z-[100] bg-slate-900/90 backdrop-blur-[32px] flex flex-col items-center justify-center text-white text-center p-8 transition-all animate-in fade-in zoom-in duration-500">
          <div className="h-24 w-24 bg-white/5 border-2 border-white/20 rounded-full flex items-center justify-center mb-6 shadow-2xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-red-500/10 group-hover:bg-red-500/20 transition-colors animate-pulse" />
            <ShieldAlert className="h-12 w-12 text-white relative z-10" />
          </div>
          <h3 className="text-2xl font-black mb-2 tracking-tight">تنبيه أمني: المحتوى محمي 🛡️</h3>
          <p className="font-bold text-white/60 mb-8 max-w-xs leading-relaxed text-sm">
            تم رصد محاولة لتصوير الشاشة أو تسجيل فيديو.
            يرجى إغلاق كافة برامج التسجيل والعودة للمشاهدة.
          </p>
          <Button
            onClick={() => window.location.reload()}
            className="px-12 h-14 bg-white text-slate-900 rounded-2xl font-black text-lg hover:bg-slate-100 transition-all shadow-2xl shadow-white/5 active:scale-95 border-none"
          >
            إغلاق وتحديث الصفحة 🔄
          </Button>
          <p className="text-[10px] text-white/30 font-bold mt-6">
            ID: {studentPhone} · تم توثيق المحاولة
          </p>
        </div>
      )}

      <div className="absolute inset-0 z-[20] pointer-events-none select-none" aria-hidden="true" />
    </div>
  );
};