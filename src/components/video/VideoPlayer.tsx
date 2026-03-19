import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import {
  useSecurityDetection,
  logSecurityEvent,
  SecurityEventType,
} from '../../lib/security';
import { Button } from '../ui/Button';

// ─────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────
const BUNNY_LIBRARY_ID = '618859';

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface VideoPlayerProps {
  src: string;           // Bunny Video ID  e.g. "0014d585-8507-..."
  studentName: string;
  studentPhone: string;
  onEnded?: () => void;
  courseThumbnail?: string;
}

// ─────────────────────────────────────────────
// Violation messages
// ─────────────────────────────────────────────
const VIOLATION_MESSAGES: Partial<Record<SecurityEventType, { title: string; body: string }>> = {
  SCREEN_RECORDING: {
    title: 'تم رصد تسجيل شاشة! 🎥',
    body: 'يرجى إيقاف برنامج التسجيل أو مشاركة الشاشة لمتابعة المشاهدة.',
  },
  PRINT_SCREEN: {
    title: 'تم رصد محاولة لقطة شاشة! 📸',
    body: 'تصوير المحتوى التعليمي محظور. تم توثيق هذه المحاولة.',
  },
  DEVTOOLS: {
    title: 'تم رصد أدوات المطور! 🔧',
    body: 'يرجى إغلاق نافذة DevTools للاستمرار في المشاهدة.',
  },
  SAVE_AS: {
    title: 'محاولة حفظ المحتوى! 💾',
    body: 'حفظ المحتوى التعليمي محظور بموجب حقوق الملكية الفكرية.',
  },
};

const DEFAULT_VIOLATION = {
  title: 'تم رصد نشاط مشبوه! ⚠️',
  body: 'تم إيقاف الفيديو لأسباب أمنية. تم توثيق هذا الإجراء.',
};

// ─────────────────────────────────────────────
// Canvas watermark helper
// ─────────────────────────────────────────────
const drawWatermark = (canvas: HTMLCanvasElement, text: string) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = canvas.offsetWidth || 640;
  canvas.height = canvas.offsetHeight || 360;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.globalAlpha = 0.13;
  ctx.fillStyle = 'white';
  ctx.font = `bold ${Math.max(11, canvas.width / 45)}px monospace`;
  ctx.textAlign = 'center';

  const spacing = 200;
  for (let y = -canvas.height; y < canvas.height * 2; y += spacing) {
    for (let x = -canvas.width; x < canvas.width * 2; x += spacing) {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(-Math.PI / 6);
      ctx.fillText(text, 0, 0);
      ctx.restore();
    }
  }
  ctx.restore();
};

// ─────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────
export const VideoPlayer = ({
  src,
  studentName,
  studentPhone,
}: VideoPlayerProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  const [isViolation, setIsViolation] = useState(false);
  const [violationType, setViolationType] = useState<SecurityEventType | null>(null);

  // ── Bunny embed URL ──
  const bunnyUrl = `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${src}?autoplay=false&preload=true&responsive=true`;

  const watermarkText = `${studentName} · ${studentPhone}`;

  // ── Canvas watermark animation loop ──
  const renderWatermark = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || isViolation) return;
    drawWatermark(canvas, watermarkText);
    animRef.current = requestAnimationFrame(renderWatermark);
  }, [watermarkText, isViolation]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(renderWatermark);
    return () => cancelAnimationFrame(animRef.current);
  }, [renderWatermark]);

  // Redraw on container resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const obs = new ResizeObserver(() => drawWatermark(canvas, watermarkText));
    obs.observe(canvas);
    return () => obs.disconnect();
  }, [watermarkText]);

  // ── Security detection ──
  // disableTabSwitch: false → allow tab switching (student may check notes)
  const handleViolation = useCallback((type: SecurityEventType) => {
    setIsViolation(true);
    setViolationType(type);
    logSecurityEvent(type, { studentName, studentPhone });
  }, [studentName, studentPhone]);

  useSecurityDetection(handleViolation, !isViolation, { disableTabSwitch: false });

  const handleDismiss = useCallback(() => {
    setIsViolation(false);
    setViolationType(null);
  }, []);

  const msg = violationType
    ? (VIOLATION_MESSAGES[violationType] ?? DEFAULT_VIOLATION)
    : DEFAULT_VIOLATION;

  return (
    <div
      className="relative w-full bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl mx-auto select-none"
      style={{ aspectRatio: '16/9' }}
      onDragStart={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Bunny Stream iframe ── */}
      <iframe
        src={bunnyUrl}
        className="absolute inset-0 w-full h-full border-0"
        allowFullScreen
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
        title={`video-${src}`}
        style={{ visibility: isViolation ? 'hidden' : 'visible' }}
      />

      {/* ── Canvas watermark (above iframe, non-interactive) ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[25]"
        style={{ mixBlendMode: 'overlay' }}
      />

      {/* ── Corner badge watermark ── */}
      {!isViolation && (
        <div className="absolute bottom-12 right-3 z-[30] pointer-events-none">
          <div className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
            <ShieldCheck className="h-2.5 w-2.5 text-emerald-400/50" />
            <p className="text-[9px] font-black text-white/35 tracking-tight">
              {studentName} · {studentPhone}
            </p>
          </div>
        </div>
      )}

      {/* ── Violation Overlay ── */}
      {isViolation && (
        <div className="absolute inset-0 z-[100] bg-slate-900/98 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-300">
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-3xl bg-red-500/20 animate-ping" />
            <div className="h-20 w-20 bg-red-100 text-red-600 rounded-3xl flex items-center justify-center shadow-2xl relative">
              <AlertCircle className="h-10 w-10" />
            </div>
          </div>

          <h2 className="text-2xl md:text-3xl font-black text-white mb-4 leading-tight">
            {msg.title}
          </h2>
          <p className="text-slate-400 font-bold text-base mb-6 max-w-md leading-relaxed">
            {msg.body}
          </p>

          <div className="mb-8 px-5 py-3 bg-red-900/30 border border-red-700/30 rounded-2xl">
            <p className="text-xs font-black text-red-400 tracking-widest uppercase">
              تم التوثيق باسم: {studentName}
            </p>
          </div>

          <Button
            onClick={handleDismiss}
            className="bg-brand-primary h-14 px-10 rounded-2xl text-white font-black shadow-lg shadow-brand-primary/20 hover:bg-brand-accent transition-all"
          >
            نعم، قمت بالإيقاف — استمر في المشاهدة
          </Button>

          <p className="text-[10px] text-slate-600 font-bold mt-6">
            تم تسجيل هذا الحدث برقم هاتفك {studentPhone} في سجلات الأمان
          </p>
        </div>
      )}

      {/* Protective invisible layer */}
      <div className="absolute inset-0 z-[20] pointer-events-none select-none" aria-hidden="true" />
    </div>
  );
};