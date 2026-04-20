import type { Notification } from "@prisma/client";
import { db } from "@/lib/db";
import { approveDraft, approveCompletion } from "@/actions/deal-actions";
import { markAsRead } from "@/actions/notification-actions";

export type ActionVerb = "ACCEPT" | "CONFIRM" | "REJECT" | "SNOOZE" | "OK";

export interface ExecuteResult {
  success: boolean;
  reply: string;
}

export async function executeNotificationAction(
  notification: Notification,
  verb: ActionVerb,
): Promise<ExecuteResult> {
  const payload = (notification.actionPayload ?? {}) as Record<string, string>;
  const dealId = payload.dealId;

  if (verb === "SNOOZE") {
    await snoozeNotification(notification);
    return { success: true, reply: "Got it — I'll remind you again tomorrow." };
  }

  if (verb === "OK") {
    await markAsRead(notification.id);
    return { success: true, reply: "Noted." };
  }

  if ((verb === "ACCEPT" || verb === "CONFIRM") && notification.actionType === "CONFIRM_JOB" && dealId) {
    const result = await approveDraft(dealId);
    if (result.success) {
      await markAsRead(notification.id);
      return { success: true, reply: "Job confirmed." };
    }
    return { success: false, reply: `Could not confirm job: ${result.error ?? "unknown error"}` };
  }

  if ((verb === "ACCEPT" || verb === "CONFIRM") && notification.actionType === "APPROVE_COMPLETION" && dealId) {
    const result = await approveCompletion(dealId);
    if (result.success) {
      await markAsRead(notification.id);
      return { success: true, reply: "Job completion approved." };
    }
    return { success: false, reply: `Could not approve completion: ${result.error ?? "unknown error"}` };
  }

  if (verb === "REJECT" && dealId) {
    await db.deal.update({
      where: { id: dealId },
      data: { stage: "LOST" },
    }).catch(() => {});
    await markAsRead(notification.id);
    return { success: true, reply: "Deal marked as lost." };
  }

  // Unrecognised combo — just mark read
  await markAsRead(notification.id);
  return { success: true, reply: "Done." };
}

async function snoozeNotification(notification: Notification) {
  const tomorrow = new Date();
  tomorrow.setHours(tomorrow.getHours() + 24);
  await db.notification.update({
    where: { id: notification.id },
    data: { read: false, createdAt: tomorrow },
  }).catch(() => {});
}
