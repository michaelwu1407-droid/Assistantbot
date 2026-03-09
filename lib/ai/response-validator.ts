/**
 * Response Validator — Post-generation check for pricing integrity.
 *
 * Scans the LLM's output text for dollar amounts and verifies each one
 * was present in a tool call result from the same turn. Any unsourced
 * dollar figure is flagged so the system can append a disclaimer.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type ValidationResult = {
  /** True if all dollar amounts in the response are sourced */
  valid: boolean;
  /** Dollar amounts found in the response text */
  mentionedAmounts: number[];
  /** Dollar amounts present in tool outputs */
  sourcedAmounts: number[];
  /** Amounts in response that don't appear in any tool output */
  unsourcedAmounts: number[];
  /** Disclaimer to append if unsourced amounts found */
  disclaimer: string | null;
};

// ─── Extraction ─────────────────────────────────────────────────────

/**
 * Extract all dollar amounts from a text string.
 * Handles: $150, $1,200, $1,200.50, $150.00, $150k
 */
export function extractDollarAmounts(text: string): number[] {
  if (!text) return [];
  const amounts: number[] = [];
  // Match $-prefixed numbers and standalone "X dollars" patterns
  const dollarRegex = /\$\s*([\d,]+(?:\.\d{1,2})?)\s*(k)?/gi;
  let match: RegExpExecArray | null;

  while ((match = dollarRegex.exec(text)) !== null) {
    const raw = match[1].replace(/,/g, "");
    let value = parseFloat(raw);
    if (match[2]?.toLowerCase() === "k") value *= 1000;
    if (Number.isFinite(value) && value > 0) amounts.push(value);
  }

  return [...new Set(amounts)];
}

/**
 * Extract all numeric amounts from tool outputs (recursively searches objects).
 */
export function extractAmountsFromToolOutputs(toolOutputs: unknown[]): number[] {
  const amounts = new Set<number>();

  function walk(obj: unknown) {
    if (obj === null || obj === undefined) return;

    if (typeof obj === "number" && Number.isFinite(obj) && obj > 0) {
      amounts.add(obj);
      return;
    }

    if (typeof obj === "string") {
      // Extract dollar amounts from string values in tool outputs
      for (const amount of extractDollarAmounts(obj)) {
        amounts.add(amount);
      }
      // Also try bare numbers in strings like "150" in descriptions
      const numMatch = obj.match(/\b(\d+(?:\.\d{1,2})?)\b/g);
      if (numMatch) {
        for (const n of numMatch) {
          const val = parseFloat(n);
          if (Number.isFinite(val) && val > 0) amounts.add(val);
        }
      }
      return;
    }

    if (Array.isArray(obj)) {
      for (const item of obj) walk(item);
      return;
    }

    if (typeof obj === "object") {
      for (const value of Object.values(obj as Record<string, unknown>)) {
        walk(value);
      }
    }
  }

  for (const output of toolOutputs) walk(output);
  return [...amounts];
}

// ─── Validator ──────────────────────────────────────────────────────

/**
 * Validate that dollar amounts in the LLM response are grounded in tool outputs.
 *
 * @param responseText - The LLM's generated text
 * @param toolOutputs - Array of tool call result objects from the same turn
 * @param tolerance - Acceptable rounding tolerance (default $1)
 */
export function validatePricingInResponse(
  responseText: string,
  toolOutputs: unknown[],
  tolerance: number = 1
): ValidationResult {
  const mentionedAmounts = extractDollarAmounts(responseText);

  // No dollar amounts in response → automatically valid
  if (mentionedAmounts.length === 0) {
    return {
      valid: true,
      mentionedAmounts: [],
      sourcedAmounts: [],
      unsourcedAmounts: [],
      disclaimer: null,
    };
  }

  const sourcedAmounts = extractAmountsFromToolOutputs(toolOutputs);

  // Check each mentioned amount against sourced amounts
  const unsourcedAmounts = mentionedAmounts.filter((mentioned) => {
    return !sourcedAmounts.some(
      (sourced) => Math.abs(sourced - mentioned) <= tolerance
    );
  });

  const valid = unsourcedAmounts.length === 0;

  return {
    valid,
    mentionedAmounts,
    sourcedAmounts,
    unsourcedAmounts,
    disclaimer: valid
      ? null
      : "Note: Some pricing in this response could not be verified against our records. Please confirm with the business before proceeding.",
  };
}
