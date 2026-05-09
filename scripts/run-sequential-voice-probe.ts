import path from "path";
import dotenv from "dotenv";
import { normalizePhone, phoneMatches } from "../lib/phone-utils";
import {
  getVoiceMonitorProbeCallTimeoutSeconds,
  getVoiceMonitorProbeMaxWaitSeconds,
  getVoiceMonitorProbePostSayPauseSeconds,
} from "../lib/voice-monitor-config";

const TERMINAL_CALL_STATUSES = new Set(["completed", "busy", "failed", "no-answer", "canceled"]);
const FAILURE_CALL_STATUSES = new Set(["busy", "failed", "no-answer", "canceled"]);
const CALL_POLL_INTERVAL_MS = 2_000;
const DB_POLL_INTERVAL_MS = 2_000;
const DEFAULT_COUNT = 3;
const DEFAULT_DELAY_MS = 4_000;
const DEFAULT_INITIAL_PAUSE_SECONDS = 1;
const DEFAULT_PROBE_VOICE = "Polly.Nicole";
const DEFAULT_PROBE_LANGUAGE = "en-AU";
const DEFAULT_PHRASE =
  "Hi Tracey. Quick test today. In one sentence, what does Earlymark AI do for missed calls and new leads?";

dotenv.config({ path: path.resolve(process.cwd(), ".env") });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true });

type TwilioCallSnapshot = {
  sid: string;
  status?: string | null;
  duration?: string | null;
};

type ProbeRunResult = {
  index: number;
  callSid: string | null;
  callStatus: string | null;
  durationSeconds: number | null;
  callId: string | null;
  callType: string | null;
  ttsTtfbAvgMs: number | null;
  ttsDefaultInstanceReused: boolean | null;
  ttsDefaultInstanceAgeMs: number | null;
  ttsDefaultInstanceSource: string | null;
  ttsDefaultInstancePrewarmed: boolean | null;
  firstTurnStartMs: number | null;
  totalTurnStartAvgMs: number | null;
  llmTtftAvgMs: number | null;
  transcriptExcerpt: string | null;
  summary: string;
  error?: string;
};

