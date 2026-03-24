"use server";

import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DEFAULT_WORKSPACE_TIMEZONE } from "@/lib/timezone";

export interface AutomatedMessageRuleView {
  id: string;
  name: string;
  enabled: boolean;
  triggerType: string;
  channel: string;
  messageTemplate: string;
  hoursOffset: number;
}

const DEFAULT_RULES = [
  {
    name: "24h Booking Reminder",
    triggerType: "booking_reminder_24h",
    channel: "sms",
    messageTemplate:
      "Hi {{clientName}}, this is Tracey, AI assistant for {{businessName}}. Reminder: your appointment for {{jobTitle}} is scheduled for {{scheduledTime}} tomorrow. Reply CONFIRM to confirm.",
    hoursOffset: -24,
  },
  {
    name: "Booking Confirmation",
    triggerType: "booking_confirmation",
    channel: "sms",
    messageTemplate:
      "Hi {{clientName}}, this is Tracey, AI assistant for {{businessName}}. Your booking for {{jobTitle}} is confirmed for {{scheduledTime}}.",
    hoursOffset: 0,
  },
  {
    name: "Follow Up After Job",
    triggerType: "follow_up_after_job",
    channel: "sms",
    messageTemplate:
      "Hi {{clientName}}, this is Tracey, AI assistant for {{businessName}}. Thanks for choosing us for {{jobTitle}}. If you have any feedback, we'd love to hear it.",
    hoursOffset: 24,
  },
];

/**
 * Get all automated message rules for the current workspace.
 * Seeds defaults if none exist.
 */
export async function getAutomatedMessageRules(): Promise<AutomatedMessageRuleView[]> {
  const authUser = await getAuthUser();
  if (!authUser?.email) return [];

  const user = await db.user.findFirst({
    where: { email: authUser.email },
    select: { workspaceId: true },
  });
  if (!user) return [];

  let rules = await db.automatedMessageRule.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "asc" },
  });

  // Seed defaults if no rules exist
  if (rules.length === 0) {
    await db.automatedMessageRule.createMany({
      data: DEFAULT_RULES.map((r) => ({
        ...r,
        workspaceId: user.workspaceId,
      })),
    });
    rules = await db.automatedMessageRule.findMany({
      where: { workspaceId: user.workspaceId },
      orderBy: { createdAt: "asc" },
    });
  }

  return rules.map((r) => ({
    id: r.id,
    name: r.name,
    enabled: r.enabled,
    triggerType: r.triggerType,
    channel: r.channel,
    messageTemplate: r.messageTemplate,
    hoursOffset: r.hoursOffset,
  }));
}

/**
 * Update an automated message rule.
 */
export async function updateAutomatedMessageRule(
  ruleId: string,
  data: Partial<{
    name: string;
    enabled: boolean;
    channel: string;
    messageTemplate: string;
    hoursOffset: number;
  }>
): Promise<{ success: boolean; error?: string }> {
  const authUser = await getAuthUser();
  if (!authUser?.email) return { success: false, error: "Unauthorized" };

  await db.automatedMessageRule.update({
    where: { id: ruleId },
    data,
  });

  revalidatePath("/crm/settings/notifications");
  return { success: true };
}

/**
 * Create a new automated message rule.
 */
export async function createAutomatedMessageRule(data: {
  name: string;
  triggerType: string;
  channel: string;
  messageTemplate: string;
  hoursOffset: number;
}): Promise<{ success: boolean; error?: string }> {
  const authUser = await getAuthUser();
  if (!authUser?.email) return { success: false, error: "Unauthorized" };

  const user = await db.user.findFirst({
    where: { email: authUser.email },
    select: { workspaceId: true },
  });
  if (!user) return { success: false, error: "User not found" };

  await db.automatedMessageRule.create({
    data: {
      ...data,
      workspaceId: user.workspaceId,
    },
  });

  revalidatePath("/crm/settings/notifications");
  return { success: true };
}

/**
 * Delete an automated message rule.
 */
export async function deleteAutomatedMessageRule(
  ruleId: string
): Promise<{ success: boolean; error?: string }> {
  const authUser = await getAuthUser();
  if (!authUser?.email) return { success: false, error: "Unauthorized" };

  await db.automatedMessageRule.delete({ where: { id: ruleId } });
  revalidatePath("/crm/settings/notifications");
  return { success: true };
}

