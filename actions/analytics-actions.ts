"use server"

import { db } from "@/lib/db"
import { startOfMonth, endOfMonth, subMonths, differenceInDays } from "date-fns"

const STAGE_LABELS: Record<string, string> = {
  NEW: "New request",
  CONTACTED: "Quote sent",
  NEGOTIATION: "Scheduled",
  SCHEDULED: "Scheduled",
  PIPELINE: "Pipeline",
  INVOICED: "Ready to invoice",
  WON: "Completed",
  LOST: "Lost",
  DELETED: "Deleted",
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
    wonWithTravis: number
  }
  team: {
    members: number
    productivity: number
    performance: Array<{ name: string; jobs: number; revenue: number }>
  }
}

export async function getReportsData(workspaceId: string, monthsBack = 6): Promise<ReportsData> {
  const now = new Date()
  const deals = await db.deal.findMany({
    where: { workspaceId },
    select: {
      id: true,
      stage: true,
      value: true,
      stageChangedAt: true,
      createdAt: true,
      metadata: true,
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
  const totalRevenue = wonDeals.reduce((sum, d) => sum + Number(d.value ?? 0), 0)
  const prevMonthStart = startOfMonth(subMonths(now, 1))
  const prevMonthEnd = endOfMonth(subMonths(now, 1))
  const prevRevenue = wonDeals
    .filter((d) => d.stageChangedAt && d.stageChangedAt >= prevMonthStart && d.stageChangedAt <= prevMonthEnd)
    .reduce((sum, d) => sum + Number(d.value ?? 0), 0)
  const thisMonthRevenue = wonDeals
    .filter((d) => d.stageChangedAt && d.stageChangedAt >= startOfMonth(now))
    .reduce((sum, d) => sum + Number(d.value ?? 0), 0)
  const growth = prevRevenue > 0 ? ((thisMonthRevenue - prevRevenue) / prevRevenue) * 100 : 0

  const monthly: Array<{ month: string; revenue: number }> = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = subMonths(now, i)
    const start = startOfMonth(d)
    const end = endOfMonth(d)
    const rev = wonDeals
      .filter((deal) => deal.stageChangedAt && deal.stageChangedAt >= start && deal.stageChangedAt <= end)
      .reduce((s, deal) => s + Number(deal.value ?? 0), 0)
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
  const jobsWonWithTravis = deals.filter((deal) => {
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
      satisfaction: 0,
    },
    jobs: {
      completed,
      inProgress,
      avgCompletionTime: avgDays,
      wonWithTravis: jobsWonWithTravis,
    },
    team: {
      members: 0,
      productivity: 0,
      performance: [],
    },
  }
}
