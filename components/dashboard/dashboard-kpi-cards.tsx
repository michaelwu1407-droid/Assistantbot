"use client"

import { useState, useMemo } from "react"
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
  "July", "August", "September", "October", "November", "December"
]

export function DashboardKpiCards({ deals }: DashboardKpiCardsProps) {
  const [staleWeeks, setStaleWeeks] = useState(2)
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const { revenue, travisWonRevenue, scheduledCount, followUpCount } = useMemo(() => {
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
    const scheduledCount = deals.filter((d) => d.stage === "scheduled").length
    const staleDays = staleWeeks * 7
    const followUpCount = deals.filter((d) => {
      const days = differenceInDays(now, new Date(d.lastActivityDate))
      return days >= staleDays && d.stage !== "completed" && d.stage !== "lost"
    }).length

    return {
      revenue,
      travisWonRevenue,
      scheduledCount,
      followUpCount,
    }
  }, [deals, currentMonth, currentYear, staleWeeks])

  const monthLabel = MONTHS[currentMonth]

  const cardClass =
    "ott-card rounded-[20px] p-2 flex flex-col justify-center h-full min-h-[50px] bg-white shadow-sm relative border border-slate-200/60 dark:border-slate-700/50"

  return (
    <div id="kpi-cards" className="grid grid-cols-4 gap-2 h-full flex-[4] min-w-0">
      {/* 1. Revenue */}
      <div className={cardClass}>
        <span className="text-[10px] font-bold text-[#64748B] tracking-tight uppercase leading-none mb-0.5">
          {monthLabel} Revenue
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-[#0F172A] tracking-tighter leading-none">
            ${revenue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 2. Jobs won with Travis */}
      <div className={cardClass}>
        <span className="text-[10px] font-bold text-[#64748B] tracking-tight uppercase leading-none mb-0.5">
          Jobs won with Travis
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-[#0F172A] tracking-tighter leading-none">
            ${travisWonRevenue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 3. Scheduled jobs */}
      <div className={cardClass}>
        <span className="text-[10px] font-bold text-[#64748B] tracking-tight uppercase leading-none mb-0.5">
          Scheduled jobs
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-extrabold text-[#0F172A] tracking-tighter leading-none">
            {scheduledCount}
          </span>
        </div>
      </div>

      {/* 4. Follow-up — label top, number left, 2w selector bottom-right */}
      <div className={cardClass}>
        <span className="text-[10px] font-bold text-[#64748B] tracking-tight uppercase leading-none mb-0.5 block">
          Follow-up
        </span>
        <div className="flex items-end justify-between gap-1">
          <span
            className={cn(
              "text-lg font-extrabold tracking-tighter leading-none",
              followUpCount > 0 ? "text-amber-600" : "text-[#0F172A]"
            )}
          >
            {followUpCount}
          </span>
          <Select
            value={String(staleWeeks)}
            onValueChange={(v) => setStaleWeeks(Number(v))}
          >
            <SelectTrigger className="h-5 w-[48px] text-[10px] font-medium px-1 border-slate-200 shrink-0">
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
