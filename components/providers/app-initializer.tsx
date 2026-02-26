"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

export function AppInitializer() {
  const router = useRouter();

  useEffect(() => {
    // When user logs in/out in another browser or tab, refresh so this tab stays in sync
    try {
      const supabase = getSupabaseClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT" || event === "TOKEN_REFRESHED") {
          router.refresh();
        }
      });
      return () => subscription.unsubscribe();
    } catch (err) {
      console.warn("[Auth] Listener setup failed:", (err as Error)?.message ?? err);
    }
  }, [router]);

  useEffect(() => {
    // Client-side initialization checks
    const checkClientEnvironment = () => {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Client-side Supabase configuration missing:', {
          url: !!supabaseUrl,
          key: !!supabaseKey
        });
        
        // In production, show a user-friendly error
        if (process.env.NODE_ENV === 'production') {
          document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; font-family: system-ui;">
              <div style="text-align: center; max-width: 400px; padding: 20px;">
                <h1>Service Temporarily Unavailable</h1>
                <p>We're experiencing technical difficulties. Please try again in a few moments.</p>
                <button onclick="window.location.reload()" style="margin-top: 20px; padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">
                  Try Again
                </button>
              </div>
            </div>
          `;
        }
      } else {
        console.log('✅ Client-side Supabase configuration verified');
      }
    };

    // Run checks after component mounts
    checkClientEnvironment();
  }, []);

  return null; // This component doesn't render anything
}
