"use server";

import { z } from "zod";
import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────

export interface MessageResult {
  success: boolean;
  messageId?: string;
  channel?: "sms" | "whatsapp";
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

/**
 * Send an SMS via Twilio using the workspace's provisioned subaccount.
 * Falls back to env vars if workspace credentials aren't available.
 */
async function sendViaTwilio(
  to: string,
  body: string,
  channel: "sms" | "whatsapp",
  workspaceId?: string
): Promise<{ success: boolean; sid?: string; error?: string }> {
  let accountSid = process.env.TWILIO_ACCOUNT_SID;
  let authToken = process.env.TWILIO_AUTH_TOKEN;
  let fromNumber = channel === "whatsapp"
    ? process.env.TWILIO_WHATSAPP_NUMBER
    : process.env.TWILIO_PHONE_NUMBER;

  // Try workspace-specific Twilio credentials first
  if (workspaceId) {
    const wsCreds = await getWorkspaceTwilioCreds(workspaceId);
    if (wsCreds?.twilioSubaccountId && wsCreds?.twilioPhoneNumber) {
      accountSid = wsCreds.twilioSubaccountId;
      // Subaccount auth token — stored as env var keyed by subaccount SID
      // or use the master account's auth token (Twilio allows parent auth on subaccounts)
      authToken = process.env.TWILIO_AUTH_TOKEN || authToken;
      fromNumber = wsCreds.twilioPhoneNumber;
    }
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
      return { success: false, error: data.message ?? "Twilio API error" };
    }

    return { success: true, sid: data.sid };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Network error",
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
    select: { id: true, name: true, phone: true },
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

    const result = await sendViaTwilio(contact.phone, personalizedMessage, "sms");

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
      include: { contact: true }
    });

    if (!deal || !deal.contact.phone) {
      return { success: false, error: "No contact phone number found" };
    }

    const message = `Hi ${deal.contact.name}, this is a confirmation for your job scheduled for ${deal.scheduledAt ? new Date(deal.scheduledAt).toLocaleString() : "today"} at ${deal.address || "your location"}. Please reply "CONFIRM" to confirm or call us if you need to reschedule. Thanks!`;

    const result = await sendSMS(deal.contactId, message, dealId);

    if (result.success) {
      // Store confirmation status in deal metadata
      await db.deal.update({
        where: { id: dealId },
        data: {
          metadata: JSON.parse(JSON.stringify({
            ...(deal.metadata as Record<string, any> || {}),
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
 * Resend/nudge confirmation SMS for a pending job.
 */
export async function resendConfirmationSMS(dealId: string): Promise<MessageResult> {
  try {
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: { contact: true }
    });

    if (!deal || !deal.contact.phone) {
      return { success: false, error: "No contact phone number found" };
    }

    const message = `Hi ${deal.contact.name}, just following up on your job scheduled for ${deal.scheduledAt ? new Date(deal.scheduledAt).toLocaleString() : "today"}. Please reply "CONFIRM" or call us to reschedule. Thanks!`;

    const result = await sendSMS(deal.contactId, message, dealId);

    if (result.success) {
      // Update last nudge time
      await db.deal.update({
        where: { id: dealId },
        data: {
          metadata: JSON.parse(JSON.stringify({
            ...(deal.metadata as Record<string, any> || {}),
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
 * Send a review request SMS to a customer after a job is completed.
 * Includes a placeholder link for Google Reviews.
 */
export async function sendReviewRequestSMS(dealId: string): Promise<MessageResult> {
  try {
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      include: { contact: true, workspace: true }
    });

    if (!deal || !deal.contact.phone) {
      return { success: false, error: "No contact phone number found" };
    }

    const businessName = deal.workspace.name || "us";
    const message = `Hi ${deal.contact.name}, thanks for letting ${businessName} help you with your job "${deal.title}". We hope you're happy with the results! If you have a moment, we'd love if you could leave us a quick review here: https://g.page/r/your-google-review-link. Thanks!`;

    const result = await sendSMS(deal.contactId, message, dealId);

    if (result.success) {
      await db.activity.create({
        data: {
          type: "NOTE",
          title: "Review Request Sent",
          content: `Sent review request SMS to ${deal.contact.name}`,
          dealId,
          contactId: deal.contactId
        }
      });
    }

    return result;
  } catch (error) {
    console.error("Error sending review request SMS:", error);
    return { success: false, error: "Failed to send review request SMS" };
  }
}

