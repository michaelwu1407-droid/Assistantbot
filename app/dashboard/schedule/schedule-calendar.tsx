"use client"

import { useState } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from "date-fns"
import { DealView } from "@/actions/deal-actions"
import { cn } from "@/lib/utils"
import { DealDetailModal } from "@/components/crm/deal-detail-modal"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

type ViewMode = "month" | "week" | "day"

interface ScheduleCalendarProps {
  deals: DealView[]
}

export function ScheduleCalendar({ deals }: ScheduleCalendarProps) {
  const [current, setCurrent] = useState(new Date())
  const [view, setView] = useState<ViewMode>("month")
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)

  const dealsByDay = deals
    .filter((d) => d.scheduledAt)
    .reduce<Record<string, DealView[]>>((acc, deal) => {
      const d = format(new Date(deal.scheduledAt!), "yyyy-MM-dd")
      if (!acc[d]) acc[d] = []
      acc[d].push(deal)
      return acc
    }, {})

  const nav = (dir: -1 | 1) => {
    if (view === "month") setCurrent(dir === 1 ? addMonths(current, 1) : subMonths(current, 1))
    else if (view === "week") setCurrent(dir === 1 ? addWeeks(current, 1) : subWeeks(current, 1))
    else setCurrent(dir === 1 ? addDays(current, 1) : subDays(current, 1))
  }

  const headerLabel = () => {
    if (view === "month") return format(current, "MMMM yyyy")
    if (view === "week") {
      const ws = startOfWeek(current, { weekStartsOn: 0 })
      const we = endOfWeek(current, { weekStartsOn: 0 })
      return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`
    }
    return format(current, "EEEE, MMMM d, yyyy")
  }

  const renderDealChip = (deal: DealView) => (
    <button
      key={deal.id}
      onClick={() => setSelectedDealId(deal.id)}
      className="w-full text-left px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium truncate border border-primary/20"
    >
      {deal.scheduledAt && <span className="text-[9px] text-primary/60 mr-1">{format(new Date(deal.scheduledAt), "h:mm a")}</span>}
      {deal.title}
    </button>
  )

  // ─── Month View ─────────────────────
  const renderMonth = () => {
    const monthStart = startOfMonth(current)
    const monthEnd = endOfMonth(current)
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
    const startPad = monthStart.getDay()
    const paddedDays = [...Array(startPad).fill(null), ...days]

    return (
      <div className="grid grid-cols-7 flex-1 min-h-0 text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="p-1.5 border-b border-r border-slate-100 font-medium text-slate-500 bg-slate-50/50">{d}</div>
        ))}
        {paddedDays.map((day, i) => {
          if (!day) return <div key={`pad-${i}`} className="p-1.5 border-b border-r border-slate-100 bg-slate-50/30" />
          const key = format(day, "yyyy-MM-dd")
          const dayDeals = dealsByDay[key] ?? []
          const isToday = isSameDay(day, new Date())
          return (
            <div
              key={key}
              className={cn(
                "p-1.5 border-b border-r border-slate-100 flex flex-col min-h-[80px] overflow-auto cursor-pointer hover:bg-slate-50/80",
                !isSameMonth(day, current) && "bg-slate-50/50 text-slate-400"
              )}
              onClick={() => { setCurrent(day); setView("day") }}
            >
              <span className={cn("font-medium text-slate-600 mb-1 w-6 h-6 flex items-center justify-center rounded-full", isToday && "bg-primary text-white")}>{format(day, "d")}</span>
              <div className="space-y-1">{dayDeals.map(renderDealChip)}</div>
            </div>
          )
        })}
      </div>
    )
  }

  // ─── Week View ──────────────────────
  const renderWeek = () => {
    const ws = startOfWeek(current, { weekStartsOn: 0 })
    const we = endOfWeek(current, { weekStartsOn: 0 })
    const days = eachDayOfInterval({ start: ws, end: we })

    return (
      <div className="grid grid-cols-7 flex-1 min-h-0 text-xs">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd")
          const dayDeals = dealsByDay[key] ?? []
          const isToday = isSameDay(day, new Date())
          return (
            <div key={key} className="border-r border-slate-100 flex flex-col min-h-[200px]">
              <div className={cn("p-2 border-b border-slate-100 text-center", isToday && "bg-primary/5")}>
                <p className="text-[10px] text-slate-500 uppercase">{format(day, "EEE")}</p>
                <p className={cn("text-lg font-semibold", isToday ? "text-primary" : "text-slate-700")}>{format(day, "d")}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1">{dayDeals.map(renderDealChip)}</div>
            </div>
          )
        })}
      </div>
    )
  }

  // ─── Day View ───────────────────────
  const renderDay = () => {
    const key = format(current, "yyyy-MM-dd")
    const dayDeals = dealsByDay[key] ?? []

    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {dayDeals.length === 0 ? (
          <p className="text-sm text-slate-400 text-center mt-12">No jobs scheduled for this day.</p>
        ) : (
          dayDeals.map((deal) => (
            <button
              key={deal.id}
              onClick={() => setSelectedDealId(deal.id)}
              className="w-full text-left p-3 rounded-lg bg-primary/5 hover:bg-primary/10 border border-primary/20 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-slate-900">{deal.title}</p>
                <p className="text-xs text-slate-500">{deal.contactName}{deal.address ? ` · ${deal.address}` : ""}</p>
              </div>
              {deal.scheduledAt && (
                <span className="text-xs font-medium text-primary">{format(new Date(deal.scheduledAt), "h:mm a")}</span>
              )}
            </button>
          ))
        )}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-slate-200">
        <Button variant="ghost" size="sm" onClick={() => nav(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-slate-900">{headerLabel()}</h2>
          <div className="flex bg-slate-100 rounded-lg p-0.5">
            {(["month", "week", "day"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-2.5 py-1 text-xs font-medium rounded-md transition-colors capitalize",
                  view === v ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={() => nav(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      {view === "month" && renderMonth()}
      {view === "week" && renderWeek()}
      {view === "day" && renderDay()}
      <DealDetailModal
        dealId={selectedDealId}
        open={!!selectedDealId}
        onOpenChange={(open) => !open && setSelectedDealId(null)}
      />
    </div>
  )
}
