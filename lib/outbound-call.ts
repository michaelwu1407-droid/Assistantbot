import { RoomServiceClient, SipClient } from "livekit-server-sdk";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  buildQueuedOutboundCallEnvelope,
  buildQueuedOutboundCallKey,
  parseQueuedOutboundCallEnvelope,
  parseQueuedOutboundCallResult,
  type QueuedOutboundCallRequest,
  type QueuedOutboundCallResult,
  VOICE_OUTBOUND_CALL_ACTION_TYPE,
  VOICE_OUTBOUND_CALL_WAIT_POLL_MS,
  VOICE_OUTBOUND_CALL_WAIT_TIMEOUT_MS,
} from "@/lib/outbound-call-queue";

export type OutboundCallInput = {
  workspaceId: string;
  contactPhone: string;
  contactName?: string;
  dealId?: string;
  reason?: string;
};

export type OutboundCallResult = QueuedOutboundCallResult;

function getLivekitApiBaseUrl() {
  const raw = (process.env.LIVEKIT_URL || "").trim();
  if (!raw) return "";
  if (/^wss:/i.test(raw)) return raw.replace(/^wss:/i, "https:");
  if (/^ws:/i.test(raw)) return raw.replace(/^ws:/i, "http:");
  return raw;
}

function getOutboundCallControlMode(env: NodeJS.ProcessEnv = process.env) {
  const explicit = (env.VOICE_OUTBOUND_CALL_CONTROL_MODE || "").trim().toLowerCase();
  if (explicit === "direct" || explicit === "queue") {
    return explicit;
  }

  return (env.NODE_ENV || "").trim() === "production" ? "queue" : "direct";
}

function getOutboundCallWaitTimeoutMs(env: NodeJS.ProcessEnv = process.env) {
  const raw = Number.parseInt((env.VOICE_OUTBOUND_CALL_WAIT_TIMEOUT_MS || "").trim(), 10);
  return Number.isInteger(raw) && raw > 0 ? raw : VOICE_OUTBOUND_CALL_WAIT_TIMEOUT_MS;
}

