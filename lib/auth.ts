import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logging";
import { cache } from "react";
import type { User } from "@supabase/supabase-js";

function hasSupabaseAuthEnv() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

function isExpectedServerAuthBootstrapError(error: unknown) {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message === "Supabase server configuration is incomplete" ||
    error.message === "Supabase server client initialization failed"
  );
}

const getSessionUser = cache(async (): Promise<User | null> => {
  if (!hasSupabaseAuthEnv()) {
    return null;
  }

  try {
    const supabase = await createClient();
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return user;
  } catch (error) {
    if (isExpectedServerAuthBootstrapError(error)) {
      return null;
    }

    throw error;
  }
});

/**
 * Get the current user's ID from Supabase.
 */
export async function getAuthUserId(): Promise<string | null> {
  try {
    const user = await getSessionUser();

    if (!user) {
      return null;
    }

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
    const user = await getSessionUser();

    if (!user) {
      return null;
    }

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    const given = str(meta.given_name);
    const family = str(meta.family_name);
    const combinedGiven = [given, family].filter(Boolean).join(" ").trim();
    const displayName =
      str(meta.full_name) ||
      combinedGiven ||
      str(meta.name) ||
      user.email?.split("@")[0] ||
      "User";

    const userData = {
      id: user.id,
      name: displayName,
      email: user.email,
      bio: user.user_metadata?.bio,
      image: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    };

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

    return workspaceId;
  } catch (error) {
    logger.authError("Unexpected error in getWorkspaceId", { error: error instanceof Error ? error.message : 'Unknown error' }, error instanceof Error ? error : new Error('Unknown error'));
    return null;
  }
}
