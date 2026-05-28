"use server"

import { db } from "@/lib/db"
import { verifyPublicJobPortalToken } from "@/lib/public-job-portal"
import { buildPublicFeedbackUrl } from "@/lib/public-feedback"
import { DEFAULT_WORKSPACE_TIMEZONE, formatDateTimeInTimezone } from "@/lib/timezone"

export type JobPortalStatus = {
  jobStatus: string | null
  scheduledAt: string | null
  title: string
  businessName: string
  businessPhone: string | null
  isComplete: boolean
  isCancelled: boolean
  feedbackUrl: string | null
  isQuote: boolean
  quoteAccepted: boolean
  quoteValue: number | null
  isInvoiced: boolean
  invoicePaid: boolean
  invoiceTotal: number | null
  invoiceId: string | null
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
      stage: true,
      jobStatus: true,
      scheduledAt: true,
      contactId: true,
      workspaceId: true,
      value: true,
      metadata: true,
      workspace: {
        select: {
          name: true,
          twilioPhoneNumber: true,
          workspaceTimezone: true,
        },
      },
      invoices: {
        where: { status: { in: ["ISSUED", "PAID"] } },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { id: true, status: true, total: true },
      },
    },
  })

  if (!deal || deal.contactId !== payload.contactId || deal.workspaceId !== payload.workspaceId) {
    return null
  }

  const recentPortalView = await db.activity.findFirst({
    where: {
      dealId: deal.id,
      title: "Job portal viewed",
      createdAt: {
        gte: new Date(Date.now() - 60 * 60 * 1000),
      },
    },
    select: { id: true },
  })

  if (!recentPortalView) {
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Job portal viewed",
        content: "A customer opened the public job portal.",
        dealId: deal.id,
        contactId: deal.contactId,
      },
    })
    await db.webhookEvent.create({
      data: {
        provider: "internal",
        eventType: "portal.opened",
        status: "success",
        payload: {
          dealId: deal.id,
          contactId: deal.contactId,
          workspaceId: deal.workspaceId,
        },
      },
    }).catch(() => {})
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
    ? formatDateTimeInTimezone(deal.scheduledAt, deal.workspace.workspaceTimezone || DEFAULT_WORKSPACE_TIMEZONE)
    : null

  const isQuote = deal.stage === "CONTACTED"
  const meta = (deal.metadata ?? {}) as Record<string, unknown>
  const quoteAccepted = Boolean(meta.quoteAcceptedAt)

  return {
    jobStatus: deal.jobStatus ?? null,
    scheduledAt,
    title: deal.title,
    businessName: deal.workspace.name,
    businessPhone: deal.workspace.twilioPhoneNumber,
    isComplete,
    isCancelled,
    feedbackUrl,
    isQuote,
    quoteAccepted,
    quoteValue: deal.value ? Number(deal.value) : null,
    isInvoiced: deal.invoices.length > 0,
    invoicePaid: deal.invoices[0]?.status === "PAID",
    invoiceTotal: deal.invoices[0]?.total ? Number(deal.invoices[0].total) : null,
    invoiceId: deal.invoices[0]?.id ?? null,
  }
}

export async function acceptQuote(
  token: string,
): Promise<{ success: boolean; error?: string }> {
  const payload = verifyPublicJobPortalToken(token)
  if (!payload) return { success: false, error: "Invalid or expired link" }

  const deal = await db.deal.findUnique({
    where: { id: payload.dealId },
    select: { id: true, stage: true, contactId: true, workspaceId: true, title: true, metadata: true },
  })

  if (!deal || deal.contactId !== payload.contactId || deal.workspaceId !== payload.workspaceId) {
    return { success: false, error: "Not found" }
  }
  if (deal.stage !== "CONTACTED") {
    return { success: false, error: "This quote is no longer pending" }
  }

  const meta = ((deal.metadata ?? {}) as Record<string, unknown>)
  await db.deal.update({
    where: { id: deal.id },
    data: { metadata: { ...meta, quoteAcceptedAt: new Date().toISOString() } },
  })

  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Quote accepted by customer",
      content: "The customer clicked 'Accept Quote' on the portal.",
      dealId: deal.id,
      contactId: deal.contactId,
    },
  })

  const workspaceOwner = await db.user.findFirst({
    where: { workspaceId: deal.workspaceId },
    select: { id: true },
  })
  if (workspaceOwner) {
    await db.notification.create({
      data: {
        userId: workspaceOwner.id,
        title: "Quote accepted",
        message: `A customer accepted your quote for "${deal.title}". Time to book them in!`,
        type: "SUCCESS",
        link: `/crm/dashboard`,
      },
    })
  }

  return { success: true }
}

export async function confirmPayment(
  token: string,
): Promise<{ success: boolean; error?: string }> {
  const payload = verifyPublicJobPortalToken(token)
  if (!payload) return { success: false, error: "Invalid or expired link" }

  const invoice = await db.invoice.findFirst({
    where: { deal: { id: payload.dealId, workspaceId: payload.workspaceId }, status: "ISSUED" },
    select: { id: true, number: true, total: true, dealId: true, deal: { select: { title: true, contactId: true, workspaceId: true } } },
  })

  if (!invoice) return { success: false, error: "No outstanding invoice found" }

  await db.invoice.update({ where: { id: invoice.id }, data: { status: "PAID", paidAt: new Date() } })
  await db.deal.update({ where: { id: invoice.dealId }, data: { stage: "WON" } })

  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Customer confirmed payment",
      content: `Customer confirmed payment for invoice #${invoice.number} via the job portal.`,
      dealId: invoice.dealId,
      contactId: invoice.deal.contactId,
    },
  })

  const owner = await db.user.findFirst({ where: { workspaceId: invoice.deal.workspaceId }, select: { id: true } })
  if (owner) {
    await db.notification.create({
      data: {
        userId: owner.id,
        title: "Payment confirmed",
        message: `A customer confirmed payment for "${invoice.deal.title}". Invoice #${invoice.number} is now marked as paid.`,
        type: "SUCCESS",
        link: `/crm/deals/${invoice.dealId}`,
      },
    })
  }

  return { success: true }
}
