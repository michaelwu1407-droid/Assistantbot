import { normalizePhone, phoneMatches } from "@/lib/phone-utils";

/**
 * The synthetic voice probe places real Twilio calls (homepage demo / Earlymark
 * inbound) to verify the voice agent path. Those calls legitimately end as
 * no-answer/busy when the path is unhealthy, and the dedicated
 * `voice-synthetic-probe` workflow already alerts on them.
 *
 * Passive/real-traffic health surfaces (recent-call health, passive
 * communications health) must NOT also count these synthetic calls as customer
 * traffic failures, or a single probe failure pages the operator multiple times
 * for the same incident. This helper centralises which caller numbers belong to
 * the probe so those surfaces can exclude them.
 */
const DEFAULT_PROBE_CALLER = "+61434955958";

export function getSyntheticProbeCallerNumbers(
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  const candidates = [
    env.VOICE_MONITOR_PROBE_CALLER_NUMBER,
    env.VOICE_ALERT_SMS_TO,
    DEFAULT_PROBE_CALLER,
  ];

  const normalized = candidates
    .flatMap((value) => (value || "").split(","))
    .map((value) => normalizePhone(value))
    .filter(Boolean);

  return Array.from(new Set(normalized));
}

export function isSyntheticProbeCaller(
  phone: string | null | undefined,
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!phone) return false;
  return getSyntheticProbeCallerNumbers(env).some((probe) => phoneMatches(probe, phone));
}
