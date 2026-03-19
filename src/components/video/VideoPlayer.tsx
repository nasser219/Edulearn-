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

interface VideoPlayerProps {
  src: string;
  studentName: string;
  studentPhone: string;
  onEnded?: () => void;
  courseThumbnail?: string;
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
  ctx.globalAlpha = 0.12; // Slightly more visible
  ctx.fillStyle = 'white';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 4;
  ctx.font = `bold ${Math.max(10, w / 55)}px monospace`;
  ctx.textAlign = 'center';
  const spacing = 220;

  // Floating animation
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
// AudioMuter
// ─────────────────────────────────────────────
// Cross-origin iframes block direct audio access.
// The ONLY reliable trick: capture system audio via
// AudioContext + createMediaStreamDestination,
// then kill the gain node when recording is detected.
//
// However this requires user gesture to create AudioContext
// and getDisplayMedia — we use a different approach:
//
// We use a transparent <div> overlay that intercepts
// all pointer events when recording is detected,
// combined with an <audio> beep that overrides
// the iframe audio perception (psychological mute).
//
// For REAL audio muting of a cross-origin iframe,
// the only true solution is to reload the iframe
// with a muted=true param — which Bunny supports.
// ─────────────────────────────────────────────

const BUNNY_URL_NORMAL = (src: string) => [
  `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${src}`,
  `?autoplay=false`,
  `&preload=false`,
  `&responsive=true`,
  `&letterbox=false`,
  `&controls=true`,
  `&muted=false`,
].join('');

// ✅ When recording detected → reload iframe with muted=true
// This is the ONLY way to mute a cross-origin iframe
const BUNNY_URL_MUTED = (src: string) => [
  `https://iframe.mediadelivery.net/embed/${BUNNY_LIBRARY_ID}/${src}`,
  `?autoplay=false`,
  `&preload=false`,
  `&responsive=true`,
  `&letterbox=false`,
  `&controls=true`,
  `&muted=true`,          // ← Bunny native mute param
].join('');

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
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const [isRecording, setIsRecording] = useState(false);
  // Track current iframe URL — switch to muted version when recording
  const [iframeUrl, setIframeUrl] = useState(BUNNY_URL_NORMAL(src));

  const watermarkText = `${studentName} · ${studentPhone}`;

  // ── Switch iframe URL to muted/unmuted ──
  useEffect(() => {
    setIframeUrl(isRecording ? BUNNY_URL_MUTED(src) : BUNNY_URL_NORMAL(src));
  }, [isRecording, src]);

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

  return (
    <div
      className="relative w-full bg-black rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl mx-auto select-none"
      style={{ paddingBottom: '56.25%', height: 0 }}
      onDragStart={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Bunny iframe ──
          URL switches to muted version when recording detected
          This is the ONLY cross-origin audio mute solution     ── */}
      <iframe
        ref={iframeRef}
        key={iframeUrl}         // ← key change forces iframe reload with new URL (muted/unmuted)
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

      {/* ── Canvas watermark — NO mixBlendMode ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none z-[25]"
        style={{ top: 0, left: 0, width: '100%', height: '100%' }}
      />

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