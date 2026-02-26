import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Refreshes the Supabase auth session and updates response cookies.
 * Call this in middleware so that when the user logs in/out in another browser or tab,
 * this tab's next request gets the updated session and avoids "no user found" glitches.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) {
    return supabaseResponse;
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Request cookies are read-only in Next.js; only set on the response so the browser gets updated cookies.
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options ?? {})
        );
      },
    },
  });

  // Refresh the session so server and other tabs stay in sync (e.g. logout elsewhere)
  try {
    await supabase.auth.getUser();
  } catch (err) {
    // e.g. "Failed to fetch" when Supabase is unreachable (paused project, network, CORS)
    console.warn("[Supabase] Session refresh failed:", (err as Error)?.message ?? err);
  }

  return supabaseResponse;
}
