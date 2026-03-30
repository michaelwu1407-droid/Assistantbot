import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { findContactByPhone, findWorkspaceByTwilioNumber } from "@/lib/workspace-routing";
import { isVoiceAgentSecretAuthorized } from "@/lib/voice-agent-auth";
import { syncVoiceCallToCRM } from "@/lib/post-call-sync";

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

function getUrgentEscalation(payload: z.infer<typeof voiceCallPayloadSchema>) {
  const raw = payload.metadata?.urgentEscalation;
  if (!raw || typeof raw !== "object") return null;
  const candidate = raw as { toolUsed?: unknown; payloads?: unknown };
  const toolUsed = Boolean(candidate.toolUsed);
  const payloads = Array.isArray(candidate.payloads) ? candidate.payloads : [];
  if (!toolUsed || payloads.length === 0) return null;
  const first = payloads[0];
  if (!first || typeof first !== "object") return { reason: "Urgent or human callback requested" };
  const reason = typeof (first as Record<string, unknown>).reason === "string"
    ? ((first as Record<string, unknown>).reason as string).trim()
    : "";
  return { reason: reason || "Urgent or human callback requested" };
}

async function findWorkspaceIdByCalledNumber(calledPhone?: string) {
  const workspace = await findWorkspaceByTwilioNumber(calledPhone);
  return workspace?.id ?? null;
}

async function findContactId(workspaceId: string, callerPhone?: string) {
  const contact = await findContactByPhone(workspaceId, callerPhone);
  return contact?.id ?? null;
}

export async function POST(req: NextRequest) {
  try {
    const providedSecret = req.headers.get("x-voice-agent-secret") || "";

    if (!isVoiceAgentSecretAuthorized(providedSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = voiceCallPayloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const payload = parsed.data;
    const existingVoiceCall = await db.voiceCall.findUnique({
      where: { callId: payload.callId },
      select: { callId: true },
    });
    const workspaceId = await findWorkspaceIdByCalledNumber(payload.calledPhone);
    const contactId = workspaceId ? await findContactId(workspaceId, payload.callerPhone) : null;
    const transcriptText = payload.transcriptText.trim();
    const urgentEscalation = getUrgentEscalation(payload);
    const baseSummary = buildSummary(payload.callType, payload.callerName, payload.callerPhone, transcriptText);
    const summary = urgentEscalation
      ? `${baseSummary} Manager callback requested: ${urgentEscalation.reason}.`
      : baseSummary;

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

    // ── Post-call CRM sync: create Contact + Deal for normal calls ──
    let syncResult = null;
    if (workspaceId && payload.callType === "normal" && transcriptText) {
      try {
        syncResult = await syncVoiceCallToCRM(workspaceId, {
          callId: payload.callId,
          callType: payload.callType,
          callerPhone: payload.callerPhone,
          calledPhone: payload.calledPhone,
          callerName: payload.callerName,
          businessName: payload.businessName,
          transcriptText,
          transcriptTurns: payload.transcriptTurns,
          summary,
          voiceCallId: payload.callId,
          urgentEscalationReason: urgentEscalation?.reason ?? null,
        });
        console.log(`[voice-call-webhook] CRM sync result:`, syncResult);
      } catch (err) {
        // Non-fatal: the VoiceCall is already saved, CRM sync is best-effort
        console.error("[voice-call-webhook] CRM sync failed (non-fatal):", err);
      }
    }

    if (workspaceId && urgentEscalation && !existingVoiceCall) {
      const callbackTitle = payload.callerName
        ? `Urgent callback: ${payload.callerName}`
        : payload.callerPhone
          ? `Urgent callback: ${payload.callerPhone}`
          : "Urgent callback requested";
      const callbackDescription = [
        `Reason: ${urgentEscalation.reason}`,
        payload.callerPhone ? `Caller: ${payload.callerPhone}` : null,
        summary,
      ].filter(Boolean).join("\n");

      await db.task.create({
        data: {
          title: callbackTitle,
          description: callbackDescription,
          dueAt: new Date(Date.now() + 15 * 60 * 1000),
          contactId: contactId ?? syncResult?.contactId ?? undefined,
          dealId: syncResult?.dealId ?? undefined,
        },
      });
    }

    // For non-normal calls or if sync was skipped, still log activity
    if (workspaceId && transcriptText && (!syncResult || syncResult.skipped)) {
      await db.activity.create({
        data: {
          type: "CALL",
          title: urgentEscalation
            ? "Urgent callback requested"
            : payload.callType === "normal"
              ? "Voice call handled by Tracey"
              : "Earlymark AI voice call",
          content: summary,
          description: transcriptText.slice(0, 2000),
          contactId: contactId ?? undefined,
        },
      });
    }

    return NextResponse.json({
      success: true,
      crmSync: syncResult ? {
        contactId: syncResult.contactId,
        dealId: syncResult.dealId,
        contactCreated: syncResult.contactCreated,
        dealCreated: syncResult.dealCreated,
        skipped: syncResult.skipped,
      } : null,
    });
  } catch (error) {
    console.error("[voice-call-webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
