import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { runIdempotent } from "@/lib/idempotency";
import { findContactByPhone, findWorkspaceByTwilioNumber } from "@/lib/workspace-routing";
import { isVoiceAgentSecretAuthorized } from "@/lib/voice-agent-auth";
import { syncVoiceCallToCRM } from "@/lib/post-call-sync";
import { recordCallbackEvent } from "@/lib/callback-events";
import { VOICE_METRIC_KEYS, recordLatencyMetric } from "@/lib/telemetry/latency";
import {
  isSipCallConnectedStatus,
  isSipCallTerminalFailureStatus,
  normalizeSipCallStatus,
  readSipCallStatus,
} from "@/lib/sip-call-status";

export const dynamic = "force-dynamic";

function recordVoiceCallMetrics(latency: Record<string, unknown> | undefined) {
  if (!latency) return;
  const safe = (v: unknown) => (typeof v === "number" && v > 0 ? v : null);
  const byProvider = latency.llmByProvider as Record<string, Record<string, unknown>> | undefined;

  const providerKeys = {
    groq: { llm: VOICE_METRIC_KEYS.llmGroq, ttft: VOICE_METRIC_KEYS.llmGroqTtft },
    deepinfra: { llm: VOICE_METRIC_KEYS.llmDeepinfra, ttft: VOICE_METRIC_KEYS.llmDeepinfraTtft },
  } as const;
  for (const [provider, keys] of Object.entries(providerKeys)) {
    const p = byProvider?.[provider];
    if (!p || (p.turns as number) === 0) continue;
    const llmAvg = safe(p.llmAvgMs);
    const ttftAvg = safe(p.llmTtftAvgMs);
    if (llmAvg !== null) recordLatencyMetric(keys.llm, llmAvg);
    if (ttftAvg !== null) recordLatencyMetric(keys.ttft, ttftAvg);
  }

  const stt = safe(latency.sttAvgMs);
  const tts = safe(latency.ttsAvgMs);
  const ttsTtfb = safe(latency.ttsTtfbAvgMs);
  if (stt !== null) recordLatencyMetric(VOICE_METRIC_KEYS.stt, stt);
  if (tts !== null) recordLatencyMetric(VOICE_METRIC_KEYS.tts, tts);
  if (ttsTtfb !== null) recordLatencyMetric(VOICE_METRIC_KEYS.ttsTtfb, ttsTtfb);
}

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

function getNestedRecord(value: unknown, key: string) {
  if (!value || typeof value !== "object") return null;
  const candidate = (value as Record<string, unknown>)[key];
  return candidate && typeof candidate === "object" && !Array.isArray(candidate)
    ? (candidate as Record<string, unknown>)
    : null;
}

function readOptionalString(value: unknown, key: string) {
  if (!value || typeof value !== "object") return null;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "string" && candidate.trim() ? candidate.trim() : null;
}

function getSipAttributes(payload: z.infer<typeof voiceCallPayloadSchema>) {
  const raw = getNestedRecord(payload.metadata, "sipAttributes");
  if (!raw) return null;

  return Object.fromEntries(
    Object.entries(raw).flatMap(([key, value]) =>
      typeof value === "string" ? [[key, value]] : [],
    ),
  ) as Record<string, string>;
}

function deriveCallbackOutcome(params: {
  transcriptText: string;
  transcriptTurns: Array<{ role: "user" | "assistant"; text: string; createdAt: number }>;
  sipCallStatus: string | null;
}) {
  if (params.transcriptText || params.transcriptTurns.length > 0 || isSipCallConnectedStatus(params.sipCallStatus)) {
    return "answered";
  }

  const normalized = normalizeSipCallStatus(params.sipCallStatus);
  if (!normalized) return "unknown";
  if (normalized === "busy") return "busy";
  if (normalized === "no_answer") return "no_answer";
  if (normalized === "canceled" || normalized === "cancelled") return "canceled";
  if (normalized === "completed") return "completed";
  if (isSipCallTerminalFailureStatus(normalized)) return "failed";
  return "unknown";
}

