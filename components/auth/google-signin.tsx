"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function GoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push("/auth/next");
      }
    };
    checkUser();
  }, [router, supabase]);

  const handleGoogleSignIn = () => {
    setLoading(true);
    // Use our OAuth flow so Google shows "Earlymark.ai" instead of the Supabase URL
    window.location.href = "/api/auth/google-signin";
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <Card className="w-full max-w-md mx-4 glass-card border-border/50 shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">Welcome Back</CardTitle>
          <CardDescription className="text-muted-foreground">
            Sign in with your Google account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full shadow-lg shadow-primary/20"
          >
            {loading ? "Signing in..." : "Sign in with Google"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
