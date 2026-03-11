import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const isDevelopment = process.env.NODE_ENV === "development";

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isDevelopment) {
      console.error("Supabase environment variables are missing:", {
        url: !!supabaseUrl,
        key: !!supabaseAnonKey,
        envLoaded: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      });
    }
    throw new Error("Supabase configuration is incomplete");
  }

  try {
    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        flowType: "pkce",
        debug: isDevelopment,
      },
      global: {
        headers: {
          "X-Client-Info": "assistantbot-web",
        },
      },
      db: {
        schema: "public",
      },
    });
  } catch (error) {
    if (isDevelopment) {
      console.error("Failed to create Supabase client:", error);
    }
    throw new Error("Supabase client initialization failed");
  }
}

let clientInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}
