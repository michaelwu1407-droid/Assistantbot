"use server"

import { db } from "@/lib/db"
import {
  addMonths,
  differenceInCalendarDays,
  differenceInDays,
  endOfDay,
  endOfMonth,
  isAfter,
  startOfDay,
  startOfMonth,
  subDays,
} from "date-fns"

const STAGE_LABELS: Record<string, string> = {
  NEW: "New request",
  CONTACTED: "Quote sent",
  NEGOTIATION: "Negotiation",
  SCHEDULED: "Scheduled",
  PIPELINE: "Pipeline",
  INVOICED: "Ready to invoice",
  PENDING_COMPLETION: "Pending approval",
  WON: "Completed",
  LOST: "Lost",
  DELETED: "Deleted",
}

function getDealRevenueValue(deal: {
  invoicedAmount?: number | { toNumber(): number } | null
  value?: number | { toNumber(): number } | null
}) {
  const normalizeValue = (value: number | { toNumber(): number } | null | undefined) => {
    if (typeof value === "number") {
      return Number.isNaN(value) ? 0 : value
    }
    if (value && typeof value === "object" && typeof value.toNumber === "function") {
      const parsed = value.toNumber()
      return Number.isNaN(parsed) ? 0 : parsed
    }
    return 0
  }

  const invoicedAmount = normalizeValue(deal.invoicedAmount)
  if (invoicedAmount > 0) {
    return invoicedAmount
  }

  return normalizeValue(deal.value)
}

export interface ReportsData {
  revenue: {
    total: number
    growth: number
    monthly: Array<{ month: string; revenue: number }>
  }
  deals: {
    total: number
    conversion: number
    byStage: Array<{ stage: string; count: number }>
  }
  customers: {
    total: number
    new: number
    satisfaction: number
  }
  jobs: {
    completed: number
    inProgress: number
    avgCompletionTime: number
    wonWithTracey: number
  }
  team: {
    members: number
    productivity: number
    performance: Array<{ name: string; jobs: number; revenue: number }>
  }
}

export type ReportRange = "7d" | "30d" | "90d" | "1y"

function resolveReportWindow(now: Date, range: ReportRange) {
  switch (range) {
    case "7d":
      return startOfDay(subDays(now, 6))
    case "30d":
      return startOfDay(subDays(now, 29))
    case "90d":
      return startOfDay(subDays(now, 89))
    case "1y":
      return startOfDay(subDays(now, 364))
    default:
      return startOfDay(subDays(now, 29))
  }
}

function isWithinRange(value: Date | null | undefined, start: Date, end: Date) {
  if (!value) return false
  return value >= start && value <= end
}

function buildMonthlyBuckets(rangeStart: Date, rangeEnd: Date) {
  const buckets: Array<{ month: string; start: Date; end: Date }> = []
  let cursor = startOfMonth(rangeStart)

  while (!isAfter(cursor, rangeEnd)) {
    buckets.push({
      month: cursor.toLocaleDateString("en-AU", { month: "short" }),
      start: cursor,
      end: endOfMonth(cursor),
    })
    cursor = addMonths(cursor, 1)
  }

  return buckets
}

