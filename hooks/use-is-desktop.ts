"use client";

import { useSyncExternalStore } from "react";

const DESKTOP_BREAKPOINT_PX = 640;
const QUERY = `(min-width: ${DESKTOP_BREAKPOINT_PX}px)`;

function subscribe(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(QUERY).matches;
}

function getServerSnapshot(): boolean {
  // Desktop-first on the server so the dialog markup matches the most
  // common viewport; the real value is settled on the client mount via
  // useSyncExternalStore without an extra render commit.
  return true;
}

export function useIsDesktop(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
