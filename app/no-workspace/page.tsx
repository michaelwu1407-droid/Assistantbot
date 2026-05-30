"use client";

import { Button } from "@/components/ui/button";
import { Users, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export default function NoWorkspacePage() {
  const router = useRouter();

  const handleSignOut = useCallback(async () => {
    try {
      const supabase = createClient();
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    router.push("/auth");
  }, [router]);

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center animate-in fade-in duration-500">
      <div className="mb-8 p-6 bg-card rounded-md shadow-sm border border-border">
        <Users className="h-12 w-12 text-muted-foreground" />
      </div>

      <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">
        You&apos;ve been removed from your workspace
      </h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
        Your access to this workspace has been revoked. Contact your workspace admin to be re-invited,
        or sign in with a different account.
      </p>

      <div className="flex gap-4">
        <Button variant="outline" onClick={handleSignOut}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Sign out
        </Button>
        <Button onClick={() => router.push("/auth")}>
          Sign in with a different account
        </Button>
      </div>
    </div>
  );
}
