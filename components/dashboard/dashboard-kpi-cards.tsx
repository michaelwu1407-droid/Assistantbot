"use client"

import { useState, useMemo } from "react"
import { DealView } from "@/actions/deal-actions"
import { differenceInDays } from "date-fns"
import { cn } from "@/lib/utils"
import { StatCard } from "@/components/ui/stat-card"
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
  "July", "August", "September", "October", "November", "December"
]

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
    const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    const upcomingCount = deals.filter((d) => {
      if (d.stage !== "scheduled") return false
      if (!d.scheduledAt) return true
      const scheduled = new Date(d.scheduledAt)
      return scheduled >= now && scheduled <= sevenDaysFromNow
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
    <div id="kpi-cards" className="grid grid-cols-4 gap-3 h-full flex-[4] min-w-0">
      <StatCard
        label={`${monthLabel} Revenue`}
        value={`$${revenue.toLocaleString()}`}
      />
      <StatCard
        label="Jobs Won With Tracey"
        value={`$${travisWonRevenue.toLocaleString()}`}
        sub="Via Tracey automation"
        accent
      />
      <StatCard
        label="Upcoming Jobs"
        value={upcomingCount}
        sub="Next 7 days"
      />
      <div className="bg-card rounded-lg border border-neutral-200 shadow-sm p-4 flex flex-col gap-1">
        <span className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
          Follow-up
        </span>
        <div className="flex items-end justify-between gap-1">
          <span
            className={cn(
              "text-3xl font-bold tracking-tight",
              followUpCount > 0 ? "text-amber-600" : "text-neutral-900"
            )}
          >
            {followUpCount}
          </span>
          <Select
            value={String(staleWeeks)}
            onValueChange={(v) => setStaleWeeks(Number(v))}
          >
            <SelectTrigger className="h-6 w-[48px] text-[10px] font-medium px-1 border-neutral-200 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 6, 8].map((w) => (
                <SelectItem key={w} value={String(w)} className="text-xs">
                  {w}w
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
