/**
 * Sends a plain-text notification email to the workspace owner.
 * Used by server actions after checking shouldSendNotificationEmail().
 */

import { Resend } from "resend"
import { db } from "@/lib/db"
import { assertSafeRecipient } from "@/lib/messaging/safe-recipient"
import { withCostCeiling } from "@/lib/cost-ceiling"
import { addToTestOutbox } from "@/lib/email-test-outbox"

const RESEND_EMAIL_COST_USD = 0.001

export async function sendOwnerNotificationEmail(params: {
  workspaceId: string
  subject: string
  text: string
  template?: string
}): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) return

  const workspace = await db.workspace.findUnique({
    where: { id: params.workspaceId },
    select: {
      name: true,
      ownerId: true,
    },
  })
  if (!workspace?.ownerId) return

  const owner = await db.user.findUnique({
    where: { id: workspace.ownerId },
    select: { email: true },
  })
  if (!owner?.email) return

  const safeEmail = (() => {
    try {
      return assertSafeRecipient("email", owner.email)
    } catch {
      return null
    }
  })()
  if (!safeEmail) return

  const resend = new Resend(resendKey)
  const fromAddress = process.env.RESEND_FROM_EMAIL || "noreply@earlymark.ai"

  addToTestOutbox({
    template: params.template ?? "notification",
    to: safeEmail,
    subject: params.subject,
    workspaceId: params.workspaceId,
  })

  await withCostCeiling("resend", RESEND_EMAIL_COST_USD, () =>
    resend.emails.send({
      from: `${workspace.name || "Earlymark"} <${fromAddress}>`,
      to: [safeEmail],
      subject: params.subject,
      text: params.text,
    }),
  ).catch(() => {})
}
