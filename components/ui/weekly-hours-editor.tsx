"use client"

import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import {
  WEEKDAY_ORDER,
  cloneWeeklyHours,
  type DayKey,
  type WeeklyHours,
} from "@/lib/working-hours"

type WeeklyHoursEditorProps = {
  value: WeeklyHours
  onChange: (next: WeeklyHours) => void
  uniform: boolean
  onUniformChange: (value: boolean) => void
}

export function WeeklyHoursEditor({
  value,
  onChange,
  uniform,
  onUniformChange,
}: WeeklyHoursEditorProps) {
  const firstOpenDay = WEEKDAY_ORDER.find((day) => value[day].open) ?? "Mon"
  const uniformStart = value[firstOpenDay].start
  const uniformEnd = value[firstOpenDay].end

  const updateUniformDays = (days: DayKey[]) => {
    const next = cloneWeeklyHours(value)
    for (const day of WEEKDAY_ORDER) {
      next[day] = {
        ...next[day],
        open: days.includes(day),
        start: uniformStart,
        end: uniformEnd,
      }
    }
    onChange(next)
  }

  const updateUniformTimes = (field: "start" | "end", nextValue: string) => {
    const next = cloneWeeklyHours(value)
    for (const day of WEEKDAY_ORDER) {
      if (next[day].open) {
        next[day] = {
          ...next[day],
          [field]: nextValue,
        }
      }
    }
    onChange(next)
  }

  const toggleDay = (day: DayKey) => {
    const next = cloneWeeklyHours(value)
    next[day] = { ...next[day], open: !next[day].open }
    onChange(next)
  }

  const updateDayField = (day: DayKey, field: "start" | "end", nextValue: string) => {
    const next = cloneWeeklyHours(value)
    next[day] = { ...next[day], [field]: nextValue }
    onChange(next)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5">
        <div className="flex flex-wrap gap-2">
          {WEEKDAY_ORDER.map((day) => {
            const isSelected = value[day].open
            return (
              <button
                key={day}
                type="button"
                onClick={() => {
                  if (!uniform) return
                  const openDays = WEEKDAY_ORDER.filter((item) => value[item].open)
                  const nextOpenDays = isSelected
                    ? openDays.filter((item) => item !== day)
                    : [...openDays, day].sort((a, b) => WEEKDAY_ORDER.indexOf(a) - WEEKDAY_ORDER.indexOf(b))
                  updateUniformDays(nextOpenDays)
                }}
                className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition-all ${
                  isSelected
                    ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                    : "border-slate-200 bg-slate-100 text-slate-600"
                } ${uniform ? "hover:bg-slate-200" : "cursor-default"}`}
              >
                {day}
              </button>
            )
          })}
        </div>
        <Switch checked={uniform} onCheckedChange={onUniformChange} aria-label="Toggle same working hours all week" />
      </div>

      {uniform ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <div className="text-xs text-slate-500">Start time</div>
              <Input type="time" value={uniformStart} onChange={(e) => updateUniformTimes("start", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <div className="text-xs text-slate-500">End time</div>
              <Input type="time" value={uniformEnd} onChange={(e) => updateUniformTimes("end", e.target.value)} />
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            {WEEKDAY_ORDER.map((day) => (
              <div key={day} className="grid grid-cols-[52px_56px_1fr_1fr] items-center gap-3 rounded-lg border px-3 py-2">
                <div className="text-sm font-medium">{day}</div>
                <Switch checked={value[day].open} onCheckedChange={() => toggleDay(day)} aria-label={`Toggle ${day} hours`} />
                <Input
                  type="time"
                  value={value[day].start}
                  disabled={!value[day].open}
                  onChange={(e) => updateDayField(day, "start", e.target.value)}
                />
                <Input
                  type="time"
                  value={value[day].end}
                  disabled={!value[day].open}
                  onChange={(e) => updateDayField(day, "end", e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
