"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Get a signed upload URL for Supabase Storage.
 * Allows the frontend to upload files directly to storage.
 */
export async function getUploadUrl(
  filename: string,
  bucket: string = "job-photos"
): Promise<{ success: boolean; signedUrl?: string; token?: string; path?: string; error?: string }> {
  const supabase = await createClient();
  
  // Sanitize filename
  const cleanName = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const path = `${Date.now()}-${cleanName}`;

  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);

  if (error) {
    console.error("Storage error:", error);
    return { success: false, error: error.message };
  }

  return {
    success: true,
    signedUrl: data.signedUrl,
    token: data.token,
    path: data.path,
  };
}

/**
 * Get a public URL for a file.
 */
export async function getPublicUrl(path: string, bucket: string = "job-photos") {
  const supabase = await createClient();
  
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}
