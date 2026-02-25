import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logging";

/**
 * Get the current user's ID from Supabase.
 */
export async function getAuthUserId(): Promise<string> {
  try {
    logger.authFlow("Attempting to get user ID", { action: "getAuthUserId" });
    
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      logger.authError("Failed to get user from Supabase", { error: error.message, details: error }, error);
      throw new Error("User not authenticated");
    }

    if (!user) {
      logger.authError("No user found in Supabase session", { hasUser: false });
      throw new Error("User not authenticated");
    }

    logger.authFlow("Successfully retrieved user ID", { userId: user.id });
    return user.id;
  } catch (error) {
    if (error.message === "User not authenticated") {
      throw error; // Re-throw auth errors
    }
    
    logger.authError("Unexpected error in getAuthUserId", { error: error.message }, error);
    throw new Error("User not authenticated");
  }
}

/**
 * Get the current user's metadata from Supabase.
 */
export async function getAuthUser(): Promise<{ id: string; name: string; email?: string; bio?: string; image?: string }> {
  try {
    logger.authFlow("Attempting to get user metadata", { action: "getAuthUser" });
    
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error) {
      logger.authError("Failed to get user metadata from Supabase", { error: error.message, details: error }, error);
      throw new Error("User not authenticated");
    }

    if (!user) {
      logger.authError("No user found in Supabase session for metadata", { hasUser: false });
      throw new Error("User not authenticated");
    }

    const userData = {
      id: user.id,
      name: user.user_metadata?.name || user.email?.split('@')[0] || "User",
      email: user.email,
      bio: user.user_metadata?.bio,
      image: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    };

    logger.authFlow("Successfully retrieved user metadata", { 
      userId: userData.id, 
      email: userData.email,
      name: userData.name 
    });

    return userData;
  } catch (error) {
    if (error.message === "User not authenticated") {
      throw error; // Re-throw auth errors
    }
    
    logger.authError("Unexpected error in getAuthUser", { error: error.message }, error);
    throw new Error("User not authenticated");
  }
}
