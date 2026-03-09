export const WEEKDAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const

export type DayKey = (typeof WEEKDAY_ORDER)[number]

export type DailyHours = {
  open: boolean
  start: string
  end: string
}

export type WeeklyHours = Record<DayKey, DailyHours>

const DAY_NAME_MAP: Record<string, DayKey> = {
  mon: "Mon",
  monday: "Mon",
  tue: "Tue",
  tues: "Tue",
  tuesday: "Tue",
  wed: "Wed",
  weds: "Wed",
  wednesday: "Wed",
  thu: "Thu",
  thur: "Thu",
  thurs: "Thu",
  thursday: "Thu",
  fri: "Fri",
  friday: "Fri",
  sat: "Sat",
  saturday: "Sat",
  sun: "Sun",
  sunday: "Sun",
}

function to24HourTime(value: string): string | null {
  const trimmed = value.replace(/[.\u2009\u202f]/g, "").trim()
  const match = trimmed.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i)
  if (!match) return null

  let hours = Number(match[1])
  const minutes = match[2] ?? "00"
  const meridiem = match[3]?.toLowerCase()

  if (meridiem === "pm" && hours < 12) hours += 12
  if (meridiem === "am" && hours === 12) hours = 0

  if (hours < 0 || hours > 23) return null
  return `${String(hours).padStart(2, "0")}:${minutes}`
}

export function createDefaultWeeklyHours(start = "08:00", end = "17:00"): WeeklyHours {
  return {
    Mon: { open: true, start, end },
    Tue: { open: true, start, end },
    Wed: { open: true, start, end },
    Thu: { open: true, start, end },
    Fri: { open: true, start, end },
    Sat: { open: false, start, end },
    Sun: { open: false, start, end },
  }
}

export function cloneWeeklyHours(hours: WeeklyHours): WeeklyHours {
  return WEEKDAY_ORDER.reduce((acc, day) => {
    acc[day] = { ...hours[day] }
    return acc
  }, {} as WeeklyHours)
}

export function normalizeWeeklyHours(value: unknown, fallback?: WeeklyHours): WeeklyHours {
  const base = fallback ? cloneWeeklyHours(fallback) : createDefaultWeeklyHours()
  if (!value || typeof value !== "object" || Array.isArray(value)) return base

  for (const day of WEEKDAY_ORDER) {
    const rawDay = (value as Record<string, unknown>)[day]
    if (!rawDay || typeof rawDay !== "object" || Array.isArray(rawDay)) continue
    const raw = rawDay as Record<string, unknown>
    base[day] = {
      open: typeof raw.open === "boolean" ? raw.open : base[day].open,
      start: typeof raw.start === "string" && raw.start ? raw.start : base[day].start,
      end: typeof raw.end === "string" && raw.end ? raw.end : base[day].end,
    }
  }

  return base
}

export function weeklyHoursAreUniform(hours: WeeklyHours): boolean {
  const openDays = WEEKDAY_ORDER.filter((day) => hours[day].open)
  if (openDays.length <= 1) return true
  const first = hours[openDays[0]]
  return openDays.every((day) => hours[day].start === first.start && hours[day].end === first.end)
}

export function summarizeWeeklyHours(hours: WeeklyHours): string {
  const groups: Array<{ days: DayKey[]; start: string; end: string; open: boolean }> = []

  for (const day of WEEKDAY_ORDER) {
    const current = hours[day]
    const last = groups[groups.length - 1]
    if (
      last &&
      last.open === current.open &&
      last.start === current.start &&
      last.end === current.end
    ) {
      last.days.push(day)
    } else {
      groups.push({
        days: [day],
        start: current.start,
        end: current.end,
        open: current.open,
      })
    }
  }

  return groups
    .map((group) => {
      const dayLabel =
        group.days.length === 1
          ? group.days[0]
          : `${group.days[0]}-${group.days[group.days.length - 1]}`
      return group.open ? `${dayLabel} ${group.start}-${group.end}` : `${dayLabel} Closed`
    })
    .join("; ")
}

export function findHoursForDate(hours: WeeklyHours | null | undefined, date: Date) {
  if (!hours) return null
  const day = WEEKDAY_ORDER[(date.getDay() + 6) % 7]
  return hours[day] ?? null
}

export function parseGoogleWeekdayDescriptions(weekdayDescriptions: string[]): WeeklyHours | null {
  if (!Array.isArray(weekdayDescriptions) || weekdayDescriptions.length === 0) return null

  const hours = createDefaultWeeklyHours()
  let foundAny = false

  for (const line of weekdayDescriptions) {
    const [rawDay, rawHours] = line.split(":")
    const day = DAY_NAME_MAP[rawDay?.trim().toLowerCase() ?? ""]
    if (!day || !rawHours) continue

    const normalized = rawHours.replace(/\u2013|\u2014/g, "-").trim()
    if (/closed/i.test(normalized)) {
      hours[day] = { ...hours[day], open: false }
      foundAny = true
      continue
    }
    if (/open 24 hours/i.test(normalized)) {
      hours[day] = { open: true, start: "00:00", end: "23:59" }
      foundAny = true
      continue
    }

    const firstRange = normalized.split(",")[0]?.trim() ?? normalized
    const [rawStart, rawEnd] = firstRange.split(/\s*-\s*/)
    const start = rawStart ? to24HourTime(rawStart) : null
    const end = rawEnd ? to24HourTime(rawEnd) : null
    if (!start || !end) continue

    hours[day] = { open: true, start, end }
    foundAny = true
  }

  return foundAny ? hours : null
}

export function parseTextHoursToWeekly(raw: string): WeeklyHours | null {
  if (!raw.trim()) return null

  const lower = raw.toLowerCase().replace(/\u2013|\u2014/g, "-")
  const hours = createDefaultWeeklyHours()
  let days: DayKey[] = []

  const rangeMatch = lower.match(
    /(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s*(?:-|to)\s*(mon(?:day)?|tue(?:s|sday)?|wed(?:nesday)?|thu(?:r|rs|rsday|rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)/i
  )

  if (rangeMatch) {
    const startDay = DAY_NAME_MAP[rangeMatch[1].toLowerCase()]
    const endDay = DAY_NAME_MAP[rangeMatch[2].toLowerCase()]
    if (startDay && endDay) {
      const startIndex = WEEKDAY_ORDER.indexOf(startDay)
      const endIndex = WEEKDAY_ORDER.indexOf(endDay)
      if (startIndex >= 0 && endIndex >= 0 && startIndex <= endIndex) {
        days = WEEKDAY_ORDER.slice(startIndex, endIndex + 1)
      }
    }
  }

  if (days.length === 0) {
    days = WEEKDAY_ORDER.filter((day) => {
      const fullName = Object.entries(DAY_NAME_MAP).find(([, short]) => short === day)?.[0]
      return fullName ? lower.includes(fullName) : false
    })
  }

  if (days.length === 0) {
    days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
  }

  const matches = [...raw.matchAll(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi)]
  const start = matches[0]
    ? to24HourTime(`${matches[0][1]}:${matches[0][2] ?? "00"}${matches[0][3] ?? ""}`)
    : "08:00"
  const end = matches[1]
    ? to24HourTime(`${matches[1][1]}:${matches[1][2] ?? "00"}${matches[1][3] ?? ""}`)
    : "17:00"

  if (!start || !end) return null

  for (const day of WEEKDAY_ORDER) {
    hours[day] = {
      open: days.includes(day),
      start,
      end,
    }
  }

  return hours
}
