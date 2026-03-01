import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logging";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";

const getSessionUser = cache(async (): Promise<User | null> => {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
});

/**
 * Get the current user's ID from Supabase.
 */
export async function getAuthUserId(): Promise<string | null> {
  try {
    logger.authFlow("Attempting to get user ID", { action: "getAuthUserId" });
    const user = await getSessionUser();

    if (!user) {
      return null;
    }

    logger.authFlow("Successfully retrieved user ID", { userId: user.id });
    return user.id;
  } catch (error) {
    logger.authError("Unexpected error in getAuthUserId", { error: error instanceof Error ? error.message : 'Unknown error' }, error instanceof Error ? error : new Error('Unknown error'));
    return null;
  }
}

/**
 * Get the current user's metadata from Supabase.
 */
export async function getAuthUser(): Promise<{ id: string; name: string; email?: string; bio?: string; image?: string } | null> {
  try {
    logger.authFlow("Attempting to get user metadata", { action: "getAuthUser" });
    const user = await getSessionUser();

    if (!user) {
      return null;
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
    logger.authError("Unexpected error in getAuthUser", { error: error instanceof Error ? error.message : 'Unknown error' }, error instanceof Error ? error : new Error('Unknown error'));
    return null;
  }
}

/**
 * Get the current user's workspace ID from Supabase.
 */
export async function getWorkspaceId(): Promise<string | null> {
  try {
    logger.authFlow("Attempting to get workspace ID", { action: "getWorkspaceId" });
    const user = await getSessionUser();

    if (!user) {
      return null;
    }

    // Get workspace from user metadata or create default workspace
    const workspaceId = user.user_metadata?.workspace_id;
    if (!workspaceId) {
      logger.authError("No workspace ID found for user", { userId: user.id });
      return null;
    }

    logger.authFlow("Successfully retrieved workspace ID", { userId: user.id, workspaceId });
    return workspaceId;
  } catch (error) {
    logger.authError("Unexpected error in getWorkspaceId", { error: error instanceof Error ? error.message : 'Unknown error' }, error instanceof Error ? error : new Error('Unknown error'));
    return null;
  }
}
