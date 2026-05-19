"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react"
import { DealView } from "@/actions/deal-actions"
import { MobileHeader } from "@/components/mobile/_primitives/mobile-header"
import { formatTime, formatShortDate } from "@/lib/format"
import { cn } from "@/lib/utils"

interface ScheduleMobileProps {
  deals: DealView[]
  userName?: string
}

function startOfDay(d: Date) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

function addDays(d: Date, n: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export function ScheduleMobile({ deals, userName }: ScheduleMobileProps) {
  const [cursor, setCursor] = useState<Date>(() => startOfDay(new Date()))

  const days = useMemo(() => {
    const start = addDays(cursor, -3)
    return Array.from({ length: 7 }, (_, i) => addDays(start, i))
  }, [cursor])

  const dayDeals = useMemo(() => {
    return deals
      .filter((d) => d.scheduledAt && sameDay(new Date(d.scheduledAt), cursor))
      .sort((a, b) => new Date(a.scheduledAt!).getTime() - new Date(b.scheduledAt!).getTime())
  }, [deals, cursor])

  const unscheduledCount = deals.filter((d) => !d.scheduledAt && d.stage !== "completed").length

  return (
    <>
      <MobileHeader pageTitle="Schedule" userName={userName} dateLabel={formatShortDate(cursor)} />

      <div className="flex items-center justify-between px-4 pt-4">
        <button
          type="button"
          onClick={() => setCursor(addDays(cursor, -1))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground"
          aria-label="Previous day"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setCursor(startOfDay(new Date()))}
          className="text-[13px] font-medium text-muted-foreground"
        >
          Today
        </button>
        <button
          type="button"
          onClick={() => setCursor(addDays(cursor, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-muted/50 text-muted-foreground"
          aria-label="Next day"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="overflow-x-auto scrollbar-hide px-4 py-4">
        <div className="flex gap-2">
          {days.map((d) => {
            const active = sameDay(d, cursor)
            const isToday = sameDay(d, new Date())
            return (
              <button
                key={d.toISOString()}
                type="button"
                onClick={() => setCursor(d)}
                className={cn(
                  "flex h-16 w-12 shrink-0 flex-col items-center justify-center rounded-md border",
                  active ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground"
                )}
              >
                <span className={cn("text-[10px] uppercase tracking-wide", active ? "text-background/70" : "text-muted-foreground")}>
                  {d.toLocaleDateString("en-AU", { weekday: "short" }).slice(0, 3)}
                </span>
                <span className="text-lg font-bold tabular-nums leading-tight">{d.getDate()}</span>
                {isToday && !active && <span className="mt-0.5 h-1 w-1 rounded-full bg-primary" />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="px-4">
        {dayDeals.length === 0 ? (
          <div className="ott-empty-state">
            <p className="ott-empty-state-title">Nothing scheduled</p>
            <p className="ott-empty-state-body">
              {unscheduledCount > 0
                ? `${unscheduledCount} job${unscheduledCount === 1 ? "" : "s"} waiting to be booked.`
                : "Enjoy the day."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3 pb-6">
            {dayDeals.map((deal) => (
              <li key={deal.id}>
                <Link
                  href={`/crm/deals/${deal.id}`}
                  className="flex items-stretch gap-3 rounded-md border border-border bg-card p-3 shadow-sm active:opacity-80"
                >
                  <span className="flex w-16 shrink-0 flex-col items-center justify-center rounded-md bg-muted/40 text-foreground">
                    <span className="text-[15px] font-bold tabular-nums">{formatTime(deal.scheduledAt!)}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-foreground">
                      {deal.contactName || deal.company}
                    </p>
                    <p className="truncate text-[13px] text-muted-foreground">{deal.title}</p>
                    {deal.address && (
                      <p className="mt-1 flex items-center gap-1 truncate text-[12px] text-muted-foreground">
                        <MapPin className="h-3 w-3 text-rose-500 shrink-0" />
                        <span className="truncate">{deal.address.split(",")[0]}</span>
                      </p>
                    )}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