function buildOutboundCallbackSummary(params: {
  callerName?: string;
  callerPhone?: string;
  transcriptText?: string;
  outcome: string;
}) {
  const callerLabel = params.callerName || params.callerPhone || "the prospect";
  const firstMeaningfulLine = (params.transcriptText || "")
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.startsWith("Caller:"));

  if (params.outcome === "answered") {
    const summaryParts = [`Tracey reached ${callerLabel}.`];
    if (firstMeaningfulLine) {
      summaryParts.push(firstMeaningfulLine.replace(/^Caller:\s*/i, "").slice(0, 180));
    }
    return summaryParts.join(" ");
  }

  if (params.outcome === "no_answer") {
    return `Tracey called ${callerLabel}, but nobody picked up.`;
  }
  if (params.outcome === "busy") {
    return `Tracey called ${callerLabel}, but the line was busy.`;
  }
  if (params.outcome === "canceled") {
    return `Tracey started a callback to ${callerLabel}, but it was canceled before it connected.`;
  }
  if (params.outcome === "completed") {
    return `Tracey's callback to ${callerLabel} completed without a usable conversation transcript.`;
  }
  if (params.outcome === "failed") {
    return `Tracey's callback to ${callerLabel} failed to connect.`;
  }
  return `Tracey attempted a callback to ${callerLabel}.`;
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
    const roomMetadata = getNestedRecord(payload.metadata, "roomMetadata");
    const isOutboundCallback = Boolean(
      roomMetadata?.outbound === true || roomMetadata?.outbound === "true",
    );
    const callbackDealId = readOptionalString(roomMetadata, "dealId");
    const callbackReason = readOptionalString(roomMetadata, "reason");
    const callbackKind = callbackReason?.startsWith("manual_recall:") ? "manual" : "automatic";
    const sipAttributes = getSipAttributes(payload);
    const sipCallStatus = readSipCallStatus(sipAttributes);
    const workspaceId = await findWorkspaceIdByCalledNumber(payload.calledPhone);
    const contactId = workspaceId ? await findContactId(workspaceId, payload.callerPhone) : null;
    const transcriptText = payload.transcriptText.trim();
    const urgentEscalation = getUrgentEscalation(payload);
    const callbackOutcome = isOutboundCallback
      ? deriveCallbackOutcome({
          transcriptText,
          transcriptTurns: payload.transcriptTurns,
          sipCallStatus,
        })
      : null;
    const persistedCallType = isOutboundCallback ? "outbound_callback" : payload.callType;
    const baseSummary = isOutboundCallback
      ? buildOutboundCallbackSummary({
          callerName: payload.callerName,
          callerPhone: payload.callerPhone,
          transcriptText,
          outcome: callbackOutcome || "unknown",
        })
      : buildSummary(payload.callType, payload.callerName, payload.callerPhone, transcriptText);
    const summary = urgentEscalation
      ? `${baseSummary} Manager callback requested: ${urgentEscalation.reason}.`
      : baseSummary;

    await db.voiceCall.upsert({
      where: { callId: payload.callId },
      update: {
        source: payload.source,
        callType: persistedCallType,
        roomName: payload.roomName,
        participantIdentity: payload.participantIdentity,
        workspaceId: workspaceId ?? undefined,
        contactId: contactId ?? undefined,
        dealId: callbackDealId || undefined,
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
        callType: persistedCallType,
        roomName: payload.roomName,
        participantIdentity: payload.participantIdentity,
        workspaceId: workspaceId ?? undefined,
        contactId: contactId ?? undefined,
        dealId: callbackDealId || undefined,
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

    recordVoiceCallMetrics(payload.latency);

    // ── Post-call side effects ─────────────────────────────────────────
    // Twilio/LiveKit retries (same callId) used to slip past the
    // findUnique-then-create dedupe and create duplicate callback events,
    // duplicate urgent-callback Tasks, and duplicate CALL Activities.
    // runIdempotent's actionExecution unique constraint on the
    // idempotencyKey makes this exactly-once per callId. bucketAt is
    // pinned to epoch so the key never expires.
    const postCallClaim = await runIdempotent<{
      crmSync: {
        contactId: string | null;
        dealId: string | null;
        contactCreated: boolean;
        dealCreated: boolean;
        skipped: boolean;
      } | null;
    }>({
      actionType: "VOICE_CALL_POST_PROCESS",
      bucketAt: new Date(0),
      parts: [payload.callId],
      resultFactory: async () => {
        if (workspaceId && isOutboundCallback && callbackOutcome) {
          await recordCallbackEvent({
            eventType: "callback_call_finished",
            payload: {
              workspaceId,
              contactId,
              contactPhone: payload.callerPhone || null,
              contactName: payload.callerName || null,
              dealId: callbackDealId,
              reason: callbackReason,
              triggerSource: "voice_agent",
              callbackKind,
              callStatus: callbackOutcome,
              providerCallSid: readOptionalString(getNestedRecord(payload.metadata, "providerCallIds"), "twilioCallSid"),
            },
          });
        }

        let syncResult: Awaited<ReturnType<typeof syncVoiceCallToCRM>> | null = null;
        if (workspaceId && payload.callType === "normal" && transcriptText && !isOutboundCallback) {
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
            console.error("[voice-call-webhook] CRM sync failed (non-fatal):", err);
          }
        }

        if (workspaceId && urgentEscalation) {
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

        if (workspaceId && transcriptText && (!syncResult || syncResult.skipped) && !isOutboundCallback) {
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

        return {
          crmSync: syncResult ? {
            contactId: syncResult.contactId,
            dealId: syncResult.dealId,
            contactCreated: syncResult.contactCreated,
            dealCreated: syncResult.dealCreated,
            skipped: syncResult.skipped,
          } : null,
        };
      },
    });

    return NextResponse.json({
      success: true,
      duplicate: !postCallClaim.created,
      crmSync: postCallClaim.result?.crmSync ?? null,
    });
  } catch (error) {
    console.error("[voice-call-webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
