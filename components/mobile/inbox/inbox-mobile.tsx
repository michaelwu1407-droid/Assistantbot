"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Search, MessageSquare, Phone, Mail, StickyNote } from "lucide-react"
import { ActivityView } from "@/actions/activity-actions"
import { MobileHeader } from "@/components/mobile/_primitives/mobile-header"
import { formatShortDate, formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"

interface InboxMobileProps {
  interactions: ActivityView[]
  contactSegment?: Record<string, "lead" | "existing">
  userName?: string
}

type FilterKey = "all" | "lead" | "existing"

const FILTERS: { id: FilterKey; label: string }[] = [
  { id: "all", label: "All" },
  { id: "lead", label: "Leads" },
  { id: "existing", label: "Customers" },
]

function activityIcon(type: string) {
  const t = type.toUpperCase()
  if (t === "CALL") return Phone
  if (t === "EMAIL") return Mail
  if (t === "NOTE") return StickyNote
  return MessageSquare
}

function groupByContact(activities: ActivityView[]): ActivityView[] {
  const seen = new Set<string>()
  const result: ActivityView[] = []
  for (const a of activities) {
    const key = a.contactId || a.id
    if (seen.has(key)) continue
    seen.add(key)
    result.push(a)
  }
  return result
}

export function InboxMobile({ interactions, contactSegment, userName }: InboxMobileProps) {
  const [filter, setFilter] = useState<FilterKey>("all")
  const [query, setQuery] = useState("")

  const threads = useMemo(() => {
    const grouped = groupByContact(interactions)
    return grouped.filter((a) => {
      if (filter !== "all") {
        const seg = a.contactId ? contactSegment?.[a.contactId] : "lead"
        if (seg !== filter) return false
      }
      if (query) {
        const q = query.toLowerCase()
        return (
          (a.contactName || "").toLowerCase().includes(q) ||
          (a.title || "").toLowerCase().includes(q) ||
          (a.description || "").toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [interactions, filter, query, contactSegment])

  return (
    <>
      <MobileHeader pageTitle="Inbox" userName={userName} />
      <div className="px-4 pt-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations"
            className="w-full rounded-md border border-border bg-card py-3 pl-10 pr-3 text-[15px] focus-visible:outline-none"
          />
        </div>
      </div>
      <div className="flex gap-2 overflow-x-auto scrollbar-hide px-4 py-3">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setFilter(f.id)}
            className={cn(
              "rounded-full border px-4 py-1.5 text-[13px] font-medium whitespace-nowrap",
              filter === f.id
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-card text-muted-foreground"
            )}
          >
            {f.label}
          </button>
        ))}
      </div>
      <ul className="flex flex-col divide-y divide-border/40 border-y border-border/40">
        {threads.length === 0 && (
          <li className="px-4 py-12">
            <div className="ott-empty-state">
              <p className="ott-empty-state-title">No conversations</p>
              <p className="ott-empty-state-body">New messages will appear here.</p>
            </div>
          </li>
        )}
        {threads.map((a) => {
          const Icon = activityIcon(a.type)
          const href = a.contactId ? `/crm/inbox/${a.contactId}` : "#"
          return (
            <li key={a.id}>
              <Link href={href} className="flex items-start gap-3 px-4 py-4 active:bg-muted/40">
                <span className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-[15px] font-semibold text-foreground">
                      {a.contactName || a.title || "Unknown"}
                    </p>
                    <span className="shrink-0 text-[11px] text-muted-foreground tabular-nums">
                      {formatShortDate(a.createdAt)} {formatTime(a.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground break-words">
                    {a.description || a.title}
                  </p>
                </div>
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
