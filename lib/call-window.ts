/**
 * Shared helpers for evaluating whether the voice agent is permitted to
 * place an outbound call right now, based on the workspace's configured
 * calling window (Australia/Sydney time).
 */

const DEFAULT_CALL_WINDOW_START = "08:00";
const DEFAULT_CALL_WINDOW_END = "20:00";

export function parseHHMM(value: string): { h: number; m: number } | null {
  const match = value.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const h = Number.parseInt(match[1], 10);
  const m = Number.parseInt(match[2], 10);
  if (!Number.isInteger(h) || !Number.isInteger(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return { h, m };
}

export function minutesNowInSydney(now: Date = new Date()): number {
  const time = now.toLocaleTimeString("en-AU", {
    hour12: false,
    timeZone: "Australia/Sydney",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parsed = parseHHMM(time);
  if (!parsed) return 0;
  return parsed.h * 60 + parsed.m;
}

export function isWithinAllowedCallWindow(settings: unknown, now: Date = new Date()): boolean {
  const s = (settings as Record<string, unknown>) ?? {};
  const startRaw = typeof s.callAllowedStart === "string" ? s.callAllowedStart : DEFAULT_CALL_WINDOW_START;
  const endRaw = typeof s.callAllowedEnd === "string" ? s.callAllowedEnd : DEFAULT_CALL_WINDOW_END;
  const start = parseHHMM(startRaw);
  const end = parseHHMM(endRaw);
  if (!start || !end) return true;
  const nowM = minutesNowInSydney(now);
  const startM = start.h * 60 + start.m;
  const endM = end.h * 60 + end.m;
  if (endM >= startM) return nowM >= startM && nowM <= endM;
  return nowM >= startM || nowM <= endM;
}

export function isUrgentLead(subject: string, body: string): boolean {
  const text = `${subject} ${body}`.toLowerCase();
  return /(urgent|emergency|asap|immediate|today|now|critical|priority)/.test(text);
}
