/**
 * canAutoCallLead — single source of truth for whether the voice agent is
 * allowed to place an outbound call on behalf of this workspace right now,
 * based on workspace-level policy (independent of the specific lead).
 *
 * Per-lead checks (call window, triage hold, urgent flag, whether the lead
 * supplied a phone number) are still made by each handler — they're
 * lead-specific, not workspace-wide.
 *
 * Returns a structured reason on block so callers can log it and surface
 * it to operators.
 */

import { isVoiceUsable, type VoiceCircuitFields } from "@/lib/voice-circuit-breaker";

export type AutoCallEligibility =
  | { allowed: true; reason: null }
  | { allowed: false; reason: AutoCallBlockReason };

export type AutoCallBlockReason =
  | "auto_call_disabled"      // tradie turned the toggle off
  | "voice_disabled"          // workspace circuit breaker tripped
  | "agent_mode_not_execution" // tradie is on DRAFT/INFO_ONLY/etc, so Tracey may not act
  | "no_workspace_number";    // workspace hasn't been provisioned a Twilio number yet

export type WorkspacePolicyFields = {
  autoCallLeads?: boolean | null;
  agentMode?: string | null;
  twilioPhoneNumber?: string | null;
} & VoiceCircuitFields;

export function canAutoCallLead(
  workspace: WorkspacePolicyFields,
  now: Date = new Date(),
): AutoCallEligibility {
  if (!workspace.autoCallLeads) {
    return { allowed: false, reason: "auto_call_disabled" };
  }
  // An automatic Twilio spend-cap pause expires at the next billing day, so a
  // workspace still flagged disabled from yesterday is callable again. Callers
  // that don't select the voiceDisabled* fields behave exactly as before.
  if (!isVoiceUsable(workspace, now)) {
    return { allowed: false, reason: "voice_disabled" };
  }
  if (workspace.agentMode !== "EXECUTION") {
    return { allowed: false, reason: "agent_mode_not_execution" };
  }
  if (!workspace.twilioPhoneNumber) {
    return { allowed: false, reason: "no_workspace_number" };
  }
  return { allowed: true, reason: null };
}
