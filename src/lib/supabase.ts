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

// Fixed bucket name — spaces in bucket names cause issues
const BUCKET_NAME = 'pdf-edulearn';
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

/**
 * Universal upload function for any file to Supabase.
 * Robust filename sanitization and bucket fallback.
 */
export async function uploadFileToSupabase(file: File, folder: string = 'submissions'): Promise<string> {
  if (!supabase) {
    throw new Error('إعدادات Supabase غير مكتملة (supabaseUrl/supabaseAnonKey).');
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`حجم الملف (${(file.size / 1024 / 1024).toFixed(1)}MB) يتجاوز الحد المسموح (25MB).`);
  }

  // Expanded list of common allowed types for homework/assignments
  const allowedExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'zip', 'rar'];
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'bin';
  
  // We don't block strictly here, but we warn in console
  if (!allowedExtensions.includes(fileExt)) {
    console.warn(`Uploading uncommon file extension: .${fileExt}`);
  }

  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);
  // Sanitize filename to avoid bucket errors with Arabic/special chars
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').substring(0, 30);
  const filePath = `${folder}/${timestamp}_${randomStr}_${safeName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    });
  
  if (error) {
    console.error('Supabase upload error:', error);
    
    // Fallback logic if the primary bucket is missing
    if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
      const { error: fallbackError } = await supabase.storage
        .from('pdf edulearn')
        .upload(filePath, file, {
           cacheControl: '3600',
           upsert: false,
           contentType: file.type || 'application/octet-stream',
        });
      
      if (fallbackError) {
        throw new Error(`فشل الرفع: ${fallbackError.message}`);
      }
      
      const { data: { publicUrl } } = supabase.storage
        .from('pdf edulearn')
        .getPublicUrl(filePath);
      
      return publicUrl;
    }
    
    throw new Error(`فشل الرفع: ${error.message}`);
  }

  const { data: { publicUrl } } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath);

  return publicUrl;
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
