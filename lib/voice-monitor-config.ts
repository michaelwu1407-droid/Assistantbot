const DEFAULT_VOICE_MONITOR_STALE_AFTER_MINUTES = 7;

export function getVoiceMonitorStaleAfterMinutes(env: NodeJS.ProcessEnv = process.env) {
  const raw = Number.parseInt((env.VOICE_MONITOR_STALE_AFTER_MINUTES || "").trim(), 10);
  return Number.isInteger(raw) && raw > 0 ? raw : DEFAULT_VOICE_MONITOR_STALE_AFTER_MINUTES;
}

export function getVoiceMonitorStaleAfterMs(env: NodeJS.ProcessEnv = process.env) {
  return getVoiceMonitorStaleAfterMinutes(env) * 60_000;
}
