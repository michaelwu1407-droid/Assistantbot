"use server"

import { z } from "zod"
import { db } from "@/lib/db"
import { getAuthUserId } from "@/lib/auth"
import { MonitoringService } from "@/lib/monitoring"
import { logActivity } from "./activity-actions"
import { maybeCreatePricingSuggestionFromConfirmedJob } from "@/lib/pricing-learning"

// ─── Validation ─────────────────────────────────────────────────────

const ReconcileStaleJobSchema = z.object({
  dealId: z.string(),
  actualOutcome: z.enum(["COMPLETED", "RESCHEDULED", "NO_SHOW", "CANCELLED"]),
  outcomeNotes: z.string().nullable(),
})

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Reconcile a stale job by updating its outcome and removing the stale flag
 */
export async function reconcileStaleJob(input: z.infer<typeof ReconcileStaleJobSchema>) {
  const parsed = ReconcileStaleJobSchema.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const { dealId, actualOutcome, outcomeNotes } = parsed.data

  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return { success: false, error: "Unauthorized" }
    }

    // First, verify the deal exists and belongs to the user's workspace
    const deal = await db.deal.findFirst({
      where: {
        id: dealId,
        workspace: {
          ownerId: userId,
        },
      },
      include: {
        contact: true,
      },
    })

    if (!deal) {
      return { success: false, error: "Deal not found or unauthorized" }
    }

    // Update the deal with the reconciliation data
    const updatedDeal = await db.deal.update({
      where: { id: dealId },
      data: {
        actualOutcome,
        outcomeNotes,
        isStale: false,
        // If the job was completed, update the stage to WON
        // If cancelled or no-show, move to LOST
        // If rescheduled, keep in SCHEDULED but clear the scheduled date
        ...(actualOutcome === "COMPLETED" && { stage: "WON" }),
        ...(actualOutcome === "CANCELLED" && { stage: "LOST" }),
        ...(actualOutcome === "NO_SHOW" && { stage: "LOST" }),
        ...(actualOutcome === "RESCHEDULED" && { 
          scheduledAt: null,
          stage: "CONTACTED" // Move back to contact stage for rescheduling
        }),
        updatedAt: new Date(),
      },
    })

    if (actualOutcome === "COMPLETED") {
      try {
        await maybeCreatePricingSuggestionFromConfirmedJob(dealId, {
          trigger: "completed",
          source: "reconcileStaleJob",
        })
      } catch (learningErr) {
        console.warn("Pricing learning hook failed on reconcileStaleJob:", learningErr)
      }
    }

    // Log the reconciliation activity
    await logActivity({
      dealId: deal.id,
      contactId: deal.contactId,
      type: "NOTE",
      title: "Job Reconciled",
      content: `Marked as ${actualOutcome.toLowerCase()}${outcomeNotes ? `: ${outcomeNotes}` : ""}`,
      description: `Job outcome: ${actualOutcome}`,
    })

    // Track the event for analytics
    MonitoringService.trackEvent("stale_job_reconciled", {
      dealId,
      actualOutcome,
      hasNotes: !!outcomeNotes,
    })

    return { 
      success: true, 
      data: {
        dealId: updatedDeal.id,
        actualOutcome: updatedDeal.actualOutcome,
        stage: updatedDeal.stage,
      }
    }

  } catch (error) {
    console.error("Error reconciling stale job:", error)
    MonitoringService.logError(error as Error, { 
      action: "reconcileStaleJob", 
      dealId,
      actualOutcome 
    })
    
    return { success: false, error: "Failed to reconcile job" }
  }
}

/**
 * Scan for overdue jobs and mark them as stale
 * This should be called periodically or on page load
 */
export async function scanAndUpdateStaleJobs(workspaceId?: string) {
  try {
    const userId = await getAuthUserId()
    if (!userId) {
      return { success: false, error: "Unauthorized" }
    }

    const where: any = {
      stage: "SCHEDULED",
      scheduledAt: {
        lt: new Date(), // Jobs scheduled before now
      },
      actualOutcome: null, // No outcome recorded yet
      isStale: false, // Not already marked as stale
    }

    // If workspaceId is provided, filter by it
    if (workspaceId) {
      where.workspaceId = workspaceId
    } else {
      // Otherwise, only scan the user's workspace
      where.workspace = {
        ownerId: userId,
      }
    }

    // Find all overdue jobs
    const overdueJobs = await db.deal.findMany({
      where,
      select: {
        id: true,
        title: true,
        scheduledAt: true,
        contactId: true,
        workspaceId: true,
      },
    })

    if (overdueJobs.length === 0) {
      return { success: true, data: { updatedCount: 0 } }
    }

    // Mark all overdue jobs as stale
    const updateResult = await db.deal.updateMany({
      where: {
        id: {
          in: overdueJobs.map(job => job.id)
        }
      },
      data: {
        isStale: true,
        updatedAt: new Date(),
      },
    })

    // Track the batch update
    MonitoringService.trackEvent("stale_jobs_scanned", {
      workspaceId,
      overdueCount: overdueJobs.length,
      updatedCount: updateResult.count,
    })

    return { 
      success: true, 
      data: { 
        overdueCount: overdueJobs.length,
        updatedCount: updateResult.count 
      }
    }

  } catch (error) {
    console.error("Error scanning for stale jobs:", error)
    MonitoringService.logError(error as Error, { 
      action: "scanAndUpdateStaleJobs", 
      workspaceId 
    })
    
    return { success: false, error: "Failed to scan for stale jobs" }
  }
}
