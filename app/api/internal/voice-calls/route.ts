import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

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

function normalisePhone(phone?: string | null) {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return `+61${cleaned.slice(1)}`;
  if (cleaned.startsWith("61")) return `+${cleaned}`;
  return cleaned;
}

function phoneVariants(phone?: string | null) {
  const normalized = normalisePhone(phone);
  if (!normalized) return [];
  const digits = normalized.replace(/[^\d]/g, "");
  const variants = new Set<string>([
    normalized,
    digits,
    digits.startsWith("61") ? `0${digits.slice(2)}` : digits,
    digits.startsWith("61") ? digits.slice(2) : digits,
  ]);
  return Array.from(variants).filter(Boolean);
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
  const variants = phoneVariants(calledPhone);
  if (!variants.length) return null;

  const workspaces = await db.workspace.findMany({
    where: { twilioPhoneNumber: { not: null } },
    select: { id: true, twilioPhoneNumber: true },
  });

  for (const workspace of workspaces) {
    const workspaceVariants = phoneVariants(workspace.twilioPhoneNumber);
    if (workspaceVariants.some((value) => variants.includes(value))) {
      return workspace.id;
    }
  }

  return null;
}

async function findContactId(workspaceId: string, callerPhone?: string) {
  const variants = phoneVariants(callerPhone);
  if (!variants.length) return null;

  const contacts = await db.contact.findMany({
    where: {
      workspaceId,
      phone: { not: null },
    },
    select: { id: true, phone: true },
  });

  for (const contact of contacts) {
    const contactVariants = phoneVariants(contact.phone);
    if (contactVariants.some((value) => variants.includes(value))) {
      return contact.id;
    }
  }

  return null;
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
