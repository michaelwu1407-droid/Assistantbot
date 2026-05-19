"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface MobileHeaderProps {
  pageTitle: string
  userName?: string
  workspaceInitial?: string
  hasNotifications?: boolean
  onProfileClick?: () => void
  onWorkspaceClick?: () => void
  /** Override the displayed date (defaults to today, formatted en-AU) */
  dateLabel?: string
  /** Optional right-side element (e.g. action button) shown in place of profile dot */
  rightSlot?: React.ReactNode
}

export function MobileHeader({
  pageTitle,
  userName,
  workspaceInitial,
  hasNotifications,
  onProfileClick,
  onWorkspaceClick,
  dateLabel,
  rightSlot,
}: MobileHeaderProps) {
  const today = useMemo(() => {
    if (dateLabel) return dateLabel
    return new Date().toLocaleDateString("en-AU", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  }, [dateLabel])

  const userInitial = (userName?.trim()?.[0] || "U").toUpperCase()
  const wsInitial = (workspaceInitial?.trim()?.[0] || userInitial).toLowerCase()

  return (
    <header
      className={cn(
        "sticky top-0 z-30 md:hidden",
        "bg-emerald-900 text-white pt-safe"
      )}
    >
      <div className="flex items-center gap-3 px-4 pb-4 pt-3">
        <button
          type="button"
          onClick={onWorkspaceClick}
          aria-label="Workspace"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-base font-semibold text-white"
        >
          {wsInitial}
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] leading-tight text-emerald-100/90">{today}</p>
          <h1 className="truncate text-xl font-bold leading-tight text-white">{pageTitle}</h1>
        </div>
        {rightSlot ?? (
          <button
            type="button"
            onClick={onProfileClick}
            aria-label="Profile and notifications"
            className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-base font-semibold text-white"
          >
            {userInitial}
            {hasNotifications && (
              <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full bg-destructive ring-2 ring-emerald-900" />
            )}
          </button>
        )}
      </div>
    </header>
  )
}
