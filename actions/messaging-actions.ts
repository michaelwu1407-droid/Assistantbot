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

// ─── Validation ─────────────────────────────────────────────────────

const SendMessageSchema = z.object({
  contactId: z.string(),
  message: z.string().min(1),
  channel: z.enum(["sms", "whatsapp"]).default("sms"),
});

// ─── Twilio Client ──────────────────────────────────────────────────

/**
 * Send an SMS via Twilio.
 *
 * Requires environment variables:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER (for SMS)
 * - TWILIO_WHATSAPP_NUMBER (for WhatsApp, format: whatsapp:+14155238886)
 */
async function sendViaTwilio(
  to: string,
  body: string,
  channel: "sms" | "whatsapp"
): Promise<{ success: boolean; sid?: string; error?: string }> {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber =
    channel === "whatsapp"
      ? process.env.TWILIO_WHATSAPP_NUMBER
      : process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return {
      success: false,
      error: `Twilio not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and ${
        channel === "whatsapp" ? "TWILIO_WHATSAPP_NUMBER" : "TWILIO_PHONE_NUMBER"
      } in .env`,
    };
  }

  const toFormatted = channel === "whatsapp" ? `whatsapp:${to}` : to;
  const fromFormatted = channel === "whatsapp" ? fromNumber : fromNumber;

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
          From: fromFormatted,
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
 * Send an SMS to a contact.
 * Auto-logs the message as an EMAIL-type activity.
 */
export async function sendSMS(
  contactId: string,
  message: string
): Promise<MessageResult> {
  const parsed = SendMessageSchema.safeParse({
    contactId,
    message,
    channel: "sms",
  });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const contact = await db.contact.findUnique({ where: { id: contactId } });
  if (!contact) return { success: false, error: "Contact not found" };
  if (!contact.phone) return { success: false, error: "Contact has no phone number" };

  const result = await sendViaTwilio(contact.phone, message, "sms");

  if (result.success) {
    // Log as activity
    await db.activity.create({
      data: {
        type: "NOTE",
        title: "SMS sent",
        content: `SMS to ${contact.name}: "${message.substring(0, 100)}${message.length > 100 ? "..." : ""}"`,
        contactId,
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

  for (const contactId of contactIds) {
    const contact = await db.contact.findUnique({ where: { id: contactId } });
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
