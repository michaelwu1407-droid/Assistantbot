"use client"

import { useState, type ReactNode } from "react"
import { BottomNav } from "./bottom-nav"
import { TraceySheet } from "./tracey-sheet"
import { MoreSheet } from "./more-sheet"

interface MobileShellProps {
  /** Page-specific header rendered above the scroll area (use <MobileHeader/> or any custom node). */
  header?: ReactNode
  /** Main scrollable content. */
  children: ReactNode
  /** Chatbot node to render inside the Tracey sheet (same node passed to desktop Shell). */
  chatbot?: ReactNode
  /** Hide the bottom navigation (e.g. for full-screen flows like onboarding). */
  hideBottomNav?: boolean
  /** Notification dot on the Tracey tab. */
  hasNotifications?: boolean
}

export function MobileShell({
  header,
  children,
  chatbot,
  hideBottomNav,
  hasNotifications,
}: MobileShellProps) {
  const [traceyOpen, setTraceyOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  return (
    <div className="md:hidden flex h-dvh min-h-0 w-full flex-col bg-background">
      {header}
      <main
        className={
          "flex-1 min-h-0 overflow-y-auto overflow-x-hidden " +
          (hideBottomNav ? "" : "pb-mobile-nav")
        }
      >
        {children}
      </main>

      {!hideBottomNav && (
        <BottomNav
          onTraceyClick={() => setTraceyOpen(true)}
          onMoreClick={() => setMoreOpen(true)}
          hasNotifications={hasNotifications}
        />
      )}

      {chatbot && (
        <TraceySheet open={traceyOpen} onOpenChange={setTraceyOpen}>
          {chatbot}
        </TraceySheet>
      )}

      <MoreSheet open={moreOpen} onOpenChange={setMoreOpen} />
    </div>
  )
}
