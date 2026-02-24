"use server";

import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface JobPhoto {
  id: string;
  url: string;
  caption?: string;
  dealId: string;
  createdAt: string;
}

interface JobNote {
  id: string;
  content: string;
  authorId: string;
  dealId: string;
  createdAt: string;
  updatedAt: string;
  author: { name: string | null };
}

export async function uploadJobPhoto(
  dealId: string,
  file: File,
  caption?: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Upload to Supabase Storage
    const fileName = `${dealId}/${nanoid()}-${file.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("job-photos")
      .upload(fileName, file);

    if (uploadError) {
      throw uploadError;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from("job-photos")
      .getPublicUrl(fileName);

    // Save to database
    const { error } = await supabase.from("job_photos").insert({
      url: publicUrl,
      caption: caption || null,
      dealId,
    });

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/deals/${dealId}`);

    return { success: true, url: publicUrl };
  } catch (error) {
    console.error("Error uploading job photo:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to upload photo" 
    };
  }
}

export async function getJobPhotos(dealId: string): Promise<{
  success: boolean;
  photos?: JobPhoto[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("job_photos")
      .select("*")
      .eq("dealId", dealId)
      .order("createdAt", { ascending: false });

    if (error) {
      throw error;
    }

    return { success: true, photos: data || [] };
  } catch (error) {
    console.error("Error fetching job photos:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch photos" 
    };
  }
}

export async function deleteJobPhoto(photoId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Get photo info before deleting
    const { data: photo } = await supabase
      .from("job_photos")
      .select("url, dealId")
      .eq("id", photoId)
      .single();

    if (!photo) {
      throw new Error("Photo not found");
    }

    // Delete from database
    const { error } = await supabase
      .from("job_photos")
      .delete()
      .eq("id", photoId);

    if (error) {
      throw error;
    }

    // Delete from Supabase Storage (optional, will be cleaned up eventually)
    try {
      const fileName = photo.url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from("job-photos")
          .remove([fileName]);
      }
    } catch (storageError) {
      console.warn("Failed to delete from storage:", storageError);
    }

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/deals/${photo.dealId}`);

    return { success: true };
  } catch (error) {
    console.error("Error deleting job photo:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete photo" 
    };
  }
}

export async function createJobNote(
  dealId: string,
  content: string,
  authorId: string
): Promise<{ success: boolean; note?: JobNote; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("job_notes")
      .insert({
        content,
        dealId,
        authorId,
      })
      .select(`
        *,
        author:users(name)
      `)
      .single();

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/deals/${dealId}`);

    return { success: true, note: data };
  } catch (error) {
    console.error("Error creating job note:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to create note" 
    };
  }
}

export async function getJobNotes(dealId: string): Promise<{
  success: boolean;
  notes?: JobNote[];
  error?: string;
}> {
  try {
    const { data, error } = await supabase
      .from("job_notes")
      .select(`
        *,
        author:users(name)
      `)
      .eq("dealId", dealId)
      .order("createdAt", { ascending: false });

    if (error) {
      throw error;
    }

    return { success: true, notes: data || [] };
  } catch (error) {
    console.error("Error fetching job notes:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to fetch notes" 
    };
  }
}

export async function updateJobNote(
  noteId: string,
  content: string
): Promise<{ success: boolean; note?: JobNote; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("job_notes")
      .update({ content })
      .eq("id", noteId)
      .select(`
        *,
        author:users(name)
      `)
      .single();

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/deals/${data.dealId}`);

    return { success: true, note: data };
  } catch (error) {
    console.error("Error updating job note:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to update note" 
    };
  }
}

export async function deleteJobNote(noteId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    // Get note info for revalidation
    const { data: note } = await supabase
      .from("job_notes")
      .select("dealId")
      .eq("id", noteId)
      .single();

    const { error } = await supabase
      .from("job_notes")
      .delete()
      .eq("id", noteId);

    if (error) {
      throw error;
    }

    revalidatePath("/dashboard");
    if (note) {
      revalidatePath(`/dashboard/deals/${note.dealId}`);
    }

    return { success: true };
  } catch (error) {
    console.error("Error deleting job note:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Failed to delete note" 
    };
  }
}
