"use client";

import { ArrowLeft, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useShellStore } from "@/lib/store";

export function SettingsHeader() {
  const setViewMode = useShellStore((state) => state.setViewMode);

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>

        <div>
          <h1 className="text-2xl font-semibold">Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage your profile and application preferences
          </p>
        </div>
      </div>
      <div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setViewMode("TUTORIAL");
          }}
        >
          <Play className="mr-2 h-4 w-4" />
          Replay Tutorial
        </Button>
      </div>
    </div>
  );
}
