/**
 * scheduleLeadCallback — book the voice agent to call a fresh lead.
 *
 * A delaySec of 0 (or negative) dials immediately. For a positive delay we
 * prefer QStash (sub-minute precision via /api/qstash/callback); when QStash
 * isn't configured we fall back to a Task with the "Scheduled call:" prefix
 * that the /api/cron/scheduled-calls cron picks up when due (~5-min cadence).
 *
 * Caller must already have decided this lead is *eligible* (autoCallLeads
 * is on for the workspace, lead has a phone, not held for triage review,
 * inside the calling window). This helper just dispatches.
 */
import { db } from "@/lib/db";
import { initiateOutboundCall } from "@/lib/outbound-call";
import {
  recordCallbackEvent,
  type CallbackDispatchMode,
  type CallbackKind,
} from "@/lib/callback-events";
import { handleCallbackDispatchFailure } from "@/lib/callback-escalation";
import { isQStashConfigured, scheduleCallbackViaQStash } from "@/lib/qstash";

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
  | { dispatched: "scheduled"; taskId: string; dueAt: Date }
  | { dispatched: "qstash"; dueAt: Date; messageId?: string };

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
      await handleCallbackDispatchFailure({
        workspaceId: input.workspaceId,
        dealId: input.dealId,
        contactPhone: input.contactPhone,
        contactId: input.contactId,
        contactName: input.contactName,
        reason: input.reason,
        triggerSource: input.triggerSource,
        callbackKind,
        error: err instanceof Error ? err.message : String(err),
      });
    });
    return { dispatched: "immediate" };
  }

  const dueAt = new Date(Date.now() + delaySec * 1000);

  // Prefer QStash for real sub-minute scheduling. If it isn't configured (or
  // publishing fails) we fall back to the cron-swept Task below, which floors
  // to the ~5-min cron cadence but never drops the callback.
  if (isQStashConfigured()) {
    try {
      const result = await scheduleCallbackViaQStash({
        delaySec,
        payload: {
          workspaceId: input.workspaceId,
          contactId: input.contactId || null,
          contactPhone: input.contactPhone,
          contactName: input.contactName || null,
          dealId: input.dealId,
          reason: input.reason,
          triggerSource: input.triggerSource || null,
          callbackKind,
          initiatedByUserId: input.initiatedByUserId || null,
        },
      });

      if (result.published) {
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
            dueAt: dueAt.toISOString(),
          },
        });
        return { dispatched: "qstash", dueAt, messageId: result.messageId };
      }
    } catch (err) {
      console.error("[lead-callback] QStash publish failed, falling back to cron task:", err);
    }
  }

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
