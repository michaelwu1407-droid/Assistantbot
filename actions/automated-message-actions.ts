"use server";

import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { revalidatePath } from "next/cache";

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

  revalidatePath("/dashboard/settings/notifications");
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

  revalidatePath("/dashboard/settings/notifications");
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
  revalidatePath("/dashboard/settings/notifications");
  return { success: true };
}

/**
 * Process booking reminders for all workspaces.
 * Called by the cron API endpoint. Sends SMS/email 24h before scheduled jobs.
 */
export async function processBookingReminders(): Promise<{
  sent: number;
  errors: number;
}> {
  let sent = 0;
  let errors = 0;

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
      select: { name: true, twilioPhoneNumber: true, twilioSubaccountId: true },
    });

    for (const job of upcomingJobs) {
      if (!job.contact?.phone) continue;

      // Build message from template
      const scheduledTime = job.scheduledAt
        ? new Date(job.scheduledAt).toLocaleString("en-AU", {
            weekday: "short",
            day: "numeric",
            month: "short",
            hour: "numeric",
            minute: "2-digit",
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
          const { getSubaccountClient } = await import("@/lib/twilio");
          const client = getSubaccountClient(
            workspace.twilioSubaccountId,
            process.env.TWILIO_SUBACCOUNT_AUTH_TOKEN ||
              process.env.TWILIO_AUTH_TOKEN ||
              ""
          );
          await client.messages.create({
            to: job.contact.phone,
            from: workspace.twilioPhoneNumber,
            body: message,
          });
          sent++;
        } catch (err) {
          console.error(
            `[BookingReminder] SMS failed for job ${job.id}:`,
            err
          );
          errors++;
        }
      }

      // Log the reminder as an activity
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

  return { sent, errors };
}
