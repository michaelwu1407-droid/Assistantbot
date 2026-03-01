"use server";

import { db } from "@/lib/db";
import { startOfWeek, endOfWeek, subDays } from "date-fns";
import { z } from "zod";
import { runDashboardTask } from "@/lib/ai-service";

export interface DashboardStats {
    weeklyRevenue: number;
    outstandingDebt: number;
    activeDealsCount?: number;
}

/**
 * aggregated financial stats for the PulseWidget.
 */
export async function getFinancialStats(workspaceId: string): Promise<DashboardStats> {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    // 1. Weekly Revenue: Sum of invoices PAID this week
    const paidInvoices = await db.invoice.aggregate({
        where: {
            deal: { workspaceId },
            status: "PAID",
            paidAt: {
                gte: weekStart,
                lte: weekEnd
            }
        },
        _sum: {
            total: true
        }
    });

    // 2. Outstanding Debt: Sum of invoices ISSUED (but not paid)
    // We could also include OVERDUE if we had that status
    const outstandingInvoices = await db.invoice.aggregate({
        where: {
            deal: { workspaceId },
            status: "ISSUED"
        },
        _sum: {
            total: true
        }
    });

    // 3. (Optional) Count active deals for Agent mode context
    const activeDeals = await db.deal.count({
        where: {
            workspaceId,
            stage: { notIn: ["WON", "LOST", "ARCHIVED"] }
        }
    });

    return {
        weeklyRevenue: paidInvoices._sum.total ? Number(paidInvoices._sum.total) : 0,
        outstandingDebt: outstandingInvoices._sum.total ? Number(outstandingInvoices._sum.total) : 0,
        activeDealsCount: activeDeals
    };
}

// ---------------------------------------------------------------------------
// AI-Powered Dashboard Actions (Two-Tier Strategy)
// ---------------------------------------------------------------------------

const transcriptSummarySchema = z.object({
    summary: z.string().describe("2-3 sentence summary of the call"),
    actionItems: z.array(z.string()).describe("List of follow-up actions"),
    sentiment: z
        .enum(["positive", "neutral", "negative"])
        .describe("Overall customer sentiment"),
});

/**
 * Summarises a long call transcript using the **context** tier (Gemini).
 * Gemini's large context window handles full transcripts efficiently.
 */
export async function summarizeCallTranscript(transcript: string) {
    const result = await runDashboardTask({
        tier: "context",
        schema: transcriptSummarySchema,
        prompt: `Summarise this call transcript for a tradie's CRM dashboard:\n\n${transcript}`,
    });

    return result.object;
}

const kanbanMoveSchema = z.object({
    recommendedStage: z
        .enum(["LEAD", "QUOTED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "WON", "LOST"])
        .describe("The recommended next pipeline stage"),
    reason: z.string().describe("One-sentence justification for the move"),
});

/**
 * Decides the next Kanban pipeline move for a deal using the **logic** tier
 * (DeepSeek V3). Pure business-logic reasoning at a fraction of the cost.
 */
export async function classifyNextKanbanMove(dealContext: string) {
    const result = await runDashboardTask({
        tier: "logic",
        schema: kanbanMoveSchema,
        prompt: `Given this deal context, recommend the next Kanban pipeline stage:\n\n${dealContext}`,
    });

    return result.object;
}
