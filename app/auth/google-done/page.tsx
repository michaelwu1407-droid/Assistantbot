"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function GoogleDonePage() {
  const [status, setStatus] = useState<"loading" | "error">("loading")

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : ""
    const params = new URLSearchParams(hash.replace(/^#/, ""))
    const idToken = params.get("id_token")
    const accessToken = params.get("access_token")
    const next = params.get("next") || "/auth/next"

    if (!idToken) {
      setStatus("error")
      window.location.href = "/auth?error=missing_token"
      return
    }

    const supabase = createClient()
    supabase.auth
      .signInWithIdToken({
        provider: "google",
        token: idToken,
        ...(accessToken && { access_token: accessToken }),
      })
      .then(({ error }) => {
        // Clear hash so token is not visible in history
        if (typeof window !== "undefined") {
          window.history.replaceState(null, "", window.location.pathname + window.location.search)
        }
        if (error) {
          setStatus("error")
          window.location.href = `/auth?error=${encodeURIComponent(error.message)}`
          return
        }
        window.location.href = next
      })
      .catch(() => {
        setStatus("error")
        window.location.href = "/auth?error=signin_failed"
      })
  }, [])

  if (status === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-muted-foreground">Something went wrong. Redirecting to sign in…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <p className="text-muted-foreground">Signing you in…</p>
    </div>
  )
}
