"use server";

import { db } from "@/lib/db";
import { startOfWeek, endOfWeek, subDays } from "date-fns";

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
