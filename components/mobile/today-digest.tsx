"use client"

import { useMemo } from "react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
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

function DigestCard({
  href,
  icon: Icon,
  count,
  singular,
  plural,
  iconColor,
}: {
  href?: string
  icon: LucideIcon
  count: number
  singular: string
  plural: string
  iconColor: string
}) {
  const inner = (
    <>
      <Icon className={`h-4 w-4 ${iconColor}`} />
      <span className="text-2xl font-bold tabular-nums text-foreground">{count}</span>
      <span className="text-[11px] text-muted-foreground leading-tight">
        {count === 1 ? singular : plural}
      </span>
    </>
  )
  const cls = "flex flex-col gap-1 rounded-md bg-card border border-border p-3"
  return href ? (
    <Link href={href} className={cls}>{inner}</Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
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
        <DigestCard href="/crm/schedule" icon={CalendarDays} count={todayJobs.length} singular="job today" plural="jobs today" iconColor="text-[#4A7CE6]" />
        <DigestCard href="/crm/dashboard" icon={Sparkles} count={newToday.length} singular="new lead" plural="new leads" iconColor="text-[#00D28B]" />
        <DigestCard icon={PhoneIncoming} count={attentionCount} singular="needs attention" plural="need attention" iconColor="text-[#E89A2B]" />
      </div>
    </div>
  )
}
