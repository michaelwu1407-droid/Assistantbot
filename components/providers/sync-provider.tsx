"use client"

import { useEffect } from "react"
import { processQueue } from "@/lib/sync-queue"
import { updateDealStage } from "@/actions/deal-actions"
import { toast } from "sonner"

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
        "updateDealStage": async (payload: any) => {
            // payload is expected to be { dealId, stage }
            await updateDealStage(payload.dealId, payload.stage)
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
