import { createClient } from "@/lib/supabase/server";

/**
 * Get the current user's ID from Supabase.
 */
export async function getAuthUserId(): Promise<string> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error("User not authenticated");
  }
  
  return user.id;
}

/**
 * Get the current user's metadata from Supabase.
 */
export async function getAuthUser(): Promise<{ id: string; name: string; email?: string; bio?: string }> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error("User not authenticated");
  }
  
  return {
    id: user.id,
    name: user.user_metadata?.name || user.email?.split('@')[0] || "User",
    email: user.email,
    bio: user.user_metadata?.bio,
  };
}
