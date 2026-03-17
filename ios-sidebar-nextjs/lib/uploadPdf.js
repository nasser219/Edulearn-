import supabase from './supabaseClient';

/**
 * Uploads a PDF file to Supabase Storage.
 * @param {File} file - The PDF file to upload.
 * @returns {Promise<string>} - The public URL of the uploaded PDF.
 */
export async function uploadPdf(file) {
  // 1. Validation
  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are allowed.");
  }

  const maxSize = 10 * 1024 * 1024; // 10MB
  if (file.size > maxSize) {
    throw new Error("File size must be ≤ 10MB.");
  }

  // 2. Generate unique filename
  const filename = `${Date.now()}-${file.name.replace(/\s+/g, "_")}`;

  // 3. Upload to bucket "pdf edulearn"
  const { data, error } = await supabase.storage
    .from("pdf edulearn")
    .upload(filename, file);

  if (error) {
    throw new Error(error.message);
  }

  // 4. Get and return public URL
  const { data: { publicUrl } } = supabase.storage
    .from("pdf edulearn")
    .getPublicUrl(filename);

  return publicUrl;
}
