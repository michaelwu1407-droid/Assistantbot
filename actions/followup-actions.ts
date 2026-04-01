"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { sendSMS } from "./messaging-actions";
import { createNotification } from "./notification-actions";

// ─── Types ──────────────────────────────────────────────────────────

export interface FollowUpResult {
  success: boolean;
  error?: string;
}

export interface PendingFollowUp {
  dealId: string;
  dealTitle: string;
  contactName: string;
  contactPhone: string | null;
  contactEmail: string | null;
  contactId: string;
  followUpAt: Date;
  followUpNote: string | null;
  followUpChannel: string | null;
  stage: string;
  value: number | null;
}

// ─── Schedule a follow-up ───────────────────────────────────────────

export async function scheduleFollowUp(
  dealId: string,
  followUpAt: Date,
  note?: string,
  channel?: string
): Promise<FollowUpResult> {
  try {
    await db.deal.update({
      where: { id: dealId },
      data: {
        followUpAt,
        followUpNote: note || null,
        followUpChannel: channel || null,
        followUpCompletedAt: null, // Reset if rescheduling
      },
    });

    // Log activity
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: { contactId: true, contact: { select: { name: true } } },
    });
    if (deal) {
      await db.activity.create({
        data: {
          type: "NOTE",
          title: "Follow-up scheduled",
          content: `Follow-up scheduled for ${followUpAt.toLocaleDateString()}${note ? `: ${note}` : ""}${channel ? ` (via ${channel})` : ""}`,
          dealId,
          contactId: deal.contactId,
        },
      });
    }

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[followup-actions] scheduleFollowUp failed:", error);
    return { success: false, error: "Failed to schedule follow-up" };
  }
}

// ─── Mark follow-up as completed ────────────────────────────────────

