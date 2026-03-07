"use server";

import { createAdminClient } from "@/lib/supabase/server";

function getStorageClient() {
  try {
    return createAdminClient();
  } catch {
    return null;
  }
}

async function ensureBucketExists(bucket: string) {
  const supabase = getStorageClient();
  if (!supabase) {
    return { success: false as const, error: "Storage not configured" };
  }

  const { data: existingBuckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error("Storage bucket list error:", listError);
    return { success: false as const, error: listError.message };
  }

  const exists = existingBuckets?.some((item) => item.name === bucket);
  if (exists) {
    return { success: true as const, supabase };
  }

  const { error: createError } = await supabase.storage.createBucket(bucket, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024,
  });

  if (createError) {
    console.error("Storage bucket create error:", createError);
    return { success: false as const, error: createError.message };
  }

  return { success: true as const, supabase };
}

/**
 * Get a signed upload URL for Supabase Storage.
 * Allows the frontend to upload files directly to storage.
 */
export async function getUploadUrl(
  filename: string,
  bucket: string = "job-photos"
): Promise<{ success: boolean; signedUrl?: string; token?: string; path?: string; error?: string }> {
  const bucketState = await ensureBucketExists(bucket);
  if (!bucketState.success) {
    return { success: false, error: bucketState.error };
  }
  const supabase = bucketState.supabase;

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
  const bucketState = await ensureBucketExists(bucket);
  if (!bucketState.success) {
    return "";
  }
  const supabase = bucketState.supabase;

  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path);

  return data.publicUrl;
}
