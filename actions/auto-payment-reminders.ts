"use server"

import { db } from "@/lib/db"
import { sendSMS } from "@/actions/messaging-actions"

const MILESTONES_DAYS = [3, 7, 14]

/**
 * Automatically sends payment reminder SMS at 3/7/14-day milestones
 * for ISSUED invoices. Fires only when workspace agentMode is EXECUTION
 * and the milestone has not already been sent (idempotent via Activity log).
 * Called from ensureDailyNotifications.
 */
export async function ensureAutoPaymentReminders(workspaceId: string) {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { agentMode: true, name: true },
  })
  if (!workspace || workspace.agentMode !== "EXECUTION") return

  const maxThreshold = new Date(Date.now() - MILESTONES_DAYS[0] * 86_400_000)

  const invoices = await db.invoice.findMany({
    where: {
      deal: { workspaceId },
      status: "ISSUED",
      issuedAt: { lte: maxThreshold },
    },
    select: {
      id: true,
      number: true,
      total: true,
      issuedAt: true,
      deal: {
        select: {
          id: true,
          title: true,
          contactId: true,
          contact: { select: { name: true, phone: true } },
          activities: {
            where: { title: { startsWith: "Auto payment reminder" } },
            select: { title: true },
          },
        },
      },
    },
  })

  for (const invoice of invoices) {
    const contact = invoice.deal.contact
    if (!contact?.phone || !invoice.issuedAt) continue

    const ageMs = Date.now() - new Date(invoice.issuedAt).getTime()
    const ageDays = ageMs / 86_400_000

    for (const milestone of MILESTONES_DAYS) {
      // Only fire if we're within a one-day window past the milestone
      if (ageDays < milestone || ageDays >= milestone + 1) continue

      const milestoneLabel = `Auto payment reminder: ${milestone} days (invoice ${invoice.number})`
      const alreadySent = invoice.deal.activities.some((a) => a.title === milestoneLabel)
      if (alreadySent) continue

      const firstName = contact.name.split(" ")[0]
      const amount = `$${Number(invoice.total || 0).toFixed(0)}`
      const message = `Hi ${firstName}, just a friendly reminder that invoice #${invoice.number} for ${amount} from ${workspace.name} is still unpaid. Please let us know if you have any questions!`

      const result = await sendSMS(invoice.deal.contactId, message, invoice.deal.id)

      if (result.success) {
        await db.activity.create({
          data: {
            type: "NOTE",
            title: milestoneLabel,
            content: `Auto payment reminder sent at ${milestone}-day milestone.`,
            dealId: invoice.deal.id,
            contactId: invoice.deal.contactId,
          },
        })
      }

      break // Only one milestone per invoice per day
    }
  }
}
