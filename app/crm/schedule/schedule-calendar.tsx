"use client"

import { useEffect, useState } from "react"
import { startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, subDays } from "date-fns"
import { useRouter } from "next/navigation"
import { DealView } from "@/actions/deal-actions"
import { cn } from "@/lib/utils"
import { DealDetailModal } from "@/components/crm/deal-detail-modal"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { publishCrmSelection } from "@/lib/crm-selection"
import {
  buildDateForHourInTimezone,
  formatLongDateInTimezone,
  formatMonthDayInTimezone,
  formatMonthDayYearInTimezone,
  formatMonthYearInTimezone,
  formatShortWeekdayInTimezone,
  formatTimeInTimezone,
  getHourInTimezone,
  getZonedDateParts,
  parseDateTimeLocalInTimezone,
  resolveWorkspaceTimezone,
  toDateKeyInTimezone,
} from "@/lib/timezone"

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
  workspaceTimezone: string
  /** Override the initial current date. Used in tests to avoid timezone-sensitive date matching. */
  initialDate?: Date
}

const DAY_HOURS = Array.from({ length: 15 }, (_, index) => index + 6)

export function ScheduleCalendar({ deals, teamMembers, workspaceTimezone, initialDate }: ScheduleCalendarProps) {
  const router = useRouter()
  const [current, setCurrent] = useState(() => initialDate ?? new Date())
  const [view, setView] = useState<ViewMode>("month")
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null)
  const [filterMemberId, setFilterMemberId] = useState<string | null>(null)
  const [localDeals, setLocalDeals] = useState(deals)
  const showTeamFilter = teamMembers.length > 1
  const resolvedTimezone = resolveWorkspaceTimezone(workspaceTimezone)

  useEffect(() => {
    setLocalDeals(deals)
  }, [deals])

  const filteredDeals = filterMemberId
    ? localDeals.filter(d => d.assignedToId === filterMemberId)
    : localDeals

  useEffect(() => {
    const selection = selectedDealId
      ? [{ id: selectedDealId, title: localDeals.find((deal) => deal.id === selectedDealId)?.title }]
      : []
    publishCrmSelection(selection)
  }, [selectedDealId, localDeals])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight") {
        nav(1)
      } else if (e.key === "ArrowLeft") {
        nav(-1)
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, current])

  const dealsByDay = filteredDeals
    .filter((d) => d.scheduledAt)
    .reduce<Record<string, DealView[]>>((acc, deal) => {
      const d = toDateKeyInTimezone(deal.scheduledAt!, resolvedTimezone)
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
    if (view === "month") return formatMonthYearInTimezone(current, resolvedTimezone)
    if (view === "week") {
      const ws = startOfWeek(current, { weekStartsOn: 0 })
      const we = endOfWeek(current, { weekStartsOn: 0 })
      return `${formatMonthDayInTimezone(ws, resolvedTimezone)} - ${formatMonthDayYearInTimezone(we, resolvedTimezone)}`
    }
    return formatLongDateInTimezone(current, resolvedTimezone)
  }

  const handleDragStart = (e: React.DragEvent, dealId: string) => {
    e.dataTransfer.setData("dealId", dealId)
  }

  const handleDrop = async (e: React.DragEvent, date: Date, memberId?: string) => {
    e.preventDefault()
    const dealId = e.dataTransfer.getData("dealId")
    if (!dealId) return

    const deal = localDeals.find(d => d.id === dealId)
    const targetParts = getZonedDateParts(date, resolvedTimezone)
    const hasExplicitTime =
      targetParts.hour !== 0 || targetParts.minute !== 0 || targetParts.second !== 0
    const existingParts = deal?.scheduledAt ? getZonedDateParts(deal.scheduledAt, resolvedTimezone) : null
    const newDate =
      parseDateTimeLocalInTimezone(
        `${String(targetParts.year).padStart(4, "0")}-${String(targetParts.month).padStart(2, "0")}-${String(targetParts.day).padStart(2, "0")}T${String(hasExplicitTime ? targetParts.hour : existingParts?.hour ?? 9).padStart(2, "0")}:${String(hasExplicitTime ? targetParts.minute : existingParts?.minute ?? 0).padStart(2, "0")}:${String(hasExplicitTime ? targetParts.second : existingParts?.second ?? 0).padStart(2, "0")}`,
        resolvedTimezone,
      ) ?? new Date(date)

    try {
      const { rescheduleDeal } = await import("@/actions/deal-actions")

      const updateResult = await rescheduleDeal(dealId, {
        scheduledAt: newDate,
        ...(memberId !== undefined ? { assignedToId: memberId || null } : {}),
      })
      if (!updateResult.success) {
        throw new Error(updateResult.error || "Could not update the job.")
      }

      setLocalDeals((prev) =>
        prev.map((item) =>
          item.id === dealId
            ? { ...item, scheduledAt: newDate, assignedToId: memberId !== undefined ? (memberId || null) : item.assignedToId }
            : item
        )
      )

      const { toast } = await import("sonner")
      toast.success("Job updated")
    } catch (err) {
      console.error(err)
      const { toast } = await import("sonner")
      toast.error(err instanceof Error ? err.message : "Could not update the job. Please try again.")
      router.refresh()
    }
  }

  const renderDealChip = (deal: DealView) => (
    <div
      key={deal.id}
      draggable
      onDragStart={(e) => handleDragStart(e, deal.id)}
      onClick={() => setSelectedDealId(deal.id)}
      className="app-body-primary w-full truncate rounded border border-primary/20 bg-primary/10 px-2 py-1 text-left text-primary hover:bg-primary/20 cursor-grab active:cursor-grabbing"
    >
      {deal.scheduledAt && <span className="app-body-secondary mr-1 text-xs text-primary/60">{formatTimeInTimezone(deal.scheduledAt, resolvedTimezone)}</span>}
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
      <div className="grid grid-cols-7 flex-1 min-h-0">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="p-1.5 border-b border-r border-slate-100 font-medium text-slate-500 bg-slate-50/50">{d}</div>
        ))}
        {days.map((day) => {
          const key = toDateKeyInTimezone(day, resolvedTimezone)
          const dayDeals = dealsByDay[key] ?? []
          const isToday = isSameDay(day, new Date())
          const isCurrentMonth = isSameMonth(day, current)
          const dayParts = getZonedDateParts(day, resolvedTimezone)

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
                  "font-medium w-6 h-6 flex items-center justify-center rounded-full text-sm",
                  isToday ? "bg-primary text-white shadow-sm" : "text-slate-600"
                )}>
                  {dayParts.day}
                </span>
                {dayDeals.length > 0 && <span className="app-body-secondary text-xs font-bold text-slate-400">{dayDeals.length}</span>}
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
      <div className="grid grid-cols-7 flex-1 min-h-0">
        {days.map((day) => {
          const key = toDateKeyInTimezone(day, resolvedTimezone)
          const dayDeals = dealsByDay[key] ?? []
          const isToday = isSameDay(day, new Date())
          const dayParts = getZonedDateParts(day, resolvedTimezone)
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
                <p className="app-field-label tracking-[0.08em]">{formatShortWeekdayInTimezone(day, resolvedTimezone)}</p>
                <p className={cn("text-lg font-bold", isToday ? "text-primary" : "text-slate-700")}>{dayParts.day}</p>
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
    const key = toDateKeyInTimezone(current, resolvedTimezone)
    const dayDeals = dealsByDay[key] ?? []
    const showUnassignedRow = teamMembers.length > 1 || dayDeals.some((deal) => !deal.assignedToId)

    // Sort deals by time
    const sortedDeals = [...dayDeals].sort((a, b) => {
      if (!a.scheduledAt || !b.scheduledAt) return 0
      return new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
    })

    const gridStyle = {
      gridTemplateColumns: `180px repeat(${DAY_HOURS.length}, minmax(92px, 1fr))`,
    }

    const buildSlotDate = (hour: number) => {
      return buildDateForHourInTimezone(current, hour, resolvedTimezone)
    }

    const renderHourCell = (memberId: string | null, hour: number) => {
      const hourDeals = sortedDeals.filter((deal) => {
        if ((memberId ? deal.assignedToId === memberId : !deal.assignedToId) === false) return false
        if (!deal.scheduledAt) return false
        return getHourInTimezone(deal.scheduledAt, resolvedTimezone) === hour
      })

      return (
        <div
          key={`${memberId ?? "unassigned"}-${hour}`}
          className="min-h-[96px] border-r border-slate-100 p-2 bg-white/70"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => handleDrop(e, buildSlotDate(hour), memberId ?? "")}
        >
          {hourDeals.length === 0 ? (
            <div className="h-full min-h-[80px] rounded-lg border border-dashed border-slate-200 bg-white/40" />
          ) : (
            <div className="space-y-2">
              {hourDeals.map((deal) => (
                <div
                  key={deal.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, deal.id)}
                  onClick={() => setSelectedDealId(deal.id)}
                  className="shadow-sm"
                >
                  <div className="p-3 rounded-lg bg-white border border-slate-200 hover:border-primary/50 hover:shadow-md transition-all cursor-grab active:cursor-grabbing group">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className={cn(
                        "app-field-label rounded px-1.5 py-0.5 tracking-[0.08em]",
                      memberId ? "text-primary bg-primary/5" : "text-slate-400 bg-slate-100"
                    )}>
                        {deal.scheduledAt ? formatTimeInTimezone(deal.scheduledAt, resolvedTimezone) : "TBD"}
                      </span>
                      {memberId ? <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> : null}
                    </div>
                    <p className={cn(
                      "app-panel-title line-clamp-1",
                      memberId ? "text-slate-900 group-hover:text-primary transition-colors" : "text-slate-600"
                    )}>
                      {deal.title}
                    </p>
                    <p className="app-body-secondary truncate mt-0.5 text-xs">
                      {memberId ? (deal.address || "No address") : (deal.contactName || "No contact")}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div className="flex-1 min-h-0 bg-slate-50/30 overflow-hidden">
        <div className="h-full overflow-auto">
          <div className="grid min-w-[1560px]" style={gridStyle}>
            <div className="app-field-label sticky top-0 left-0 z-30 border-b border-r border-slate-200 bg-slate-50/95 px-4 py-3 backdrop-blur">
              Team
            </div>
            {DAY_HOURS.map((hour) => (
              <div
                key={`day-hour-${hour}`}
                className="sticky top-0 z-20 border-b border-r border-slate-200 bg-slate-50/95 px-2 py-3 text-center backdrop-blur"
              >
                <p className="app-field-label">
                  {hour < 12 ? "AM" : "PM"}
                </p>
                <p className="app-panel-title text-slate-700">
                  {hour <= 12 ? hour : hour - 12}:00
                </p>
              </div>
            ))}

            {teamMembers.map((member) => (
              <div key={member.id} className="contents">
                <div className="sticky left-0 z-10 flex min-h-[96px] flex-col justify-center border-b border-r border-slate-200 bg-white px-4">
                  <p className="app-panel-title truncate">{member.name}</p>
                  <p className="app-field-label tracking-[0.08em]">{member.role.replace('_', ' ')}</p>
                </div>
                {DAY_HOURS.map((hour) => renderHourCell(member.id, hour))}
              </div>
            ))}

            {showUnassignedRow ? (
              <>
                <div className="sticky left-0 z-10 flex min-h-[96px] flex-col justify-center border-b border-r border-slate-200 bg-slate-100/60 px-4">
                  <p className="app-panel-title text-neutral-400">Unassigned</p>
                </div>
                {DAY_HOURS.map((hour) => renderHourCell(null, hour))}
              </>
            ) : null}
          </div>
        </div>
      </div>
    )
  }

  // ─── Mobile List View ─────────────────────
  const renderMobileList = () => {
    const dayStart = new Date(current)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(current)
    dayEnd.setHours(23, 59, 59, 999)
    const start =
      view === "month" ? startOfMonth(current)
        : view === "week" ? startOfWeek(current, { weekStartsOn: 0 })
          : dayStart
    const end =
      view === "month" ? endOfMonth(current)
        : view === "week" ? endOfWeek(current, { weekStartsOn: 0 })
          : dayEnd

    const sortedDeals = filteredDeals
      .filter(d => d.scheduledAt)
      .filter(d => {
        const when = new Date(d.scheduledAt!)
        return when >= start && when <= end
      })
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())

    if (sortedDeals.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-500">
          <p className="app-section-title">No jobs scheduled for this {view}.</p>
        </div>
      )
    }

    return (
      <div className="flex flex-col gap-2 p-3">
        {sortedDeals.map(deal => (
          <div
            key={deal.id}
            onClick={() => setSelectedDealId(deal.id)}
            className="p-3 bg-white border border-slate-200 rounded-xl shadow-sm active:bg-slate-50 relative cursor-pointer"
          >
            <div className="flex justify-between items-start mb-1.5">
              <div className="flex items-center gap-2">
                <span className="app-body-primary rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                  {formatMonthDayInTimezone(deal.scheduledAt!, resolvedTimezone)}
                </span>
                <span className="app-body-primary rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                  {formatTimeInTimezone(deal.scheduledAt!, resolvedTimezone)}
                </span>
              </div>
              {deal.assignedToId && (
                <span className="app-field-label tracking-[0.08em] text-slate-400">
                  {teamMembers.find(m => m.id === deal.assignedToId)?.name || 'Assigned'}
                </span>
              )}
            </div>
            <p className="app-panel-title mt-1 text-slate-800">{deal.title}</p>
            <p className="app-body-secondary truncate mt-0.5 text-xs">
              {deal.address || deal.contactName || "No location details"}
            </p>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white rounded-lg border border-neutral-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => nav(-1)} className="rounded-md h-8 w-8 hover:bg-white shadow-sm">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrent(new Date())} className="h-8 hover:bg-white shadow-sm font-medium">
            Today
          </Button>
          <h2 className="app-panel-title min-w-[150px] text-center">{headerLabel()}</h2>
          <Button variant="outline" size="icon" onClick={() => nav(1)} className="rounded-md h-8 w-8 hover:bg-white shadow-sm">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Team Member Filter */}
          {showTeamFilter ? (
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-white border border-neutral-200 rounded-md shadow-sm">
              <span className="app-field-label ml-1 tracking-[0.08em]">Team</span>
              <select
                value={filterMemberId || ""}
                onChange={(e) => setFilterMemberId(e.target.value || null)}
                className="app-body-primary h-8 bg-transparent border-none focus:ring-0 cursor-pointer pr-6"
              >
                <option value="">All Members</option>
                {teamMembers.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          ) : null}

          <div className="flex bg-neutral-100 rounded-lg p-1 gap-1">
            {(["month", "week", "day"] as ViewMode[]).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-4 py-1.5 text-sm font-semibold rounded-md transition-all capitalize",
                  view === v ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500 hover:text-neutral-700"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 hidden md:flex flex-col">
        {view === "month" && renderMonth()}
        {view === "week" && renderWeek()}
        {view === "day" && renderDay()}
      </div>
      <div className="flex-1 overflow-y-auto min-h-0 md:hidden bg-slate-50/50">
        {renderMobileList()}
      </div>

      <DealDetailModal
        dealId={selectedDealId}
        open={!!selectedDealId}
        onOpenChange={(open) => !open && setSelectedDealId(null)}
      />
    </div>
  )
}
