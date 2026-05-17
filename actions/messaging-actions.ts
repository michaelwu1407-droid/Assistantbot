"use server";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

import { z } from "zod";
import { db } from "@/lib/db";
import { buildPublicFeedbackUrl } from "@/lib/public-feedback";
import { DEFAULT_WORKSPACE_TIMEZONE, resolveWorkspaceTimezone, formatDateTimeInTimezone } from "@/lib/timezone";
import { assertSafeRecipient } from "@/lib/messaging/safe-recipient";
import { withCostCeiling } from "@/lib/cost-ceiling";

const RESEND_EMAIL_COST_USD = 0.001;

// ─── Types ──────────────────────────────────────────────────────────

export interface MessageResult {
  success: boolean;
  messageId?: string;
  channel?: "sms" | "whatsapp" | "email" | "multi";
  error?: string;
}

export interface InboxThread {
  contactId: string;
  contactName: string;
  contactAvatar: string | null;
  contactCompany: string | null;
  contactPhone: string | null;
  lastMessage: {
    content: string;
    createdAt: Date;
    type: string;
  } | null;
  unreadCount: number;
}

// ─── Validation ─────────────────────────────────────────────────────

const SendMessageSchema = z.object({
  contactId: z.string(),
  message: z.string().min(1),
  channel: z.enum(["sms", "whatsapp"]).default("sms"),
});

function formatSmsSchedule(value: Date | string | null | undefined, workspaceTimezone?: string | null) {
  if (!value) return "today";
  const scheduled = new Date(value);
  if (Number.isNaN(scheduled.getTime())) return "today";
  const timeZone = resolveWorkspaceTimezone(workspaceTimezone);
  return formatDateTimeInTimezone(scheduled, timeZone);
}

// ─── Twilio Client ──────────────────────────────────────────────────

/**
 * Look up the workspace's Twilio subaccount credentials from the database.
 * Each workspace gets a provisioned Twilio subaccount + phone number during onboarding.
 */
async function getWorkspaceTwilioCreds(workspaceId: string) {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      twilioSubaccountId: true,
      twilioPhoneNumber: true,
    },
  });
  return workspace;
}

function hasProvisionedSmsSender(workspace: { twilioSubaccountId: string | null; twilioPhoneNumber: string | null } | null | undefined) {
  return Boolean(workspace?.twilioSubaccountId && workspace.twilioPhoneNumber);
}

/**
 * Send an SMS via Twilio using the workspace's provisioned subaccount.
 * Customer-facing SMS must come from the workspace's provisioned number.
 */
async function sendViaTwilio(
  to: string,
  body: string,
  channel: "sms" | "whatsapp",
  workspaceId?: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  let accountSid: string | undefined;
  let authToken: string | undefined;
  let fromNumber: string | undefined;

  // Try workspace-specific Twilio credentials first
  if (workspaceId) {
    const wsCreds = await getWorkspaceTwilioCreds(workspaceId);
    if (hasProvisionedSmsSender(wsCreds)) {
      accountSid = wsCreds!.twilioSubaccountId!;
      // Subaccount auth token — stored as env var keyed by subaccount SID
      // or use the master account's auth token (Twilio allows parent auth on subaccounts)
      authToken = process.env.TWILIO_AUTH_TOKEN;
      fromNumber = wsCreds!.twilioPhoneNumber!;
    }
  } else if (channel === "whatsapp") {
    accountSid = process.env.TWILIO_ACCOUNT_SID;
    authToken = process.env.TWILIO_AUTH_TOKEN;
    fromNumber = process.env.TWILIO_WHATSAPP_NUMBER;
  }

  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      error: "SMS not configured yet. Complete onboarding to provision your business number, or contact support.",
    };
  }

  const toFormatted = channel === "whatsapp" ? `whatsapp:${to}` : to;

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          To: toFormatted,
          From: fromNumber,
          Body: body,
        }),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data.message ?? "Twilio API error";
      db.webhookEvent.create({
        data: {
          provider: "twilio",
          eventType: `sms.${channel}`,
          status: "error",
          error: errMsg,
          payload: { to: to.slice(0, 6) + "***", channel },
        },
      }).catch(() => {});
      return { success: false, error: errMsg };
    }

    db.webhookEvent.create({
      data: {
        provider: "twilio",
        eventType: `sms.${channel}`,
        status: "success",
        payload: { sid: data.sid, channel },
      },
    }).catch(() => {});
    return { success: true, sid: data.sid };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : "Network error";
    db.webhookEvent.create({
      data: {
        provider: "twilio",
        eventType: `sms.${channel}`,
        status: "error",
        error: errMsg,
        payload: { channel },
      },
    }).catch(() => {});
    return {
      success: false,
      error: errMsg,
    };
  }
}

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Get inbox threads (contacts with recent activity).
 * Groups activities by contact to create a "chat list" view.
 */
