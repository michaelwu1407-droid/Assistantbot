const DEFAULT_VOICE_MONITOR_STALE_AFTER_MINUTES = 15;
const DEFAULT_VOICE_MONITOR_PROBE_CALL_TIMEOUT_SECONDS = 18;
const DEFAULT_VOICE_MONITOR_PROBE_MAX_WAIT_SECONDS = 45;
const DEFAULT_VOICE_MONITOR_PROBE_POST_SAY_PAUSE_SECONDS = 8;

function parsePositiveInt(rawValue: string | undefined, fallback: number) {
  const raw = Number.parseInt((rawValue || "").trim(), 10);
  return Number.isInteger(raw) && raw > 0 ? raw : fallback;
}

export function getVoiceMonitorStaleAfterMinutes(env: NodeJS.ProcessEnv = process.env) {
  return parsePositiveInt(env.VOICE_MONITOR_STALE_AFTER_MINUTES, DEFAULT_VOICE_MONITOR_STALE_AFTER_MINUTES);
}

export function getVoiceMonitorStaleAfterMs(env: NodeJS.ProcessEnv = process.env) {
  return getVoiceMonitorStaleAfterMinutes(env) * 60_000;
}

export function getVoiceMonitorProbeCallTimeoutSeconds(env: NodeJS.ProcessEnv = process.env) {
  return parsePositiveInt(env.VOICE_MONITOR_PROBE_CALL_TIMEOUT_SECONDS, DEFAULT_VOICE_MONITOR_PROBE_CALL_TIMEOUT_SECONDS);
}

export function getVoiceMonitorProbeMaxWaitSeconds(env: NodeJS.ProcessEnv = process.env) {
  return parsePositiveInt(env.VOICE_MONITOR_PROBE_MAX_WAIT_SECONDS, DEFAULT_VOICE_MONITOR_PROBE_MAX_WAIT_SECONDS);
}

export function getVoiceMonitorProbePostSayPauseSeconds(env: NodeJS.ProcessEnv = process.env) {
  return parsePositiveInt(env.VOICE_MONITOR_PROBE_POST_SAY_PAUSE_SECONDS, DEFAULT_VOICE_MONITOR_PROBE_POST_SAY_PAUSE_SECONDS);
}
