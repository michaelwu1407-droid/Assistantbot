"use server"

import { db } from "@/lib/db"
import { verifyPublicJobPortalToken } from "@/lib/public-job-portal"
import { buildPublicFeedbackUrl } from "@/lib/public-feedback"
import { DEFAULT_WORKSPACE_TIMEZONE } from "@/lib/timezone"

export type JobPortalStatus = {
  jobStatus: string | null
  scheduledAt: string | null
  title: string
  businessName: string
  businessPhone: string | null
  isComplete: boolean
  isCancelled: boolean
  feedbackUrl: string | null
}

/**
 * Returns job status data for the customer portal.
 * Validates the token and fetches current deal state.
 * Safe for public (unauthenticated) access.
 */
export async function getJobPortalStatus(token: string): Promise<JobPortalStatus | null> {
  const payload = verifyPublicJobPortalToken(token)
  if (!payload) return null

  const deal = await db.deal.findUnique({
    where: { id: payload.dealId },
    select: {
      id: true,
      title: true,
      jobStatus: true,
      scheduledAt: true,
      contactId: true,
      workspaceId: true,
      workspace: {
        select: {
          name: true,
          twilioPhoneNumber: true,
          workspaceTimezone: true,
        },
      },
    },
  })

  if (!deal || deal.contactId !== payload.contactId || deal.workspaceId !== payload.workspaceId) {
    return null
  }

  const isComplete = deal.jobStatus === "COMPLETED"
  const isCancelled = deal.jobStatus === "CANCELLED"

  const feedbackUrl = isComplete
    ? buildPublicFeedbackUrl({
        dealId: deal.id,
        contactId: deal.contactId,
        workspaceId: deal.workspaceId,
      })
    : null

  const scheduledAt = deal.scheduledAt
    ? new Date(deal.scheduledAt).toLocaleString("en-AU", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
        timeZone: deal.workspace.workspaceTimezone || DEFAULT_WORKSPACE_TIMEZONE,
      })
    : null

  return {
    jobStatus: deal.jobStatus ?? null,
    scheduledAt,
    title: deal.title,
    businessName: deal.workspace.name,
    businessPhone: deal.workspace.twilioPhoneNumber,
    isComplete,
    isCancelled,
    feedbackUrl,
  }
}
