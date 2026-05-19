"use client"

import { useSyncExternalStore } from "react"

const MOBILE_QUERY = "(max-width: 767px)"

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {}
  const mq = window.matchMedia(MOBILE_QUERY)
  mq.addEventListener("change", callback)
  return () => mq.removeEventListener("change", callback)
}

function getSnapshot(): boolean {
  return window.matchMedia(MOBILE_QUERY).matches
}

function getServerSnapshot(): boolean {
  // Desktop-first on the server so the desktop shell renders during SSR;
  // the real value is settled on the client mount via useSyncExternalStore
  // without an extra render commit.
  return false
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
