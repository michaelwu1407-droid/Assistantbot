/**
 * scheduleLeadCallback — book the voice agent to call a fresh lead.
 *
 * Honours the workspace's configured autoCallDelaySec by creating a Task
 * with the "Scheduled call:" prefix that the /api/cron/scheduled-calls cron
 * picks up when due. A delaySec of 0 (or negative) bypasses the queue and
 * dials immediately, which is useful for testing and for tradies who want
 * zero-latency follow-up.
 *
 * Caller must already have decided this lead is *eligible* (autoCallLeads
 * is on for the workspace, lead has a phone, not held for triage review,
 * inside the calling window). This helper just dispatches.
 */
import { db } from "@/lib/db";
import { initiateOutboundCall } from "@/lib/outbound-call";
import {
  countRecentDispatchFailures,
  recordCallbackEvent,
  type CallbackDispatchMode,
  type CallbackKind,
} from "@/lib/callback-events";

export type ScheduleLeadCallbackInput = {
  workspaceId: string;
  contactId?: string | null;
  contactPhone: string;
  contactName?: string;
  dealId: string;
  reason: string;
  delaySec: number;
  triggerSource?: string | null;
  callbackKind?: CallbackKind | null;
  initiatedByUserId?: string | null;
};

export type ScheduleLeadCallbackResult =
  | { dispatched: "immediate" }
  | { dispatched: "scheduled"; taskId: string; dueAt: Date };

export async function scheduleLeadCallback(
  input: ScheduleLeadCallbackInput,
): Promise<ScheduleLeadCallbackResult> {
  const delaySec = Number.isFinite(input.delaySec) && input.delaySec > 0
    ? Math.floor(input.delaySec)
    : 0;
  const dispatchMode: CallbackDispatchMode = delaySec === 0 ? "immediate" : "scheduled";
  const callbackKind = input.callbackKind || "automatic";

  if (delaySec === 0) {
    await recordCallbackEvent({
      eventType: "callback_requested",
      payload: {
        workspaceId: input.workspaceId,
        contactId: input.contactId || null,
        contactPhone: input.contactPhone,
        contactName: input.contactName || null,
        dealId: input.dealId,
        reason: input.reason,
        triggerSource: input.triggerSource || null,
        callbackKind,
        dispatchMode,
        initiatedByUserId: input.initiatedByUserId || null,
      },
    });

    // Fire-and-forget so the caller (a webhook handler) returns fast.
    initiateOutboundCall({
      workspaceId: input.workspaceId,
      contactPhone: input.contactPhone,
      contactName: input.contactName,
      dealId: input.dealId,
      reason: input.reason,
    }).then((result) => {
      return recordCallbackEvent({
        eventType: "callback_dispatched",
        payload: {
          workspaceId: input.workspaceId,
          contactId: input.contactId || null,
          contactPhone: input.contactPhone,
          contactName: input.contactName || null,
          dealId: input.dealId,
          reason: input.reason,
          triggerSource: input.triggerSource || null,
          callbackKind,
          dispatchMode,
          initiatedByUserId: input.initiatedByUserId || null,
          roomName: result.roomName,
          resolvedTrunkId: result.resolvedTrunkId,
          callerNumber: result.callerNumber,
        },
      });
    }).catch(async (err) => {
      console.error("[lead-callback] Immediate dial failed:", err);
      await recordCallbackEvent({
        eventType: "callback_dispatch_failed",
        status: "error",
        error: err instanceof Error ? err.message : String(err),
        payload: {
          workspaceId: input.workspaceId,
          contactId: input.contactId || null,
          contactPhone: input.contactPhone,
          contactName: input.contactName || null,
          dealId: input.dealId,
          reason: input.reason,
          triggerSource: input.triggerSource || null,
          callbackKind,
          dispatchMode,
          initiatedByUserId: input.initiatedByUserId || null,
        },
      });

      const failures = await countRecentDispatchFailures({
        workspaceId: input.workspaceId,
        contactId: input.contactId,
        dealId: input.dealId,
        contactPhone: input.contactPhone,
      });

      if (failures < 3) {
        const retryDelaySec = failures === 1 ? 30 : 120;
        const dueAt = new Date(Date.now() + retryDelaySec * 1000);
        await db.task.create({
          data: {
            dealId: input.dealId,
            title: `Scheduled call: auto-callback retry (${input.reason})`,
            description: input.reason,
            dueAt,
            completed: false,
          },
        });
      }
    });
    return { dispatched: "immediate" };
  }

  const dueAt = new Date(Date.now() + delaySec * 1000);
  const task = await db.task.create({
    data: {
      dealId: input.dealId,
      title: `Scheduled call: auto-callback (${input.reason})`,
      description: input.reason,
      dueAt,
      completed: false,
    },
    select: { id: true },
  });

  await recordCallbackEvent({
    eventType: "callback_requested",
    payload: {
      workspaceId: input.workspaceId,
      contactId: input.contactId || null,
      contactPhone: input.contactPhone,
      contactName: input.contactName || null,
      dealId: input.dealId,
      reason: input.reason,
      triggerSource: input.triggerSource || null,
      callbackKind,
      dispatchMode,
      initiatedByUserId: input.initiatedByUserId || null,
      taskId: task.id,
      dueAt: dueAt.toISOString(),
    },
  });

  return { dispatched: "scheduled", taskId: task.id, dueAt };
}
