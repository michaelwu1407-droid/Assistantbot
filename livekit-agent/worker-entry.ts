import { WorkerOptions, cli, type JobRequest } from "@livekit/agents";
import { fileURLToPath } from "node:url";
import { isEarlymarkInboundRoomName } from "../lib/voice-room-routing";
import { startVoiceWorkerBackgroundTasks } from "./agent";
import { resolveWorkerHttpHost, resolveWorkerHttpPort } from "./runtime-config";
import { getActiveCallCount, getMaxConcurrentCalls, isWorkerAcceptingCalls } from "./runtime-state";

type VoiceSurface = "demo" | "inbound_demo" | "normal";

function normalizePhone(phone?: string | null) {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");
  if (!cleaned) return "";
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return `+61${cleaned.slice(1)}`;
  if (cleaned.startsWith("61")) return `+${cleaned}`;
  return cleaned;
}

function getKnownEarlymarkNumbers() {
  const values = [
    ...(process.env.EARLYMARK_INBOUND_PHONE_NUMBERS || "")
      .split(/[,\n]/)
      .map((value) => value.trim())
      .filter(Boolean),
    process.env.EARLYMARK_INBOUND_PHONE_NUMBER,
    process.env.EARLYMARK_PHONE_NUMBER,
    process.env.TWILIO_PHONE_NUMBER,
  ]
    .filter(Boolean)
    .map((value) => normalizePhone(value))
    .filter(Boolean) as string[];

  return Array.from(new Set(values));
}

function readJsonObject(raw?: string | null) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

function inferSurface(job: JobRequest): VoiceSurface {
  const roomName = job.room?.name || "";
  const roomMetadata = readJsonObject(job.room?.metadata);
  const attributes = (job.publisher?.attributes || {}) as Record<string, string>;
  const explicitCallType = (
    (typeof roomMetadata?.callType === "string" ? roomMetadata.callType : "") ||
    attributes.callType ||
    ""
  ).trim();

  if (explicitCallType === "demo" || roomName.startsWith("demo-")) {
    return "demo";
  }
  if (explicitCallType === "inbound_demo" || isEarlymarkInboundRoomName(roomName)) {
    return "inbound_demo";
  }

  const calledPhone = normalizePhone(
    attributes["sip.trunkPhoneNumber"] ||
    attributes["sip.calledNumber"] ||
    attributes["sip.to"] ||
    attributes["sip.toNumber"] ||
    attributes["sip.called_number"] ||
    (typeof roomMetadata?.calledPhone === "string" ? roomMetadata.calledPhone : ""),
  );

  if (calledPhone && getKnownEarlymarkNumbers().includes(calledPhone)) {
    return "inbound_demo";
  }

  return "normal";
}

function buildRequestFunc(surfaces: VoiceSurface[]) {
  return async (job: JobRequest) => {
    const inferredSurface = inferSurface(job);
    if (surfaces.includes(inferredSurface)) {
      if (!isWorkerAcceptingCalls()) {
        console.warn("[voice-worker] Rejecting job because worker is not accepting new calls.", {
          roomName: job.room?.name || "",
          inferredSurface,
          workerRole: process.env.VOICE_WORKER_ROLE || "",
          activeCalls: getActiveCallCount(),
          maxConcurrentCalls: getMaxConcurrentCalls(),
        });
        await job.reject();
        return;
      }

      await job.accept();
      return;
    }

    await job.reject();
  };
}

export function runVoiceWorker(params: {
  workerRole: string;
  surfaces: VoiceSurface[];
  agentName?: string;
}) {
  process.env.VOICE_WORKER_ROLE = process.env.VOICE_WORKER_ROLE || params.workerRole;
  process.env.VOICE_WORKER_SURFACES = process.env.VOICE_WORKER_SURFACES || params.surfaces.join(",");
  startVoiceWorkerBackgroundTasks(`[${params.workerRole}]`);

  cli.runApp(
    new WorkerOptions({
      agent: fileURLToPath(new URL("./agent.ts", import.meta.url)),
      numIdleProcesses: 1,
      initializeProcessTimeout: 60_000,
      // LiveKit's automatic room dispatch targets the unnamed worker pool.
      // Surface routing is handled in requestFunc, so setting a workerRole as
      // agentName prevents inbound rooms from ever reaching these workers.
      agentName: params.agentName,
      host: resolveWorkerHttpHost(),
      port: resolveWorkerHttpPort(),
      requestFunc: buildRequestFunc(params.surfaces),
    }),
  );
}
