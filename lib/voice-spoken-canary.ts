import { db } from "@/lib/db";
import { getEarlymarkInboundSipUri } from "@/lib/livekit-sip-config";
import { phoneMatches, normalizePhone } from "@/lib/phone-utils";
import { twilioMasterClient } from "@/lib/twilio";
import type { RuntimeStatus } from "@/lib/voice-fleet";
import {
  getVoiceMonitorProbeBusyRetryCount,
  getVoiceMonitorProbeBusyRetryDelaySeconds,
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
  mode: "gateway_only" | "pstn_spoken" | "sip_direct";
  configured: boolean;
  supported: boolean;
  probeCaller: string;
  targetNumber: string;
  callSid: string | null;
  callStatus: string | null;
  durationSeconds: number | null;
  expectedPhrase: string;
  verification: SpokenCanaryVerification | null;
  fallbackReason: string | null;
  attempts: Array<{
    mode: "pstn_spoken" | "sip_direct";
    target: string;
    callSid: string | null;
    callStatus: string | null;
    durationSeconds: number | null;
  }>;
};

type VoiceCallVerificationCandidate = {
  callId: string;
  createdAt: Date;
  startedAt: Date | null;
  callerPhone: string | null;
  calledPhone: string | null;
  participantIdentity: string;
  transcriptText: string | null;
  metadata: unknown;
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function extractProviderCallIds(metadata: unknown) {
  const root = isRecord(metadata) ? metadata : null;
  const providerCallIds = isRecord(root?.providerCallIds) ? root.providerCallIds : null;
  const roomMetadata = isRecord(root?.roomMetadata) ? root.roomMetadata : null;
  const sipAttributes = isRecord(root?.sipAttributes) ? root.sipAttributes : null;

  return {
    twilioCallSid:
      readString(providerCallIds?.twilioCallSid) ||
      readString(roomMetadata?.twilioCallSid) ||
      readString(roomMetadata?.callSid) ||
      readString(sipAttributes?.["twilio.callSid"]) ||
      readString(sipAttributes?.callSid),
    sipCallId:
      readString(providerCallIds?.sipCallId) ||
      readString(sipAttributes?.["sip.callID"]) ||
      readString(sipAttributes?.["sip.callId"]) ||
      readString(sipAttributes?.["sip.call_id"]) ||
      readString(sipAttributes?.["sip.callSid"]) ||
      readString(sipAttributes?.["sip.call_sid"]),
  };
}

function buildVerification(candidate: VoiceCallVerificationCandidate): SpokenCanaryVerification {
  const transcript = candidate.transcriptText || "";

  return {
    callId: candidate.callId,
    createdAt: candidate.createdAt.toISOString(),
    heardProbePhrase: transcriptHeardProbePhrase(transcript),
    capturedCallerSpeech: /Caller:/i.test(transcript),
    capturedAssistantSpeech: /Tracey:/i.test(transcript),
    heardGreeting: /Tracey/i.test(transcript),
    transcriptExcerpt: transcript ? transcript.slice(0, 400) : null,
  };
}

function scoreCandidate(
  candidate: VoiceCallVerificationCandidate,
  verification: SpokenCanaryVerification,
  params: {
    probeCaller: string;
    targetNumber: string;
    startedAt: Date;
    callSid?: string | null;
  },
) {
  if (!phoneMatches(candidate.callerPhone, params.probeCaller) || !phoneMatches(candidate.calledPhone, params.targetNumber)) {
    return -1;
  }

  const matchedTimestamp = candidate.startedAt || candidate.createdAt;
  const deltaMs = Math.abs(matchedTimestamp.getTime() - params.startedAt.getTime());
  if (deltaMs > 5 * 60_000) {
    return -1;
  }

  const providerCallIds = extractProviderCallIds(candidate.metadata);
  let score = Math.max(0, 300 - Math.round(deltaMs / 1000));

  if (params.callSid && providerCallIds.twilioCallSid === params.callSid) score += 1_000;
  if (verification.heardProbePhrase) score += 100;
  if (verification.capturedCallerSpeech) score += 30;
  if (verification.capturedAssistantSpeech) score += 30;
  if (verification.heardGreeting) score += 10;
  if (/probe/i.test(candidate.participantIdentity || "")) score += 5;

  return score;
}

function parseDurationSeconds(value?: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

async function startProbeCall(params: {
  to: string;
  from: string;
  expectedPhrase: string;
}) {
  if (!twilioMasterClient) {
    return null;
  }

  return twilioMasterClient.calls.create({
    to: params.to,
    from: params.from,
    timeout: getVoiceMonitorProbeCallTimeoutSeconds(),
    twiml: buildProbeTwiml(params.expectedPhrase),
  }) as Promise<TwilioCallSnapshot>;
}

function buildAttempt(params: {
  mode: "pstn_spoken" | "sip_direct";
  target: string;
  callSid: string | null;
  callStatus: string | null;
  durationSeconds: number | null;
}) {
  return params;
}

async function runProbeAttempt(params: {
  mode: "pstn_spoken" | "sip_direct";
  target: string;
  probeCaller: string;
  expectedPhrase: string;
  maxWaitMs: number;
}) {
  const createdCall = await startProbeCall({
    to: params.target,
    from: params.probeCaller,
    expectedPhrase: params.expectedPhrase,
  });

  if (!createdCall) {
    return null;
  }

  const terminalCall = await waitForTerminalCallStatus(createdCall.sid, params.maxWaitMs);
  const callStatus = (terminalCall?.status || createdCall.status || "").toLowerCase() || null;
  const durationSeconds = parseDurationSeconds(terminalCall?.duration || createdCall.duration || null);

  return {
    createdCall,
    terminalCall,
    attempt: buildAttempt({
      mode: params.mode,
      target: params.target,
      callSid: createdCall.sid,
      callStatus,
      durationSeconds,
    }),
  };
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
  callSid?: string | null;
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
      participantIdentity: true,
      transcriptText: true,
      metadata: true,
    },
    orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
    take: 40,
  });

  const matchedCall = candidates
    .map((candidate) => {
      const verification = buildVerification(candidate);
      return {
        candidate,
        verification,
        score: scoreCandidate(candidate, verification, params),
      };
    })
    .filter((entry) => entry.score >= 0)
    .sort((left, right) => right.score - left.score)[0];

  if (!matchedCall) {
    return null;
  }

  return matchedCall.verification;
}

