"use server"

import { db } from "@/lib/db"
import { verifyPublicFeedbackToken } from "@/lib/public-feedback"
import { revalidatePath } from "next/cache"

type FeedbackContext = {
  dealId: string
  contactId: string
  workspaceId: string
  dealTitle: string
  contactName: string
  businessName: string
  googleReviewUrl: string
}

type FeedbackSubmissionResult = {
  success: boolean
  id?: string
  error?: string
  promptPublicReview?: boolean
  googleReviewUrl?: string
}

/**
 * Get all customer feedback for a workspace.
 */
export async function getWorkspaceFeedback(workspaceId: string) {
  try {
    const feedback = await db.customerFeedback.findMany({
      where: {
        deal: { workspaceId },
      },
      include: {
        contact: { select: { name: true } },
        deal: { select: { title: true } },
      },
      orderBy: [
        { resolved: "asc" },
        { score: "asc" },
        { createdAt: "desc" },
      ],
    })

    return feedback.map((f) => ({
      id: f.id,
      score: f.score,
      comment: f.comment,
      resolved: f.resolved,
      resolution: f.resolution,
      contactName: f.contact?.name || "Unknown Contact",
      dealTitle: f.deal?.title || "Unknown Deal",
      createdAt: f.createdAt.toISOString(),
    }))
  } catch (error) {
    console.error("Error fetching feedback:", error)
    return []
  }
}

/**
 * Resolve a feedback item with internal notes.
 */
export async function resolveFeedback(feedbackId: string, resolution: string) {
  try {
    await db.customerFeedback.update({
      where: { id: feedbackId },
      data: {
        resolved: true,
        resolution,
      },
    })

    revalidatePath("/crm/analytics")
    return { success: true }
  } catch (error) {
    console.error("Error resolving feedback:", error)
    return { success: false, error: "Failed to resolve feedback" }
  }
}

async function getFeedbackContextFromIds(
  dealId: string,
  contactId: string,
  workspaceId?: string,
): Promise<FeedbackContext | null> {
  const deal = await db.deal.findFirst({
    where: {
      id: dealId,
      contactId,
      ...(workspaceId ? { workspaceId } : {}),
    },
    include: {
      contact: { select: { id: true, name: true } },
      workspace: { select: { id: true, name: true, settings: true } },
    },
  })

  if (!deal?.contact || !deal.workspace) {
    return null
  }

  const workspaceSettings = (deal.workspace.settings as Record<string, unknown> | null) ?? {}
  const googleReviewUrl =
    typeof workspaceSettings.googleReviewUrl === "string"
      ? workspaceSettings.googleReviewUrl.trim()
      : ""

  return {
    dealId: deal.id,
    contactId: deal.contact.id,
    workspaceId: deal.workspace.id,
    dealTitle: deal.title,
    contactName: deal.contact.name || "there",
    businessName: deal.workspace.name || "our team",
    googleReviewUrl,
  }
}

async function upsertFeedbackAndNotify(
  context: FeedbackContext,
  score: number,
  comment?: string,
): Promise<FeedbackSubmissionResult> {
  const existing = await db.customerFeedback.findFirst({
    where: {
      dealId: context.dealId,
      contactId: context.contactId,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      score: true,
      resolved: true,
    },
  })

  const normalizedComment = comment?.trim() ? comment.trim() : null

  const feedback = existing
    ? await db.customerFeedback.update({
        where: { id: existing.id },
        data: {
          score,
          comment: normalizedComment,
          resolved: false,
          resolution: null,
        },
      })
    : await db.customerFeedback.create({
        data: {
          score,
          comment: normalizedComment,
          dealId: context.dealId,
          contactId: context.contactId,
        },
      })

  const shouldCreateAlert = score <= 6 && (!existing || existing.score > 6 || existing.resolved)

  if (shouldCreateAlert) {
    const users = await db.user.findMany({
      where: { workspaceId: context.workspaceId },
      select: { id: true },
    })

    for (const user of users) {
      await db.notification.create({
        data: {
          userId: user.id,
          title: "Low customer feedback",
          message: `${context.contactName} gave ${score}/10 for "${context.dealTitle}". Follow up before they leave a public review.`,
          type: "WARNING",
          link: `/crm/contacts/${context.contactId}`,
        },
      })
    }
  }

  revalidatePath("/crm/analytics")
  revalidatePath(`/crm/contacts/${context.contactId}`)
  revalidatePath("/crm/dashboard")

  return {
    success: true,
    id: feedback.id,
    promptPublicReview: score >= 9 && Boolean(context.googleReviewUrl),
    googleReviewUrl: context.googleReviewUrl || undefined,
  }
}

export async function getPublicFeedbackContext(token: string) {
  const payload = verifyPublicFeedbackToken(token)
  if (!payload) {
    return null
  }

  const context = await getFeedbackContextFromIds(
    payload.dealId,
    payload.contactId,
    payload.workspaceId,
  )

  if (!context) {
    return null
  }

  const existing = await db.customerFeedback.findFirst({
    where: {
      dealId: context.dealId,
      contactId: context.contactId,
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      score: true,
      comment: true,
      createdAt: true,
    },
  })

  return {
    ...context,
    existingFeedback: existing
      ? {
          id: existing.id,
          score: existing.score,
          comment: existing.comment,
          createdAt: existing.createdAt.toISOString(),
        }
      : null,
  }
}

/**
 * Submit customer feedback (called from public feedback form or internally).
 */
export async function submitFeedback(
  dealId: string,
  contactId: string,
  score: number,
  comment?: string,
): Promise<FeedbackSubmissionResult> {
  try {
    const context = await getFeedbackContextFromIds(dealId, contactId)
    if (!context) {
      return { success: false, error: "Feedback target not found" }
    }

    return await upsertFeedbackAndNotify(context, score, comment)
  } catch (error) {
    console.error("Error submitting feedback:", error)
    return { success: false, error: "Failed to submit feedback" }
  }
}

export async function submitFeedbackFromPublicToken(
  token: string,
  score: number,
  comment?: string,
): Promise<FeedbackSubmissionResult> {
  try {
    const payload = verifyPublicFeedbackToken(token)
    if (!payload) {
      return { success: false, error: "This feedback link is invalid or has expired." }
    }

    const context = await getFeedbackContextFromIds(
      payload.dealId,
      payload.contactId,
      payload.workspaceId,
    )
    if (!context) {
      return { success: false, error: "This feedback request is no longer available." }
    }

    return await upsertFeedbackAndNotify(context, score, comment)
  } catch (error) {
    console.error("Error submitting public feedback:", error)
    return { success: false, error: "Failed to submit feedback" }
  }
}
