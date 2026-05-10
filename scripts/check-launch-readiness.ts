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

  const launchPayload = launch.payload as Record<string, any> | null;
  const healthPayload = health.payload as Record<string, any> | null;
  const probePayload =
    (launchPayload?.canary?.monitor as Record<string, any> | null) ||
    (healthPayload?.canary?.monitor as Record<string, any> | null) ||
    null;
  const spokenCanaryPayload =
    (launchPayload?.canary?.spokenCanary as Record<string, any> | null) ||
    (healthPayload?.canary?.spokenCanary as Record<string, any> | null) ||
    null;

  const summary = {
    baseUrl,
    healthHttp: health.response.status,
    healthStatus: healthPayload?.status ?? null,
    healthSummary: healthPayload?.summary ?? null,
    launchHttp: launch.response.status,
    appSha: launchPayload?.release?.app?.shortGitSha ?? null,
    workerShas: launchPayload?.release?.worker?.liveDeployGitShas ?? null,
    launchStatus: launchPayload?.status ?? null,
    voiceCritical: launchPayload?.voiceCritical?.status ?? null,
    voiceWorker: launchPayload?.voiceCritical?.voiceWorker?.status ?? null,
    workerFingerprint: launchPayload?.voiceCritical?.voiceWorker?.latestHeartbeat?.runtimeFingerprint ?? null,
    expectedFingerprint: launchPayload?.voiceCritical?.voiceWorker?.expectedFingerprint ?? null,
    launchSummary:
      launchPayload?.voiceCritical?.voiceWorker?.summary ||
      launchPayload?.voiceCritical?.summary ||
      launchPayload?.summary ||
      null,
    probeHttp: null,
    probeStatus: probePayload?.status ?? null,
    probeResult: launchPayload?.canary?.probeResult ?? healthPayload?.canary?.probeResult ?? null,
    spokenCanaryStatus: spokenCanaryPayload?.status ?? null,
    spokenCanaryMode: spokenCanaryPayload?.mode ?? null,
    spokenCanarySummary: spokenCanaryPayload?.summary ?? null,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error("check-launch-readiness failed");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
