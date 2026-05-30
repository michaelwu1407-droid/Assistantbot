"use server"

import { db } from "@/lib/db"
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access"
import { sendSMS } from "@/actions/messaging-actions"
import { formatTime } from "@/lib/format"

export async function sendRunningLateMessage(
  dealId: string,
  delayMinutes: number
): Promise<{ success: boolean; error?: string }> {
  const actor = await requireCurrentWorkspaceAccess()

  const deal = await db.deal.findUnique({
    where: { id: dealId },
    select: {
      id: true,
      workspaceId: true,
      scheduledAt: true,
      contactId: true,
      contact: { select: { name: true, phone: true } },
    },
  })

  if (!deal || deal.workspaceId !== actor.workspaceId) {
    return { success: false, error: "Job not found" }
  }
  if (!deal.contact?.phone) {
    return { success: false, error: "No phone number for this contact" }
  }

  const base = deal.scheduledAt ? new Date(deal.scheduledAt) : new Date()
  const newEta = new Date(base.getTime() + delayMinutes * 60_000)
  const etaStr = formatTime(newEta)

  const firstName = deal.contact.name.split(" ")[0]
  const message = `Hi ${firstName}, sorry — running about ${delayMinutes} min late. New ETA: ${etaStr}. Thanks for your patience!`

  const result = await sendSMS(deal.contactId, message, dealId)
  return result.success
    ? { success: true }
    : { success: false, error: result.error }
}
