import { db } from "@/lib/db"
import { getWorkspaceTwilioClient } from "@/lib/twilio"
import { buildPublicJobPortalUrl } from "@/lib/public-job-portal"
import { getNotificationChannel, NotificationScenario, type NotificationChannel } from "./channel-router"
import { checkSafeRecipient } from "./safe-recipient"

type WorkspaceMessagingConfig = {
  id: string
  name: string
  twilioPhoneNumber: string | null
  twilioSubaccountId: string | null
  twilioSubaccountAuthToken: string | null
}

type ContactMessagingConfig = {
  id: string
  name: string
  phone: string | null
  email: string | null
}

type DealMessagingConfig = {
  id: string
  contactId: string
  workspaceId: string
}

type SendNotificationOptions = {
  contact: ContactMessagingConfig
  workspace: WorkspaceMessagingConfig
  deal: DealMessagingConfig
  scenario: NotificationScenario
  smsBody: string
  emailSubject: string
  emailBody: string
  includePortalLink?: boolean
}

type SendNotificationResult = {
  channel: NotificationChannel
  sent: boolean
  error?: string
}

/**
 * Sends a notification to a contact via the appropriate channel (SMS or email),
 * determined by the scenario and what contact details are available.
 *
 * Optionally appends a job portal link to the message body.
 */
export async function sendNotification(
  options: SendNotificationOptions
): Promise<SendNotificationResult> {
  const { contact, workspace, deal, scenario, includePortalLink } = options

  const channel = getNotificationChannel(contact, scenario)

  let portalUrl: string | null = null
  if (includePortalLink) {
    portalUrl = buildPublicJobPortalUrl({
      dealId: deal.id,
      contactId: deal.contactId,
      workspaceId: deal.workspaceId,
    })
  }

  if (channel === "sms") {
    if (!contact.phone) {
      return { channel, sent: false, error: "No phone number on file" }
    }
    if (!workspace.twilioPhoneNumber || !workspace.twilioSubaccountId) {
      return { channel, sent: false, error: "Twilio not configured for workspace" }
    }

    const body = portalUrl
      ? `${options.smsBody}\n\nTrack your job: ${portalUrl}`
      : options.smsBody

    const client = getWorkspaceTwilioClient(workspace)
    if (!client) {
      return { channel, sent: false, error: "No usable Twilio client" }
    }

    const smsRecipient = checkSafeRecipient("sms", contact.phone)
    if (!smsRecipient.ok) {
      return { channel, sent: false, error: `Refusing SMS: ${smsRecipient.reason}` }
    }
    let smsSid: string | undefined
    try {
      const msg = await client.messages.create({
        to: smsRecipient.target,
        from: workspace.twilioPhoneNumber,
        body,
      })
      smsSid = msg.sid
    } catch (err) {
      db.webhookEvent.create({
        data: {
          provider: "twilio",
          eventType: `sms.${scenario}`,
          status: "error",
          payload: { scenario, error: err instanceof Error ? err.message : String(err) },
        },
      }).catch(() => {})
      throw err
    }

    db.webhookEvent.create({
      data: {
        provider: "twilio",
        eventType: `sms.${scenario}`,
        status: "success",
        payload: { sid: smsSid, scenario },
      },
    }).catch(() => {})

    await db.activity.create({
      data: {
        type: "CALL",
        title: `SMS sent (${scenario})`,
        content: body,
        dealId: deal.id,
        contactId: deal.contactId,
      },
    })

    return { channel, sent: true }
  }

  // channel === "email"
  if (!contact.email) {
    return { channel, sent: false, error: "No email on file" }
  }

  const resendKey = process.env.RESEND_API_KEY
  if (!resendKey) {
    return { channel, sent: false, error: "Email not configured (RESEND_API_KEY missing)" }
  }

  const fromDomain = process.env.RESEND_FROM_DOMAIN || "earlymark.ai"
  const emailBody = portalUrl
    ? `${options.emailBody}\n\nTrack your appointment: ${portalUrl}`
    : options.emailBody

  const emailRecipient = checkSafeRecipient("email", contact.email)
  if (!emailRecipient.ok) {
    return { channel, sent: false, error: `Refusing email: ${emailRecipient.reason}` }
  }
  const { Resend } = await import("resend")
  const resend = new Resend(resendKey)
  const { error } = await resend.emails.send({
    from: `${workspace.name} <noreply@${fromDomain}>`,
    to: [emailRecipient.target],
    subject: options.emailSubject,
    text: emailBody,
  })

  if (error) {
    db.webhookEvent.create({
      data: {
        provider: "resend",
        eventType: `email.${scenario}`,
        status: "error",
        payload: { scenario, error: error.message },
      },
    }).catch(() => {})
    return { channel, sent: false, error: `Email failed: ${error.message}` }
  }

  db.webhookEvent.create({
    data: {
      provider: "resend",
      eventType: `email.${scenario}`,
      status: "success",
      payload: { scenario, to: contact.email },
    },
  }).catch(() => {})

  await db.activity.create({
    data: {
      type: "EMAIL",
      title: `Email sent (${scenario})`,
      content: emailBody.substring(0, 500),
      dealId: deal.id,
      contactId: deal.contactId,
    },
  })

  return { channel, sent: true }
}
