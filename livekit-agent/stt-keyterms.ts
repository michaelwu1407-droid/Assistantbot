/**
 * Deepgram STT keyterm derivation.
 *
 * Keyterms boost recognition of specific proper nouns on Nova-3. We keep a
 * static base list of Earlymark/Tracey product terms and Sydney demo suburbs,
 * and — for real customer calls — additionally derive keyterms from the called
 * workspace's own grounding (business name, trade, service suburbs) so a
 * caller saying the tradie's business name or local suburb is transcribed
 * correctly.
 */

export const VOICE_STT_BASE_KEYTERMS = [
  "Earlymark",
  "earlymark.ai",
  "Tracey",
  "Tracy",
  "Ottorize",
  "Alexandria Automotive Services",
  "Alexandria Automotive",
  "Assistantbot",
  "LiveKit",
  "Cartesia",
  "Deepgram",
  "Sonic",
  "Nova",
  "Groq",
  "DeepInfra",
  "Llama",
  "Sydney",
  "Alexandria",
  "Marrickville",
  "Newtown",
  "Erskineville",
  "Redfern",
  "Mascot",
  "Botany",
];

export type GroundingKeytermSource = {
  businessName?: string | null;
  tradeType?: string | null;
  serviceArea?: string | null;
  physicalAddress?: string | null;
};

/** Base keyterms plus any extra terms supplied via the VOICE_STT_KEYTERMS env var. */
export function resolveSttKeyterms(env: NodeJS.ProcessEnv = process.env): string[] {
  const fromEnv = (env.VOICE_STT_KEYTERMS || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  const merged = [...VOICE_STT_BASE_KEYTERMS, ...fromEnv];
  return Array.from(new Set(merged));
}

/**
 * Derive Deepgram keyterms from a workspace's own grounding so STT recognises
 * the tradie's business name, trade, and service suburbs — the proper nouns a
 * caller is most likely to say on a real (non-demo) call. Service-area and
 * address fields are split on common separators; pure numbers (street numbers,
 * postcodes) are dropped since keyterm boosting is for names, not digits.
 */
export function deriveGroundingKeyterms(grounding: GroundingKeytermSource | null): string[] {
  if (!grounding) return [];
  const terms: string[] = [];
  const push = (value?: string | null) => {
    if (!value) return;
    const trimmed = value.trim();
    if (trimmed) terms.push(trimmed);
  };

  push(grounding.businessName);
  push(grounding.tradeType);

  for (const field of [grounding.serviceArea, grounding.physicalAddress]) {
    if (!field) continue;
    for (const part of field.split(/[,/;|]/)) {
      const suburb = part.trim();
      if (suburb && !/^\d+$/.test(suburb)) terms.push(suburb);
    }
  }

  return terms;
}

/** Final keyterm list for a call: base + env + grounding-derived, de-duplicated. */
export function buildCallKeyterms(
  grounding: GroundingKeytermSource | null,
  env: NodeJS.ProcessEnv = process.env,
): string[] {
  return Array.from(new Set([...resolveSttKeyterms(env), ...deriveGroundingKeyterms(grounding)]));
}
