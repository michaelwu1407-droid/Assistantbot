"use client"

import { useState } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, addMonths, subMonths } from "date-fns"
import { DealView } from "@/actions/deal-actions"
import { cn } from "@/lib/utils"
import { DealDetailModal } from "@/components/crm/deal-detail-modal"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface ScheduleCalendarProps {
  deals: DealView[]
}

export function ScheduleCalendar({ deals }: ScheduleCalendarProps) {
  const [current, setCurrent] = useState(new Date())
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)

  const monthStart = startOfMonth(current)
  const monthEnd = endOfMonth(current)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })

  // Pad to start on Sunday
  const startPad = monthStart.getDay()
  const paddedDays = [...Array(startPad).fill(null), ...days]

  const dealsByDay = deals
    .filter((d) => d.scheduledAt)
    .reduce<Record<string, DealView[]>>((acc, deal) => {
      const d = format(new Date(deal.scheduledAt!), "yyyy-MM-dd")
      if (!acc[d]) acc[d] = []
      acc[d].push(deal)
      return acc
    }, {})

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-slate-200">
        <Button variant="ghost" size="sm" onClick={() => setCurrent(subMonths(current, 1))}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="font-semibold text-slate-900">{format(current, "MMMM yyyy")}</h2>
        <Button variant="ghost" size="sm" onClick={() => setCurrent(addMonths(current, 1))}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      <div className="grid grid-cols-7 flex-1 min-h-0 text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="p-1.5 border-b border-r border-slate-100 font-medium text-slate-500 bg-slate-50/50">
            {d}
          </div>
        ))}
        {paddedDays.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} className="p-1.5 border-b border-r border-slate-100 bg-slate-50/30" />
          const key = format(day, "yyyy-MM-dd")
          const dayDeals = dealsByDay[key] ?? []
          const isCurrentMonth = isSameMonth(day, current)
          return (
            <div
              key={key}
              className={cn(
                "p-1.5 border-b border-r border-slate-100 flex flex-col min-h-[80px] overflow-auto",
                !isCurrentMonth && "bg-slate-50/50 text-slate-400"
              )}
            >
              <span className="font-medium text-slate-600 mb-1">{format(day, "d")}</span>
              <div className="space-y-1">
                {dayDeals.map((deal) => (
                  <button
                    key={deal.id}
                    onClick={() => setSelectedDealId(deal.id)}
                    className="w-full text-left px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium truncate border border-primary/20"
                  >
                    {deal.title}
                  </button>
                ))}
              </div>
            </div>
          )
        })}
      </div>
      <DealDetailModal
        dealId={selectedDealId}
        open={!!selectedDealId}
        onOpenChange={(open) => !open && setSelectedDealId(null)}
      />
    </div>
  )
}
