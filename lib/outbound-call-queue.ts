import crypto from "node:crypto";

export const VOICE_OUTBOUND_CALL_ACTION_TYPE = "voice_outbound_call";
export const VOICE_OUTBOUND_CALL_QUEUE_VERSION = 1;
export const VOICE_OUTBOUND_CALL_BUCKET_MS = 2 * 60 * 1000;
export const VOICE_OUTBOUND_CALL_CLAIM_STALE_MS = 2 * 60 * 1000;
export const VOICE_OUTBOUND_CALL_WAIT_TIMEOUT_MS = 20_000;
export const VOICE_OUTBOUND_CALL_WAIT_POLL_MS = 400;

export type QueuedOutboundCallRequest = {
  workspaceId: string;
  workspaceName: string;
  workspaceCallerNumber: string | null;
  contactPhone: string;
  contactName: string;
  dealId: string | null;
  reason: string;
};

export type QueuedOutboundCallResult = {
  roomName: string;
  normalizedPhone: string;
  resolvedTrunkId: string;
  callerNumber: string | null;
  transport: "livekit_control" | "worker_queue";
};

export type QueuedOutboundCallClaim = {
  workerRole: string | null;
  hostId: string | null;
  claimedAt: string | null;
};

export type QueuedOutboundCallEnvelope = {
  kind: "voice_outbound_call_request";
  version: typeof VOICE_OUTBOUND_CALL_QUEUE_VERSION;
  request: QueuedOutboundCallRequest;
  queue: {
    state: "queued" | "claimed";
    enqueuedAt: string;
    claim: QueuedOutboundCallClaim | null;
  };
};

function hourlessBucketAt(timestampMs: number) {
  return Math.floor(timestampMs / VOICE_OUTBOUND_CALL_BUCKET_MS);
}

function sha256Hex(input: string) {
  return crypto.createHash("sha256").update(input).digest("hex");
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

export function buildQueuedOutboundCallKey(
  request: QueuedOutboundCallRequest,
  createdAt: Date = new Date(),
) {
  const bucket = hourlessBucketAt(createdAt.getTime());
  return sha256Hex([
    VOICE_OUTBOUND_CALL_ACTION_TYPE,
    bucket,
    request.workspaceId,
    request.contactPhone,
    request.contactName,
    request.dealId || "",
    request.reason,
  ].join("|"));
}

export function buildQueuedOutboundCallEnvelope(params: {
  request: QueuedOutboundCallRequest;
  enqueuedAt?: string;
  claim?: QueuedOutboundCallClaim | null;
}) {
  return {
    kind: "voice_outbound_call_request" as const,
    version: VOICE_OUTBOUND_CALL_QUEUE_VERSION,
    request: params.request,
    queue: {
      state: params.claim?.claimedAt ? "claimed" as const : "queued" as const,
      enqueuedAt: params.enqueuedAt || new Date().toISOString(),
      claim: params.claim || null,
    },
  };
}

export function parseQueuedOutboundCallEnvelope(value: unknown): QueuedOutboundCallEnvelope | null {
  const record = asRecord(value);
  if (!record) return null;
  if (record.kind !== "voice_outbound_call_request") return null;
  if (record.version !== VOICE_OUTBOUND_CALL_QUEUE_VERSION) return null;

  const request = asRecord(record.request);
  const queue = asRecord(record.queue);
  if (!request || !queue) return null;

  const claim = asRecord(queue.claim);
  const state = queue.state === "claimed" ? "claimed" : "queued";

  return {
    kind: "voice_outbound_call_request",
    version: VOICE_OUTBOUND_CALL_QUEUE_VERSION,
    request: {
      workspaceId: asString(request.workspaceId),
      workspaceName: asString(request.workspaceName),
      workspaceCallerNumber: asString(request.workspaceCallerNumber) || null,
      contactPhone: asString(request.contactPhone),
      contactName: asString(request.contactName),
      dealId: asString(request.dealId) || null,
      reason: asString(request.reason),
    },
    queue: {
      state,
      enqueuedAt: asString(queue.enqueuedAt) || new Date(0).toISOString(),
      claim: claim
        ? {
            workerRole: asString(claim.workerRole) || null,
            hostId: asString(claim.hostId) || null,
            claimedAt: asString(claim.claimedAt) || null,
          }
        : null,
    },
  };
}

export function parseQueuedOutboundCallResult(value: unknown): QueuedOutboundCallResult | null {
  const record = asRecord(value);
  if (!record) return null;

  const roomName = asString(record.roomName);
  const normalizedPhone = asString(record.normalizedPhone);
  const resolvedTrunkId = asString(record.resolvedTrunkId);
  const transport = record.transport === "livekit_control" ? "livekit_control" : record.transport === "worker_queue"
    ? "worker_queue"
    : "";

  if (!roomName || !normalizedPhone || !resolvedTrunkId || !transport) {
    return null;
  }

  return {
    roomName,
    normalizedPhone,
    resolvedTrunkId,
    callerNumber: asString(record.callerNumber) || null,
    transport,
  };
}

export function isQueuedOutboundCallClaimStale(
  envelope: QueuedOutboundCallEnvelope,
  now: Date = new Date(),
  staleMs: number = VOICE_OUTBOUND_CALL_CLAIM_STALE_MS,
) {
  if (envelope.queue.state !== "claimed") return false;
  const claimedAt = envelope.queue.claim?.claimedAt;
  if (!claimedAt) return true;

  const claimedAtMs = new Date(claimedAt).getTime();
  if (!Number.isFinite(claimedAtMs)) return true;
  return claimedAtMs <= now.getTime() - staleMs;
}
