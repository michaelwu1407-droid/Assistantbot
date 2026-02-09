import { createClient } from "@/lib/supabase/server"

/**
 * Get the authenticated user's ID, falling back to "demo-user" if Supabase
 * auth is unavailable. This is the SINGLE SOURCE OF TRUTH for user identification
 * across all server components and server actions.
 * 
 * Usage:
 *   const userId = await getAuthUserId()
 *   const workspace = await getOrCreateWorkspace(userId)
 */
export async function getAuthUserId(): Promise<string> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            return user.id
        }
    } catch {
        // Supabase client creation failed — fall back
    }
    return "demo-user"
}

/**
 * Get the authenticated user's metadata (name, email, etc)
 */
export async function getAuthUser(): Promise<{ id: string; name: string; email?: string }> {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
            return {
                id: user.id,
                name: user.user_metadata?.full_name || "Mate",
                email: user.email,
            }
        }
    } catch {
        // Supabase client creation failed — fall back
    }
    return { id: "demo-user", name: "Mate" }
}