export async function completeFollowUp(
  dealId: string,
  outcome?: string
): Promise<FollowUpResult> {
  try {
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: { contactId: true, contact: { select: { name: true } }, followUpNote: true },
    });
    if (!deal) return { success: false, error: "Deal not found" };

    await db.deal.update({
      where: { id: dealId },
      data: {
        followUpCompletedAt: new Date(),
        lastActivityAt: new Date(),
      },
    });

    await db.activity.create({
      data: {
        type: "NOTE",
        title: "Follow-up completed",
        content: outcome
          ? `Follow-up completed: ${outcome}`
          : `Follow-up with ${deal.contact.name} completed`,
        dealId,
        contactId: deal.contactId,
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[followup-actions] completeFollowUp failed:", error);
    return { success: false, error: "Failed to complete follow-up" };
  }
}

// ─── Cancel a scheduled follow-up ───────────────────────────────────

export async function cancelFollowUp(dealId: string): Promise<FollowUpResult> {
  try {
    await db.deal.update({
      where: { id: dealId },
      data: {
        followUpAt: null,
        followUpNote: null,
        followUpChannel: null,
        followUpCompletedAt: null,
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[followup-actions] cancelFollowUp failed:", error);
    return { success: false, error: "Failed to cancel follow-up" };
  }
}

// ─── Send a follow-up message (SMS or email) and log it ─────────────

export async function sendFollowUpMessage(
  dealId: string,
  message: string,
  channel: "sms" | "email"
): Promise<FollowUpResult> {
  try {
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        title: true,
        contactId: true,
        workspaceId: true,
        contact: { select: { id: true, name: true, phone: true, email: true } },
      },
    });
    if (!deal) return { success: false, error: "Deal not found" };

    if (channel === "sms") {
      if (!deal.contact.phone) {
        return { success: false, error: `${deal.contact.name} has no phone number on file` };
      }
      const result = await sendSMS(deal.contactId, message, dealId);
      if (!result.success) {
        return { success: false, error: result.error || "SMS send failed" };
      }
    } else if (channel === "email") {
      if (!deal.contact.email) {
        return { success: false, error: `${deal.contact.name} has no email on file` };
      }

      // Send via Resend
      const resendKey = process.env.RESEND_API_KEY;
      if (!resendKey) {
        return { success: false, error: "Email not configured (RESEND_API_KEY missing)" };
      }

      const workspace = await db.workspace.findUnique({
        where: { id: deal.workspaceId },
        select: { name: true },
      });

      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      const { error } = await resend.emails.send({
        from: `${workspace?.name || "Earlymark"} <noreply@earlymark.ai>`,
        to: [deal.contact.email],
        subject: `Following up on ${deal.title}`,
        text: message,
      });

      if (error) {
        return { success: false, error: `Email failed: ${error.message}` };
      }

      // Log email activity
      await db.activity.create({
        data: {
          type: "EMAIL",
          title: `Follow-up email to ${deal.contact.name}`,
          content: message.substring(0, 500),
          dealId,
          contactId: deal.contactId,
        },
      });
    }

    // Mark deal as having recent activity
    await db.deal.update({
      where: { id: dealId },
      data: {
        lastActivityAt: new Date(),
        followUpCompletedAt: new Date(),
      },
    });

    revalidatePath("/dashboard");
    return { success: true };
  } catch (error) {
    console.error("[followup-actions] sendFollowUpMessage failed:", error);
    return { success: false, error: "Failed to send follow-up" };
  }
}

// ─── Get pending follow-ups for a workspace ─────────────────────────

export async function getPendingFollowUps(
  workspaceId: string
): Promise<PendingFollowUp[]> {
  const deals = await db.deal.findMany({
    where: {
      workspaceId,
      followUpAt: { not: null },
      followUpCompletedAt: null,
      stage: { notIn: ["WON", "LOST", "DELETED", "ARCHIVED"] },
    },
    select: {
      id: true,
      title: true,
      stage: true,
      value: true,
      followUpAt: true,
      followUpNote: true,
      followUpChannel: true,
      contact: { select: { id: true, name: true, phone: true, email: true } },
    },
    orderBy: { followUpAt: "asc" },
  });

  return deals.map((d) => ({
    dealId: d.id,
    dealTitle: d.title,
    contactName: d.contact.name,
    contactPhone: d.contact.phone,
    contactEmail: d.contact.email,
    contactId: d.contact.id,
    followUpAt: d.followUpAt!,
    followUpNote: d.followUpNote,
    followUpChannel: d.followUpChannel,
    stage: d.stage,
    value: d.value ? Number(d.value) : null,
  }));
}

// ─── Cron: process due follow-up reminders ──────────────────────────
// Called by /api/cron/followup-reminders
// Notifies workspace users when a follow-up is due (today or overdue)

export async function processFollowUpReminders(): Promise<{
  notified: number;
  errors: string[];
}> {
  const now = new Date();
  // End of today
  const endOfToday = new Date(now);
  endOfToday.setHours(23, 59, 59, 999);

  let notified = 0;
  const errors: string[] = [];

  try {
    // Find all deals with follow-ups due today or overdue
    const dueDeals = await db.deal.findMany({
      where: {
        followUpAt: { lte: endOfToday },
        followUpCompletedAt: null,
        stage: { notIn: ["WON", "LOST", "DELETED", "ARCHIVED"] },
      },
      select: {
        id: true,
        title: true,
        followUpAt: true,
        followUpNote: true,
        followUpChannel: true,
        workspaceId: true,
        contact: { select: { name: true, phone: true, email: true } },
      },
    });

    // Group by workspace
    const byWorkspace = new Map<string, typeof dueDeals>();
    for (const deal of dueDeals) {
      const existing = byWorkspace.get(deal.workspaceId) || [];
      existing.push(deal);
      byWorkspace.set(deal.workspaceId, existing);
    }

    // Notify all users in each workspace
    for (const [workspaceId, deals] of byWorkspace) {
      const users = await db.user.findMany({
        where: { workspaceId },
        select: { id: true },
      });

      for (const deal of deals) {
        const isOverdue = deal.followUpAt! < now;
        const urgency = isOverdue ? "OVERDUE" : "due today";

        for (const user of users) {
          try {
            await createNotification({
              userId: user.id,
              title: `Follow-up ${urgency}: ${deal.contact.name}`,
              message: deal.followUpNote
                ? `${deal.title} — ${deal.followUpNote}`
                : `Follow up on ${deal.title}`,
              type: isOverdue ? "WARNING" : "INFO",
              link: `/dashboard?deal=${deal.id}`,
              actionType: "CALL_CLIENT",
              actionPayload: { dealId: deal.id },
            });
            notified++;
          } catch (err) {
            errors.push(`Failed to notify user ${user.id} about deal ${deal.id}: ${err}`);
          }
        }
      }
    }
  } catch (err) {
    errors.push(`processFollowUpReminders error: ${err}`);
  }

  return { notified, errors };
}

// ─── Request payment for a completed deal (SMS to contact) ──────────

export async function requestPaymentForDeal(dealId: string): Promise<FollowUpResult> {
  try {
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: {
        id: true,
        title: true,
        value: true,
        invoicedAmount: true,
        contactId: true,
        workspaceId: true,
        contact: { select: { name: true, phone: true, email: true } },
        workspace: { select: { name: true } },
      },
    });
    if (!deal) return { success: false, error: "Deal not found" };

    const amount = deal.invoicedAmount ?? deal.value;
    const formattedAmount = amount ? `$${Number(amount).toLocaleString()}` : "the invoice";

    const message = `Hi ${deal.contact.name}, ${formattedAmount} is now due for ${deal.title}. Please get in touch to arrange payment. Thanks, ${deal.workspace.name || "us"}.`;

    if (!deal.contact.phone) {
      // Fall back to email if available
      if (deal.contact.email) {
        const resendKey = process.env.RESEND_API_KEY;
        if (!resendKey) return { success: false, error: "No phone or email configured" };
        const { Resend } = await import("resend");
        const resend = new Resend(resendKey);
        await resend.emails.send({
          from: `${deal.workspace.name || "Earlymark"} <noreply@earlymark.ai>`,
          to: [deal.contact.email],
          subject: `Payment due: ${deal.title}`,
          text: message,
        });
        await db.activity.create({
          data: {
            type: "EMAIL",
            title: `Payment request emailed to ${deal.contact.name}`,
            content: message,
            dealId,
            contactId: deal.contactId,
          },
        });
        return { success: true };
      }
      return { success: false, error: `${deal.contact.name} has no phone or email on file` };
    }

    const result = await sendSMS(deal.contactId, message, dealId);
    return { success: result.success, error: result.error };
  } catch (error) {
    console.error("[followup-actions] requestPaymentForDeal failed:", error);
    return { success: false, error: "Failed to send payment request" };
  }
}

