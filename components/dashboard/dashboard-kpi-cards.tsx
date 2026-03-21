"use client"

import { useState, useMemo, type ReactNode } from "react"
import { DealView } from "@/actions/deal-actions"
import { differenceInDays } from "date-fns"
import { cn } from "@/lib/utils"
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
        "text-xl font-extrabold leading-none tracking-tight tabular-nums text-black dark:text-black",
        className
      )}
    >
      {children}
    </h2>
  )
}

const kpiLabelClass =
  "text-[10px] font-bold uppercase tracking-widest text-black dark:text-black"

/** Label↔metric gap −⅓ vs `gap-1` (4px → ~2.67px). Grid: `gap-3` between the four cards. */
const cardShell =
  "flex min-h-[5.75rem] flex-col justify-between gap-[0.17rem] rounded-lg border p-2.5 ghost-border sunlight-shadow"

/** ~10% deeper than flat emerald-50 (subtle ring + tint). Black text on top. */
const kpiSharedTint =
  "border-emerald-200/75 bg-emerald-50 shadow-sm ring-1 ring-emerald-100/45 dark:border-emerald-800/55 dark:bg-emerald-950/42 dark:ring-emerald-800/35"

export function DashboardKpiCards({ deals }: DashboardKpiCardsProps) {
  const [staleWeeks, setStaleWeeks] = useState(2)
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const { revenue, travisWonRevenue, upcomingCount, followUpCount } = useMemo(() => {
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
    const followUpCount = deals.filter((d) => {
      const days = differenceInDays(now, new Date(d.lastActivityDate))
      return days >= staleDays && d.stage !== "completed" && d.stage !== "lost"
    }).length

    return { revenue, travisWonRevenue, upcomingCount, followUpCount }
  }, [deals, currentMonth, currentYear, staleWeeks])

  const monthLabel = MONTHS[currentMonth]

  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      <div className={cn(cardShell, kpiSharedTint)}>
        <p className={kpiLabelClass}>{monthLabel} Revenue</p>
        <KpiMetric>${revenue.toLocaleString()}</KpiMetric>
      </div>

      <div className={cn(cardShell, kpiSharedTint)}>
        <p className={kpiLabelClass}>Jobs Won With Tracey ({monthLabel})</p>
        <KpiMetric>${travisWonRevenue.toLocaleString()}</KpiMetric>
      </div>

      <div className={cn(cardShell, kpiSharedTint)}>
        <p className={kpiLabelClass}>Upcoming Jobs ({monthLabel})</p>
        <KpiMetric>{upcomingCount}</KpiMetric>
      </div>

      <div className={cn(cardShell, kpiSharedTint, "relative")}>
        <p className={cn(kpiLabelClass, "min-w-0 pr-14")}>Follow-up</p>
        <div className="absolute right-2.5 top-2.5 z-10">
          <Select value={String(staleWeeks)} onValueChange={(v) => setStaleWeeks(Number(v))}>
            <SelectTrigger
              aria-label="Stale follow-up window in weeks"
              className="h-7 min-w-[3rem] shrink-0 border-black/15 bg-white px-2 text-xs font-semibold text-black dark:text-black"
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
        <KpiMetric>{followUpCount}</KpiMetric>
      </div>
    </section>
  )
}
