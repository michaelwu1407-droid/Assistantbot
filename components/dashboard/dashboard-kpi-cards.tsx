"use client"

import type { ReactNode } from "react"
import { DealView } from "@/actions/deal-actions"
import { cn } from "@/lib/utils"
import { countAttentionRequiredDeals } from "@/lib/deal-attention"
import { formatCurrency } from "@/lib/format"

interface DashboardKpiCardsProps {
  deals: DealView[]
}

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function getDealRevenueValue(deal: DealView) {
  if (typeof deal.invoicedAmount === "number" && deal.invoicedAmount > 0) {
    return deal.invoicedAmount
  }
  return deal.value
}

function isTraceyWonDeal(deal: DealView) {
  const metadata = (deal.metadata ?? {}) as Record<string, unknown>
  const source = typeof metadata.source === "string" ? metadata.source.toLowerCase() : ""

  return (
    Boolean(source) ||
    typeof metadata.leadSource === "string" ||
    typeof metadata.provider === "string" ||
    typeof metadata.portal === "string" ||
    Boolean(metadata.leadWonEmail) ||
    typeof deal.source === "string"
  )
}

function KpiMetric({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2
      className={cn(
        "app-kpi-value tabular-nums",
        className
      )}
      style={{ color: "var(--color-ink)" }}
    >
      {children}
    </h2>
  )
}

const kpiLabelClass =
  "app-micro-label font-bold tracking-widest"

function KpiCardFrame({
  stripeClass,
  children,
}: {
  stripeClass: string
  children: React.ReactNode
}) {
  return (
    <div
      className="overflow-hidden rounded-md border bg-card shadow-sm"
      style={{ borderColor: "#E6E2D7" }}
    >
      <div className="flex min-w-0 flex-1 flex-col">
        <div className={cn("h-[3px] w-full", stripeClass)} />
        <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 p-3">{children}</div>
      </div>
    </div>
  )
}

export function DashboardKpiCards({ deals }: DashboardKpiCardsProps) {
  const now = new Date()
  const currentMonth = now.getMonth()
  const currentYear = now.getFullYear()

  const wonThisMonth = deals.filter(
    (d) =>
      d.stage === "completed" &&
      new Date(d.stageChangedAt).getMonth() === currentMonth &&
      new Date(d.stageChangedAt).getFullYear() === currentYear
  )
  const revenue = wonThisMonth.reduce((sum, d) => sum + getDealRevenueValue(d), 0)
  const travisWon = wonThisMonth.filter(isTraceyWonDeal)
  const travisWonCount = travisWon.length
  const travisWonRevenue = travisWon.reduce((sum, d) => sum + getDealRevenueValue(d), 0)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const upcomingCount = deals.filter((d) => {
    if (d.stage !== "scheduled") return false
    if (!d.scheduledAt) return false
    const scheduled = new Date(d.scheduledAt)
    return (
      scheduled.getMonth() === currentMonth &&
      scheduled.getFullYear() === currentYear &&
      scheduled >= startOfToday
    )
  }).length
  const attentionRequiredCount = countAttentionRequiredDeals(deals)

  const monthLabel = MONTHS[currentMonth]

  return (
    <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
      <KpiCardFrame stripeClass="bg-[#4A7CE6]">
        <p className={kpiLabelClass} style={{ color: "var(--color-ink2)" }}>{monthLabel} Revenue</p>
        <div className="flex min-w-0 items-end justify-between gap-2">
          <KpiMetric>{formatCurrency(revenue)}</KpiMetric>
        </div>
      </KpiCardFrame>

      <KpiCardFrame stripeClass="bg-[#00D28B]">
        <p className={kpiLabelClass} style={{ color: "var(--color-ink2)" }}>Jobs Won With Tracey ({monthLabel})</p>
        <div className="flex min-w-0 items-end justify-between gap-2">
          <KpiMetric>{formatCurrency(travisWonRevenue)} ({travisWonCount})</KpiMetric>
        </div>
      </KpiCardFrame>

      <KpiCardFrame stripeClass="bg-[#8B6FE0]">
        <p className={kpiLabelClass} style={{ color: "var(--color-ink2)" }}>Upcoming Jobs ({monthLabel})</p>
        <div className="flex min-w-0 items-end justify-between gap-2">
          <KpiMetric>{upcomingCount}</KpiMetric>
        </div>
      </KpiCardFrame>

      <KpiCardFrame stripeClass="bg-[#E89A2B]">
        <p className={cn(kpiLabelClass, "min-w-0 flex-1 truncate")} style={{ color: "var(--color-ink2)" }}>Attention Required</p>
        <div className="flex min-w-0 items-end justify-between gap-2">
          <KpiMetric>{attentionRequiredCount}</KpiMetric>
        </div>
      </KpiCardFrame>
    </section>
  )
}
