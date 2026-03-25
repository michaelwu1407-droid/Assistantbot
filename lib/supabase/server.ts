import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const shouldLogSupabaseDiagnostics =
  process.env.NODE_ENV === "development" || process.env.SUPABASE_DEBUG === "1";

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (shouldLogSupabaseDiagnostics) {
      console.error("Supabase environment variables are missing on server:", {
        url: !!supabaseUrl,
        key: !!supabaseAnonKey,
        envLoaded: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      });
    }

    throw new Error("Supabase server configuration is incomplete");
  }

  try {
    const cookieStore = await cookies();

    return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch (error) {
            if (shouldLogSupabaseDiagnostics) {
              console.warn("Failed to set cookie:", name, error);
            }
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: "", ...options });
          } catch (error) {
            if (shouldLogSupabaseDiagnostics) {
              console.warn("Failed to remove cookie:", name, error);
            }
          }
        },
      },
      global: {
        headers: {
          "X-Client-Info": "assistantbot-server",
        },
      },
    });
  } catch (error) {
    if (shouldLogSupabaseDiagnostics) {
      console.error("Failed to create Supabase server client:", error);
    }

    throw new Error("Supabase server client initialization failed");
  }
}

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    if (shouldLogSupabaseDiagnostics) {
      console.error("Supabase admin environment variables are missing:", {
        url: !!supabaseUrl,
        key: !!serviceRoleKey,
        envLoaded: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      });
    }

    throw new Error("Supabase admin configuration is incomplete");
  }

  try {
    return createSupabaseClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
      global: {
        headers: {
          "X-Client-Info": "assistantbot-admin",
        },
      },
    });
  } catch (error) {
    if (shouldLogSupabaseDiagnostics) {
      console.error("Failed to create Supabase admin client:", error);
    }

    throw new Error("Supabase admin client initialization failed");
  }
}
