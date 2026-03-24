"use server";

import { db } from "@/lib/db";
import { createNotification } from "./notification-actions";
import { createTask } from "./task-actions";
import { logActivity } from "./activity-actions";
import { initiateOutboundCall } from "@/lib/outbound-call";

/**
 * Execute an action from the Kanban automation modal.
 * Each action is designed for 99% reliability — simple DB writes + notifications.
 */
export async function executeKanbanAction(
  action: string,
  data: {
    dealId: string;
    message?: string;
    followUpDate?: string;
    targetStage?: string;
  },
) {
  const deal = await db.deal.findUnique({
    where: { id: data.dealId },
    include: {
      contact: { select: { id: true, name: true } },
      workspace: { select: { id: true, name: true, ownerId: true } },
    },
  });

  if (!deal || !deal.workspace) {
    return { success: false, error: "Deal not found" };
  }

  const workspaceId = deal.workspace.id;

  switch (action) {
    // ── Escalate ──────────────────────────────────────────────
    case "escalate": {
      const reason = data.message || "Deal flagged for owner attention";

      // 1. Flag the deal
      await db.deal.update({
        where: { id: data.dealId },
        data: {
          escalatedAt: new Date(),
          escalationReason: reason,
        },
      });

      // 2. Create an urgent task for the owner
      const dueAt = new Date();
      dueAt.setHours(dueAt.getHours() + 4); // 4-hour SLA
      await createTask({
        title: `ESCALATED: ${deal.title}`,
        description: reason,
        dueAt,
        dealId: data.dealId,
        contactId: deal.contact?.id,
      });

      // 3. Notify all workspace users (owner sees it first)
      const users = await db.user.findMany({ where: { workspaceId } });
      for (const user of users) {
        await createNotification({
          userId: user.id,
          title: "Deal Escalated",
          message: `${deal.title}: ${reason}`,
          type: "SYSTEM",
          link: `/crm?dealId=${data.dealId}`,
        });
      }

      // 4. Log activity
      await logActivity({
        type: "NOTE",
        title: "Deal escalated",
        content: reason,
        dealId: data.dealId,
        contactId: deal.contact?.id,
      });

      return { success: true, action: "escalated" };
    }

    // ── Schedule Call ─────────────────────────────────────────
    case "schedule-call": {
      const isFutureDate = data.followUpDate && new Date(data.followUpDate) > new Date();

      if (isFutureDate) {
        // Schedule for later — cron will pick it up at the right time
        const callDate = new Date(data.followUpDate!);
        await createTask({
          title: `Scheduled call: ${deal.title}`,
          description: data.message || `Follow-up call with ${deal.contact?.name || "contact"}`,
          dueAt: callDate,
          dealId: data.dealId,
          contactId: deal.contact?.id,
        });

        await logActivity({
          type: "CALL",
          title: `Call scheduled for ${callDate.toLocaleDateString()}`,
          content: data.message || `Follow-up call with ${deal.contact?.name || "contact"}`,
          dealId: data.dealId,
          contactId: deal.contact?.id,
        });

        const users = await db.user.findMany({ where: { workspaceId } });
        for (const user of users) {
          await createNotification({
            userId: user.id,
            title: "Call Scheduled",
            message: `${deal.title}: call on ${callDate.toLocaleDateString()}`,
            type: "SYSTEM",
            link: `/crm?dealId=${data.dealId}`,
          });
        }

        return { success: true, action: "call-scheduled", scheduledAt: callDate.toISOString() };
      }

      // No future date — place the call immediately
      const contactPhone = await db.contact.findUnique({
        where: { id: deal.contact?.id || "" },
        select: { phone: true, name: true },
      });

      if (!contactPhone?.phone) {
        return { success: false, error: "Contact has no phone number on file" };
      }

      try {
        const callResult = await initiateOutboundCall({
          workspaceId,
          contactPhone: contactPhone.phone,
          contactName: contactPhone.name || undefined,
          dealId: data.dealId,
          reason: data.message || `Follow-up call for ${deal.title}`,
        });

        await logActivity({
          type: "CALL",
          title: "Outbound call placed",
          content: `Called ${contactPhone.name || contactPhone.phone}: ${data.message || "Follow-up call"}`,
          dealId: data.dealId,
          contactId: deal.contact?.id,
        });

        return { success: true, action: "call-placed", roomName: callResult.roomName };
      } catch (err) {
        console.error("[kanban-action] Outbound call failed:", err);
        return {
          success: false,
          error: err instanceof Error ? err.message : "Failed to place outbound call",
        };
      }
    }

    // ── Move Stage ────────────────────────────────────────────
    case "move-stage": {
      if (!data.targetStage) {
        return { success: false, error: "Target stage is required" };
      }

      const STAGE_REVERSE: Record<string, string> = {
        lead: "NEW", new: "NEW", new_request: "NEW",
        qualified: "CONTACTED", quote_sent: "CONTACTED",
        proposal: "NEGOTIATION", negotiation: "NEGOTIATION",
        scheduled: "SCHEDULED", pipeline: "PIPELINE",
        ready_to_invoice: "INVOICED", pending_approval: "PENDING_COMPLETION",
        "closed-won": "WON", completed: "WON",
        "closed-lost": "LOST", lost: "LOST",
      };

      const prismaStage = STAGE_REVERSE[data.targetStage] || data.targetStage;

      await db.deal.update({
        where: { id: data.dealId },
        data: { stage: prismaStage, stageChangedAt: new Date() },
      });

      await logActivity({
        type: "NOTE",
        title: `Stage changed to ${data.targetStage}`,
        content: data.message || `Deal moved to ${data.targetStage}`,
        dealId: data.dealId,
        contactId: deal.contact?.id,
      });

      return { success: true, action: "stage-moved", newStage: prismaStage };
    }

    // ── Follow-up / Nudge ─────────────────────────────────────
    case "follow-up":
    case "nudge": {
      const dueAt = data.followUpDate ? new Date(data.followUpDate) : new Date();
      if (!data.followUpDate) {
        dueAt.setDate(dueAt.getDate() + 1);
      }

      await createTask({
        title: action === "nudge" ? `Nudge: ${deal.title}` : `Follow up: ${deal.title}`,
        description: data.message || `Follow up with ${deal.contact?.name || "contact"}`,
        dueAt,
        dealId: data.dealId,
        contactId: deal.contact?.id,
      });

      await logActivity({
        type: "NOTE",
        title: action === "nudge" ? "Nudge sent" : "Follow-up scheduled",
        content: data.message || "",
        dealId: data.dealId,
        contactId: deal.contact?.id,
      });

      return { success: true, action };
    }

    default:
      return { success: false, error: `Unknown action: ${action}` };
  }
}

/**
 * Clear escalation flag on a deal (when owner reviews it).
 */
export async function clearEscalation(dealId: string) {
  await db.deal.update({
    where: { id: dealId },
    data: { escalatedAt: null, escalationReason: null },
  });
  return { success: true };
}
