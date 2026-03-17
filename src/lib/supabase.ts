import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Export a null-safe client or throw a more helpful error during usage instead of at initialization
export const supabase = (supabaseUrl && supabaseAnonKey) 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!supabase) {
  console.warn('⚠️ Supabase credentials missing. PDF uploads will be disabled.');
}

/**
 * Uploads a PDF file to Supabase Storage.
 */
export async function uploadPdfToSupabase(file: File): Promise<string> {
  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are allowed.");
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error("File size must be ≤ 10MB.");
  }

  const fileExt = file.name.split('.').pop();
  const filename = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error } = await supabase.storage
    .from("pdf edulearn")
    .upload(filename, file);

  if (error) {
    throw new Error(error.message);
  }

  const { data: { publicUrl } } = supabase.storage
    .from("pdf edulearn")
    .getPublicUrl(filename);

  return publicUrl;
}
