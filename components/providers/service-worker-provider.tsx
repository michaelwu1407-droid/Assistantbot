"use client"

import { useEffect } from "react"
import { processQueue } from "@/lib/sync-queue"

const ACTION_MAP: Record<string, (payload: unknown) => Promise<unknown>> = {
  updateJobStatus: (payload) =>
    fetch("/api/sync/replay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionName: "updateJobStatus", payload }),
    }).then((res) => {
      if (!res.ok) throw new Error(`Sync replay failed (${res.status})`)
      return res.json()
    }),
  createQuoteVariation: (payload) =>
    fetch("/api/sync/replay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionName: "createQuoteVariation", payload }),
    }).then((res) => {
      if (!res.ok) throw new Error(`Sync replay failed (${res.status})`)
      return res.json()
    }),
  logActivity: (payload) =>
    fetch("/api/sync/replay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actionName: "logActivity", payload }),
    }).then((res) => {
      if (!res.ok) throw new Error(`Sync replay failed (${res.status})`)
      return res.json()
    }),
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