export async function getReportsData(workspaceId: string, range: ReportRange = "30d"): Promise<ReportsData> {
  const now = new Date()
  const rangeStart = resolveReportWindow(now, range)
  const comparisonDays = differenceInCalendarDays(now, rangeStart) + 1
  const previousRangeEnd = endOfDay(subDays(rangeStart, 1))
  const previousRangeStart = startOfDay(subDays(rangeStart, comparisonDays))

  const deals = await db.deal.findMany({
    where: {
      workspaceId,
      OR: [
        { createdAt: { gte: previousRangeStart } },
        { stageChangedAt: { gte: previousRangeStart } },
      ],
    },
    select: {
      id: true,
      stage: true,
      value: true,
      invoicedAmount: true,
      stageChangedAt: true,
      createdAt: true,
      metadata: true,
      assignedTo: { select: { id: true, name: true } },
    },
  })

  const contacts = await db.contact.count({ where: { workspaceId } })
  const newContactsThisMonth = await db.contact.count({
    where: {
      workspaceId,
      createdAt: { gte: rangeStart },
    },
  })

  const wonDeals = deals.filter((d) => d.stage === "WON")
  const wonDealsInRange = wonDeals.filter((deal) => isWithinRange(deal.stageChangedAt, rangeStart, now))
  const wonDealsInPreviousRange = wonDeals.filter((deal) =>
    isWithinRange(deal.stageChangedAt, previousRangeStart, previousRangeEnd),
  )
  const totalRevenue = wonDealsInRange.reduce((sum, d) => sum + getDealRevenueValue(d), 0)
  const prevRevenue = wonDealsInPreviousRange
    .reduce((sum, d) => sum + getDealRevenueValue(d), 0)
  const growth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0

  const monthly = buildMonthlyBuckets(rangeStart, now).map((bucket) => ({
    month: bucket.month,
    revenue: wonDeals
      .filter((deal) => isWithinRange(deal.stageChangedAt, bucket.start, bucket.end))
      .reduce((sum, deal) => sum + getDealRevenueValue(deal), 0),
  }))

  const dealsInRange = deals.filter(
    (deal) => isWithinRange(deal.createdAt, rangeStart, now) || isWithinRange(deal.stageChangedAt, rangeStart, now),
  )

  const stageCounts: Record<string, number> = {}
  for (const d of dealsInRange) {
    const label = STAGE_LABELS[d.stage] ?? d.stage
    stageCounts[label] = (stageCounts[label] ?? 0) + 1
  }
  const byStage = Object.entries(stageCounts).map(([stage, count]) => ({ stage, count }))

  const completed = wonDealsInRange.length
  const inProgress = dealsInRange.filter(
    (d) => !["WON", "LOST", "DELETED"].includes(d.stage)
  ).length
  const wonWithDates = wonDealsInRange.filter((d) => d.stageChangedAt && d.createdAt)
  const avgDays =
    wonWithDates.length > 0
      ? Math.round(
          wonWithDates.reduce((s, d) => s + differenceInDays(d.stageChangedAt!, d.createdAt), 0) /
            wonWithDates.length
        )
      : 0

  const scheduledOrBeyondStages = new Set(["NEGOTIATION", "SCHEDULED", "PIPELINE", "INVOICED", "PENDING_COMPLETION", "WON"])
  const jobsWonWithTracey = dealsInRange.filter((deal) => {
    if (!scheduledOrBeyondStages.has(deal.stage)) return false

    const metadata = (deal.metadata ?? {}) as Record<string, unknown>
    const source = typeof metadata.source === "string" ? metadata.source.toLowerCase() : ""
    const hasSystemSource =
      Boolean(source) ||
      Boolean(metadata.leadWonEmail) ||
      typeof metadata.leadSource === "string" ||
      typeof metadata.provider === "string" ||
      typeof metadata.portal === "string"

    const createdDirectlyAtCurrentStage =
      Math.abs(new Date(deal.stageChangedAt).getTime() - new Date(deal.createdAt).getTime()) < 60_000

    // Exclude only manual jobs created directly at scheduled-or-beyond stage.
    if (!hasSystemSource && createdDirectlyAtCurrentStage) return false

    return true
  }).length

  const feedback = await db.customerFeedback.aggregate({
    where: {
      contact: { workspaceId },
      createdAt: { gte: rangeStart },
    },
    _avg: { score: true },
  })

  const workspaceUsers = await db.user.count({ where: { workspaceId } })
  const jobsPerMember = new Map<string, { name: string; jobs: number; revenue: number }>()
  for (const deal of wonDealsInRange) {
    const memberId = deal.assignedTo?.id
    if (!memberId) continue
    const existing = jobsPerMember.get(memberId) ?? {
      name: deal.assignedTo?.name ?? "Unknown",
      jobs: 0,
      revenue: 0,
    }
    existing.jobs += 1
    existing.revenue += getDealRevenueValue(deal)
    jobsPerMember.set(memberId, existing)
  }
  const teamPerformance = Array.from(jobsPerMember.values()).sort((a, b) => b.revenue - a.revenue)
  const productivity = workspaceUsers > 0 ? Math.round(completed / workspaceUsers) : 0

  return {
    revenue: {
      total: totalRevenue,
      growth,
      monthly,
    },
    deals: {
      total: dealsInRange.length,
      conversion: dealsInRange.length > 0 ? Math.round((completed / dealsInRange.length) * 1000) / 10 : 0,
      byStage,
    },
    customers: {
      total: contacts,
      new: newContactsThisMonth,
      satisfaction: feedback._avg.score ? Number(feedback._avg.score.toFixed(1)) : 0,
    },
    jobs: {
      completed,
      inProgress,
      avgCompletionTime: avgDays,
      wonWithTracey: jobsWonWithTracey,
    },
    team: {
      members: workspaceUsers,
      productivity,
      performance: teamPerformance,
    },
  }
}
