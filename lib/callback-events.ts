import { db } from "@/lib/db";

export const CALLBACK_EVENT_PROVIDER = "tracey_callback";
const CALLBACK_IN_PROGRESS_WINDOW_MS = 10 * 60 * 1000;
const AUTOMATIC_CALLBACK_COOLDOWN_MS = 6 * 60 * 60 * 1000;

export type CallbackKind = "automatic" | "manual";
export type CallbackDispatchMode = "immediate" | "scheduled";
export type CallbackEventType =
  | "callback_requested"
  | "callback_blocked"
  | "callback_dispatched"
  | "callback_dispatch_failed"
  | "callback_call_finished"
  | "callback_taken_over";

export type CallbackOutcome =
  | "answered"
  | "no_answer"
  | "busy"
  | "failed"
  | "canceled"
  | "completed"
  | "unknown";

export type CallbackEventPayload = {
  workspaceId: string;
  contactId?: string | null;
  dealId?: string | null;
  contactPhone?: string | null;
  contactName?: string | null;
  reason?: string | null;
  triggerSource?: string | null;
  callbackKind?: CallbackKind | null;
  blockReason?: string | null;
  dispatchMode?: CallbackDispatchMode | null;
  taskId?: string | null;
  dueAt?: string | null;
  roomName?: string | null;
  resolvedTrunkId?: string | null;
  callerNumber?: string | null;
  initiatedByUserId?: string | null;
  callStatus?: string | null;
  providerCallSid?: string | null;
};

