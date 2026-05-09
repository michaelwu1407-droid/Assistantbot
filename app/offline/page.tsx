"use client";

import { WifiOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-4 text-center">
      <div className="mb-6 rounded-full bg-muted p-6">
        <WifiOff className="h-12 w-12 text-muted-foreground" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-foreground">You are offline</h1>
      <p className="mt-4 text-muted-foreground">You&apos;re currently offline. Please check your internet connection. We&apos;ve saved your recent changes locally and will sync them when you&apos;re back online.</p>
      <div className="flex gap-4">
        <Link href="/crm/dashboard">
          <Button variant="default">Go to Dashboard</Button>
        </Link>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    </div>
  );
}
