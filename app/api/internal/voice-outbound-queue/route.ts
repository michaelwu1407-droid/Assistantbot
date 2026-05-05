import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  buildQueuedOutboundCallEnvelope,
  isQueuedOutboundCallClaimStale,
  parseQueuedOutboundCallEnvelope,
  type QueuedOutboundCallResult,
  VOICE_OUTBOUND_CALL_ACTION_TYPE,
} from "@/lib/outbound-call-queue";
import { isVoiceAgentSecretAuthorized } from "@/lib/voice-agent-auth";

export const dynamic = "force-dynamic";

const payloadSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("claim"),
    workerRole: z.string().optional(),
    hostId: z.string().optional(),
  }),
  z.object({
    action: z.literal("complete"),
    idempotencyKey: z.string().min(1),
    success: z.boolean(),
    result: z.object({
      roomName: z.string(),
      normalizedPhone: z.string(),
      resolvedTrunkId: z.string(),
      callerNumber: z.string().nullable(),
      transport: z.enum(["livekit_control", "worker_queue"]),
    }).optional(),
    error: z.string().optional(),
  }),
]);

async function claimNextQueuedOutboundCall(workerRole?: string, hostId?: string) {
  const now = new Date();
  const candidates = await db.actionExecution.findMany({
    where: {
      actionType: VOICE_OUTBOUND_CALL_ACTION_TYPE,
      status: "IN_PROGRESS",
    },
    orderBy: { createdAt: "asc" },
    take: 10,
    select: {
      idempotencyKey: true,
      result: true,
      updatedAt: true,
    },
  });

  for (const candidate of candidates) {
    const envelope = parseQueuedOutboundCallEnvelope(candidate.result);
    if (!envelope) {
      continue;
    }

    if (envelope.queue.state === "claimed" && !isQueuedOutboundCallClaimStale(envelope, now)) {
      continue;
    }

    const nextEnvelope = buildQueuedOutboundCallEnvelope({
      request: envelope.request,
      enqueuedAt: envelope.queue.enqueuedAt,
      claim: {
        workerRole: workerRole || null,
        hostId: hostId || null,
        claimedAt: now.toISOString(),
      },
    });

    const claimed = await db.actionExecution.updateMany({
      where: {
        idempotencyKey: candidate.idempotencyKey,
        status: "IN_PROGRESS",
        updatedAt: candidate.updatedAt,
      },
      data: {
        result: nextEnvelope,
        error: null,
      },
    });

    if (claimed.count > 0) {
      return {
        claimed: true,
        idempotencyKey: candidate.idempotencyKey,
        request: envelope.request,
      };
    }
  }

  return { claimed: false };
}

async function completeQueuedOutboundCall(params: {
  idempotencyKey: string;
  success: boolean;
  result?: QueuedOutboundCallResult;
  error?: string;
}) {
  const existing = await db.actionExecution.findUnique({
    where: { idempotencyKey: params.idempotencyKey },
    select: {
      status: true,
      result: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: "Queued outbound call not found" }, { status: 404 });
  }

  if (existing.status !== "IN_PROGRESS") {
    return NextResponse.json({ ok: true, status: existing.status.toLowerCase() });
  }

  const failedEnvelope = parseQueuedOutboundCallEnvelope(existing.result);
  await db.actionExecution.update({
    where: { idempotencyKey: params.idempotencyKey },
    data: params.success
      ? {
          status: "COMPLETED",
          result: params.result,
          error: null,
        }
      : {
          status: "FAILED",
          ...(failedEnvelope ? { result: failedEnvelope } : {}),
          error: params.error || "Voice worker failed to place the outbound call.",
        },
  });

  return NextResponse.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const providedSecret = req.headers.get("x-voice-agent-secret") || "";
  if (!isVoiceAgentSecretAuthorized(providedSecret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || "Invalid payload" },
        { status: 400 },
      );
    }

    if (parsed.data.action === "claim") {
      const claimed = await claimNextQueuedOutboundCall(parsed.data.workerRole, parsed.data.hostId);
      return NextResponse.json(claimed);
    }

    return completeQueuedOutboundCall({
      idempotencyKey: parsed.data.idempotencyKey,
      success: parsed.data.success,
      result: parsed.data.result,
      error: parsed.data.error,
    });
  } catch (error) {
    console.error("[voice-outbound-queue] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
