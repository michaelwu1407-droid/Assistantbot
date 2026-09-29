/**
 * Database-touching half of the voice circuit breaker.
 *
 * Kept apart from `lib/voice-circuit-breaker.ts` so the pure predicates that
 * policy modules use (notably `lib/auto-call-eligibility.ts`) never pull Prisma
 * into their import graph.
 */

import { db } from "@/lib/db";
import {
    VOICE_CIRCUIT_RESTORE_DATA,
    hasSpendCapPauseExpired,
    isVoiceUsable,
    type VoiceCircuitFields,
} from "@/lib/voice-circuit-breaker";

/**
 * Returns whether voice is usable, and when an expired spend-cap pause is
 * found, clears it in the database so the admin dashboard and every other
 * reader agree instead of showing a workspace as disabled forever.
 *
 * The write is best-effort: a failure must never block an inbound call, so it
 * is logged and swallowed. The caller is still told voice is usable, because
 * the pause genuinely has expired.
 */
export async function restoreVoiceIfSpendCapExpired(
    workspace: { id: string } & VoiceCircuitFields,
    now: Date = new Date(),
): Promise<boolean> {
    if (!hasSpendCapPauseExpired(workspace, now)) {
        return isVoiceUsable(workspace, now);
    }

    try {
        await db.workspace.update({
            where: { id: workspace.id },
            data: { ...VOICE_CIRCUIT_RESTORE_DATA },
        });
        console.log(
            `[voice-circuit-breaker] Spend-cap pause expired; voice restored for workspace ${workspace.id}`,
        );
    } catch (error) {
        console.error(
            `[voice-circuit-breaker] Failed to restore voice for workspace ${workspace.id}:`,
            error,
        );
    }

    return true;
}
