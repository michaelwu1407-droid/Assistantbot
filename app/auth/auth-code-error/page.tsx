"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

export default function AuthCodeErrorPage() {
  const [details, setDetails] = useState<{ error?: string; errorCode?: string }>({});

  useEffect(() => {
    const url = new URL(window.location.href);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ""));

    setDetails({
      error: url.searchParams.get("error") ?? hash.get("error") ?? undefined,
      errorCode: url.searchParams.get("error_code") ?? hash.get("error_code") ?? undefined,
    });
  }, []);

  const isExpired = details.errorCode === "otp_expired";

  return (
    <div className="flex h-screen w-full flex-col items-center justify-center bg-background text-center animate-in fade-in duration-500 relative">
      <div className="absolute inset-0 ott-glow -z-10" />

      <div className="mb-8 p-6 bg-card rounded-[24px] shadow-ott border border-border/60">
        <AlertTriangle className="h-12 w-12 text-red-500" />
      </div>
      
      <h1 className="text-4xl font-extrabold text-midnight tracking-tight mb-2">Authentication Error</h1>
      <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
        {isExpired
          ? "This verification link is invalid or expired. Return to sign in and request a new confirmation email."
          : "There was an issue with the authentication process. Please try signing in again."}
      </p>
      
      <div className="flex gap-4">
        <Button variant="outline" onClick={() => window.history.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Go Back
        </Button>
        <Button asChild>
          <Link href="/auth">Try Again</Link>
        </Button>
      </div>
    </div>
  );
}
