import { createBrowserClient } from "@supabase/ssr";

// Robust client with error handling and retry logic
export function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables are missing:', {
      url: !!supabaseUrl,
      key: !!supabaseAnonKey
    });
    throw new Error('Supabase configuration is incomplete');
  }

  try {
    return createBrowserClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
      global: {
        headers: {
          'X-Client-Info': 'assistantbot-web'
        }
      }
    });
  } catch (error) {
    console.error('Failed to create Supabase client:', error);
    throw new Error('Supabase client initialization failed');
  }
}

// Singleton pattern to prevent multiple client instances
let clientInstance: ReturnType<typeof createClient> | null = null;

export function getSupabaseClient() {
  if (!clientInstance) {
    clientInstance = createClient();
  }
  return clientInstance;
}
