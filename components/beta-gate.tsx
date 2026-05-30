"use client"

import { useState, useEffect, type ReactNode } from "react"
import { Lock } from "lucide-react"
import { cn } from "@/lib/utils"

const STORAGE_KEY = "em_beta_map_unlocked"

export function BetaGate({ children }: { children: ReactNode }) {
  const [unlocked, setUnlocked] = useState<boolean | null>(null)
  const [input, setInput] = useState("")
  const [error, setError] = useState(false)

  useEffect(() => {
    // Hydrate the unlock flag from localStorage on client mount. Starting null
    // (and rendering nothing) keeps server and first client render identical;
    // the effect-driven update is the standard hydration-safe pattern here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUnlocked(localStorage.getItem(STORAGE_KEY) === "1")
  }, [])

  if (unlocked === null) return null

  if (unlocked) return <>{children}</>

  const password = process.env.NEXT_PUBLIC_MAP_BETA_PASSWORD

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!password || input === password) {
      localStorage.setItem(STORAGE_KEY, "1")
      setUnlocked(true)
    } else {
      setError(true)
      setInput("")
    }
  }

  return (
    <div className="flex h-full w-full items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm rounded-md border border-border bg-card p-8 shadow-sm text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <Lock className="h-5 w-5 text-muted-foreground" />
        </div>
        <h2 className="app-panel-title mb-1">Map — Beta Preview</h2>
        <p className="app-body-secondary mb-6">Enter the beta password to access the map feature.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="password"
            value={input}
            onChange={(e) => { setInput(e.target.value); setError(false) }}
            placeholder="Beta password"
            autoFocus
            className={cn(
              "w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none",
              "focus-visible:ring-0 focus-visible:border-foreground/40",
              error && "ott-field-error",
            )}
          />
          {error && <p className="ott-field-error-msg text-left">Incorrect password. Try again.</p>}
          <button
            type="submit"
            className="rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:bg-foreground/90 transition-colors"
          >
            Unlock
          </button>
        </form>
      </div>
    </div>
  )
}
