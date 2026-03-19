import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ShieldCheck, MonitorOff } from 'lucide-react';
import {
  useScreenRecordingDetection,
  logSecurityEvent,
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
  src: string;           // Bunny Video ID
  studentName: string;
  studentPhone: string;
  onEnded?: () => void;
  courseThumbnail?: string;
}

// ─────────────────────────────────────────────
// Canvas watermark helper
// ─────────────────────────────────────────────
const drawWatermark = (canvas: HTMLCanvasElement, text: string) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width  = canvas.offsetWidth  || 640;
  canvas.height = canvas.offsetHeight || 360;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.save();
  ctx.globalAlpha = 0.11;
  ctx.fillStyle   = 'white';
  ctx.font        = `bold ${Math.max(10, canvas.width / 50)}px monospace`;
  ctx.textAlign   = 'center';

  const spacing = 210;
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
  const animRef   = useRef<number>(0);

  // ── ONLY blur when screen recording is active ──
  const [isRecording, setIsRecording] = useState(false);

  // Bunny embed URL
  const bunnyUrl = [
    `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${src}`,
    `?autoplay=false`,
    `&preload=true`,
    `&responsive=true`,
    `&letterbox=false`,
    `&controls=true`,
  ].join('');

  const watermarkText = `${studentName} · ${studentPhone}`;

  // ── Canvas watermark loop ──
  const renderWatermark = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawWatermark(canvas, watermarkText);
    animRef.current = requestAnimationFrame(renderWatermark);
  }, [watermarkText]);

  useEffect(() => {
    animRef.current = requestAnimationFrame(renderWatermark);
    return () => cancelAnimationFrame(animRef.current);
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

  useScreenRecordingDetection(
    handleRecordingStart,
    handleRecordingStop,
    true   // always active — no toggle needed
  );

  return (
    <div
      className="relative w-full bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl mx-auto select-none"
      style={{ paddingBottom: '56.25%', height: 0 }}
      onDragStart={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Bunny iframe ── */}
      <iframe
        src={bunnyUrl}
        className="absolute inset-0 w-full h-full border-0"
        style={{
          top: 0,
          left: 0,
          // ONLY hide when actively recording — nothing else
          filter: isRecording ? 'blur(40px) brightness(0.2)' : 'none',
          transition: 'filter 0.4s ease',
        }}
        allowFullScreen
        allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen; clipboard-write; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        title={`lesson-${src}`}
        scrolling="no"
      />

      {/* ── Canvas watermark (always visible, above iframe) ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-[25]"
        style={{ mixBlendMode: 'overlay' }}
      />

      {/* ── Corner watermark badge ── */}
      {!isRecording && (
        <div className="absolute bottom-12 right-3 z-[30] pointer-events-none">
          <div className="bg-black/40 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-white/10 flex items-center gap-1.5">
            <ShieldCheck className="h-2.5 w-2.5 text-emerald-400/50" />
            <p className="text-[9px] font-black text-white/35 tracking-tight">
              {studentName} · {studentPhone}
            </p>
          </div>
        </div>
      )}

      {/* ── Screen Recording Warning Overlay ── */}
      {isRecording && (
        <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-300">
          {/* Big blurred warning — visible even through blur */}
          <div className="relative mb-6">
            <div className="absolute inset-0 rounded-full bg-red-500/30 animate-ping scale-150" />
            <div className="h-16 w-16 md:h-20 md:w-20 bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl relative z-10">
              <MonitorOff className="h-8 w-8 md:h-10 md:w-10" />
            </div>
          </div>

          <div className="bg-slate-900/90 backdrop-blur-xl rounded-3xl p-6 md:p-8 max-w-sm border border-red-500/30 shadow-2xl">
            <h2 className="text-xl md:text-2xl font-black text-white mb-3">
              🚫 تسجيل الشاشة محظور
            </h2>
            <p className="text-slate-400 font-bold text-sm mb-5 leading-relaxed">
              تم رصد مشاركة أو تسجيل الشاشة. أوقف التسجيل لمتابعة المشاهدة.
            </p>

            <div className="mb-5 px-4 py-2.5 bg-red-900/40 border border-red-700/30 rounded-2xl">
              <p className="text-[11px] font-black text-red-400 tracking-wider uppercase">
                تم التوثيق باسم: {studentName}
              </p>
            </div>

            <Button
              onClick={() => setIsRecording(false)}
              className="w-full bg-brand-primary h-12 rounded-2xl text-white font-black shadow-lg border-none"
            >
              أوقفت التسجيل — استمر
            </Button>

            <p className="text-[10px] text-slate-600 font-bold mt-4">
              {studentPhone} · تم الحفظ في سجلات الأمان
            </p>
          </div>
        </div>
      )}

      {/* Protective layer */}
      <div
        className="absolute inset-0 z-[20] pointer-events-none select-none"
        aria-hidden="true"
      />
    </div>
  );
};