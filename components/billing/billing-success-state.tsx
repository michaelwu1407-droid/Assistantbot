"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BillingSuccessState({
  title,
  description,
  detail,
  nextPath,
}: {
  title: string;
  description: string;
  detail?: string | null;
  nextPath: string;
}) {
  const router = useRouter();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      router.push(nextPath);
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [nextPath, router]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="w-full max-w-lg rounded-md border border-border bg-card shadow-xl shadow-slate-900/5 p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-primary/12">
          <CheckCircle2 className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-midnight">{title}</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>

        {detail ? (
          <div className="mt-5 rounded-md border border-primary/15 bg-primary/5 px-4 py-3 text-sm text-foreground">
            <div className="flex items-center justify-center gap-2">
              <Phone className="h-4 w-4 text-primary" />
              <span>{detail}</span>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>Taking you to the next step…</span>
        </div>

        <Button className="mt-6 w-full" onClick={() => router.push(nextPath)}>
          Continue now
        </Button>
      </div>
    </div>
  );
}
