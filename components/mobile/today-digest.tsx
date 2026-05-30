"use client"

import { useMemo } from "react"
import Link from "next/link"
import { CalendarDays, PhoneIncoming, Sparkles } from "lucide-react"
import type { DealView } from "@/actions/deal-actions"

interface TodayDigestProps {
  deals: DealView[]
  userName: string
}

function getGreeting(name: string) {
  const hour = new Date().getHours()
  const first = name.split(" ")[0] || name
  if (hour < 12) return `Morning, ${first}`
  if (hour < 17) return `Afternoon, ${first}`
  return `Evening, ${first}`
}

export function TodayDigest({ deals, userName }: TodayDigestProps) {
  const { todayJobs, newToday, attentionCount } = useMemo(() => {
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const todayEnd = new Date(todayStart.getTime() + 86400000)

    const todayJobs = deals.filter((d) => {
      if (d.stage !== "scheduled") return false
      const s = d.scheduledAt ? new Date(d.scheduledAt) : null
      return s && s >= todayStart && s < todayEnd
    })

    const newToday = deals.filter((d) => {
      const c = new Date(d.createdAt)
      return c >= todayStart && c < todayEnd && d.stage === "new_request"
    })

    const attentionCount = deals.filter((d) => {
      const meta = (d.metadata ?? {}) as Record<string, unknown>
      return meta.attentionRequired === true
    }).length

    return { todayJobs, newToday, attentionCount }
  }, [deals])

  return (
    <div className="px-4 pt-4 pb-2 space-y-3">
      <p className="text-lg font-semibold text-foreground">{getGreeting(userName)} 👋</p>

      <div className="grid grid-cols-3 gap-2">
        <Link href="/crm/schedule" className="flex flex-col gap-1 rounded-md bg-card border border-border p-3">
          <CalendarDays className="h-4 w-4 text-[#4A7CE6]" />
          <span className="text-2xl font-bold tabular-nums text-foreground">{todayJobs.length}</span>
          <span className="text-[11px] text-muted-foreground leading-tight">
            {todayJobs.length === 1 ? "job today" : "jobs today"}
          </span>
        </Link>

        <Link href="/crm/dashboard" className="flex flex-col gap-1 rounded-md bg-card border border-border p-3">
          <Sparkles className="h-4 w-4 text-[#00D28B]" />
          <span className="text-2xl font-bold tabular-nums text-foreground">{newToday.length}</span>
          <span className="text-[11px] text-muted-foreground leading-tight">
            {newToday.length === 1 ? "new lead" : "new leads"}
          </span>
        </Link>

        <div className="flex flex-col gap-1 rounded-md bg-card border border-border p-3">
          <PhoneIncoming className="h-4 w-4 text-[#E89A2B]" />
          <span className="text-2xl font-bold tabular-nums text-foreground">{attentionCount}</span>
          <span className="text-[11px] text-muted-foreground leading-tight">
            {attentionCount === 1 ? "needs attention" : "need attention"}
          </span>
        </div>
      </div>
    </div>
  )
}