export async function getInboxThreads(workspaceId: string): Promise<InboxThread[]> {
  // Fetch contacts who have relevant activities
  const contacts = await db.contact.findMany({
    where: {
      workspaceId,
      activities: {
        some: {
          type: { in: ["EMAIL", "CALL", "NOTE"] }
        }
      }
    },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      company: true,
      phone: true,
      activities: {
        where: {
          type: { in: ["EMAIL", "CALL", "NOTE"] }
        },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          content: true,
          createdAt: true,
          type: true,
          title: true
        }
      }
    }
  });

  // Transform and sort by most recent message
  const threads = contacts
    .map(c => {
      const last = c.activities[0];
      return {
        contactId: c.id,
        contactName: c.name,
        contactAvatar: c.avatarUrl,
        contactCompany: c.company,
        contactPhone: c.phone ?? null,
        lastMessage: last ? {
          content: last.content || last.title,
          createdAt: last.createdAt,
          type: last.type
        } : null,
        unreadCount: 0 // In future, track read status
      };
    })
    .filter(t => t.lastMessage !== null)
    .sort((a, b) => b.lastMessage!.createdAt.getTime() - a.lastMessage!.createdAt.getTime());

  return threads;
}

/**
 * Send an SMS to a contact.
 * Auto-logs the message as an EMAIL-type activity.
 */
export async function sendSMS(
  contactId: string,
  message: string,
  dealId?: string
): Promise<MessageResult> {
  const parsed = SendMessageSchema.safeParse({
    contactId,
    message,
    channel: "sms",
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const contact = await db.contact.findUnique({
    where: { id: contactId },
    select: { id: true, name: true, phone: true, workspaceId: true },
  });
  if (!contact) return { success: false, error: "Contact not found" };
  if (!contact.phone) return { success: false, error: "Contact has no phone number" };

  // Use workspace's Twilio subaccount
  const result = await sendViaTwilio(contact.phone, message, "sms", contact.workspaceId);

  if (result.success) {
    // Log as activity
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "SMS sent",
        content: `SMS to ${contact.name}: "${message.substring(0, 100)}${message.length > 100 ? "..." : ""}"`,
        contactId,
        dealId,
      },
    });
  }

  return {
    success: result.success,
    messageId: result.sid,
    channel: "sms",
    error: result.error,
  };
}

/**
 * Send a WhatsApp message to a contact.
 */
export async function sendWhatsApp(
  contactId: string,
  message: string
): Promise<MessageResult> {
  const parsed = SendMessageSchema.safeParse({
    contactId,
    message,
    channel: "whatsapp",
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const contact = await db.contact.findUnique({ where: { id: contactId } });
  if (!contact) return { success: false, error: "Contact not found" };
  if (!contact.phone) return { success: false, error: "Contact has no phone number" };

  const result = await sendViaTwilio(contact.phone, message, "whatsapp");

  if (result.success) {
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "WhatsApp sent",
        content: `WhatsApp to ${contact.name}: "${message.substring(0, 100)}${message.length > 100 ? "..." : ""}"`,
        contactId,
      },
    });
  }

  return {
    success: result.success,
    messageId: result.sid,
    channel: "whatsapp",
    error: result.error,
  };
}

/**
 * Send bulk SMS to multiple contacts.
 * Uses a template for personalization.
 * Rate-limited: 1 message per second to avoid Twilio throttling.
 */