function normalizePhone(phone?: string | null) {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return `+61${cleaned.slice(1)}`;
  if (cleaned.startsWith("61")) return `+${cleaned}`;
  return cleaned;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getSipClient() {
  const livekitUrl = getLivekitApiBaseUrl();
  const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();

  if (!livekitUrl || !apiKey || !apiSecret) {
    throw new Error("LiveKit credentials are incomplete for outbound calls.");
  }
  return new SipClient(livekitUrl, apiKey, apiSecret);
}

function getRoomClient() {
  const livekitUrl = getLivekitApiBaseUrl();
  const apiKey = (process.env.LIVEKIT_API_KEY || "").trim();
  const apiSecret = (process.env.LIVEKIT_API_SECRET || "").trim();

  if (!livekitUrl || !apiKey || !apiSecret) {
    throw new Error("LiveKit credentials are incomplete for outbound calls.");
  }
  return new RoomServiceClient(livekitUrl, apiKey, apiSecret);
}

async function resolveWorkspaceOutboundTrunk(workspaceCallerNumber: string | null, sipClient: SipClient) {
  const outboundTrunks = await sipClient.listSipOutboundTrunk();

  if (workspaceCallerNumber) {
    const workspaceTrunk = outboundTrunks.find((trunk) => {
      const numbers = Array.isArray(trunk.numbers) ? trunk.numbers.map(String).map((value) => normalizePhone(value)) : [];
      return numbers.includes(workspaceCallerNumber);
    });
    if (workspaceTrunk) {
      return {
        trunkId: String(workspaceTrunk.sipTrunkId || ""),
        callerNumber: workspaceCallerNumber,
      };
    }
  }

  const configuredTrunkId = (process.env.LIVEKIT_SIP_TRUNK_ID || "").trim();
  const resolved = configuredTrunkId
    ? outboundTrunks.find((trunk) => String(trunk.sipTrunkId) === configuredTrunkId)
    : outboundTrunks[0];

  if (!resolved) {
    throw new Error("No outbound SIP trunk available for this workspace.");
  }

  const callerNumber = workspaceCallerNumber
    || (Array.isArray(resolved.numbers) ? resolved.numbers.map((value) => normalizePhone(String(value))).find((value) => value && value !== "*") : null)
    || null;

  return {
    trunkId: String(resolved.sipTrunkId || ""),
    callerNumber,
  };
}

async function initiateOutboundCallDirect(request: QueuedOutboundCallRequest): Promise<OutboundCallResult> {
  const sipClient = getSipClient();
  const roomClient = getRoomClient();
  const trunk = await resolveWorkspaceOutboundTrunk(request.workspaceCallerNumber, sipClient);

  const roomName = `outbound-${request.workspaceId.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  await roomClient.createRoom({
    name: roomName,
    emptyTimeout: 300,
    maxParticipants: 2,
    metadata: JSON.stringify({
      callType: "normal",
      outbound: true,
      workspaceId: request.workspaceId,
      contactName: request.contactName,
      phone: request.contactPhone,
      calledPhone: request.workspaceCallerNumber || "",
      dealId: request.dealId || "",
      reason: request.reason,
    }),
  });

  await sipClient.createSipParticipant(trunk.trunkId, request.contactPhone, roomName, {
    fromNumber: trunk.callerNumber || undefined,
    participantName: request.contactName || request.contactPhone,
    participantIdentity: `outbound-caller-${request.contactPhone}`,
    playDialtone: true,
  });

  return {
    roomName,
    normalizedPhone: request.contactPhone,
    resolvedTrunkId: trunk.trunkId,
    callerNumber: trunk.callerNumber,
    transport: "livekit_control",
  };
}

async function enqueueOutboundCallRequest(request: QueuedOutboundCallRequest) {
  const idempotencyKey = buildQueuedOutboundCallKey(request);
  const envelope = buildQueuedOutboundCallEnvelope({ request });

  try {
    await db.actionExecution.create({
      data: {
        idempotencyKey,
        actionType: VOICE_OUTBOUND_CALL_ACTION_TYPE,
        status: "IN_PROGRESS",
        result: envelope,
        error: null,
      },
    });
    return { idempotencyKey, completedResult: null as OutboundCallResult | null };
  } catch (error) {
    const errorCode = error instanceof Prisma.PrismaClientKnownRequestError
      ? error.code
      : (error as { code?: string } | null)?.code;

    if (errorCode !== "P2002") {
      throw error;
    }

    const existing = await db.actionExecution.findUnique({
      where: { idempotencyKey },
      select: {
        status: true,
        result: true,
      },
    });

    if (!existing) {
      throw new Error("Outbound call queue claim raced and the existing request could not be found.");
    }

    if (existing.status === "COMPLETED") {
      const completedResult = parseQueuedOutboundCallResult(existing.result);
      if (completedResult) {
        return { idempotencyKey, completedResult };
      }
    }

    if (existing.status === "FAILED") {
      const existingEnvelope = parseQueuedOutboundCallEnvelope(existing.result) || envelope;
      const reclaimed = await db.actionExecution.updateMany({
        where: {
          idempotencyKey,
          status: "FAILED",
        },
        data: {
          status: "IN_PROGRESS",
          result: buildQueuedOutboundCallEnvelope({
            request: existingEnvelope.request,
            enqueuedAt: existingEnvelope.queue.enqueuedAt,
          }),
          error: null,
        },
      });

      if (reclaimed.count > 0) {
        return { idempotencyKey, completedResult: null };
      }
    }

    return { idempotencyKey, completedResult: null };
  }
}

async function waitForQueuedOutboundCall(idempotencyKey: string) {
  const timeoutMs = getOutboundCallWaitTimeoutMs();
  const startedAt = Date.now();

  while (Date.now() - startedAt <= timeoutMs) {
    const existing = await db.actionExecution.findUnique({
      where: { idempotencyKey },
      select: {
        status: true,
        result: true,
        error: true,
      },
    });

    if (!existing) {
      throw new Error("Queued outbound call disappeared before completion.");
    }

    if (existing.status === "COMPLETED") {
      const completedResult = parseQueuedOutboundCallResult(existing.result);
      if (!completedResult) {
        throw new Error("Queued outbound call completed without a valid result payload.");
      }
      return completedResult;
    }

    if (existing.status === "FAILED") {
      throw new Error(existing.error || "Queued outbound call failed.");
    }

    await sleep(VOICE_OUTBOUND_CALL_WAIT_POLL_MS);
  }

  throw new Error("Timed out waiting for the voice worker to place the outbound call.");
}

async function buildQueuedRequest(input: OutboundCallInput): Promise<QueuedOutboundCallRequest> {
  const normalizedPhone = normalizePhone(input.contactPhone);
  if (!normalizedPhone) {
    throw new Error("Valid phone number required for outbound call.");
  }

  const workspace = await db.workspace.findUnique({
    where: { id: input.workspaceId },
    select: {
      twilioPhoneNumber: true,
      twilioPhoneNumberNormalized: true,
      name: true,
    },
  });

  if (!workspace) {
    throw new Error("Workspace not found.");
  }

  return {
    workspaceId: input.workspaceId,
    workspaceName: workspace.name || "",
    workspaceCallerNumber: normalizePhone(workspace.twilioPhoneNumberNormalized || workspace.twilioPhoneNumber),
    contactPhone: normalizedPhone,
    contactName: (input.contactName || "").trim(),
    dealId: input.dealId || null,
    reason: (input.reason || "").trim(),
  };
}

export async function initiateOutboundCall(input: OutboundCallInput): Promise<OutboundCallResult> {
  const request = await buildQueuedRequest(input);

  if (getOutboundCallControlMode() === "direct") {
    return initiateOutboundCallDirect(request);
  }

  const queued = await enqueueOutboundCallRequest(request);
  if (queued.completedResult) {
    return queued.completedResult;
  }

  const completed = await waitForQueuedOutboundCall(queued.idempotencyKey);
  return {
    ...completed,
    transport: "worker_queue",
  };
}
