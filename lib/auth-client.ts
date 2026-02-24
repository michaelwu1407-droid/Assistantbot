import { createBrowserClient } from "@supabase/ssr";
import { SupabaseClient } from "@supabase/supabase-js";

export function createClient(): SupabaseClient {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

/**
 * Get the current user's ID from Supabase (client-side).
 */
export async function getAuthUserId(): Promise<string | null> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user.id;
}

/**
 * Get the current user's metadata from Supabase (client-side).
 */
export async function getAuthUser(): Promise<{ id: string; name: string; email?: string; bio?: string; image?: string } | null> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return {
    id: user.id,
    name: user.user_metadata?.name || user.email?.split('@')[0] || "User",
    email: user.email,
    bio: user.user_metadata?.bio,
    image: user.user_metadata?.avatar_url || user.user_metadata?.picture,
  };
}