type CallbackEventRow = {
  id: string;
  eventType: string;
  status: string;
  error: string | null;
  payload: unknown;
  createdAt: Date;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

export function parseCallbackPayload(value: unknown): CallbackEventPayload | null {
  const record = asRecord(value);
  if (!record) return null;

  const workspaceId = readString(record, "workspaceId");
  if (!workspaceId) return null;

  const callbackKindRaw = readString(record, "callbackKind");
  const callbackKind =
    callbackKindRaw === "automatic" || callbackKindRaw === "manual"
      ? callbackKindRaw
      : null;
  const dispatchModeRaw = readString(record, "dispatchMode");
  const dispatchMode =
    dispatchModeRaw === "immediate" || dispatchModeRaw === "scheduled"
      ? dispatchModeRaw
      : null;

  return {
    workspaceId,
    contactId: readString(record, "contactId"),
    dealId: readString(record, "dealId"),
    contactPhone: readString(record, "contactPhone"),
    contactName: readString(record, "contactName"),
    reason: readString(record, "reason"),
    triggerSource: readString(record, "triggerSource"),
    callbackKind,
    blockReason: readString(record, "blockReason"),
    dispatchMode,
    taskId: readString(record, "taskId"),
    dueAt: readString(record, "dueAt"),
    roomName: readString(record, "roomName"),
    resolvedTrunkId: readString(record, "resolvedTrunkId"),
    callerNumber: readString(record, "callerNumber"),
    initiatedByUserId: readString(record, "initiatedByUserId"),
    callStatus: readString(record, "callStatus"),
    providerCallSid: readString(record, "providerCallSid"),
  };
}

function normalizeCallbackKind(payload: CallbackEventPayload): CallbackKind {
  if (payload.callbackKind === "automatic" || payload.callbackKind === "manual") {
    return payload.callbackKind;
  }
  return payload.reason?.startsWith("manual_recall:") ? "manual" : "automatic";
}

export function normalizeCallbackOutcome(value?: string | null): CallbackOutcome {
  const normalized = (value || "").trim().toLowerCase().replace(/\s+/g, "_");
  if (!normalized) return "unknown";
  if (normalized === "answered") return "answered";
  if (normalized === "no_answer") return "no_answer";
  if (normalized === "busy") return "busy";
  if (normalized === "failed") return "failed";
  if (normalized === "canceled" || normalized === "cancelled") return "canceled";
  if (normalized === "completed") return "completed";
  return "unknown";
}

export async function recordCallbackEvent(params: {
  eventType: CallbackEventType;
  payload: CallbackEventPayload;
  status?: "success" | "error";
  error?: string | null;
}) {
  try {
    await db.webhookEvent.create({
      data: {
        provider: CALLBACK_EVENT_PROVIDER,
        eventType: params.eventType,
        status: params.status || "success",
        payload: params.payload,
        error: params.error || null,
      },
    });
  } catch (error) {
    console.error("[callback-events] Failed to record callback event:", error);
  }
}

function buildContactMatchFilters(params: {
  contactId?: string | null;
  dealId?: string | null;
  contactPhone?: string | null;
}) {
  const clauses: Array<Record<string, unknown>> = [];
  if (params.contactId) clauses.push({ payload: { path: ["contactId"], equals: params.contactId } });
  if (params.dealId) clauses.push({ payload: { path: ["dealId"], equals: params.dealId } });
  if (params.contactPhone) clauses.push({ payload: { path: ["contactPhone"], equals: params.contactPhone } });
  return clauses;
}

export async function hasRecentAutomaticCallbackAttempt(params: {
  workspaceId: string;
  contactId?: string | null;
  dealId?: string | null;
  contactPhone?: string | null;
  lookbackMs?: number;
}) {
  const contactClauses = buildContactMatchFilters(params);
  if (contactClauses.length === 0) return false;

  // Only count successful dispatches and finished calls — not failed attempts.
  // A failed dispatch must not lock the lead out for 6 hours.
  const existing = await db.webhookEvent.findFirst({
    where: {
      provider: CALLBACK_EVENT_PROVIDER,
      eventType: {
        in: [
          "callback_dispatched",
          "callback_call_finished",
        ],
      },
      createdAt: { gt: new Date(Date.now() - (params.lookbackMs ?? AUTOMATIC_CALLBACK_COOLDOWN_MS)) },
      AND: [
        { payload: { path: ["workspaceId"], equals: params.workspaceId } },
        { payload: { path: ["callbackKind"], equals: "automatic" } },
        { OR: contactClauses },
      ],
    },
    select: { id: true },
  }).catch(() => null);

  return Boolean(existing);
}

export async function hasRecentCallbackInProgress(params: {
  workspaceId: string;
  contactId?: string | null;
  dealId?: string | null;
  contactPhone?: string | null;
}) {
  const contactClauses = buildContactMatchFilters(params);
  if (contactClauses.length === 0) return false;

  const existing = await db.webhookEvent.findFirst({
    where: {
      provider: CALLBACK_EVENT_PROVIDER,
      eventType: {
        in: [
          "callback_requested",
          "callback_dispatched",
        ],
      },
      createdAt: { gt: new Date(Date.now() - CALLBACK_IN_PROGRESS_WINDOW_MS) },
      AND: [
        { payload: { path: ["workspaceId"], equals: params.workspaceId } },
        { OR: contactClauses },
      ],
    },
    select: { id: true },
  }).catch(() => null);

  return Boolean(existing);
}

function formatBlockReason(reason: string | null | undefined) {
  switch (reason) {
    case "auto_call_disabled":
      return "auto-call is turned off";
    case "voice_disabled":
      return "voice is temporarily disabled";
    case "agent_mode_not_execution":
      return "Tracey is not allowed to act in the current agent mode";
    case "no_workspace_number":
      return "your business number is not provisioned yet";
    case "no_lead_phone":
      return "there is no phone number on this lead";
    case "triage_review":
      return "the lead was held for review";
    case "after_hours":
      return "it is outside the allowed calling window";
    case "urgent":
      return "urgent leads require manual follow-up";
    case "callback_recently_attempted":
      return "Tracey already tried this prospect recently";
    case "spam_review":
      return "the lead looked like repeat spam or duplicate traffic";
    default:
      return reason ? reason.replace(/_/g, " ") : "the callback could not be sent";
  }
}

export function getCallbackEventCopy(row: CallbackEventRow) {
  const payload = parseCallbackPayload(row.payload);
  if (!payload) return null;

  const callbackKind = normalizeCallbackKind(payload);
  const outcome = normalizeCallbackOutcome(payload.callStatus);
  const isManual = callbackKind === "manual";

  if (row.eventType === "callback_requested") {
    const title =
      payload.dispatchMode === "scheduled"
        ? isManual
          ? "Tracey recall scheduled"
          : "Tracey callback scheduled"
        : isManual
          ? "Tracey recall requested"
          : "Tracey callback queued";
    const description =
      payload.dispatchMode === "scheduled" && payload.dueAt
        ? `Due ${new Date(payload.dueAt).toLocaleString("en-AU", {
            timeZone: "Australia/Sydney",
            dateStyle: "medium",
            timeStyle: "short",
          })}.`
        : "Tracey is preparing the callback now.";
    return {
      payload,
      title,
      description,
      body: description,
      recallEligible: false,
      outcome: null as string | null,
    };
  }

  if (row.eventType === "callback_blocked") {
    const reason = formatBlockReason(payload.blockReason);
    return {
      payload,
      title: isManual ? "Tracey recall could not start" : "Auto-call skipped",
      description: `Reason: ${reason}.`,
      body: `Reason: ${reason}.`,
      recallEligible: false,
      outcome: payload.blockReason,
    };
  }

  if (row.eventType === "callback_dispatched") {
    return {
      payload,
      title: isManual ? "Tracey recall started" : "Tracey called the prospect",
      description: payload.contactPhone ? `Dialling ${payload.contactPhone}.` : "Tracey is dialling now.",
      body: payload.contactPhone ? `Dialling ${payload.contactPhone}.` : "Tracey is dialling now.",
      recallEligible: false,
      outcome: null as string | null,
    };
  }

  if (row.eventType === "callback_dispatch_failed") {
    const description = row.error || "Tracey could not start the callback.";
    return {
      payload,
      title: "Tracey callback failed to start",
      description,
      body: description,
      recallEligible: true,
      outcome: "failed",
    };
  }

  if (row.eventType === "callback_call_finished") {
    if (outcome === "answered") {
      return {
        payload,
        title: isManual ? "Tracey reached the prospect" : "Tracey reached the prospect",
        description: "The callback connected successfully.",
        body: "The callback connected successfully.",
        recallEligible: false,
        outcome,
      };
    }

    if (outcome === "no_answer") {
      return {
        payload,
        title: "No answer to Tracey callback",
        description: "Nobody picked up. You can ask Tracey to try once more or handle it yourself.",
        body: "Nobody picked up. You can ask Tracey to try once more or handle it yourself.",
        recallEligible: true,
        outcome,
      };
    }

    if (outcome === "busy") {
      return {
        payload,
        title: "Prospect line was busy",
        description: "Tracey hit a busy line. You can try again from the thread when it makes sense.",
        body: "Tracey hit a busy line. You can try again from the thread when it makes sense.",
        recallEligible: true,
        outcome,
      };
    }

    const description =
      outcome === "canceled"
        ? "The callback was canceled before it connected."
        : "The callback did not connect.";
    return {
      payload,
      title: "Tracey callback did not connect",
      description,
      body: description,
      recallEligible: true,
      outcome,
    };
  }

  if (row.eventType === "callback_taken_over") {
    return {
      payload,
      title: "You'll handle the next step",
      description: "Tracey will stand down here so you or your team can follow up directly from this thread.",
      body: "Tracey will stand down here so you or your team can follow up directly from this thread.",
      recallEligible: false,
      outcome: "manual_takeover",
    };
  }

  return null;
}

