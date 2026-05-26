"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Inbox, ClipboardList, MoreHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

type TabItem = {
  href: string
  label: string
  icon: typeof LayoutDashboard
  match: (pathname: string) => boolean
}

const TABS: TabItem[] = [
  {
    href: "/crm/dashboard",
    label: "Pipeline",
    icon: LayoutDashboard,
    match: (p) => p === "/crm/dashboard" || p.startsWith("/crm/deals"),
  },
  {
    href: "/crm/inbox",
    label: "Inbox",
    icon: Inbox,
    match: (p) => p.startsWith("/crm/inbox"),
  },
  {
    href: "/crm/run-sheet",
    label: "Today",
    icon: ClipboardList,
    match: (p) => p.startsWith("/crm/run-sheet") || p.startsWith("/crm/schedule"),
  },
]

interface BottomNavProps {
  onTraceyClick: () => void
  onMoreClick: () => void
  hasNotifications?: boolean
}

export function BottomNav({ onTraceyClick, onMoreClick, hasNotifications }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 h-mobile-nav pb-safe border-t border-border/60 bg-card/95 backdrop-blur-md md:hidden"
    >
      <div className="relative mx-auto flex h-[64px] max-w-md items-stretch justify-around px-2">
        <TabButton tab={TABS[0]} active={TABS[0].match(pathname)} />
        <TabButton tab={TABS[1]} active={TABS[1].match(pathname)} />
        <TraceyTab onClick={onTraceyClick} hasDot={hasNotifications} />
        <TabButton tab={TABS[2]} active={TABS[2].match(pathname)} />
        <MoreTab onClick={onMoreClick} />
      </div>
    </nav>
  )
}

function TabButton({ tab, active }: { tab: TabItem; active: boolean }) {
  const Icon = tab.icon
  return (
    <Link
      href={tab.href}
      aria-label={tab.label}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors",
        active ? "text-foreground" : "text-muted-foreground"
      )}
    >
      <Icon className="h-5 w-5" strokeWidth={active ? 2.25 : 1.75} />
      <span>{tab.label}</span>
    </Link>
  )
}

function TraceyTab({ onClick, hasDot }: { onClick: () => void; hasDot?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Tracey assistant"
      className="flex flex-1 flex-col items-center justify-end gap-1 text-[11px] font-medium text-foreground"
    >
      <span className="relative -mt-6 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15 ring-4 ring-card">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-base font-semibold text-primary-foreground">
          T
        </span>
        {hasDot && (
          <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-destructive" />
        )}
      </span>
      <span>Tracey</span>
    </button>
  )
}

function MoreTab({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="More"
      className="flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium text-muted-foreground"
    >
      <MoreHorizontal className="h-5 w-5" strokeWidth={1.75} />
      <span>More</span>
    </button>
  )
}
