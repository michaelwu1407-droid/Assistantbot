"use client"

import { useEffect } from "react"
import { processQueue } from "@/lib/sync-queue"
import { toast } from "sonner"

type DealStageUpdatePayload = { dealId: string; stage: string }

function isDealStageUpdatePayload(value: unknown): value is DealStageUpdatePayload {
  if (!value || typeof value !== "object") return false
  const v = value as Record<string, unknown>
  return typeof v.dealId === "string" && typeof v.stage === "string"
}

/**
 * SyncProvider listens for the browser's 'online' event.
 * When online, it triggers the processing of the offline mutation queue.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const handleOnline = () => {
      toast.info("Back online. Syncing changes...")
      
      // Map action names to actual server action functions
      const actionMap = {
        "updateDealStage": async (payload: unknown) => {
            if (!isDealStageUpdatePayload(payload)) {
              throw new Error("Invalid updateDealStage payload")
            }
            const response = await fetch("/api/deals/update-stage", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                dealId: payload.dealId,
                stage: payload.stage,
              }),
            })

            if (!response.ok) {
              throw new Error(`Failed to sync stage update (${response.status})`)
            }
        },
        // Add other offline-capable actions here
      }

      processQueue(actionMap)
        .then(() => {
          // processQueue logs its own completion, but we can toast here if needed
          // toast.success("Sync complete") 
        })
        .catch((err) => {
          console.error("Sync failed", err)
          toast.error("Sync encountered errors")
        })
    }

    window.addEventListener("online", handleOnline)

    // Optional: Attempt sync on mount if online
    if (navigator.onLine) {
        // We could trigger a silent sync here
    }

    return () => window.removeEventListener("online", handleOnline)
  }, [])

  return <>{children}</>
}