async function waitForVoiceCallVerification(params: {
  probeCaller: string;
  targetNumber: string;
  startedAt: Date;
  maxWaitMs: number;
  callSid?: string | null;
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
      fallbackReason: null,
      attempts: [],
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
      fallbackReason: null,
      attempts: [],
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
      fallbackReason: null,
      attempts: [],
    };
  }

  const startedAt = params.checkedAt || new Date();
  const maxWaitMs = getVoiceMonitorProbeMaxWaitSeconds() * 1_000;

  try {
    const initialAttempt = await runProbeAttempt({
      mode: "pstn_spoken",
      target: targetNumber,
      probeCaller,
      expectedPhrase,
      maxWaitMs,
    });
    if (!initialAttempt) {
      throw new Error("Twilio is not configured for the spoken PSTN canary.");
    }
    let createdCall = initialAttempt.createdCall;
    let terminalCall = initialAttempt.terminalCall;
    let callStatus = initialAttempt.attempt.callStatus;
    let durationSeconds = initialAttempt.attempt.durationSeconds;
    const attempts = [initialAttempt.attempt];
    let retrySucceeded = false;
    let retryCountUsed = 0;

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
        fallbackReason: null,
        attempts,
      };
    }

    if (callStatus === "busy") {
      const maxBusyRetries = getVoiceMonitorProbeBusyRetryCount();
      const retryDelayMs = getVoiceMonitorProbeBusyRetryDelaySeconds() * 1_000;

      for (let retryIndex = 0; retryIndex < maxBusyRetries; retryIndex += 1) {
        if (retryDelayMs > 0) {
          await sleep(retryDelayMs);
        }

        const retryAttempt = await runProbeAttempt({
          mode: "pstn_spoken",
          target: targetNumber,
          probeCaller,
          expectedPhrase,
          maxWaitMs,
        });
        retryCountUsed += 1;
        if (!retryAttempt) {
          break;
        }

        attempts.push(retryAttempt.attempt);
        createdCall = retryAttempt.createdCall;
        terminalCall = retryAttempt.terminalCall;
        callStatus = retryAttempt.attempt.callStatus;
        durationSeconds = retryAttempt.attempt.durationSeconds;

        if (terminalCall && callStatus && !FAILURE_CALL_STATUSES.has(callStatus)) {
          retrySucceeded = true;
          break;
        }

        if (callStatus !== "busy") {
          break;
        }
      }
    }

    if (callStatus && FAILURE_CALL_STATUSES.has(callStatus)) {
      const sipTarget = getEarlymarkInboundSipUri(targetNumber);
      if (sipTarget) {
        const sipAttempt = await runProbeAttempt({
          mode: "sip_direct",
          target: sipTarget,
          probeCaller,
          expectedPhrase,
          maxWaitMs,
        });
        const sipCreatedCall = sipAttempt?.createdCall || null;
        const sipTerminalCall = sipAttempt?.terminalCall || null;
        const sipCallStatus = sipAttempt?.attempt.callStatus || null;
        const sipDurationSeconds = sipAttempt?.attempt.durationSeconds || null;
        if (sipAttempt) {
          attempts.push(sipAttempt.attempt);
        }

        if (sipTerminalCall && sipCallStatus && !FAILURE_CALL_STATUSES.has(sipCallStatus)) {
          const verification = await waitForVoiceCallVerification({
            probeCaller,
            targetNumber,
            startedAt,
            maxWaitMs,
            callSid: sipCreatedCall?.sid || null,
          });

          if (verification) {
            const healthyExchange =
              verification.heardProbePhrase &&
              verification.capturedCallerSpeech &&
              verification.capturedAssistantSpeech;
            const partialExchange = verification.capturedCallerSpeech && verification.capturedAssistantSpeech;

            return {
              status: "degraded",
              summary: healthyExchange
                ? `Real PSTN spoken canary hit Twilio status ${callStatus}, but direct SIP fallback reached the voice agent and captured both caller and Tracey speech.`
                : partialExchange
                  ? `Real PSTN spoken canary hit Twilio status ${callStatus}, and direct SIP fallback completed with only a partial transcript match.`
                  : `Real PSTN spoken canary hit Twilio status ${callStatus}, and direct SIP fallback completed without a full spoken exchange in the transcript.`,
              warnings: [
                `The PSTN probe call to ${targetNumber} ended as ${callStatus}.`,
                healthyExchange
                  ? "Direct SIP fallback succeeded, so the voice agent path is reachable even though the PSTN number leg is degraded."
                  : partialExchange
                    ? "Direct SIP fallback reached the voice agent, but the transcript did not clearly capture the expected probe phrase."
                    : "Direct SIP fallback did not capture both caller and Tracey speech in the persisted transcript.",
              ],
              mode: "sip_direct",
              configured: true,
              supported: true,
              probeCaller,
              targetNumber,
              callSid: sipCreatedCall?.sid || null,
              callStatus: sipCallStatus,
              durationSeconds: sipDurationSeconds,
              expectedPhrase,
              verification,
              fallbackReason: `pstn_${callStatus}`,
              attempts,
            };
          }
        }

        return {
          status: "unhealthy",
          summary: `Real PSTN spoken canary call failed with Twilio status ${callStatus}, and direct SIP fallback did not verify the voice agent path.`,
          warnings: [
            `The PSTN probe call to ${targetNumber} ended as ${callStatus}.`,
            sipCallStatus
              ? `The direct SIP fallback attempt ended as ${sipCallStatus}.`
              : "The direct SIP fallback attempt did not settle to a verified terminal status.",
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
          verification: null,
          fallbackReason: `pstn_${callStatus}`,
          attempts,
        };
      }

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
        fallbackReason: null,
        attempts,
      };
    }

    const verification = await waitForVoiceCallVerification({
      probeCaller,
      targetNumber,
      startedAt,
      maxWaitMs,
      callSid: createdCall.sid,
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
        fallbackReason: null,
        attempts,
      };
    }

    const healthyExchange =
      verification.heardProbePhrase &&
      verification.capturedCallerSpeech &&
      verification.capturedAssistantSpeech;
    const partialExchange = verification.capturedCallerSpeech && verification.capturedAssistantSpeech;

    return {
      status: healthyExchange
        ? "healthy"
        : partialExchange
          ? "degraded"
          : "unhealthy",
      summary: healthyExchange
        ? retrySucceeded
          ? `Real PSTN spoken canary placed a successful inbound call after ${retryCountUsed} retry and captured both caller and Tracey speech.`
          : "Real PSTN spoken canary placed a successful inbound call and captured both caller and Tracey speech."
        : partialExchange
          ? "Real PSTN spoken canary completed, but the transcript did not clearly capture the expected probe phrase."
          : "Real PSTN spoken canary completed, but the transcript did not show a complete spoken exchange.",
      warnings:
        healthyExchange
          ? retrySucceeded
            ? [`The PSTN probe needed ${retryCountUsed} retry after a busy response before succeeding.`]
            : []
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
      fallbackReason: retrySucceeded ? "pstn_busy_retry" : null,
      attempts,
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
      fallbackReason: null,
      attempts: [],
    };
  }
}
