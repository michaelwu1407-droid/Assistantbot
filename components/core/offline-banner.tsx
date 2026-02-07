"use client"

import { useEffect, useState } from "react"
import { WifiOff } from "lucide-react"

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false)

  useEffect(() => {
    function onOffline() {
      setIsOffline(true)
    }

    function onOnline() {
      setIsOffline(false)
    }

    if (typeof window !== "undefined") {
      window.addEventListener("offline", onOffline)
      window.addEventListener("online", onOnline)
      setIsOffline(!navigator.onLine)
    }

    return () => {
      window.removeEventListener("offline", onOffline)
      window.removeEventListener("online", onOnline)
    }
  }, [])

  if (!isOffline) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-in slide-in-from-bottom-5">
      <div className="flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-lg">
        <WifiOff className="h-4 w-4" />
        <span>You are currently offline. Changes will sync when you reconnect.</span>
      </div>
    </div>
  )
}
