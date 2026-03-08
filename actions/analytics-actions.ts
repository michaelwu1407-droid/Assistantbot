"use server"

import { db } from "@/lib/db"
import { startOfMonth, endOfMonth, subMonths, differenceInDays } from "date-fns"

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
  invoicedAmount?: number | null
  value?: number | null
}) {
  if (typeof deal.invoicedAmount === "number" && !Number.isNaN(deal.invoicedAmount)) {
    return deal.invoicedAmount
  }
  return Number(deal.value ?? 0)
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

export async function getReportsData(workspaceId: string, monthsBack = 6): Promise<ReportsData> {
  const now = new Date()
  const rangeStart = startOfMonth(subMonths(now, Math.max(monthsBack - 1, 0)))
  const deals = await db.deal.findMany({
    where: {
      workspaceId,
      OR: [
        { createdAt: { gte: rangeStart } },
        { stageChangedAt: { gte: rangeStart } },
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
      createdAt: { gte: startOfMonth(now) },
    },
  })

  const wonDeals = deals.filter((d) => d.stage === "WON")
  const totalRevenue = wonDeals.reduce((sum, d) => sum + getDealRevenueValue(d), 0)
  const prevMonthStart = startOfMonth(subMonths(now, 1))
  const prevMonthEnd = endOfMonth(subMonths(now, 1))
  const prevRevenue = wonDeals
    .filter((d) => d.stageChangedAt && d.stageChangedAt >= prevMonthStart && d.stageChangedAt <= prevMonthEnd)
    .reduce((sum, d) => sum + getDealRevenueValue(d), 0)
  const thisMonthRevenue = wonDeals
    .filter((d) => d.stageChangedAt && d.stageChangedAt >= startOfMonth(now))
    .reduce((sum, d) => sum + getDealRevenueValue(d), 0)
  const growth = prevRevenue > 0 ? ((thisMonthRevenue - prevRevenue) / prevRevenue) * 100 : 0

  const monthly: Array<{ month: string; revenue: number }> = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = subMonths(now, i)
    const start = startOfMonth(d)
    const end = endOfMonth(d)
    const rev = wonDeals
      .filter((deal) => deal.stageChangedAt && deal.stageChangedAt >= start && deal.stageChangedAt <= end)
      .reduce((s, deal) => s + getDealRevenueValue(deal), 0)
    monthly.push({ month: start.toLocaleDateString("en-AU", { month: "short" }), revenue: rev })
  }

  const stageCounts: Record<string, number> = {}
  for (const d of deals) {
    const label = STAGE_LABELS[d.stage] ?? d.stage
    stageCounts[label] = (stageCounts[label] ?? 0) + 1
  }
  const byStage = Object.entries(stageCounts).map(([stage, count]) => ({ stage, count }))

  const completed = deals.filter((d) => d.stage === "WON").length
  const inProgress = deals.filter(
    (d) => !["WON", "LOST", "DELETED"].includes(d.stage)
  ).length
  const wonWithDates = wonDeals.filter((d) => d.stageChangedAt && d.createdAt)
  const avgDays =
    wonWithDates.length > 0
      ? Math.round(
          wonWithDates.reduce((s, d) => s + differenceInDays(d.stageChangedAt!, d.createdAt), 0) /
            wonWithDates.length
        )
      : 0

  const scheduledOrBeyondStages = new Set(["NEGOTIATION", "SCHEDULED", "PIPELINE", "INVOICED", "PENDING_COMPLETION", "WON"])
  const jobsWonWithTracey = deals.filter((deal) => {
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
  for (const deal of wonDeals) {
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
      total: deals.length,
      conversion: deals.length > 0 ? Math.round((completed / deals.length) * 1000) / 10 : 0,
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
