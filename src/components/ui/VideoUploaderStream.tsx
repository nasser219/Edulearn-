import React, { useState, useRef } from 'react';
import * as tus from 'tus-js-client';
import { UploadCloud, Check, X, FileVideo, Loader2, ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/utils';
import { BUNNY } from '../../lib/bunny';

interface VideoUploaderStreamProps {
  onUploadComplete: (videoId: string, metadata?: { duration?: string }) => void;
  label?: string;
  className?: string;
}

export const VideoUploaderStream = ({ 
  onUploadComplete, 
  label = "رفع فيديو محمي (Bunny Stream)", 
  className 
}: VideoUploaderStreamProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoId, setVideoId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError("عذراً، يجب اختيار ملف فيديو فقط.");
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(0);

    try {
      // 1. Get Video Duration
      let duration: string | undefined;
      try {
        duration = await new Promise((resolve) => {
          const video = document.createElement('video');
          video.preload = 'metadata';
          video.onloadedmetadata = () => {
            window.URL.revokeObjectURL(video.src);
            const mins = Math.floor(video.duration / 60);
            const secs = Math.floor(video.duration % 60);
            resolve(`${mins}:${secs.toString().padStart(2, '0')}`);
          };
          video.onerror = () => resolve(undefined);
          video.src = URL.createObjectURL(file);
        });
      } catch (e) {
        console.error("Error getting video duration:", e);
      }

      // 2. Create video entry in Bunny
      const createRes = await fetch("/api/bunny/create-video", {
        method: "POST",
        body: JSON.stringify({ title: file.name }),
        headers: { "Content-Type": "application/json" },
      });
      
      if (!createRes.ok) {
        const errorText = await createRes.text();
        throw new Error(`فشل إنشاء مدخل فيديو (${createRes.status}): ${errorText.slice(0, 50)}`);
      }

      const createData = await createRes.json();
      console.log("[DEBUG] Bunny Create Video Response:", createData);
      const { videoId: newVideoId, signature, expirationTime, libraryId } = createData;
      
      if (!newVideoId) throw new Error("لم يتم استلام معرف الفيديو من السيرفر");

      // 3. Upload using TUS
      const upload = new tus.Upload(file, {
        endpoint: `https://video.bunnycdn.com/tusupload`,
        retryDelays: [0, 3000, 5000, 10000],
        headers: {
          AuthorizationSignature: signature,
          AuthorizationExpire: expirationTime.toString(),
          VideoId: newVideoId,
          LibraryId: libraryId,
        },
        metadata: {
          filename: file.name,
          filetype: file.type,
        },
        onProgress(uploaded, total) {
          setProgress(Math.round((uploaded / total) * 100));
        },
        onSuccess() {
          setIsUploading(false);
          setVideoId(newVideoId);
          onUploadComplete(newVideoId, { duration });
        },
        onError(err) {
          console.error("TUS Error:", err);
          setError("فشل الرفع لمخدم Bunny Stream. يرجى المحاولة لاحقاً.");
          setIsUploading(false);
        },
      });

      upload.start();

    } catch (err: any) {
      console.error("Stream Upload Catch:", err);
      setError(err.message || "حدث خطأ غير متوقع أثناء المعالجة.");
      setIsUploading(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)} dir="rtl">
      {!videoId && !isUploading && (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-purple-200 rounded-2xl cursor-pointer hover:bg-purple-50 transition-all group">
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
            <div className="bg-purple-100 p-2 rounded-xl mb-2 group-hover:scale-110 transition-transform">
              <UploadCloud className="w-6 h-6 text-purple-600" />
            </div>
            <p className="mb-2 text-sm text-purple-900 font-black">{label}</p>
            <div className="flex items-center gap-1 text-[10px] text-purple-400 font-bold">
              <ShieldCheck className="h-3 w-3" />
              <span>فيديو محمي ضد التحميل (Bunny Stream)</span>
            </div>
          </div>
          <input 
            ref={inputRef}
            type="file" 
            className="hidden" 
            accept="video/*" 
            onChange={handleUpload} 
          />
        </label>
      )}

      {isUploading && (
        <div className="p-6 bg-purple-50 rounded-2xl border border-purple-100 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-purple-600 animate-spin" />
          <div className="w-full bg-purple-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-purple-600 h-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs font-black text-purple-800">جاري الرفع المشفر... {progress}%</p>
        </div>
      )}

      {videoId && (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-emerald-900">تم الرفع والتشفير بنجاح! 🔒</p>
              <p className="text-[10px] text-emerald-500 font-bold">Video ID: {videoId}</p>
              <button 
                onClick={() => setVideoId(null)} 
                className="text-[10px] text-emerald-600 font-bold hover:underline mt-1"
              >
                تغيير الفيديو
              </button>
            </div>
          </div>
          <FileVideo className="h-5 w-5 text-emerald-200" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3 text-red-600">
          <X className="h-5 w-5 flex-shrink-0" />
          <p className="text-[10px] font-bold">{error}</p>
        </div>
      )}
    </div>
  );
};
