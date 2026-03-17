import React, { useState } from 'react';
import { UploadCloud, Check, X, File, Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface FileUploadProps {
  path: string;
  onUploadComplete: (url: string, metadata?: { duration?: string }) => void;
  allowedTypes?: string[];
  maxSizeMB?: number;
  label?: string;
  className?: string;
}

export const FileUpload = ({ 
  path, 
  onUploadComplete, 
  allowedTypes = [], // Empty means all allowed now
  maxSizeMB = 100,
  label = "رفع ملف من الجهاز",
  className
}: FileUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`حجم الملف كبير جداً. الحد الأقصى هو ${maxSizeMB} ميجابايت.`);
      return;
    }

    setError(null);
    setIsUploading(true);
    setProgress(0);

    let duration: string | undefined;
    if (file.type.startsWith('video/')) {
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
    }

    try {
      const formData = new FormData();
      formData.append('file', file);

      // Call our NEW server-side proxy instead of Cloudinary directly
      // This solves the signature mismatch "from the roots"
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/cloudinary/upload');

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const p = (event.loaded / event.total) * 100;
          setProgress(Math.round(p));
        }
      };

      xhr.onload = () => {
        if (xhr.status === 200 || xhr.status === 201) {
          const response = JSON.parse(xhr.responseText);
          const secureUrl = response.secure_url;
          setUploadedUrl(secureUrl);
          setIsUploading(false);
          onUploadComplete(secureUrl, { duration });
        } else {
          console.error("Server upload failed:", xhr.responseText);
          let errorMsg = "🛑 فشل في الرفع عبر السيرفر.";
          try {
            const errJson = JSON.parse(xhr.responseText);
            errorMsg += ` السبب: ${errJson.error || xhr.responseText}`;
          } catch (e) {
            errorMsg += ` (${xhr.status})`;
          }
          setError(errorMsg);
          setIsUploading(false);
        }
      };

      xhr.onerror = () => {
        setError("حدث خطأ في الاتصال بالسيرفر.");
        setIsUploading(false);
      };

      xhr.send(formData);
    } catch (err) {
      console.error("Upload proxy catch:", err);
      setError("حدث خطأ غير متوقع في عملية الرفع.");
      setIsUploading(false);
    }
  };

  return (
    <div className={cn("space-y-3", className)} dir="rtl">
      {!uploadedUrl && !isUploading && (
        <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-50 transition-all group">
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <UploadCloud className="w-8 h-8 mb-3 text-slate-400 group-hover:text-brand-primary transition-colors" />
            <p className="mb-2 text-sm text-slate-500 font-bold">{label}</p>
            <p className="text-xs text-slate-400">PDF، وورد، إكسيل، فيديو، أو صور (بحد أقصى {maxSizeMB}MB)</p>
          </div>
          <input type="file" className="hidden" onChange={handleFileChange} />
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
          <p className="text-xs font-black text-slate-500">جاري الرفع عبر السيرفر... {progress}%</p>
        </div>
      )}

      {uploadedUrl && (
        <div className="p-4 bg-green-50 rounded-2xl border border-green-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-green-100 text-green-600 rounded-xl flex items-center justify-center">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-green-900">تم رفع الملف بنجاح!</p>
              <button 
                onClick={() => setUploadedUrl(null)} 
                className="text-xs text-green-600 font-bold hover:underline"
              >
                تغيير الملف
              </button>
            </div>
          </div>
          <File className="h-5 w-5 text-green-200" />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex items-center gap-3 text-red-600">
          <X className="h-5 w-5 flex-shrink-0" />
          <p className="text-xs font-bold">{error}</p>
        </div>
      )}
    </div>
  );
};
