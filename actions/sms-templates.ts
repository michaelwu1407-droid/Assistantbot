"use server";

/* eslint-disable @typescript-eslint/no-explicit-any */

import { db } from "@/lib/db";
import { buildPublicFeedbackUrl } from "@/lib/public-feedback";
import { revalidatePath } from "next/cache";
import type { TriggerEvent } from "@prisma/client";
import { sendNotification } from "@/lib/messaging/send-notification";
import { getNotificationChannel, NotificationScenario } from "@/lib/messaging/channel-router";
import { requireCurrentWorkspaceAccess } from "@/lib/workspace-access";

// ─── Default Templates ──────────────────────────────────────────────

const DEFAULT_TEMPLATES: Record<TriggerEvent, string> = {
  JOB_COMPLETE:
    "Hi [Name], thanks for today. [ReviewRequest]\nTracey, [Company]",
  ON_MY_WAY: "Hi [Name], I'm Tracey, AI assistant for [Company]. Your tradie is about 20 minutes away.",
  LATE: "Hi [Name], I'm Tracey, AI assistant for [Company]. Quick heads up: we're running about 15 minutes late.",
  BOOKING_REMINDER_24H: "Hi [Name], this is Tracey, AI assistant for [Company]. Reminder: your appointment is tomorrow. Reply YES to confirm.",
};

function ensureTraceyStyle(content: string, companyName: string): string {
  const message = content.trim();
  if (!message) return message;
  if (/tracey/i.test(message) && message.includes(companyName)) return message;
  return `${message}\nTracey, ${companyName}`;
}

function buildReviewRequestText(feedbackUrl: string) {
  return `Feedback: ${feedbackUrl}`
}

function replaceReviewPlaceholders(content: string, feedbackUrl: string) {
  let next = content.replace(/\[ReviewRequest\]/g, buildReviewRequestText(feedbackUrl));

  if (feedbackUrl) {
    next = next.replace(/\[Link\]/g, feedbackUrl);
  } else {
    next = next
      .replace(/\s*:?\s*\[Link\]/g, "")
      .replace(/\[Link\]/g, "");
  }

  return next.replace(/\s{2,}/g, " ").trim();
}

// ─── Get all templates for current user ─────────────────────────────