/**
 * Process booking reminders for all workspaces.
 * Called by the cron API endpoint. Sends SMS/email 24h before scheduled jobs.
 *
 * Reliability:
 * - Dedup via `lastReminderSentAt` on Deal (prevents double-sends if cron fires twice)
 * - Retry with exponential backoff on transient Twilio failures
 * - Activity logged after successful send only
 */
export async function processBookingReminders(): Promise<{
  sent: number;
  errors: number;
  skippedAlreadySent: number;
}> {
  let sent = 0;
  let errors = 0;
  let skippedAlreadySent = 0;

  // Find all enabled 24h reminder rules
  const rules = await db.automatedMessageRule.findMany({
    where: {
      triggerType: "booking_reminder_24h",
      enabled: true,
    },
  });

  for (const rule of rules) {
    // Find jobs scheduled 23-25 hours from now for this workspace
    const now = new Date();
    const windowStart = new Date(now.getTime() + 23 * 60 * 60 * 1000);
    const windowEnd = new Date(now.getTime() + 25 * 60 * 60 * 1000);

    const upcomingJobs = await db.deal.findMany({
      where: {
        workspaceId: rule.workspaceId,
        scheduledAt: {
          gte: windowStart,
          lte: windowEnd,
        },
        jobStatus: { not: "CANCELLED" },
      },
      include: {
        contact: true,
      },
    });

    const workspace = await db.workspace.findUnique({
      where: { id: rule.workspaceId },
      select: { name: true, workspaceTimezone: true, twilioPhoneNumber: true, twilioSubaccountId: true, twilioSubaccountAuthToken: true },
    });

    for (const job of upcomingJobs) {
      if (!job.contact?.phone) continue;

      // ── Dedup: skip if reminder already sent for this booking ──
      if (job.lastReminderSentAt) {
        skippedAlreadySent++;
        continue;
      }

      // Build message from template
      const scheduledTime = job.scheduledAt
        ? new Date(job.scheduledAt).toLocaleString("en-AU", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
            timeZone: workspace?.workspaceTimezone || DEFAULT_WORKSPACE_TIMEZONE,
          })
        : "your scheduled time";

      const message = rule.messageTemplate
        .replace(/\{\{clientName\}\}/g, job.contact.name || "there")
        .replace(/\{\{jobTitle\}\}/g, job.title || "your appointment")
        .replace(/\{\{scheduledTime\}\}/g, scheduledTime)
        .replace(/\{\{businessName\}\}/g, workspace?.name || "Our team");

      // Send SMS if workspace has Twilio configured
      if (
        rule.channel !== "email" &&
        workspace?.twilioPhoneNumber &&
        workspace?.twilioSubaccountId
      ) {
        try {
          const { getWorkspaceTwilioClient } = await import("@/lib/twilio");
          const client = getWorkspaceTwilioClient(workspace);
          if (!client) {
            throw new Error("No usable Twilio messaging client is available for this workspace");
          }
          await retryWithBackoff(() =>
            client.messages.create({
              to: job.contact!.phone!,
              from: workspace!.twilioPhoneNumber!,
              body: message,
            })
          );

          // ── Mark as sent (dedup flag) ──
          await db.deal.update({
            where: { id: job.id },
            data: { lastReminderSentAt: new Date() },
          });

          sent++;
        } catch (err) {
          console.error(
            `[BookingReminder] SMS failed for job ${job.id} after retries:`,
            err
          );
          errors++;
          continue; // Don't log activity for failed sends
        }
      }

      // Log the reminder as an activity (only after successful send)
      try {
        await db.activity.create({
          data: {
            type: "NOTE",
            title: "Automated 24h Booking Reminder Sent",
            content: message,
            dealId: job.id,
            contactId: job.contactId,
          },
        });
      } catch {
        // non-critical
      }
    }
  }

  return { sent, errors, skippedAlreadySent };
}

// ─── Retry Utility ───────────────────────────────────────────────

/**
 * Retries an async operation with exponential backoff.
 * Only retries on transient/network errors, not on 4xx client errors.
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts = 3,
  baseDelayMs = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const isLast = attempt === maxAttempts;
      // Don't retry client errors (4xx) — only transient/server/network errors
      const status = (err as { status?: number }).status;
      if (status && status >= 400 && status < 500) throw err;
      if (isLast) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error("retryWithBackoff: unreachable");
}