export async function sendBulkSMS(
  contactIds: string[],
  message: string,
  templateValues?: Record<string, string>
): Promise<{
  success: boolean;
  sent: number;
  failed: number;
  errors: string[];
}> {
  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  // Batch fetch all contacts in one query instead of N individual queries
  const contacts = await db.contact.findMany({
    where: { id: { in: contactIds } },
    select: { id: true, name: true, phone: true, workspaceId: true },
  });
  const contactMap = new Map(contacts.map((c) => [c.id, c]));

  for (const contactId of contactIds) {
    const contact = contactMap.get(contactId);
    if (!contact || !contact.phone) {
      failed++;
      errors.push(`${contact?.name ?? contactId}: no phone number`);
      continue;
    }

    // Simple template substitution
    let personalizedMessage = message;
    if (templateValues) {
      for (const [key, value] of Object.entries(templateValues)) {
        personalizedMessage = personalizedMessage.replace(
          new RegExp(`\\{\\{${key}\\}\\}`, "g"),
          value
        );
      }
    }
    // Always substitute contactName
    personalizedMessage = personalizedMessage.replace(
      /\{\{contactName\}\}/g,
      contact.name
    );

    const result = await sendViaTwilio(contact.phone, personalizedMessage, "sms", contact.workspaceId);

    if (result.success) {
      sent++;
      await db.activity.create({
        data: {
          type: "NOTE",
          title: "Bulk SMS sent",
          content: `Bulk SMS to ${contact.name}: "${personalizedMessage.substring(0, 80)}..."`,
          contactId,
        },
      });
    } else {
      failed++;
      errors.push(`${contact.name}: ${result.error}`);
    }

    // Rate limit: 1 message per second
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return { success: true, sent, failed, errors };
}

/**
 * Send initial confirmation SMS for a scheduled job.
 */
export async function sendConfirmationSMS(dealId: string): Promise<MessageResult> {
  try {
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: { contact: true, workspace: { select: { workspaceTimezone: true } } }
    });

    if (!deal || !deal.contact.phone) {
      return { success: false, error: "No contact phone number found" };
    }

    const message = `Hi ${deal.contact.name}, your job is booked for ${formatSmsSchedule(deal.scheduledAt, deal.workspace?.workspaceTimezone ?? DEFAULT_WORKSPACE_TIMEZONE)} at ${deal.address || "your location"}. Reply CONFIRM or call us to reschedule.`;

    const result = await sendSMS(deal.contactId, message, dealId);

    if (result.success) {
      // Store confirmation status in deal metadata
      await db.deal.update({
        where: { id: dealId },
        data: {
          metadata: JSON.parse(JSON.stringify({
            ...(deal.metadata as Record<string, unknown> | null || {}),
            confirmationSent: new Date().toISOString(),
            confirmationStatus: "pending"
          }))
        }
      });

      await db.activity.create({
        data: {
          type: "NOTE",
          title: "Confirmation SMS Sent",
          content: `Sent confirmation SMS to ${deal.contact.name}`,
          dealId,
          contactId: deal.contactId
        }
      });
    }

    return result;
  } catch (error) {
    console.error("Error sending confirmation SMS:", error);
    return { success: false, error: "Failed to send confirmation SMS" };
  }
}

/**
 * Send a customer-facing SMS when a scheduled booking time changes.
 */
export async function sendRescheduleConfirmationSMS(dealId: string): Promise<MessageResult> {
  try {
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: { contact: true, workspace: { select: { workspaceTimezone: true } } }
    });

    if (!deal || !deal.contact.phone) {
      return { success: false, error: "No contact phone number found" };
    }

    const message = `Hi ${deal.contact.name}, your booking has been updated to ${formatSmsSchedule(deal.scheduledAt, deal.workspace?.workspaceTimezone ?? DEFAULT_WORKSPACE_TIMEZONE)} at ${deal.address || "your location"}. Reply CONFIRM or call us if you need anything else.`;

    const result = await sendSMS(deal.contactId, message, dealId);

    if (result.success) {
      await db.deal.update({
        where: { id: dealId },
        data: {
          metadata: JSON.parse(JSON.stringify({
            ...(deal.metadata as Record<string, unknown> | null || {}),
            rescheduleConfirmationSent: new Date().toISOString(),
            confirmationStatus: "pending"
          }))
        }
      });

      await db.activity.create({
        data: {
          type: "NOTE",
          title: "Reschedule confirmation SMS sent",
          content: `Sent updated booking confirmation to ${deal.contact.name}`,
          dealId,
          contactId: deal.contactId
        }
      });
    }

    return result;
  } catch (error) {
    console.error("Error sending reschedule confirmation SMS:", error);
    return { success: false, error: "Failed to send reschedule confirmation SMS" };
  }
}

/**
 * Resend/nudge confirmation SMS for a pending job.
 */
