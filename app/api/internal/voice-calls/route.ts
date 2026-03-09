import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { findContactByPhone, findWorkspaceByTwilioNumber } from "@/lib/workspace-routing";

export const dynamic = "force-dynamic";

const transcriptTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string(),
  createdAt: z.number(),
});

const voiceCallPayloadSchema = z.object({
  callId: z.string().min(1),
  source: z.string().default("livekit"),
  callType: z.enum(["demo", "inbound_demo", "normal"]),
  roomName: z.string().min(1),
  participantIdentity: z.string().min(1),
  callerPhone: z.string().optional(),
  calledPhone: z.string().optional(),
  callerName: z.string().optional(),
  businessName: z.string().optional(),
  transcriptTurns: z.array(transcriptTurnSchema).default([]),
  transcriptText: z.string().default(""),
  latency: z.record(z.string(), z.any()).optional(),
  leadCapture: z.record(z.string(), z.any()).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  startedAt: z.string(),
  endedAt: z.string().optional(),
});

function getExpectedSecret() {
  return process.env.VOICE_AGENT_WEBHOOK_SECRET || process.env.LIVEKIT_API_SECRET || "";
}

function buildSummary(callType: string, callerName?: string, callerPhone?: string, transcriptText?: string) {
  const callerLabel = callerName || callerPhone || "Caller";
  const firstMeaningfulLine = (transcriptText || "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("Caller:"));

  const summaryParts = [`${callerLabel} completed a ${callType.replace(/_/g, " ")} call.`];
  if (firstMeaningfulLine) {
    summaryParts.push(firstMeaningfulLine.replace(/^Caller:\s*/i, "").slice(0, 180));
  }
  return summaryParts.join(" ");
}

async function findWorkspaceIdByCalledNumber(calledPhone?: string) {
  const workspace = await findWorkspaceByTwilioNumber(calledPhone, { id: true });
  return workspace?.id ?? null;
}

async function findContactId(workspaceId: string, callerPhone?: string) {
  const contact = await findContactByPhone(workspaceId, callerPhone, { id: true });
  return contact?.id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = getExpectedSecret();
    const providedSecret = req.headers.get("x-voice-agent-secret") || "";

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = voiceCallPayloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const payload = parsed.data;
    const workspaceId = await findWorkspaceIdByCalledNumber(payload.calledPhone);
    const contactId = workspaceId ? await findContactId(workspaceId, payload.callerPhone) : null;
    const transcriptText = payload.transcriptText.trim();
    const summary = buildSummary(payload.callType, payload.callerName, payload.callerPhone, transcriptText);

    await db.voiceCall.upsert({
      where: { callId: payload.callId },
      update: {
        source: payload.source,
        callType: payload.callType,
        roomName: payload.roomName,
        participantIdentity: payload.participantIdentity,
        workspaceId: workspaceId ?? undefined,
        contactId: contactId ?? undefined,
        callerPhone: payload.callerPhone,
        calledPhone: payload.calledPhone,
        callerName: payload.callerName,
        businessName: payload.businessName,
        transcriptText,
        transcriptTurns: payload.transcriptTurns,
        summary,
        latency: payload.latency,
        leadCapture: payload.leadCapture,
        metadata: payload.metadata,
        startedAt: new Date(payload.startedAt),
        endedAt: payload.endedAt ? new Date(payload.endedAt) : new Date(),
      },
      create: {
        callId: payload.callId,
        source: payload.source,
        callType: payload.callType,
        roomName: payload.roomName,
        participantIdentity: payload.participantIdentity,
        workspaceId: workspaceId ?? undefined,
        contactId: contactId ?? undefined,
        callerPhone: payload.callerPhone,
        calledPhone: payload.calledPhone,
        callerName: payload.callerName,
        businessName: payload.businessName,
        transcriptText,
        transcriptTurns: payload.transcriptTurns,
        summary,
        latency: payload.latency,
        leadCapture: payload.leadCapture,
        metadata: payload.metadata,
        startedAt: new Date(payload.startedAt),
        endedAt: payload.endedAt ? new Date(payload.endedAt) : new Date(),
      },
    });

    if (workspaceId && transcriptText) {
      await db.activity.create({
        data: {
          type: "CALL",
          title: payload.callType === "normal" ? "Voice call handled by Tracey" : "Earlymark AI voice call",
          content: summary,
          description: transcriptText.slice(0, 2000),
          contactId: contactId ?? undefined,
        },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[voice-call-webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
