import path from "path";
import dotenv from "dotenv";

dotenv.config({ path: path.resolve(process.cwd(), ".env"), quiet: true });
dotenv.config({ path: path.resolve(process.cwd(), ".env.local"), override: true, quiet: true });

function getArgValue(flag: string) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] ?? null;
}

function normalizeBaseUrl(value?: string | null) {
  const raw = (value || "").trim();
  if (!raw) return "https://www.earlymark.ai";
  const normalized = raw.replace(/\/+$/, "");
  return normalized === "https://earlymark.ai" ? "https://www.earlymark.ai" : normalized;
}

async function fetchJson(url: string, headers: Record<string, string>) {
  const separator = url.includes("?") ? "&" : "?";
  const response = await fetch(`${url}${separator}ts=${Date.now()}`, {
    headers: {
      ...headers,
      "cache-control": "no-cache",
      pragma: "no-cache",
    },
    cache: "no-store",
  });
  const text = await response.text();

  let payload: unknown = null;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  return { response, payload };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readRecord(record: Record<string, unknown> | null, key: string) {
  return asRecord(record?.[key]);
}

function readString(record: Record<string, unknown> | null, key: string) {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
}

async function main() {
  const baseUrl = normalizeBaseUrl(
    getArgValue("--base-url") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL,
  );
  const opsKey =
    getArgValue("--ops-key") ||
    process.env.TELEMETRY_ADMIN_KEY ||
    process.env.CRON_SECRET ||
    "";

  if (!opsKey) {
    throw new Error("Missing TELEMETRY_ADMIN_KEY or CRON_SECRET.");
  }

  const headers = {
    "x-ops-key": opsKey,
    "x-telemetry-key": opsKey,
    authorization: `Bearer ${opsKey}`,
  };

  const [health, launch] = await Promise.all([
    fetchJson(`${baseUrl}/api/health`, headers),
    fetchJson(`${baseUrl}/api/internal/launch-readiness`, headers),
  ]);

  const launchPayload = asRecord(launch.payload);
  const healthPayload = asRecord(health.payload);
  const launchCanary = readRecord(launchPayload, "canary");
  const healthCanary = readRecord(healthPayload, "canary");
  const launchVoiceCritical = readRecord(launchPayload, "voiceCritical");
  const launchVoiceWorker = readRecord(launchVoiceCritical, "voiceWorker");
  const launchLatestHeartbeat = readRecord(launchVoiceWorker, "latestHeartbeat");
  const launchRelease = readRecord(launchPayload, "release");
  const launchAppRelease = readRecord(launchRelease, "app");
  const launchWorkerRelease = readRecord(launchRelease, "worker");
  const probePayload =
    readRecord(launchCanary, "monitor") ||
    readRecord(healthCanary, "monitor") ||
    null;
  const spokenCanaryPayload =
    readRecord(launchCanary, "spokenCanary") ||
    readRecord(healthCanary, "spokenCanary") ||
    null;

  const summary = {
    baseUrl,
    healthHttp: health.response.status,
    healthStatus: readString(healthPayload, "status"),
    healthSummary: readString(healthPayload, "summary"),
    launchHttp: launch.response.status,
    appSha: readString(launchAppRelease, "shortGitSha"),
    workerShas: launchWorkerRelease?.liveDeployGitShas ?? null,
    launchStatus: readString(launchPayload, "status"),
    voiceCritical: readString(launchVoiceCritical, "status"),
    voiceWorker: readString(launchVoiceWorker, "status"),
    workerFingerprint: readString(launchLatestHeartbeat, "runtimeFingerprint"),
    expectedFingerprint: readString(launchVoiceWorker, "expectedFingerprint"),
    launchSummary:
      readString(launchVoiceWorker, "summary") ||
      readString(launchVoiceCritical, "summary") ||
      readString(launchPayload, "summary") ||
      null,
    probeHttp: null,
    probeStatus: readString(probePayload, "status"),
    probeResult: launchCanary?.probeResult ?? healthCanary?.probeResult ?? null,
    spokenCanaryStatus: readString(spokenCanaryPayload, "status"),
    spokenCanaryMode: readString(spokenCanaryPayload, "mode"),
    spokenCanarySummary: readString(spokenCanaryPayload, "summary"),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("check-launch-readiness failed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