function getArgValue(flag: string): string | null {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

function parsePositiveInt(value: string | null | undefined, fallback: number): number {
  const parsed = Number.parseInt((value || "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

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

function buildProbeTwiml(phrase: string, initialPauseSeconds: number) {
  const pauseSeconds = getVoiceMonitorProbePostSayPauseSeconds();
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="${initialPauseSeconds}" />
  <Say language="${DEFAULT_PROBE_LANGUAGE}" voice="${DEFAULT_PROBE_VOICE}">${escapeXml(phrase)}</Say>
  <Pause length="${pauseSeconds}" />
  <Hangup />
</Response>`;
}

function parseDurationSeconds(value?: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
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
  };
}

async function waitForTerminalCallStatus(
  twilioMasterClient: Awaited<typeof import("../lib/twilio")>["twilioMasterClient"],
  callSid: string,
  maxWaitMs: number,
) {
  if (!twilioMasterClient) return null;

  const deadline = Date.now() + maxWaitMs;
  let latest = (await twilioMasterClient.calls(callSid).fetch()) as TwilioCallSnapshot;

  while (latest?.status && !TERMINAL_CALL_STATUSES.has(latest.status.toLowerCase()) && Date.now() < deadline) {
    await sleep(Math.max(1, Math.min(CALL_POLL_INTERVAL_MS, deadline - Date.now())));
    latest = (await twilioMasterClient.calls(callSid).fetch()) as TwilioCallSnapshot;
  }

  return latest;
}

async function findPersistedVoiceCall(params: {
  db: Awaited<typeof import("../lib/db")>["db"];
  startedAt: Date;
  callSid: string;
  caller: string;
  target: string;
  seenCallIds: Set<string>;
}) {
  const candidates = await params.db.voiceCall.findMany({
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
      callType: { in: ["inbound_demo", "normal", "demo"] },
    },
    select: {
      callId: true,
      callType: true,
      createdAt: true,
      startedAt: true,
      callerPhone: true,
      calledPhone: true,
      transcriptText: true,
      summary: true,
      latency: true,
      metadata: true,
    },
    orderBy: [{ startedAt: "desc" }, { createdAt: "desc" }],
    take: 40,
  });

  const matched = candidates
    .map((candidate) => {
      const providerCallIds = extractProviderCallIds(candidate.metadata);
      const startedOrCreatedAt = candidate.startedAt || candidate.createdAt;
      let score = 0;

      if (params.seenCallIds.has(candidate.callId)) score -= 20_000;
      if (providerCallIds.twilioCallSid === params.callSid) score += 10_000;
      if (phoneMatches(candidate.callerPhone, params.caller)) score += 300;
      if (phoneMatches(candidate.calledPhone, params.target)) score += 300;

      const createdDeltaMs = candidate.createdAt.getTime() - params.startedAt.getTime();
      if (createdDeltaMs >= -10_000) {
        score += 2_000;
      } else {
        score -= 2_000;
      }

      const deltaMs = Math.abs(startedOrCreatedAt.getTime() - params.startedAt.getTime());
      if (deltaMs > 5 * 60_000) score -= 5_000;
      score += Math.max(0, 300 - Math.round(deltaMs / 1_000));

      if (candidate.latency && isRecord(candidate.latency) && readNumber(candidate.latency.ttsTtfbAvgMs) !== null) {
        score += 200;
      }

      return { candidate, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score)[0];

  return matched?.candidate || null;
}

async function waitForPersistedVoiceCall(params: {
  db: Awaited<typeof import("../lib/db")>["db"];
  startedAt: Date;
  callSid: string;
  caller: string;
  target: string;
  maxWaitMs: number;
  seenCallIds: Set<string>;
}) {
  const deadline = Date.now() + params.maxWaitMs;
  let voiceCall = await findPersistedVoiceCall(params);

  while (
    (!voiceCall || !isRecord(voiceCall.latency) || readNumber(voiceCall.latency.ttsTtfbAvgMs) === null) &&
    Date.now() < deadline
  ) {
    await sleep(Math.max(1, Math.min(DB_POLL_INTERVAL_MS, deadline - Date.now())));
    voiceCall = await findPersistedVoiceCall(params);
  }

  return voiceCall;
}

function summarizeTranscript(transcript: string | null | undefined) {
  if (!transcript) return null;
  return transcript.replace(/\s+/g, " ").trim().slice(0, 220) || null;
}

function buildRunResult(index: number, params: {
  callSid: string | null;
  callStatus: string | null;
  durationSeconds: number | null;
  voiceCall: Awaited<ReturnType<typeof waitForPersistedVoiceCall>> | null;
  fallbackSummary: string;
  error?: string;
}): ProbeRunResult {
  const latency = isRecord(params.voiceCall?.latency) ? params.voiceCall?.latency : null;
  return {
    index,
    callSid: params.callSid,
    callStatus: params.callStatus,
    durationSeconds: params.durationSeconds,
    callId: params.voiceCall?.callId || null,
    callType: params.voiceCall?.callType || null,
    ttsTtfbAvgMs: readNumber(latency?.ttsTtfbAvgMs),
    ttsDefaultInstanceReused: readBoolean(latency?.ttsDefaultInstanceReused),
    ttsDefaultInstanceAgeMs: readNumber(latency?.ttsDefaultInstanceAgeMs),
    ttsDefaultInstanceSource: readString(latency?.ttsDefaultInstanceSource),
    ttsDefaultInstancePrewarmed: readBoolean(latency?.ttsDefaultInstancePrewarmed),
    firstTurnStartMs: readNumber(latency?.firstTurnStartMs),
    totalTurnStartAvgMs: readNumber(latency?.totalTurnStartAvgMs),
    llmTtftAvgMs: readNumber(latency?.llmTtftAvgMs),
    transcriptExcerpt: summarizeTranscript(params.voiceCall?.transcriptText),
    summary: params.voiceCall?.summary || params.fallbackSummary,
    error: params.error,
  };
}

function avg(values: Array<number | null>) {
  const filtered = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (filtered.length === 0) return null;
  return Math.round(filtered.reduce((sum, value) => sum + value, 0) / filtered.length);
}

function countWhere<T>(values: T[], predicate: (value: T) => boolean) {
  return values.reduce((count, value) => (predicate(value) ? count + 1 : count), 0);
}

function printRun(result: ProbeRunResult) {
  console.log(`\nRun ${result.index}`);
  console.log(`  callSid: ${result.callSid || "n/a"}`);
  console.log(`  status: ${result.callStatus || "n/a"} | duration: ${result.durationSeconds ?? "n/a"}s`);
  console.log(`  callId: ${result.callId || "n/a"} | callType: ${result.callType || "n/a"}`);
  console.log(
    `  latency: reused=${result.ttsDefaultInstanceReused ?? "n/a"} ageMs=${result.ttsDefaultInstanceAgeMs ?? "n/a"} source=${result.ttsDefaultInstanceSource ?? "n/a"} prewarmed=${result.ttsDefaultInstancePrewarmed ?? "n/a"} ttsTtfb=${result.ttsTtfbAvgMs ?? "n/a"} firstTurn=${result.firstTurnStartMs ?? "n/a"} totalTurnStart=${result.totalTurnStartAvgMs ?? "n/a"} llmTtft=${result.llmTtftAvgMs ?? "n/a"}`,
  );
  console.log(`  summary: ${result.summary}`);
  if (result.transcriptExcerpt) {
    console.log(`  transcript: ${result.transcriptExcerpt}`);
  }
  if (result.error) {
    console.log(`  error: ${result.error}`);
  }
}

async function main() {
  const [{ db }, { twilioMasterClient }] = await Promise.all([
    import("../lib/db"),
    import("../lib/twilio"),
  ]);
  const count = parsePositiveInt(getArgValue("--count"), DEFAULT_COUNT);
  const delayMs = parsePositiveInt(getArgValue("--delay-ms"), DEFAULT_DELAY_MS);
  const initialPauseSeconds = parsePositiveInt(
    getArgValue("--initial-pause-seconds"),
    DEFAULT_INITIAL_PAUSE_SECONDS,
  );
  const phrase = (getArgValue("--phrase") || process.env.VOICE_ONEOFF_PROBE_PHRASE || DEFAULT_PHRASE).trim();
  const caller = normalizePhone(
    getArgValue("--caller") ||
    process.env.VOICE_MONITOR_PROBE_CALLER_NUMBER ||
    process.env.VOICE_ALERT_SMS_TO ||
    "",
  );
  const target = normalizePhone(
    getArgValue("--target") ||
    process.env.VOICE_MONITOR_PROBE_TARGET_NUMBER ||
    "",
  );
  const dryRun = hasFlag("--dry-run");
  const maxWaitMs = getVoiceMonitorProbeMaxWaitSeconds() * 1_000;
  const callTimeoutSeconds = getVoiceMonitorProbeCallTimeoutSeconds();

  console.log("# Sequential Voice Probe");
  console.log(`count=${count} delayMs=${delayMs} initialPauseSeconds=${initialPauseSeconds} maxWaitMs=${maxWaitMs} callTimeoutSeconds=${callTimeoutSeconds}`);
  console.log(`callerConfigured=${Boolean(caller)} targetConfigured=${Boolean(target)} twilioConfigured=${Boolean(twilioMasterClient)} dbConfigured=${Boolean(process.env.DATABASE_URL)}`);
  console.log(`phrase=${JSON.stringify(phrase)}`);

  if (!caller || !target) {
    throw new Error("Missing caller or target. Set VOICE_MONITOR_PROBE_CALLER_NUMBER and VOICE_MONITOR_PROBE_TARGET_NUMBER, or pass --caller/--target.");
  }

  if (phoneMatches(caller, target)) {
    throw new Error("Caller and target resolve to the same number. Use distinct numbers.");
  }

  if (!twilioMasterClient) {
    throw new Error("Twilio master client is not configured. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN.");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not configured, so persisted VoiceCall rows cannot be inspected.");
  }

  if (dryRun) {
    console.log("Dry run only. No calls placed.");
    return;
  }

  const results: ProbeRunResult[] = [];
  const seenCallIds = new Set<string>();

  for (let index = 1; index <= count; index += 1) {
    console.log(`\nPlacing run ${index}/${count}...`);
    const startedAt = new Date();
    const createdCall = await twilioMasterClient.calls.create({
      to: target,
      from: caller,
      timeout: callTimeoutSeconds,
      twiml: buildProbeTwiml(phrase, initialPauseSeconds),
    }) as TwilioCallSnapshot;

    const terminalCall = await waitForTerminalCallStatus(twilioMasterClient, createdCall.sid, maxWaitMs);
    const callStatus = (terminalCall?.status || createdCall.status || "").toLowerCase() || null;
    const durationSeconds = parseDurationSeconds(terminalCall?.duration || createdCall.duration || null);

    if (!callStatus) {
      const result = buildRunResult(index, {
        callSid: createdCall.sid,
        callStatus,
        durationSeconds,
        voiceCall: null,
        fallbackSummary: "Twilio call never reached a terminal status before timeout.",
        error: "terminal_status_timeout",
      });
      results.push(result);
      printRun(result);
    } else if (FAILURE_CALL_STATUSES.has(callStatus)) {
      const result = buildRunResult(index, {
        callSid: createdCall.sid,
        callStatus,
        durationSeconds,
        voiceCall: null,
        fallbackSummary: `Twilio call failed with status ${callStatus}.`,
        error: `twilio_${callStatus}`,
      });
      results.push(result);
      printRun(result);
    } else {
      const voiceCall = await waitForPersistedVoiceCall({
        db,
        startedAt,
        callSid: createdCall.sid,
        caller,
        target,
        maxWaitMs,
        seenCallIds,
      });
      if (voiceCall?.callId) seenCallIds.add(voiceCall.callId);

      const result = buildRunResult(index, {
        callSid: createdCall.sid,
        callStatus,
        durationSeconds,
        voiceCall,
        fallbackSummary: voiceCall
          ? "Matched persisted voice call."
          : "Twilio call completed, but no persisted VoiceCall with latency data was matched in time.",
        error: voiceCall ? undefined : "voice_call_match_timeout",
      });
      results.push(result);
      printRun(result);
    }

    if (index < count) {
      console.log(`Waiting ${delayMs}ms before the next run...`);
      await sleep(delayMs);
    }
  }

  const fresh = results.filter((result) => result.ttsDefaultInstanceReused === false);
  const reused = results.filter((result) => result.ttsDefaultInstanceReused === true);

  console.log("\n## Aggregate");
  console.log(`freshCalls=${fresh.length} reusedCalls=${reused.length} totalRuns=${results.length}`);
  console.log(
    `prewarmedCalls=${countWhere(results, (result) => result.ttsDefaultInstancePrewarmed === true)} processPrewarmSourceCalls=${countWhere(results, (result) => result.ttsDefaultInstanceSource === "process_prewarm")}`,
  );
  console.log(`freshAvgTtsTtfbMs=${avg(fresh.map((result) => result.ttsTtfbAvgMs)) ?? "n/a"}`);
  console.log(`reusedAvgTtsTtfbMs=${avg(reused.map((result) => result.ttsTtfbAvgMs)) ?? "n/a"}`);
  console.log(`freshAvgFirstTurnStartMs=${avg(fresh.map((result) => result.firstTurnStartMs)) ?? "n/a"}`);
  console.log(`reusedAvgFirstTurnStartMs=${avg(reused.map((result) => result.firstTurnStartMs)) ?? "n/a"}`);

  if (fresh.length > 0 && reused.length > 0) {
    const freshAvg = avg(fresh.map((result) => result.ttsTtfbAvgMs));
    const reusedAvg = avg(reused.map((result) => result.ttsTtfbAvgMs));
    if (typeof freshAvg === "number" && typeof reusedAvg === "number") {
      console.log(`deltaTtsTtfbMs=${reusedAvg - freshAvg}`);
    }
  }
}

main().catch((error) => {
  console.error("Sequential voice probe failed.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
