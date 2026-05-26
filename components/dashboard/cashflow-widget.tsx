"use client"

import { DealView } from "@/actions/deal-actions"
import { formatCurrency } from "@/lib/format"

interface CashflowWidgetProps {
  deals: DealView[]
}

export function CashflowWidget({ deals }: CashflowWidgetProps) {
  const now = new Date()
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  const unpaidTotal = deals
    .filter((d) => d.stage === "ready_to_invoice")
    .reduce((sum, d) => {
      const amt = typeof d.invoicedAmount === "number" && d.invoicedAmount > 0
        ? d.invoicedAmount
        : d.value
      return sum + (amt || 0)
    }, 0)

  const expectedThisWeek = deals
    .filter((d) => {
      if (d.stage !== "scheduled") return false
      if (!d.scheduledAt) return false
      const t = new Date(d.scheduledAt).getTime()
      return t >= now.getTime() && t < weekEnd.getTime()
    })
    .reduce((sum, d) => sum + (d.value || 0), 0)

  if (unpaidTotal === 0 && expectedThisWeek === 0) return null

  return (
    <div
      className="overflow-hidden rounded-md border bg-card shadow-sm"
      style={{ borderColor: "#E6E2D7" }}
    >
      <div className="h-[3px] w-full bg-[#16A34A]" />
      <div className="flex min-w-0 flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
        <p className="app-micro-label font-bold tracking-widest shrink-0" style={{ color: "var(--color-ink2)" }}>
          Cashflow
        </p>
        <div className="flex min-w-0 flex-wrap gap-x-6 gap-y-1">
          {unpaidTotal > 0 && (
            <span className="app-body-primary shrink-0">
              <span className="font-semibold text-foreground">{formatCurrency(unpaidTotal)}</span>
              <span className="text-muted-foreground"> invoiced &amp; unpaid</span>
            </span>
          )}
          {expectedThisWeek > 0 && (
            <span className="app-body-primary shrink-0">
              <span className="font-semibold text-foreground">{formatCurrency(expectedThisWeek)}</span>
              <span className="text-muted-foreground"> expected this week</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