// ─── Cron: process post-job follow-ups ──────────────────────────────
// Sends "thank you" SMS 24h after a job is completed (WON stage)

export async function processPostJobFollowUps(): Promise<{
  sent: number;
  skipped: number;
  errors: string[];
}> {
  let sent = 0;
  let skipped = 0;
  const errors: string[] = [];

  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twentySixHoursAgo = new Date(Date.now() - 26 * 60 * 60 * 1000);

    // Find deals completed ~24h ago that haven't received a post-job follow-up
    const completedDeals = await db.deal.findMany({
      where: {
        stage: "WON",
        stageChangedAt: {
          gte: twentySixHoursAgo,
          lte: twentyFourHoursAgo,
        },
      },
      select: {
        id: true,
        title: true,
        contactId: true,
        workspaceId: true,
        contact: { select: { name: true, phone: true } },
        workspace: { select: { name: true } },
      },
    });

    for (const deal of completedDeals) {
      // Check if workspace has the "follow_up_after_job" rule enabled
      const rule = await db.automatedMessageRule.findFirst({
        where: {
          workspaceId: deal.workspaceId,
          triggerType: "follow_up_after_job",
          enabled: true,
        },
      });

      if (!rule) {
        skipped++;
        continue;
      }

      if (!deal.contact.phone) {
        skipped++;
        continue;
      }

      // Check if we already sent a post-job follow-up for this deal
      const alreadySent = await db.activity.findFirst({
        where: {
          dealId: deal.id,
          title: { contains: "Post-job follow-up" },
        },
      });

      if (alreadySent) {
        skipped++;
        continue;
      }

      // Personalize the template
      const message = rule.messageTemplate
        .replace(/\{\{clientName\}\}/g, deal.contact.name)
        .replace(/\{\{jobTitle\}\}/g, deal.title)
        .replace(/\{\{businessName\}\}/g, deal.workspace.name || "us");

      try {
        const result = await sendSMS(deal.contactId, message, deal.id);
        if (result.success) {
          // Log the post-job follow-up activity
          await db.activity.create({
            data: {
              type: "NOTE",
              title: "Post-job follow-up sent",
              content: `Automated follow-up SMS to ${deal.contact.name}: "${message.substring(0, 100)}..."`,
              dealId: deal.id,
              contactId: deal.contactId,
            },
          });
          sent++;
        } else {
          errors.push(`SMS to ${deal.contact.name} failed: ${result.error}`);
        }
      } catch (err) {
        errors.push(`Post-job follow-up for deal ${deal.id} failed: ${err}`);
      }
    }
  } catch (err) {
    errors.push(`processPostJobFollowUps error: ${err}`);
  }

  return { sent, skipped, errors };
}
