import { db } from "@/lib/db";
import { phoneMatches, normalizePhone } from "@/lib/phone-utils";
import { twilioMasterClient } from "@/lib/twilio";
import type { RuntimeStatus } from "@/lib/voice-fleet";
import {
  getVoiceMonitorProbeCallTimeoutSeconds,
  getVoiceMonitorProbeMaxWaitSeconds,
  getVoiceMonitorProbePostSayPauseSeconds,
} from "@/lib/voice-monitor-config";

const TERMINAL_CALL_STATUSES = new Set(["completed", "busy", "failed", "no-answer", "canceled"]);
const FAILURE_CALL_STATUSES = new Set(["busy", "failed", "no-answer", "canceled"]);
const CALL_POLL_INTERVAL_MS = 2_000;
const TRANSCRIPT_POLL_INTERVAL_MS = 2_000;
const PROBE_TRANSCRIPT_PHRASE = "voice monitor probe";
const PROBE_TWILIO_VOICE = "Polly.Nicole";
const PROBE_TWILIO_LANGUAGE = "en-AU";

type TwilioCallSnapshot = {
  sid: string;
  status?: string | null;
  duration?: string | null;
  dateCreated?: Date | null;
  dateUpdated?: Date | null;
  startTime?: Date | null;
  endTime?: Date | null;
};

export type SpokenCanaryVerification = {
  callId: string | null;
  createdAt: string | null;
  heardProbePhrase: boolean;
  capturedCallerSpeech: boolean;
  capturedAssistantSpeech: boolean;
  heardGreeting: boolean;
  transcriptExcerpt: string | null;
};

