"use client"

import { useState, useMemo, type ReactNode } from "react"
import { DealView } from "@/actions/deal-actions"
import { differenceInDays } from "date-fns"
import { cn } from "@/lib/utils"
import { countAttentionRequiredDeals } from "@/lib/deal-attention"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface DashboardKpiCardsProps {
  deals: DealView[]
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function KpiMetric({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "text-xl font-extrabold leading-none tracking-tight tabular-nums text-black dark:text-white",
        className
      )}
    >
      {children}
    </h2>
  )
}

const kpiLabelClass =
  "text-[10px] font-bold uppercase tracking-widest text-black dark:text-white/90"

function KpiCardFrame({
  borderClass,
  bgClass,
  children,
}: {
  borderClass: string
  bgClass: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex min-h-[5.75rem] rounded-[18px] border-l-[5px] shadow-sm",
        borderClass,
        bgClass
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 p-3">{children}</div>
    </div>
  )
}

export function DashboardKpiCards({ deals }: DashboardKpiCardsProps) {
  const [staleWeeks, setStaleWeeks] = useState(2)
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const { revenue, travisWonRevenue, upcomingCount, attentionRequiredCount } = useMemo(() => {
    const wonThisMonth = deals.filter(
      (d) =>
        d.stage === "completed" &&
        new Date(d.stageChangedAt).getMonth() === currentMonth &&
        new Date(d.stageChangedAt).getFullYear() === currentYear
    )
    const revenue = wonThisMonth.reduce((sum, d) => sum + d.value, 0)
    const travisWon = wonThisMonth.filter(
      (d) => d.metadata && typeof d.metadata === "object" && "source" in d.metadata && d.metadata.source
    )
    const travisWonRevenue = travisWon.reduce((sum, d) => sum + d.value, 0)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const upcomingCount = deals.filter((d) => {
      if (d.stage !== "scheduled") return false
      if (!d.scheduledAt) return false
      const scheduled = new Date(d.scheduledAt)
      return (
        scheduled.getMonth() === currentMonth &&
        scheduled.getFullYear() === currentYear &&
        scheduled >= startOfToday
      )
    }).length
    const staleDays = staleWeeks * 7
    const staleWindowDeals = deals.filter((d) => {
      const days = differenceInDays(now, new Date(d.lastActivityDate))
      return days >= staleDays && d.stage !== "completed" && d.stage !== "lost"
    })
    const attentionRequiredCount = countAttentionRequiredDeals(
      deals.map((deal) => {
        const staleMatch = staleWindowDeals.some((s) => s.id === deal.id)
        return staleMatch
          ? { ...deal, health: { ...deal.health, status: "STALE" as const } }
          : deal
      })
    )

    return { revenue, travisWonRevenue, upcomingCount, attentionRequiredCount }
  }, [deals, currentMonth, currentYear, staleWeeks])

  const monthLabel = MONTHS[currentMonth]

  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      <KpiCardFrame borderClass="border-l-sky-700" bgClass="bg-sky-100 dark:bg-sky-950/40">
        <p className={kpiLabelClass}>{monthLabel} Revenue</p>
        <div className="flex min-w-0 items-end justify-between gap-2">
          <KpiMetric>${revenue.toLocaleString()}</KpiMetric>
        </div>
      </KpiCardFrame>

      <KpiCardFrame borderClass="border-l-emerald-700" bgClass="bg-emerald-100 dark:bg-emerald-950/45">
        <p className={kpiLabelClass}>Jobs Won With Tracey ({monthLabel})</p>
        <div className="flex min-w-0 items-end justify-between gap-2">
          <KpiMetric>${travisWonRevenue.toLocaleString()}</KpiMetric>
        </div>
      </KpiCardFrame>

      <KpiCardFrame borderClass="border-l-slate-600" bgClass="bg-slate-200 dark:bg-slate-900/50">
        <p className={kpiLabelClass}>Upcoming Jobs ({monthLabel})</p>
        <div className="flex min-w-0 items-end justify-between gap-2">
          <KpiMetric>{upcomingCount}</KpiMetric>
        </div>
      </KpiCardFrame>

      <KpiCardFrame borderClass="border-l-red-700" bgClass="bg-red-100 dark:bg-red-950/45">
        <div className="flex min-w-0 items-start gap-2">
          <p className={cn(kpiLabelClass, "min-w-0 flex-1 truncate")}>Attention Required</p>
          <div className="w-fit max-w-[4.5rem] shrink-0">
            <Select value={String(staleWeeks)} onValueChange={(v) => setStaleWeeks(Number(v))}>
              <SelectTrigger
                aria-label="Stale follow-up window in weeks"
                className="h-7 !w-auto max-w-[4.5rem] min-w-[3rem] border-black/15 bg-white px-2 py-0 text-xs font-semibold text-black dark:text-black"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[1, 2, 3, 4, 6, 8].map((w) => (
                  <SelectItem key={w} value={String(w)} className="text-sm">
                    {w}w
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex min-w-0 items-end justify-between gap-2">
          <KpiMetric>{attentionRequiredCount}</KpiMetric>
        </div>
      </KpiCardFrame>
    </section>
  )
}
