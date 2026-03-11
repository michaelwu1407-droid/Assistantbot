"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseClient } from "@/lib/supabase/client";

export function AppInitializer() {
  const router = useRouter();

  useEffect(() => {
    try {
      const supabase = getSupabaseClient();
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event) => {
        if (event === "SIGNED_OUT") {
          router.refresh();
        }
      });
      return () => subscription.unsubscribe();
    } catch (err) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[Auth] Listener setup failed:", (err as Error)?.message ?? err);
      }
    }
  }, [router]);

  return null;
}