export async function getUserSmsTemplates() {
  const actor = await requireCurrentWorkspaceAccess().catch(() => null);
  if (!actor) return [];
  const user = await db.user.findUnique({
    where: { id: actor.id },
    include: { workspace: { select: { name: true } } }
  });
  const companyName = (user as any)?.workspace?.name || "your business";

  const templates = await db.smsTemplate.findMany({
    where: { userId: actor.id },
  });

  // Fill in defaults for any missing triggers
  const events: TriggerEvent[] = ["JOB_COMPLETE", "ON_MY_WAY", "LATE", "BOOKING_REMINDER_24H"];
  return events.map((event) => {
    const existing = templates.find((t) => t.triggerEvent === event);
    return {
      triggerEvent: event,
      content: (existing?.content ?? DEFAULT_TEMPLATES[event]).replace(/\[Company\]/g, companyName),
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
    const actor = await requireCurrentWorkspaceAccess();
    const user = await db.user.findUnique({
      where: { id: actor.id },
      include: { workspace: { select: { name: true } } }
    });
    const companyName = (user as any)?.workspace?.name || "your business";
    const styledContent = ensureTraceyStyle(content.replace(/\[Company\]/g, companyName), companyName);

    await db.smsTemplate.upsert({
      where: { userId_triggerEvent: { userId: actor.id, triggerEvent } },
      create: { userId: actor.id, triggerEvent, content: styledContent, isActive },
      update: { content: styledContent, isActive },
    });

    revalidatePath("/crm/settings/sms-templates");
    return { success: true };
  } catch (error) {
    console.error("Failed to upsert SMS template:", error);
    return { success: false, error: "Failed to save template" };
  }
}

// ─── Map trigger events to notification scenarios ───────────────────

const TRIGGER_TO_SCENARIO: Record<TriggerEvent, NotificationScenario> = {
  JOB_COMPLETE: NotificationScenario.JOB_COMPLETE_FEEDBACK,
  ON_MY_WAY: NotificationScenario.ON_MY_WAY,
  LATE: NotificationScenario.RUNNING_LATE,
  BOOKING_REMINDER_24H: NotificationScenario.REMINDER_24H,
}

// ─── Get template + contact info for a deal ─────────────────────────

export async function getMessagePreview(
  dealId: string,
  triggerEvent: TriggerEvent
) {
  const actor = await requireCurrentWorkspaceAccess().catch(() => null);
  if (!actor) return null;

  const [deal, template] = await Promise.all([
    db.deal.findFirst({
      where: { id: dealId, workspaceId: actor.workspaceId },
      include: {
        contact: true,
        workspace: { select: { settings: true, twilioPhoneNumber: true, twilioSubaccountId: true } },
      },
    }),
    db.smsTemplate.findFirst({
      where: { userId: actor.id, triggerEvent },
    }),
  ]);

  if (!deal) return null;

  const contact = deal.contact;
  const feedbackUrl = buildPublicFeedbackUrl({
    dealId: deal.id,
    contactId: deal.contactId,
    workspaceId: deal.workspaceId,
  });
  const rawContent = template?.content ?? DEFAULT_TEMPLATES[triggerEvent];
  const messageBodyWithName = rawContent.replace(/\[Name\]/g, contact.name);
  const messageBody = replaceReviewPlaceholders(messageBodyWithName, feedbackUrl);

  // Determine channel using the same routing logic as actual sends
  const routedChannel = getNotificationChannel(contact, TRIGGER_TO_SCENARIO[triggerEvent]);
  const channel: "sms" | "email" = routedChannel === "portal-only" ? "sms" : routedChannel;
  const unavailableReason =
    channel === "sms" && !contact.phone
      ? "Add a customer phone number before sending this SMS."
      : channel === "sms" && (!deal.workspace.twilioPhoneNumber || !deal.workspace.twilioSubaccountId)
        ? "Your Tracey SMS number is not provisioned yet. Finish phone setup in Settings before sending customer SMS."
        : channel === "email" && !contact.email
          ? "Add a customer email before sending this email."
          : null;

  return {
    contactName: contact.name,
    contactPhone: contact.phone || null,
    contactEmail: contact.email || null,
    channel,
    messageBody,
    isActive: template?.isActive ?? true,
    canSend: !unavailableReason,
    unavailableReason,
  };
}

// ─── Send the message ────────────────────────────────────────────────

export async function sendTemplateMessage(
  dealId: string,
  triggerEvent: TriggerEvent,
): Promise<{ success: boolean; error?: string; channel?: string }> {
  try {
    const actor = await requireCurrentWorkspaceAccess();

    const deal = await db.deal.findFirst({
      where: { id: dealId, workspaceId: actor.workspaceId },
      include: {
        contact: { select: { id: true, name: true, phone: true, email: true } },
        workspace: {
          select: {
            id: true,
            name: true,
            twilioPhoneNumber: true,
            twilioSubaccountId: true,
            twilioSubaccountAuthToken: true,
          },
        },
      },
    });
    if (!deal) return { success: false, error: "Job not found" };

    // Find user's template or fall back to default
    const template = await db.smsTemplate.findFirst({
      where: { userId: actor.id, triggerEvent },
    });

    const feedbackUrl = buildPublicFeedbackUrl({
      dealId: deal.id,
      contactId: deal.contactId,
      workspaceId: deal.workspaceId,
    });

    const rawContent = template?.content ?? DEFAULT_TEMPLATES[triggerEvent];
    const messageWithName = rawContent.replace(/\[Name\]/g, deal.contact.name);
    const messageBody = replaceReviewPlaceholders(messageWithName, feedbackUrl);

    const scenario = TRIGGER_TO_SCENARIO[triggerEvent];
    const result = await sendNotification({
      contact: deal.contact,
      workspace: deal.workspace,
      deal: { id: dealId, contactId: deal.contactId, workspaceId: deal.workspaceId },
      scenario,
      smsBody: messageBody,
      emailSubject: `Update from ${deal.workspace.name}`,
      emailBody: messageBody,
    });

    if (!result.sent && result.channel !== "portal-only") {
      return { success: false, error: result.error || "Failed to send message" };
    }

    return { success: true, channel: result.channel };
  } catch (error) {
    console.error("Failed to send message:", error);
    return { success: false, error: "Failed to send message" };
  }
}
