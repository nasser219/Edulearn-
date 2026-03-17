import React, { useState } from 'react';
import { UploadCloud, Check, X, FileVideo, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface VideoUploaderBunnyProps {
  onUploadComplete: (url: string, metadata?: { duration?: string }) => void;
  label?: string;
  className?: string;
}

export const VideoUploaderBunny = ({ 
  onUploadComplete, 
  label = "رفع فيديو التعليمي (Bunny.net)", 
  className 
}: VideoUploaderBunnyProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError("عذراً، يجب اختيار ملف فيديو فقط.");
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(0);

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

    // 2. Upload to Server Proxy
    try {
      const formData = new FormData();
      formData.append('file', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/bunny/upload');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const p = (event.loaded / event.total) * 100;
          setProgress(Math.round(p));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          setUploadedUrl(response.url);
          setIsUploading(false);
          onUploadComplete(response.url, { duration });
        } else {
          try {
            const errJson = JSON.parse(xhr.responseText);
            setError(errJson.error || "فشل الرفع لمخدم Bunny.net");
          } catch (e) {
            setError(`فشل الرفع (${xhr.status})`);
          }
          setIsUploading(false);
        }
      };

      xhr.onerror = () => {
        setError("حدث خطأ في الاتصال بالسيرفر.");
        setIsUploading(false);
      };

      xhr.send(formData);
    } catch (err) {
      console.error("Bunny Upload catch:", err);
      setError("حدث خطأ غير متوقع في عملية الرفع.");
      setIsUploading(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)} dir="rtl">
      {!uploadedUrl && !isUploading && (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all group">
          <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
            <UploadCloud className="w-8 h-8 mb-3 text-brand-primary/60 group-hover:text-brand-primary transition-colors" />
            <p className="mb-2 text-sm text-slate-500 font-bold">{label}</p>
            <p className="text-[10px] text-slate-400">فيديو MP4/WebM وغيرها</p>
          </div>
          <input type="file" className="hidden" accept="video/*" onChange={handleFileChange} />
        </label>
      )}

      {isUploading && (
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-brand-primary animate-spin" />
          <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-brand-primary h-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs font-black text-slate-500">جاري الرفع إلى Bunny.net Storage... {progress}%</p>
        </div>
      )}

      {uploadedUrl && (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-emerald-900">تم رفع الفيديو بنجاح! 🎬</p>
              <button 
                onClick={() => setUploadedUrl(null)} 
                className="text-[10px] text-emerald-600 font-bold hover:underline"
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
