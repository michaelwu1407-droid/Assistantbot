import { logger } from "@/lib/logging"
import { sendNotification } from "@/lib/messaging/send-notification"
import { NotificationScenario } from "@/lib/messaging/channel-router"
import { sendPushToUser } from "@/lib/push-notifications"
import { recordCallbackEvent, type CallbackKind } from "@/lib/callback-events"
import { db } from "@/lib/db"

export type CallbackFailureInput = {
  workspaceId: string
  dealId: string
  contactPhone: string
  contactId?: string | null
  contactName?: string | null
  reason: string
  triggerSource?: string | null
  callbackKind?: CallbackKind | null
  error: string
}

/**
 * Called when an outbound auto-call dispatch fails.
 * Records the failure then immediately falls back: text the lead, alert the tradie.
 * One channel at a time — SMS only fires because the phone call failed.
 */
export async function handleCallbackDispatchFailure(
  input: CallbackFailureInput,
): Promise<void> {
  const callbackKind = input.callbackKind || "automatic"

  await recordCallbackEvent({
    eventType: "callback_dispatch_failed",
    status: "error",
    error: input.error,
    payload: {
      workspaceId: input.workspaceId,
      contactId: input.contactId || null,
      contactPhone: input.contactPhone,
      contactName: input.contactName || null,
      dealId: input.dealId,
      reason: input.reason,
      triggerSource: input.triggerSource || null,
      callbackKind,
      dispatchMode: "immediate",
    },
  })

  await escalateFailedCallback(input)
}

async function escalateFailedCallback(input: CallbackFailureInput): Promise<void> {
  const deal = await db.deal
    .findUnique({
      where: { id: input.dealId },
      select: {
        id: true,
        contactId: true,
        workspaceId: true,
        contact: { select: { id: true, name: true, phone: true, email: true } },
        workspace: {
          select: {
            id: true,
            name: true,
            ownerId: true,
            twilioPhoneNumber: true,
            twilioSubaccountId: true,
            twilioSubaccountAuthToken: true,
          },
        },
      },
    })
    .catch(() => null)

  if (!deal || !deal.contact || !deal.workspace) return

  const leadFirstName = deal.contact.name?.split(" ")[0] || "there"
  const bizName = deal.workspace.name
  const callbackNumber = deal.workspace.twilioPhoneNumber || ""

  // Text the lead — only because the call failed, never simultaneously.
  let smsSent = false
  try {
    const result = await sendNotification({
      contact: deal.contact,
      workspace: deal.workspace,
      deal: { id: deal.id, contactId: deal.contactId, workspaceId: deal.workspaceId },
      scenario: NotificationScenario.NEW_LEAD_RESPONSE,
      smsBody:
        `Hi ${leadFirstName}, it's Tracey from ${bizName}. We tried to call about your enquiry but couldn't reach you — happy to help by text, or call us back any time${callbackNumber ? ` on ${callbackNumber}` : ""}.`.trim(),
      emailSubject: `${bizName} — we tried to reach you`,
      emailBody:
        `Hi ${leadFirstName},\n\nWe tried calling about your enquiry but couldn't reach you. Reply here or call us back any time and we'll help straight away.\n\n${bizName}`,
      includePortalLink: true,
    })
    smsSent = result.sent
  } catch (err) {
    logger.warn("Lead fallback message failed", {
      component: "callback-escalation",
      dealId: deal.id,
      error: err instanceof Error ? err.message : String(err),
    })
  }

  // Alert the tradie so they can step in personally.
  if (deal.workspace.ownerId) {
    await sendPushToUser(deal.workspace.ownerId, {
      title: `Couldn't reach ${deal.contact.name || "a new lead"}`,
      body: smsSent
        ? "Tracey tried calling and has now texted them. Worth a personal call?"
        : "Tracey couldn't reach them by phone or text. Worth a personal call?",
      url: `/crm/deals/${deal.id}`,
    }).catch(() => {})
  }
}
