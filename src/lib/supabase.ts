import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Export a null-safe client
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabase) {
  console.warn('⚠️ Supabase credentials missing. PDF uploads will be disabled.');
}

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB (matching server proxy)

/**
 * Universal upload function using server-side proxy.
 * This resolves all "Bucket not found" and RLS issues by bypassing Supabase Storage.
 */
export async function uploadFileToSupabase(file: File, folder: string = 'submissions'): Promise<string> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`حجم الملف كبير جداً (${(file.size / 1024 / 1024).toFixed(1)}MB). الحد الأقصى هو 100MB.`);
  }

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/cloudinary/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `فشل الرفع عبر السيرفر (${response.status})`);
    }

    const data = await response.json();
    
    if (!data.secure_url) {
      throw new Error("لم يتم استلام رابط الملف من السيرفر.");
    }

    console.log("[STORAGE ROOT FIX] Upload success:", data.secure_url);
    return data.secure_url;
  } catch (error: any) {
    console.error('Storage Proxy Error:', error);
    throw new Error(`فشل الرفع من الجذور: ${error.message}`);
  }
}

/**
 * Backwards compatible alias for PDF-specific uploads.
 * Now uses the same robust logic as uploadFileToSupabase.
 */
export async function uploadPdfToSupabase(file: File, folder?: string): Promise<string> {
  return uploadFileToSupabase(file, folder || 'pdf');
}

/**
 * Get a signed/private URL for access-controlled downloads.
 */
export async function getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.');
  
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, expiresIn);

  if (error) throw new Error(`Failed to create signed URL: ${error.message}`);
  return data.signedUrl;
}
