import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Robust server client with comprehensive error handling
export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Supabase environment variables are missing on server:', {
      url: !!supabaseUrl,
      key: !!supabaseAnonKey
    });
    throw new Error('Supabase server configuration is incomplete');
  }

  try {
    const cookieStore = await cookies();
    
    return createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // The `set` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
              console.warn('Failed to set cookie:', name, error);
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch (error) {
              // The `delete` method was called from a Server Component.
              // This can be ignored if you have middleware refreshing
              // user sessions.
              console.warn('Failed to remove cookie:', name, error);
            }
          },
        },
        global: {
          headers: {
            'X-Client-Info': 'assistantbot-server'
          }
        }
      }
    );
  } catch (error) {
    console.error('Failed to create Supabase server client:', error);
    throw new Error('Supabase server client initialization failed');
  }
}

/**
 * Create a Supabase admin client with service role privileges and error handling.
 * This should only be used for server-side admin operations like user deletion.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Supabase admin environment variables are missing:', {
      url: !!supabaseUrl,
      key: !!serviceRoleKey
    });
    throw new Error('Supabase admin configuration is incomplete');
  }

  try {
    return createSupabaseClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        },
        global: {
          headers: {
            'X-Client-Info': 'assistantbot-admin'
          }
        }
      }
    );
  } catch (error) {
    console.error('Failed to create Supabase admin client:', error);
    throw new Error('Supabase admin client initialization failed');
  }
}
