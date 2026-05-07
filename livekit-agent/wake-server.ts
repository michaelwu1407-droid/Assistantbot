import { createServer } from "node:http";
import { getVoiceAgentWebhookSecret } from "./runtime-config";

export function getWakeServerPort(env: NodeJS.ProcessEnv = process.env) {
  const raw = Number.parseInt((env.VOICE_WORKER_WAKE_PORT || "").trim(), 10);
  return Number.isInteger(raw) && raw > 0 ? raw : 9090;
}

export function getWakeServerHost(env: NodeJS.ProcessEnv = process.env) {
  return (env.VOICE_WORKER_WAKE_HOST || "").trim() || "0.0.0.0";
}

// Requires explicit opt-in. Defaulting to true in production was unsafe:
// startWakeServer() with network_mode:host can EADDRINUSE on Docker restart
// and crash the worker before the startup heartbeat fires.
export function isWakeServerEnabled(env: NodeJS.ProcessEnv = process.env) {
  return (env.VOICE_WORKER_WAKE_SERVER || "").trim().toLowerCase() === "true";
}

export function startWakeServer(params: {
  onWake: () => Promise<void>;
}) {
  const port = getWakeServerPort();
  const host = getWakeServerHost();

  const server = createServer((req, res) => {
    if (req.method !== "POST" || req.url !== "/wake-queue") {
      res.writeHead(404).end();
      return;
    }

    const secret = getVoiceAgentWebhookSecret();
    if (secret && req.headers["x-voice-agent-secret"] !== secret) {
      res.writeHead(401).end();
      return;
    }

    res.writeHead(200, { "Content-Type": "application/json" }).end('{"ok":true}');

    void params.onWake().catch((err: unknown) => {
      console.error("[wake-server] Queue processing error:", err);
    });
  });

  server.on("error", (err: NodeJS.ErrnoException) => {
    // Non-fatal: log and continue. The 30s poll fallback handles queue processing.
    console.warn(`[wake-server] Failed to bind ${host}:${port} — ${err.message}. Falling back to poll.`);
  });

  server.listen(port, host, () => {
    console.log(`[wake-server] Listening on ${host}:${port}`);
  });

  return server;
}
