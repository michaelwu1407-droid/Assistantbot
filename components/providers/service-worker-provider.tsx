"use client"

import { useEffect } from "react"
import { processQueue } from "@/lib/sync-queue"
import { updateJobStatus, createQuoteVariation } from "@/actions/tradie-actions"
import { logActivity } from "@/actions/activity-actions"

// Map action names to actual server action functions
// This allows the generic queue processor to execute them
const ACTION_MAP: Record<string, (payload: any) => Promise<any>> = {
  'updateJobStatus': (payload) => updateJobStatus(payload.jobId, payload.status),
  'createQuoteVariation': (payload) => createQuoteVariation(payload.jobId, payload.items),
  'logActivity': (payload) => logActivity(payload),
}

export function ServiceWorkerProvider() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator
    ) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("Service Worker registered with scope:", registration.scope)
        })
        .catch((error) => {
          console.error("Service Worker registration failed:", error)
        })
    }

    // Listen for online status to trigger sync
    const handleOnline = () => {
      console.log("App is online. Processing sync queue...");
      processQueue(ACTION_MAP);
    };

    window.addEventListener('online', handleOnline);

    // Try to process queue on mount (in case we just reloaded and are online)
    if (navigator.onLine) {
      processQueue(ACTION_MAP);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [])

  return null
}
