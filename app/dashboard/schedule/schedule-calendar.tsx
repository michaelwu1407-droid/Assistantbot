"use client"

import { useState } from "react"
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from "date-fns"
import { DealView } from "@/actions/deal-actions"
import { cn } from "@/lib/utils"
import { DealDetailModal } from "@/components/crm/deal-detail-modal"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

type ViewMode = "month" | "week" | "day"

interface TeamMember {
  id: string
  name: string
  email: string
  role: string
}

interface ScheduleCalendarProps {
  deals: DealView[]
  teamMembers: TeamMember[]
}

export function ScheduleCalendar({ deals, teamMembers }: ScheduleCalendarProps) {
  const [current, setCurrent] = useState(new Date())
  const [view, setView] = useState<ViewMode>("month")
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null)

  const filteredDeals = filterMemberId
    ? deals.filter(d => d.assignedToId === filterMemberId)
    : deals

  const dealsByDay = filteredDeals
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

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData("dealId", dealId)
  }

  const handleDrop = async (e: React.DragEvent, date: Date, memberId?: string) => {
    e.preventDefault()
    const dealId = e.dataTransfer.getData("dealId")
    if (!dealId) return

    // Calculate new date with time preserved if possible
    const deal = deals.find(d => d.id === dealId)
    let newDate = new Date(date)
    if (deal?.scheduledAt) {
      const oldDate = new Date(deal.scheduledAt)
      newDate.setHours(oldDate.getHours(), oldDate.getMinutes())
    }

    try {
      const { updateDeal } = await import("@/actions/deal-actions")
      const { updateDealAssignedTo } = await import("@/actions/deal-actions")

      await updateDeal(dealId, { scheduledAt: newDate })
      if (memberId !== undefined) {
        await updateDealAssignedTo(dealId, memberId || null)
      }

      const { toast } = await import("sonner")
      toast.success("Job updated")
      window.location.reload() // Quickest way to sync all state
    } catch (err) {
      console.error(err)
    }
  }

  const renderDealChip = (deal: DealView) => (
    <div
      key={deal.id}
      draggable
      onDragStart={(e) => handleDragStart(e, deal.id)}
      onClick={() => setSelectedDealId(deal.id)}
      className="w-full text-left px-2 py-1 rounded bg-primary/10 hover:bg-primary/20 text-primary text-[11px] font-medium truncate border border-primary/20 cursor-grab active:cursor-grabbing"
    >
      {deal.scheduledAt && <span className="text-[9px] text-primary/60 mr-1">{format(new Date(deal.scheduledAt), "h:mm a")}</span>}
      {deal.title}
    </div>
  )

  // ─── Month View ─────────────────────
  const renderMonth = () => {
    const monthStart = startOfMonth(current)
    const monthEnd = endOfMonth(current)
    const startMonthDay = startOfWeek(monthStart)
    const endMonthDay = endOfWeek(monthEnd)
    const days = eachDayOfInterval({ start: startMonthDay, end: endMonthDay })

    return (
      <div className="grid grid-cols-7 flex-1 min-h-0 text-xs">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="p-1.5 border-b border-r border-slate-100 font-medium text-slate-500 bg-slate-50/50">{d}</div>
        ))}
        {days.map((day, i) => {
          const key = format(day, "yyyy-MM-dd")
          const dayDeals = dealsByDay[key] ?? []
          const isToday = isSameDay(day, new Date())
          const isCurrentMonth = isSameMonth(day, current)

          return (
            <div
              key={key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, day)}
              className={cn(
                "p-1.5 border-b border-r border-slate-100 flex flex-col min-h-[100px] overflow-auto hover:bg-slate-50/80 transition-colors",
                !isCurrentMonth && "bg-slate-50/40 text-slate-400"
              )}
            >
              <div
                className="flex items-center justify-between mb-1"
                onClick={() => { setCurrent(day); setView("day") }}
              >
                <span className={cn(
                  "font-medium w-6 h-6 flex items-center justify-center rounded-full text-[11px]",
                  isToday ? "bg-primary text-white shadow-sm" : "text-slate-600"
                )}>
                  {format(day, "d")}
                </span>
                {dayDeals.length > 0 && <span className="text-[9px] text-slate-400 font-bold">{dayDeals.length}</span>}
              </div>
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
            <div
              key={key}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, day)}
              className="border-r border-slate-100 flex flex-col min-h-[400px] bg-white"
            >
              <div
                className={cn("p-2 border-b border-slate-100 text-center cursor-pointer hover:bg-slate-50", isToday && "bg-primary/5")}
                onClick={() => { setCurrent(day); setView("day") }}
              >
                <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">{format(day, "EEE")}</p>
                <p className={cn("text-lg font-bold", isToday ? "text-primary" : "text-slate-700")}>{format(day, "d")}</p>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1 bg-slate-50/20">{dayDeals.map(renderDealChip)}</div>
            </div>
          )
        })}
      </div>
    )
  }

  // ─── Day View (Resource Gantt) ───────────────────────
  const renderDay = () => {
    const key = format(current, "yyyy-MM-dd")
    const dayDeals = dealsByDay[key] ?? []

    // Sort deals by time
    const sortedDeals = [...dayDeals].sort((a, b) => {
      if (!a.scheduledAt || !b.scheduledAt) return 0
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    })

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-slate-50/30 overflow-hidden">
        {/* Resource Rows */}
        <div className="flex-1 overflow-y-auto">
          {teamMembers.map((member) => {
            const memberDeals = sortedDeals.filter(d => d.assignedToId === member.id)
            return (
              <div key={member.id} className="flex border-b border-slate-100 min-h-[80px]">
                {/* Resource Header (Team Member) */}
                <div className="w-[140px] border-r border-slate-200 p-3 bg-white shrink-0 sticky left-0 z-10 flex flex-col justify-center">
                  <p className="text-sm font-bold text-slate-900 truncate">{member.name}</p>
                  <p className="text-[10px] text-slate-500 uppercase font-medium">{member.role.replace('_', ' ')}</p>
                </div>

                {/* Timeline / Slot */}
                <div
                  className="flex-1 p-2 flex flex-wrap gap-2 items-center"
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, current, member.id)}
                >
                  {memberDeals.length === 0 ? (
                    <div className="w-full flex items-center justify-center py-4 border-2 border-dashed border-slate-200 rounded-lg bg-white/50">
                      <p className="text-[11px] text-slate-400 font-medium">Drag jobs here to assign</p>
                    </div>
                  ) : (
                    memberDeals.map(deal => (
                      <div
                        key={deal.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, deal.id)}
                        onClick={() => setSelectedDealId(deal.id)}
                        className="min-w-[150px] shadow-sm animate-in fade-in zoom-in-95 duration-200"
                      >
                        <div className="p-3 rounded-xl bg-white border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[10px] font-bold text-primary bg-primary/5 px-1.5 py-0.5 rounded uppercase tracking-tight">
                              {deal.scheduledAt ? format(new Date(deal.scheduledAt), "h:mm a") : "TBD"}
                            </span>
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          </div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-primary transition-colors line-clamp-1">{deal.title}</p>
                          <p className="text-[10px] text-slate-500 truncate mt-0.5">{deal.address || "No address"}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })}

          {/* Unassigned row */}
          <div className="flex border-b border-slate-100 min-h-[80px] bg-slate-100/30">
            <div className="w-[140px] border-r border-slate-200 p-3 shrink-0 sticky left-0 z-10 flex flex-col justify-center bg-slate-100/50">
              <p className="text-sm font-bold text-slate-400 italic">Unassigned</p>
            </div>
            <div
              className="flex-1 p-2 flex flex-wrap gap-2 items-center"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, current, "")}
            >
              {sortedDeals.filter(d => !d.assignedToId).map(deal => (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, deal.id)}
                  onClick={() => setSelectedDealId(deal.id)}
                  className="min-w-[150px] shadow-sm"
                >
                  <div className="p-3 rounded-xl bg-white/80 border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-tight">
                        {deal.scheduledAt ? format(new Date(deal.scheduledAt), "h:mm a") : "TBD"}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-slate-600 line-clamp-1">{deal.title}</p>
                    <p className="text-[10px] text-slate-400 truncate mt-0.5">{deal.contactName}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-[24px] border border-slate-200/60 shadow-xl shadow-black/[0.03] overflow-hidden">
      <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => nav(-1)} className="rounded-full h-8 w-8 hover:bg-white shadow-sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-sm font-bold text-slate-900 min-w-[150px] text-center">{headerLabel()}</h2>
          <Button variant="outline" size="icon" onClick={() => nav(1)} className="rounded-full h-8 w-8 hover:bg-white shadow-sm">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Team Member Filter */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-white border border-slate-200 rounded-full shadow-sm">
            <span className="text-[10px] font-bold text-slate-400 uppercase ml-1">Team:</span>
            <select
              value={filterMemberId || ""}
              onChange={(e) => setFilterMemberId(e.target.value || null)}
              className="text-xs font-bold bg-transparent border-none focus:ring-0 cursor-pointer pr-6"
            >
              <option value="">All Members</option>
              {teamMembers.map(m => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div className="flex bg-slate-100/80 rounded-full p-1">
            {(["month", "week", "day"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-4 py-1.5 text-xs font-bold rounded-full transition-all capitalize",
                  view === v ? "bg-white text-primary shadow-sm ring-1 ring-black/[0.05]" : "text-slate-500 hover:text-slate-800"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0">
        {view === "month" && renderMonth()}
        {view === "week" && renderWeek()}
        {view === "day" && renderDay()}
      </div>

      <DealDetailModal
        dealId={selectedDealId}
        open={!!selectedDealId}
        onOpenChange={(open) => !open && setSelectedDealId(null)}
      />
    </div>
  )
}
