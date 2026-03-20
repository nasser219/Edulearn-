import { useState } from 'react';
import { uploadPdfToSupabase, supabase } from '../../lib/supabase';
import { UploadCloud, Check, X, Loader2, File } from 'lucide-react';
import { cn } from '../../lib/utils';

interface PdfUploaderSupabaseProps {
  onUploadComplete: (url: string) => void;
  className?: string;
  label?: string;
}

export const PdfUploaderSupabase = ({ 
  onUploadComplete, 
  className,
  label = "رفع ملف PDF عبر Supabase"
}: PdfUploaderSupabaseProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!supabase) {
      setError("عذراً، إعدادات Supabase غير مكتملة في ملف .env.");
      return;
    }

    const isPdf = file.type === "application/pdf";
    const isImage = file.type.startsWith("image/");
    
    if (!isPdf && !isImage && !file.name.match(/\.(doc|docx|xls|xlsx|ppt|pptx|zip|rar)$/i)) {
      setError("عذراً، نوع الملف غير مدعوم. يرجى اختيار PDF أو صورة أو ملف أوفيس.");
      return;
    }

    if (file.size > 25 * 1024 * 1024) {
      setError("حجم الملف كبير جداً. الحد الأقصى هو 25 ميجابايت.");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const url = await uploadPdfToSupabase(file);
      setUploadedUrl(url);
      onUploadComplete(url);
    } catch (err: any) {
      console.error("Supabase Upload Error:", err);
      setError(err.message || "فشل الرفع عبر Supabase.");
    } finally {
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
            <p className="text-[10px] text-slate-400">PDF، صور، أو ملفات أوفيس (بحد أقصى 25MB)</p>
          </div>
          <input type="file" className="hidden" accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.rar" onChange={handleFileChange} />
        </label>
      )}

      {isUploading && (
        <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 text-brand-primary animate-spin" />
          <p className="text-xs font-black text-slate-500">جاري الرفع إلى Supabase Storage...</p>
        </div>
      )}

      {uploadedUrl && (
        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
              <Check className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-black text-emerald-900">تم الرفع بنجاح! 🚀</p>
              <button 
                onClick={() => setUploadedUrl(null)} 
                className="text-[10px] text-emerald-600 font-bold hover:underline"
              >
                تغيير الملف
              </button>
            </div>
          </div>
          <File className="h-5 w-5 text-emerald-200" />
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
