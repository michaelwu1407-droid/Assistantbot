/**
 * Voice circuit breaker — spend-cap pause and its expiry.
 * ══════════════════════════════════════════════════════
 * Twilio fires a daily `totalprice` UsageTrigger when a workspace's spend
 * crosses the cap (wired in `lib/comms.ts`). The handler at
 * `app/api/webhooks/twilio-usage/route.ts` flips `Workspace.voiceEnabled` to
 * false and tells the tradie voice "will re-enable at the start of the next
 * billing day".
 *
 * This module is what makes that promise true. Without it the pause was
 * permanent and a tradie's phone stayed dead until someone noticed by hand.
 *
 * Why lazy rather than a nightly cron: every scheduled GitHub Actions workflow
 * in this repo is paused to `workflow_dispatch` only, so a cron sweep would
 * never fire. Checking on the call path costs one indexed update per workspace
 * per day and heals at exactly the moment it matters.
 *
 * Why the reason field: a bare `voiceEnabled === false` cannot tell an
 * automatic spend-cap pause from a deliberate support or owner disable.
 * Only pauses tagged `VOICE_DISABLED_SPEND_CAP` expire on their own.
 *
 * This module is deliberately dependency-free so pure policy callers such as
 * `lib/auto-call-eligibility.ts` stay free of Prisma. The database-touching
 * resolver lives in `lib/voice-circuit-breaker-store.ts`.
 */

/** Tag written by the Twilio usage webhook. Only this reason auto-expires. */
export const VOICE_DISABLED_SPEND_CAP = "twilio_daily_spend_cap";

export type VoiceCircuitFields = {
    voiceEnabled?: boolean | null;
    voiceDisabledReason?: string | null;
    voiceDisabledAt?: Date | string | null;
};

/**
 * UTC day bucket. Matches the day key the usage webhook already uses to dedup
 * trigger callbacks, and matches Twilio's own daily billing boundary.
 */
export function utcDayKey(at: Date): string {
    return at.toISOString().slice(0, 10);
}

function parseDisabledAt(value: Date | string | null | undefined): Date | null {
    if (!value) return null;
    const parsed = value instanceof Date ? value : new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * True when an automatic spend-cap pause has outlived the Twilio billing day
 * that set it. Pure — safe to call anywhere, including tests.
 *
 * Returns false for a workspace that is not paused, was paused for any other
 * reason, or has no recorded pause timestamp. A missing timestamp is treated
 * as "do not expire" so a legacy row disabled before this field existed is
 * never silently switched back on.
 */
export function hasSpendCapPauseExpired(
    fields: VoiceCircuitFields,
    now: Date = new Date(),
): boolean {
    if (fields.voiceEnabled !== false) return false;
    if (fields.voiceDisabledReason !== VOICE_DISABLED_SPEND_CAP) return false;

    const disabledAt = parseDisabledAt(fields.voiceDisabledAt);
    if (!disabledAt) return false;

    return utcDayKey(disabledAt) < utcDayKey(now);
}

/**
 * Whether voice should be treated as usable right now.
 *
 * Pure, and backwards compatible: a caller that does not select the new
 * `voiceDisabled*` fields gets exactly today's behaviour, because an
 * unidentified pause never expires.
 */
export function isVoiceUsable(
    fields: VoiceCircuitFields,
    now: Date = new Date(),
): boolean {
    if (fields.voiceEnabled !== false) return true;
    return hasSpendCapPauseExpired(fields, now);
}

/** Fields the store-side resolver needs to clear an expired pause. */
export const VOICE_CIRCUIT_RESTORE_DATA = {
    voiceEnabled: true,
    voiceDisabledReason: null,
    voiceDisabledAt: null,
} as const;
