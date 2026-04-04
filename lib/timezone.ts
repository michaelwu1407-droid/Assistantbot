const AU_STATE_TO_TIMEZONE: Array<{ token: RegExp; timezone: string }> = [
  { token: /\bwa\b|western australia/i, timezone: "Australia/Perth" },
  { token: /\bnt\b|northern territory/i, timezone: "Australia/Darwin" },
  { token: /\bsa\b|south australia/i, timezone: "Australia/Adelaide" },
  { token: /\bqld\b|queensland/i, timezone: "Australia/Brisbane" },
  { token: /\bnsw\b|new south wales/i, timezone: "Australia/Sydney" },
  { token: /\bvic\b|victoria/i, timezone: "Australia/Melbourne" },
  { token: /\bact\b|australian capital territory/i, timezone: "Australia/Sydney" },
  { token: /\btas\b|tasmania/i, timezone: "Australia/Hobart" },
]

export const DEFAULT_WORKSPACE_TIMEZONE = "Australia/Sydney"
export const AU_TIMEZONE_OPTIONS = [
  "Australia/Perth",
  "Australia/Darwin",
  "Australia/Adelaide",
  "Australia/Brisbane",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Hobart",
] as const

type ZonedDateParts = {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const LONG_MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]
const SHORT_WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const LONG_WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

export function isValidIanaTimezone(value: string | null | undefined): value is string {
  if (!value) return false
  try {
    Intl.DateTimeFormat("en-AU", { timeZone: value })
    return true
  } catch {
    return false
  }
}

export function inferTimezoneFromAddress(address: string | null | undefined): string {
  if (!address) return DEFAULT_WORKSPACE_TIMEZONE
  for (const rule of AU_STATE_TO_TIMEZONE) {
    if (rule.token.test(address)) return rule.timezone
  }
  return DEFAULT_WORKSPACE_TIMEZONE
}

export function resolveWorkspaceTimezone(value: string | null | undefined): string {
  return isValidIanaTimezone(value) ? value : DEFAULT_WORKSPACE_TIMEZONE
}

function getFormatter(timeZone: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: resolveWorkspaceTimezone(timeZone),
    hourCycle: "h23",
    ...options,
  })
}

export function getZonedDateParts(date: Date | string | number, timeZone: string): ZonedDateParts {
  const resolvedDate = date instanceof Date ? date : new Date(date)
  const parts = getFormatter(timeZone, {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(resolvedDate)

  const lookup = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]))

  return {
    year: Number(lookup.year),
    month: Number(lookup.month),
    day: Number(lookup.day),
    hour: Number(lookup.hour),
    minute: Number(lookup.minute),
    second: Number(lookup.second),
  }
}

function getTimezoneOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedDateParts(date, timeZone)
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second)
  return asUtc - date.getTime()
}

export function parseDateTimeLocalInTimezone(value: string | null | undefined, timeZone: string): Date | null {
  if (!value) return null
  const match = value.trim().match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/)
  if (!match) return null

  const [, year, month, day, hour, minute, second] = match
  const utcGuess = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
    Number(second ?? "0"),
    0,
  )

  let offset = getTimezoneOffsetMs(new Date(utcGuess), timeZone)
  let resolved = new Date(utcGuess - offset)
  const adjustedOffset = getTimezoneOffsetMs(resolved, timeZone)
  if (adjustedOffset !== offset) {
    offset = adjustedOffset
    resolved = new Date(utcGuess - offset)
  }

  return resolved
}

export function toDateTimeLocalValue(date: Date | string | number | null | undefined, timeZone: string): string {
  if (!date) return ""
  const parts = getZonedDateParts(date, timeZone)
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`
}

export function toDateKeyInTimezone(date: Date | string | number, timeZone: string): string {
  const parts = getZonedDateParts(date, timeZone)
  return `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
}

export function getHourInTimezone(date: Date | string | number, timeZone: string): number {
  return getZonedDateParts(date, timeZone).hour
}

export function buildDateForHourInTimezone(referenceDate: Date, hour: number, timeZone: string): Date {
  const parts = getZonedDateParts(referenceDate, timeZone)
  return parseDateTimeLocalInTimezone(
    `${String(parts.year).padStart(4, "0")}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(hour).padStart(2, "0")}:00`,
    timeZone,
  ) ?? new Date(referenceDate)
}

export function formatMonthDayInTimezone(date: Date | string | number, timeZone: string): string {
  const parts = getZonedDateParts(date, timeZone)
  return `${SHORT_MONTHS[parts.month - 1]} ${parts.day}`
}

export function formatMonthDayYearInTimezone(date: Date | string | number, timeZone: string): string {
  const parts = getZonedDateParts(date, timeZone)
  return `${SHORT_MONTHS[parts.month - 1]} ${parts.day}, ${parts.year}`
}

export function formatMonthYearInTimezone(date: Date | string | number, timeZone: string): string {
  const parts = getZonedDateParts(date, timeZone)
  return `${LONG_MONTHS[parts.month - 1]} ${parts.year}`
}

export function formatTimeInTimezone(date: Date | string | number, timeZone: string): string {
  const parts = getZonedDateParts(date, timeZone)
  const normalizedHour = parts.hour % 12 || 12
  const suffix = parts.hour >= 12 ? "PM" : "AM"
  return `${normalizedHour}:${String(parts.minute).padStart(2, "0")} ${suffix}`
}

export function formatDateTimeInTimezone(date: Date | string | number, timeZone: string): string {
  return `${formatMonthDayYearInTimezone(date, timeZone)} ${formatTimeInTimezone(date, timeZone)}`
}

export function formatLongDateInTimezone(date: Date | string | number, timeZone: string): string {
  const parts = getZonedDateParts(date, timeZone)
  const weekdayIndex = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
  return `${LONG_WEEKDAYS[weekdayIndex]}, ${LONG_MONTHS[parts.month - 1]} ${parts.day}, ${parts.year}`
}

export function formatShortWeekdayInTimezone(date: Date | string | number, timeZone: string): string {
  const parts = getZonedDateParts(date, timeZone)
  const weekdayIndex = new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay()
  return SHORT_WEEKDAYS[weekdayIndex]
}
