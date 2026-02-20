"use server";

import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import type { TriggerEvent } from "@prisma/client";

// ─── Default Templates ──────────────────────────────────────────────

const DEFAULT_TEMPLATES: Record<TriggerEvent, string> = {
  JOB_COMPLETE:
    "Hi [Name], thanks for today! A review helps us heaps: [Link]",
  ON_MY_WAY: "Hi [Name], I'm 20 mins away.",
  LATE: "Hi [Name], stuck in traffic. 15 mins late.",
};

// ─── Get all templates for current user ─────────────────────────────

export async function getUserSmsTemplates() {
  const userId = await getAuthUserId();

  const templates = await db.smsTemplate.findMany({
    where: { userId },
  });

  // Fill in defaults for any missing triggers
  const events: TriggerEvent[] = ["JOB_COMPLETE", "ON_MY_WAY", "LATE"];
  return events.map((event) => {
    const existing = templates.find((t) => t.triggerEvent === event);
    return {
      triggerEvent: event,
      content: existing?.content ?? DEFAULT_TEMPLATES[event],
      isActive: existing?.isActive ?? true,
      id: existing?.id ?? null,
    };
  });
}

// ─── Upsert a template ──────────────────────────────────────────────

export async function upsertSmsTemplate(
  triggerEvent: TriggerEvent,
  content: string,
  isActive: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const userId = await getAuthUserId();

    await db.smsTemplate.upsert({
      where: { userId_triggerEvent: { userId, triggerEvent } },
      create: { userId, triggerEvent, content, isActive },
      update: { content, isActive },
    });

    revalidatePath("/dashboard/settings/sms-templates");
    return { success: true };
  } catch (error) {
    console.error("Failed to upsert SMS template:", error);
    return { success: false, error: "Failed to save template" };
  }
}

// ─── Get template + contact info for a deal ─────────────────────────

export async function getMessagePreview(
  dealId: string,
  triggerEvent: TriggerEvent
) {
  const userId = await getAuthUserId();

  const [deal, template] = await Promise.all([
    db.deal.findUnique({
      where: { id: dealId },
      include: { contact: true },
    }),
    db.smsTemplate.findFirst({
      where: { userId, triggerEvent },
    }),
  ]);

  if (!deal) return null;

  const contact = deal.contact;
  const rawContent = template?.content ?? DEFAULT_TEMPLATES[triggerEvent];
  const messageBody = rawContent.replace(/\[Name\]/g, contact.name);

  // Determine channel based on what the contact has
  const channel: "sms" | "email" =
    contact.phone ? "sms" : contact.email ? "email" : "sms";

  return {
    contactName: contact.name,
    contactPhone: contact.phone || null,
    contactEmail: contact.email || null,
    channel,
    messageBody,
    isActive: template?.isActive ?? true,
  };
}

// ─── Send the message (stub — wire to Twilio/SendGrid in prod) ──────

export async function sendTemplateMessage(
  dealId: string,
  triggerEvent: TriggerEvent,
  channel: "sms" | "email"
): Promise<{ success: boolean; error?: string }> {
  try {
    const preview = await getMessagePreview(dealId, triggerEvent);
    if (!preview) return { success: false, error: "Job not found" };

    if (channel === "sms" && !preview.contactPhone) {
      return { success: false, error: "No phone number on file" };
    }
    if (channel === "email" && !preview.contactEmail) {
      return { success: false, error: "No email on file" };
    }

    // TODO: Wire to Twilio for SMS / SendGrid for Email
    console.log(
      `[MESSAGE] Sending ${channel.toUpperCase()} to ${
        channel === "sms" ? preview.contactPhone : preview.contactEmail
      }: ${preview.messageBody}`
    );

    // Log as activity
    const userId = await getAuthUserId();
    const user = await db.user.findUnique({ where: { id: userId } });

    await db.activity.create({
      data: {
        type: channel === "sms" ? "CALL" : "EMAIL",
        title: `Sent ${triggerEvent.replace(/_/g, " ").toLowerCase()} ${channel.toUpperCase()}`,
        description: preview.messageBody,
        dealId,
        contactId: (await db.deal.findUnique({ where: { id: dealId } }))?.contactId,
        userId: user?.id,
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to send message:", error);
    return { success: false, error: "Failed to send message" };
  }
}
