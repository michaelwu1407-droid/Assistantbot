import { WifiOff } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4 text-center">
      <div className="mb-6 rounded-full bg-slate-100 p-6">
        <WifiOff className="h-12 w-12 text-slate-400" />
      </div>
      <h1 className="mb-2 text-2xl font-bold text-slate-900">You are offline</h1>
      <p className="mb-8 max-w-md text-slate-500">
        It looks like you've lost your internet connection. We've saved your recent changes locally and will sync them when you're back online.
      </p>
      <div className="flex gap-4">
        <Link href="/dashboard">
          <Button variant="default">Go to Dashboard</Button>
        </Link>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    </div>
  );
}
