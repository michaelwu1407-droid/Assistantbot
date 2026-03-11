"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { ReferralProvider } from "@/components/providers/referral-provider";

const AppInitializer = dynamic(
  () => import("@/components/providers/app-initializer").then((mod) => mod.AppInitializer),
  { ssr: false },
);
const CommandPalette = dynamic(
  () => import("@/components/core/command-palette").then((mod) => mod.CommandPalette),
  { ssr: false },
);
const OfflineBanner = dynamic(
  () => import("@/components/core/offline-banner").then((mod) => mod.OfflineBanner),
  { ssr: false },
);
const ServiceWorkerProvider = dynamic(
  () => import("@/components/providers/service-worker-provider").then((mod) => mod.ServiceWorkerProvider),
  { ssr: false },
);

export function DashboardClientChrome() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (ready) return;

    const activate = () => setReady(true);
    const timer = window.setTimeout(activate, 1200);
    const idle =
      "requestIdleCallback" in window
        ? window.requestIdleCallback(activate, { timeout: 1500 })
        : null;

    window.addEventListener("pointerdown", activate, { once: true, passive: true });
    window.addEventListener("keydown", activate, { once: true });

    return () => {
      window.clearTimeout(timer);
      if (idle != null && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idle);
      }
      window.removeEventListener("pointerdown", activate);
      window.removeEventListener("keydown", activate);
    };
  }, [ready]);

  if (!ready) return null;

  return (
    <PostHogProvider>
      <ReferralProvider>
        <AppInitializer />
        <CommandPalette />
        <OfflineBanner />
        <ServiceWorkerProvider />
      </ReferralProvider>
    </PostHogProvider>
  );
}
