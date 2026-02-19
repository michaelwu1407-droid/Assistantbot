"use client"

import { useState, useMemo } from "react"
import { DealView } from "@/actions/deal-actions"
import { DollarSign, Briefcase, AlertTriangle, Clock } from "lucide-react"
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

  const { revenue, activeCount, totalCount, criticalCount, followUpCount } = useMemo(() => {
    const wonThisMonth = deals.filter(
      (d) =>
        d.stage === "completed" &&
        new Date(d.stageChangedAt).getMonth() === currentMonth &&
        new Date(d.stageChangedAt).getFullYear() === currentYear
    )
    const revenue = wonThisMonth.reduce((sum, d) => sum + d.value, 0)
    const activeCount = deals.filter(
      (d) => d.stage !== "completed" && d.stage !== "lost"
    ).length
    const totalCount = deals.length
    const criticalCount = deals.filter((d) => d.health.status === "ROTTING").length
    const staleDays = staleWeeks * 7
    const followUpCount = deals.filter((d) => {
      const days = differenceInDays(now, new Date(d.lastActivityDate))
      return days >= staleDays && d.stage !== "completed" && d.stage !== "lost"
    }).length

    return {
      revenue,
      activeCount,
      totalCount,
      criticalCount,
      followUpCount,
    }
  }, [deals, currentMonth, currentYear, staleWeeks])

  const monthLabel = MONTHS[currentMonth]

  const cardClass =
    "ott-card p-3 flex flex-col justify-center h-full min-h-[72px] bg-white shadow-sm relative"

  return (
    <div className="grid grid-cols-4 gap-2 h-full flex-[4] min-w-0">
      {/* [Month] Revenue */}
      <div className={cardClass}>
        <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center">
          <DollarSign className="w-4 h-4 text-[#0F172A]" />
        </div>
        <span className="text-[10px] font-bold text-[#64748B] tracking-tight uppercase leading-none mb-1">
          {monthLabel} Revenue
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold text-[#0F172A] tracking-tighter leading-none">
            ${revenue.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Active jobs */}
      <div className={cardClass}>
        <span className="text-[10px] font-bold text-[#64748B] tracking-tight uppercase leading-none mb-1">
          Active jobs
        </span>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold text-[#0F172A] tracking-tighter leading-none">
            {activeCount}/{totalCount}
          </span>
        </div>
        <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[#F1F5F9] flex items-center justify-center">
          <Briefcase className="w-4 h-4 text-[#0F172A]" />
        </div>
      </div>

      {/* Critical */}
      <div className={cardClass}>
        <span className="text-[10px] font-bold text-[#64748B] tracking-tight uppercase leading-none mb-1">
          Critical
        </span>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-xl font-extrabold tracking-tighter leading-none",
              criticalCount > 0 ? "text-red-500" : "text-[#0F172A]"
            )}
          >
            {criticalCount}
          </span>
        </div>
        <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[#FEF2F2] flex items-center justify-center">
          <AlertTriangle className="w-4 h-4 text-red-600" />
        </div>
      </div>

      {/* Follow-up */}
      <div className={cardClass}>
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <Select
            value={String(staleWeeks)}
            onValueChange={(v) => setStaleWeeks(Number(v))}
          >
            <SelectTrigger className="h-6 w-[64px] text-[10px] font-medium px-1.5 border-slate-200">
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
          <div className="w-8 h-8 rounded-full bg-[#FFFBEB] flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
        </div>
        <span className="text-[10px] font-bold text-[#64748B] tracking-tight uppercase leading-none mb-1">
          Follow-up
        </span>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              "text-xl font-extrabold tracking-tighter leading-none",
              followUpCount > 0 ? "text-amber-600" : "text-[#0F172A]"
            )}
          >
            {followUpCount}
          </span>
        </div>
      </div>
    </div>
  )
}
