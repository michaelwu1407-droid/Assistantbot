/**
 * Prompt Compression — strips irrelevant system prompt sections per intent.
 *
 * Instead of sending the full system prompt (pricing rules + messaging rules +
 * multi-job handling + etc.) for every request, we trim sections that are
 * irrelevant to the detected intent. This reduces input tokens and speeds up TTFT.
 */

import type { IntentHint } from "@/lib/ai/pre-classifier";

export type PromptBlocks = {
  pricingIntegrityBlock: string;
  messagingRuleBlock: string;
  uncertaintyBlock: string;
  roleGuardBlock: string;
  multiJobBlock: string;
  jobDraftBlock: string;
};

type IntentRelevance = {
  pricing: boolean;
  messaging: boolean;
  uncertainty: boolean;
  roleGuard: boolean;
  multiJob: boolean;
  jobDraft: boolean;
};

const INTENT_RELEVANCE: Record<IntentHint, IntentRelevance> = {
  pricing: {
    pricing: true,
    messaging: false,
    uncertainty: true,
    roleGuard: true,
    multiJob: false,
    jobDraft: false,
  },
  scheduling: {
    pricing: false,
    messaging: false,
    uncertainty: true,
    roleGuard: true,
    multiJob: false,
    jobDraft: false,
  },
  communication: {
    pricing: false,
    messaging: true,
    uncertainty: true,
    roleGuard: false,
    multiJob: false,
    jobDraft: false,
  },
  flow_control: {
    pricing: false,
    messaging: false,
    uncertainty: false,
    roleGuard: true,
    multiJob: true,
    jobDraft: true,
  },
  reporting: {
    pricing: true,
    messaging: false,
    uncertainty: true,
    roleGuard: false,
    multiJob: false,
    jobDraft: false,
  },
  contact_lookup: {
    pricing: false,
    messaging: false,
    uncertainty: true,
    roleGuard: false,
    multiJob: false,
    jobDraft: false,
  },
  crm_action: {
    pricing: false,
    messaging: false,
    uncertainty: true,
    roleGuard: true,
    multiJob: true,
    jobDraft: true,
  },
  invoice: {
    pricing: true,
    messaging: false,
    uncertainty: true,
    roleGuard: true,
    multiJob: false,
    jobDraft: false,
  },
  support: {
    pricing: false,
    messaging: false,
    uncertainty: true,
    roleGuard: false,
    multiJob: false,
    jobDraft: false,
  },
  general: {
    pricing: true,
    messaging: true,
    uncertainty: true,
    roleGuard: true,
    multiJob: true,
    jobDraft: true,
  },
};

/**
 * Returns only the prompt blocks relevant to the detected intent.
 * For 'general' or low-confidence classification, returns all blocks unchanged.
 */
export function compressPromptBlocks(
  blocks: PromptBlocks,
  intent: IntentHint,
  confidence: number,
): PromptBlocks {
  if (confidence < 0.6 || intent === "general") {
    return blocks;
  }

  const relevance = INTENT_RELEVANCE[intent];

  return {
    pricingIntegrityBlock: relevance.pricing ? blocks.pricingIntegrityBlock : "",
    messagingRuleBlock: relevance.messaging ? blocks.messagingRuleBlock : "",
    uncertaintyBlock: relevance.uncertainty ? blocks.uncertaintyBlock : "",
    roleGuardBlock: relevance.roleGuard ? blocks.roleGuardBlock : "",
    multiJobBlock: relevance.multiJob ? blocks.multiJobBlock : "",
    jobDraftBlock: relevance.jobDraft ? blocks.jobDraftBlock : "",
  };
}