export type VoiceSpokenCanaryResult = {
  status: RuntimeStatus;
  summary: string;
  warnings: string[];
  mode: "gateway_only" | "pstn_spoken";
  configured: boolean;
  supported: boolean;
  probeCaller: string;
  targetNumber: string;
  callSid: string | null;
  callStatus: string | null;
  durationSeconds: number | null;
  expectedPhrase: string;
  verification: SpokenCanaryVerification | null;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildProbePhrase() {
  return "Hello Tracey. Voice monitor probe. Can you hear me?";
}

function buildProbeTwiml(phrase: string) {
  const pauseSeconds = getVoiceMonitorProbePostSayPauseSeconds();
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1" />
  <Say language="${PROBE_TWILIO_LANGUAGE}" voice="${PROBE_TWILIO_VOICE}">${escapeXml(phrase)}</Say>
  <Pause length="${pauseSeconds}" />
  <Hangup />
</Response>`;
}

function normalizeTranscriptText(value: string) {
  return value
    .toLowerCase()
    .replace(/tracey/g, "tracy")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function transcriptHeardProbePhrase(transcript: string) {
  const normalizedTranscript = normalizeTranscriptText(transcript);
  if (normalizedTranscript.includes(PROBE_TRANSCRIPT_PHRASE)) {
    return true;
  }

  const hasGreeting = normalizedTranscript.includes("hello tracy");
  const hasMonitorProbe =
    normalizedTranscript.includes("monitor probe") ||
    (normalizedTranscript.includes("voice monitor") && normalizedTranscript.includes("probe"));

  return hasGreeting && hasMonitorProbe;
}

function parseDurationSeconds(value?: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function waitForTerminalCallStatus(callSid: string, maxWaitMs: number) {
  if (!twilioMasterClient) return null;

  const deadline = Date.now() + maxWaitMs;
  let latest = await twilioMasterClient.calls(callSid).fetch() as TwilioCallSnapshot;

  while (latest?.status && !TERMINAL_CALL_STATUSES.has(latest.status.toLowerCase()) && Date.now() < deadline) {
    await sleep(Math.max(1, Math.min(CALL_POLL_INTERVAL_MS, deadline - Date.now())));
    latest = await twilioMasterClient.calls(callSid).fetch() as TwilioCallSnapshot;
  }

  return latest;
}

async function findVoiceCallVerification(params: {
  probeCaller: string;
  targetNumber: string;
  startedAt: Date;
}) {
  const candidates = await db.voiceCall.findMany({
    where: {
      OR: [
        {
          createdAt: {
            gte: new Date(params.startedAt.getTime() - 60_000),
          },
        },
        {
          startedAt: {
            gte: new Date(params.startedAt.getTime() - 2 * 60_000),
          },
        },
      ],
      callType: { in: ["inbound_demo", "normal"] },
    },
    select: {
      callId: true,
      createdAt: true,
      startedAt: true,
      callerPhone: true,
      calledPhone: true,
      transcriptText: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const matchedCall = candidates.find((candidate) => {
    const matchedTimestamp = candidate.startedAt || candidate.createdAt;
    return (
      matchedTimestamp >= new Date(params.startedAt.getTime() - 60_000) &&
      phoneMatches(candidate.callerPhone, params.probeCaller) &&
      phoneMatches(candidate.calledPhone, params.targetNumber)
    );
  });

  if (!matchedCall) {
    return null;
  }

  const transcript = matchedCall.transcriptText || "";

  return {
    callId: matchedCall.callId,
    createdAt: matchedCall.createdAt.toISOString(),
    heardProbePhrase: transcriptHeardProbePhrase(transcript),
    capturedCallerSpeech: /Caller:/i.test(transcript),
    capturedAssistantSpeech: /Tracey:/i.test(transcript),
    heardGreeting: /Tracey/i.test(transcript),
    transcriptExcerpt: transcript ? transcript.slice(0, 400) : null,
  } satisfies SpokenCanaryVerification;
}

async function waitForVoiceCallVerification(params: {
  probeCaller: string;
  targetNumber: string;
  startedAt: Date;
  maxWaitMs: number;
}) {
  const deadline = Date.now() + params.maxWaitMs;
  let verification = await findVoiceCallVerification(params);

  while (!verification && Date.now() < deadline) {
    await sleep(Math.max(1, Math.min(TRANSCRIPT_POLL_INTERVAL_MS, deadline - Date.now())));
    verification = await findVoiceCallVerification(params);
  }

  return verification;
}

export async function runVoiceSpokenPstnCanary(params: {
  probeCaller: string;
  targetNumber: string;
  checkedAt?: Date;
}): Promise<VoiceSpokenCanaryResult> {
  const probeCaller = normalizePhone(params.probeCaller);
  const targetNumber = normalizePhone(params.targetNumber);
  const expectedPhrase = buildProbePhrase();

  if (!probeCaller || !targetNumber) {
    return {
      status: "degraded",
      summary: "Real PSTN spoken canary is not fully configured because the probe caller or target number is missing.",
      warnings: ["Configure both VOICE_MONITOR_PROBE_CALLER_NUMBER and a target number for the spoken PSTN canary."],
      mode: "gateway_only",
      configured: false,
      supported: Boolean(twilioMasterClient),
      probeCaller,
      targetNumber,
      callSid: null,
      callStatus: null,
      durationSeconds: null,
      expectedPhrase,
      verification: null,
    };
  }

  if (!twilioMasterClient) {
    return {
      status: "degraded",
      summary: "Real PSTN spoken canary is not available because the Twilio master client is not configured.",
      warnings: ["TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN are required for the spoken PSTN canary."],
      mode: "gateway_only",
      configured: true,
      supported: false,
      probeCaller,
      targetNumber,
      callSid: null,
      callStatus: null,
      durationSeconds: null,
      expectedPhrase,
      verification: null,
    };
  }

  if (phoneMatches(probeCaller, targetNumber)) {
    return {
      status: "degraded",
      summary: "Real PSTN spoken canary is not safe because the probe caller and target number are the same.",
      warnings: ["Use a distinct Twilio-owned or verified outgoing caller ID for VOICE_MONITOR_PROBE_CALLER_NUMBER."],
      mode: "gateway_only",
      configured: true,
      supported: true,
      probeCaller,
      targetNumber,
      callSid: null,
      callStatus: null,
      durationSeconds: null,
      expectedPhrase,
      verification: null,
    };
  }

  const startedAt = params.checkedAt || new Date();

  try {
    const createdCall = await twilioMasterClient.calls.create({
      to: targetNumber,
      from: probeCaller,
      timeout: getVoiceMonitorProbeCallTimeoutSeconds(),
      twiml: buildProbeTwiml(expectedPhrase),
    }) as TwilioCallSnapshot;

    const terminalCall = await waitForTerminalCallStatus(
      createdCall.sid,
      getVoiceMonitorProbeMaxWaitSeconds() * 1_000,
    );
    const callStatus = (terminalCall?.status || createdCall.status || "").toLowerCase() || null;
    const durationSeconds = parseDurationSeconds(terminalCall?.duration || createdCall.duration || null);

    if (!terminalCall || !callStatus) {
      return {
        status: "unhealthy",
        summary: "Real PSTN spoken canary could not confirm a terminal Twilio call status in time.",
        warnings: ["The Twilio probe call did not settle to a terminal status before the canary timeout."],
        mode: "pstn_spoken",
        configured: true,
        supported: true,
        probeCaller,
        targetNumber,
        callSid: createdCall.sid,
        callStatus,
        durationSeconds,
        expectedPhrase,
        verification: null,
      };
    }

    if (FAILURE_CALL_STATUSES.has(callStatus)) {
      return {
        status: "unhealthy",
        summary: `Real PSTN spoken canary call failed with Twilio status ${callStatus}.`,
        warnings: [`The probe call to ${targetNumber} ended as ${callStatus}.`],
        mode: "pstn_spoken",
        configured: true,
        supported: true,
        probeCaller,
        targetNumber,
        callSid: createdCall.sid,
        callStatus,
        durationSeconds,
        expectedPhrase,
        verification: null,
      };
    }

    const verification = await waitForVoiceCallVerification({
      probeCaller,
      targetNumber,
      startedAt,
      maxWaitMs: getVoiceMonitorProbeMaxWaitSeconds() * 1_000,
    });

    if (!verification) {
      return {
        status: "unhealthy",
        summary: "Real PSTN spoken canary completed, but no matching persisted voice call was found.",
        warnings: ["The probe call reached Twilio completion, but the app did not persist a matching VoiceCall record in time."],
        mode: "pstn_spoken",
        configured: true,
        supported: true,
        probeCaller,
        targetNumber,
        callSid: createdCall.sid,
        callStatus,
        durationSeconds,
        expectedPhrase,
        verification: null,
      };
    }

    const healthyExchange =
      verification.heardProbePhrase &&
      verification.capturedCallerSpeech &&
      verification.capturedAssistantSpeech;
    const partialExchange = verification.capturedCallerSpeech && verification.capturedAssistantSpeech;

    return {
      status: healthyExchange ? "healthy" : partialExchange ? "degraded" : "unhealthy",
      summary: healthyExchange
        ? "Real PSTN spoken canary placed a successful inbound call and captured both caller and Tracey speech."
        : partialExchange
          ? "Real PSTN spoken canary completed, but the transcript did not clearly capture the expected probe phrase."
          : "Real PSTN spoken canary completed, but the transcript did not show a complete spoken exchange.",
      warnings:
        healthyExchange
          ? []
          : [
              partialExchange
                ? "The spoken canary call persisted, but transcript matching for the probe phrase was incomplete."
                : "The spoken canary call did not capture both caller and Tracey speech in the persisted transcript.",
            ],
      mode: "pstn_spoken",
      configured: true,
      supported: true,
      probeCaller,
      targetNumber,
      callSid: createdCall.sid,
      callStatus,
      durationSeconds,
      expectedPhrase,
      verification,
    };
  } catch (error) {
    return {
      status: "unhealthy",
      summary: `Real PSTN spoken canary failed to originate a Twilio call: ${error instanceof Error ? error.message : String(error)}.`,
      warnings: ["Verify that VOICE_MONITOR_PROBE_CALLER_NUMBER is a Twilio-owned or verified outgoing caller ID."],
      mode: "pstn_spoken",
      configured: true,
      supported: true,
      probeCaller,
      targetNumber,
      callSid: null,
      callStatus: null,
      durationSeconds: null,
      expectedPhrase,
      verification: null,
    };
  }
}
