/**
 * Shared formatting utilities for currency, dates, and times.
 * All monetary values use en-AU locale with 2 decimal places.
 * All dates use en-AU convention (day-first) with 12-hour time.
 */

export function formatCurrency(amount: number | null | undefined): string {
  if (amount == null) return "—"
  return "$" + amount.toLocaleString("en-AU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

export function formatShortDate(date: Date | string | null | undefined): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
  })
}

export function formatWeekdayLong(date: Date | string | null | undefined): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  })
}

export function formatWeekdayShort(date: Date | string | null | undefined): string {
  if (!date) return "—"
  return new Date(date).toLocaleDateString("en-AU", { weekday: "short" })
}

export function formatTime(date: Date | string | null | undefined): string {
  if (!date) return "—"
  return new Date(date).toLocaleTimeString("en-AU", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "—"
  const d = new Date(date)
  const day = d.toLocaleDateString("en-AU", { weekday: "short", day: "numeric", month: "short" })
  const time = d.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
  return `${day} · ${time}`
}

export function formatNumber(value: number | null | undefined): string {
  if (value == null) return "—"
  return value.toLocaleString("en-AU")
}
