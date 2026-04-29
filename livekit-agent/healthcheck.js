let snapshot = null;

(async () => {
  const fsMod = await import("node:fs");
  const fs = fsMod.default ?? fsMod;

  const healthPath = (process.env.VOICE_WORKER_HEALTH_PATH || "/tmp/voice-worker-health.json").trim();
  const staleMs = Number.parseInt(process.env.VOICE_WORKER_HEALTH_STALE_MS || "180000", 10);

  const raw = fs.readFileSync(healthPath, "utf8");
  snapshot = JSON.parse(raw);
  const lastHeartbeatSuccessAt = Date.parse(snapshot.lastHeartbeatSuccessAt || snapshot.updatedAt || "");

  if (!Number.isFinite(lastHeartbeatSuccessAt)) {
    throw new Error("missing lastHeartbeatSuccessAt");
  }

  const safeStaleMs = Number.isFinite(staleMs) && staleMs > 0 ? staleMs : 180000;
  if (Date.now() - lastHeartbeatSuccessAt > safeStaleMs) {
    throw new Error("worker heartbeat snapshot is stale");
  }

  if (snapshot.bootReady !== true) {
    throw new Error("worker boot is not ready");
  }

  process.exit(0);
})().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  const pid = Number.isInteger(snapshot?.pid) && snapshot.pid > 1 ? snapshot.pid : null;
  if (pid && pid !== process.pid) {
    try {
      process.kill(pid, "SIGTERM");
      console.error(`[voice-worker-healthcheck] sent SIGTERM to stale worker pid ${pid}`);
    } catch (killError) {
      const killMessage = killError instanceof Error ? killError.message : String(killError);
      console.error(`[voice-worker-healthcheck] failed to stop worker pid ${pid}: ${killMessage}`);
    }
  }
  console.error(`[voice-worker-healthcheck] ${message}`);
  process.exit(1);
});
