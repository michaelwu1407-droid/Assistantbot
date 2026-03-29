"use client"

import type { ReactNode } from "react"
import { DealView } from "@/actions/deal-actions"
import { cn } from "@/lib/utils"
import { countAttentionRequiredDeals } from "@/lib/deal-attention"

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
        "app-kpi-value tabular-nums text-black dark:text-white",
        className
      )}
    >
      {children}
    </h2>
  )
}

const kpiLabelClass =
  "app-micro-label font-bold tracking-widest text-black dark:text-white/90"

function KpiCardFrame({
  borderClass,
  bgClass,
  children,
}: {
  borderClass: string
  bgClass: string
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        "flex min-h-[5.75rem] rounded-[18px] border-l-[5px] shadow-sm",
        borderClass,
        bgClass
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col justify-between gap-1 p-3">{children}</div>
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
      <KpiCardFrame borderClass="border-l-sky-700" bgClass="bg-sky-100 dark:bg-sky-950/40">
        <p className={kpiLabelClass}>{monthLabel} Revenue</p>
        <div className="flex min-w-0 items-end justify-between gap-2">
          <KpiMetric>${revenue.toLocaleString()}</KpiMetric>
        </div>
      </KpiCardFrame>

      <KpiCardFrame borderClass="border-l-emerald-700" bgClass="bg-emerald-100 dark:bg-emerald-950/45">
        <p className={kpiLabelClass}>Jobs Won With Tracey ({monthLabel})</p>
        <div className="flex min-w-0 items-end justify-between gap-2">
          <KpiMetric>${travisWonRevenue.toLocaleString()} ({travisWonCount})</KpiMetric>
        </div>
      </KpiCardFrame>

      <KpiCardFrame borderClass="border-l-slate-600" bgClass="bg-slate-200 dark:bg-slate-900/50">
        <p className={kpiLabelClass}>Upcoming Jobs ({monthLabel})</p>
        <div className="flex min-w-0 items-end justify-between gap-2">
          <KpiMetric>{upcomingCount}</KpiMetric>
        </div>
      </KpiCardFrame>

      <KpiCardFrame borderClass="border-l-red-700" bgClass="bg-red-100 dark:bg-red-950/45">
        <p className={cn(kpiLabelClass, "min-w-0 flex-1 truncate")}>Attention Required</p>
        <div className="flex min-w-0 items-end justify-between gap-2">
          <KpiMetric>{attentionRequiredCount}</KpiMetric>
        </div>
      </KpiCardFrame>
    </section>
  )
}