export async function resendConfirmationSMS(dealId: string): Promise<MessageResult> {
  try {
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: { contact: true, workspace: { select: { workspaceTimezone: true } } }
    });

    if (!deal || !deal.contact.phone) {
      return { success: false, error: "No contact phone number found" };
    }

    const message = `Hi ${deal.contact.name}, just following up on your job for ${formatSmsSchedule(deal.scheduledAt, deal.workspace?.workspaceTimezone ?? DEFAULT_WORKSPACE_TIMEZONE)}. Reply CONFIRM or call us to reschedule.`;

    const result = await sendSMS(deal.contactId, message, dealId);

    if (result.success) {
      // Update last nudge time
      await db.deal.update({
        where: { id: dealId },
        data: {
          metadata: JSON.parse(JSON.stringify({
            ...(deal.metadata as Record<string, unknown> | null || {}),
            lastNudgeSent: new Date().toISOString()
          }))
        }
      });

      await db.activity.create({
        data: {
          type: "NOTE",
          title: "Nudge SMS Sent",
          content: `Sent nudge SMS to ${deal.contact.name}`,
          dealId,
          contactId: deal.contactId
        }
      });
    }

    return result;
  } catch (error) {
    console.error("Error sending nudge SMS:", error);
    return { success: false, error: "Failed to send nudge SMS" };
  }
}

/**
 * Send a customer feedback request SMS after a job is completed.
 * This links to the internal Earlymark feedback page first, then offers
 * a Google review on the thank-you screen when the score is strong.
 */
export async function sendReviewRequestSMS(dealId: string): Promise<MessageResult> {
  try {
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: { contact: true, workspace: true }
    });

    if (!deal) {
      return { success: false, error: "Deal not found" };
    }

    const businessName = deal.workspace.name || "us";
    const feedbackUrl = buildPublicFeedbackUrl({
      dealId: deal.id,
      contactId: deal.contactId,
      workspaceId: deal.workspaceId,
    });
    const smsMessage = `Hi ${deal.contact.name}, thanks for choosing ${businessName}. We'd love your feedback: ${feedbackUrl}`;

    const smsResult = deal.contact.phone ? await sendSMS(deal.contactId, smsMessage, dealId) : null;
    const emailResult = deal.contact.email
      ? await sendReviewRequestEmailInternal({
          dealId,
          contactId: deal.contactId,
          contactName: deal.contact.name,
          to: deal.contact.email,
          businessName,
          feedbackUrl,
        })
      : null;

    if (smsResult?.success || emailResult?.success) {
      const channelSummary = [
        smsResult?.success ? "SMS" : null,
        emailResult?.success ? "email" : null,
      ]
        .filter(Boolean)
        .join(" and ");

      await db.activity.create({
        data: {
          type: "NOTE",
          title: "Feedback Request Sent",
          content: `Sent customer feedback request via ${channelSummary} to ${deal.contact.name}`,
          dealId,
          contactId: deal.contactId
        }
      });
    }

    if (smsResult?.success && emailResult?.success) {
      return {
        success: true,
        channel: "multi",
        messageId: [smsResult.messageId, emailResult.messageId].filter(Boolean).join(","),
      };
    }
    if (smsResult?.success) return smsResult;
    if (emailResult?.success) return emailResult;

    return {
      success: false,
      error: smsResult?.error || emailResult?.error || "No contact phone number or email address found",
    };
  } catch (error) {
    console.error("Error sending feedback request SMS:", error);
    return { success: false, error: "Failed to send feedback request SMS" };
  }
}

async function sendReviewRequestEmailInternal(input: {
  dealId: string;
  contactId: string;
  contactName: string;
  to: string;
  businessName: string;
  feedbackUrl: string;
}): Promise<MessageResult> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!resendKey) {
    return { success: false, error: "Email sending is not configured" };
  }

  const safeRecipient = assertSafeRecipient("email", input.to);
  const { Resend } = await import("resend");
  const resend = new Resend(resendKey);
  const fromDomain = process.env.RESEND_FROM_DOMAIN || "earlymark.ai";
  const fromAddress = process.env.SUPPORT_EMAIL_FROM || `support@${fromDomain}`;

  const result = await withCostCeiling("resend", RESEND_EMAIL_COST_USD, () =>
    resend.emails.send({
      from: `${input.businessName} via Earlymark <${fromAddress}>`,
      to: [safeRecipient],
      subject: "We'd love your feedback on your recent job",
      text: [
        `Hi ${input.contactName},`,
        "",
        `Thanks for choosing ${input.businessName}. We'd really appreciate your feedback on the recent job.`,
        "",
        input.feedbackUrl,
      ].join("\n"),
    }),
  );

  if (result.error) {
    return { success: false, error: "Failed to send review request email" };
  }

  return {
    success: true,
    channel: "email",
    messageId: result.data?.id || undefined,
  };
}

