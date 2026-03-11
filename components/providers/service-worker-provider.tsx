"use client"

import { useEffect } from "react"
import { processQueue } from "@/lib/sync-queue"
import { updateJobStatus, createQuoteVariation } from "@/actions/tradie-actions"
import { logActivity } from "@/actions/activity-actions"

type UpdateJobStatusPayload = {
  jobId: string
  status: Parameters<typeof updateJobStatus>[1]
}

type CreateQuoteVariationPayload = {
  jobId: string
  items: Parameters<typeof createQuoteVariation>[1]
}

type ActivityPayload = Parameters<typeof logActivity>[0]

const ACTION_MAP: Record<string, (payload: Record<string, unknown>) => Promise<unknown>> = {
  updateJobStatus: (payload) => {
    const typedPayload = payload as UpdateJobStatusPayload
    return updateJobStatus(typedPayload.jobId, typedPayload.status)
  },
  createQuoteVariation: (payload) => {
    const typedPayload = payload as CreateQuoteVariationPayload
    return createQuoteVariation(typedPayload.jobId, typedPayload.items)
  },
  logActivity: (payload) => logActivity(payload as ActivityPayload),
}

export function ServiceWorkerProvider() {
  useEffect(() => {
    const registerServiceWorker = () => {
      if (
        typeof window !== "undefined" &&
        "serviceWorker" in navigator
      ) {
        navigator.serviceWorker
          .register("/sw.js")
          .then((registration) => {
            if (process.env.NODE_ENV === "development") console.log("SW registered:", registration.scope)
          })
          .catch((error) => {
            console.error("Service Worker registration failed:", error)
          })
      }
    }

    let idleRegistrationId: number | null = null
    let timeoutRegistrationId: ReturnType<typeof setTimeout> | null = null

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      idleRegistrationId = window.requestIdleCallback(registerServiceWorker, { timeout: 2000 })
    } else {
      timeoutRegistrationId = setTimeout(registerServiceWorker, 1200)
    }

    const handleOnline = () => {
      if (process.env.NODE_ENV === "development") console.log("Online - processing sync queue")
      processQueue(ACTION_MAP)
    }

    window.addEventListener("online", handleOnline)

    if (navigator.onLine) {
      setTimeout(() => {
        processQueue(ACTION_MAP)
      }, 300)
    }

    return () => {
      window.removeEventListener("online", handleOnline)
      if (timeoutRegistrationId != null) {
        clearTimeout(timeoutRegistrationId)
      }
      if (idleRegistrationId != null && typeof window !== "undefined" && "cancelIdleCallback" in window) {
        window.cancelIdleCallback(idleRegistrationId)
      }
    }
  }, [])

  return null
}
