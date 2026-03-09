/**
 * Pre-Classifier — Fast TypeScript-based intent detection.
 *
 * Runs BEFORE the LLM to catch obvious intents in <1ms. This is NOT a
 * replacement for the LLM's tool selection — it's an accelerator that
 * pre-injects the right context and hints so the LLM makes fewer
 * round-trips.
 *
 * The classifier returns "hints" that get injected into the system prompt
 * for the current turn only.
 */

// ─── Types ──────────────────────────────────────────────────────────

export type IntentHint =
  | "pricing"
  | "scheduling"
  | "communication"
  | "flow_control"
  | "reporting"
  | "contact_lookup"
  | "invoice"
  | "support"
  | "general";

export type PreClassification = {
  /** Primary detected intent */
  intent: IntentHint;
  /** Confidence: 1.0 = keyword match, 0.7 = heuristic */
  confidence: number;
  /** Extra context hints to inject into the LLM system prompt */
  contextHints: string[];
  /** Which tools the LLM should prefer for this intent */
  suggestedTools: string[];
  /** If true, pricing calculator is likely needed */
  requiresCalculator: boolean;
};

// ─── Pattern Definitions ────────────────────────────────────────────

const PRICING_PATTERNS = [
  /\b(how much|price|pricing|quote|quoted|cost|rate|fee|charge|estimate)\b/i,
  /\$\s*\d/,
  /\b(call.?out|callout|assessment)\s*(fee)?\b/i,
  /\b(invoice|invoiced|billing|bill)\b/i,
  /\b(discount|gst|tax|surcharge|margin|markup)\b/i,
  /\b(total|subtotal|per hour|hourly|flat rate)\b/i,
];

const SCHEDULING_PATTERNS = [
  /\b(schedule|scheduled|booking|book|availability|available|slot|reschedule)\b/i,
  /\b(today|tomorrow|tmrw|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i,
  /\b(next week|this week|next month|this month)\b/i,
  /\b\d{1,2}\s*(am|pm)\b/i,
  /\b(what('s| is) my day|what am i doing|morning|afternoon)\b/i,
];

const COMMUNICATION_PATTERNS = [
  /\b(text|sms|message|msg|send|email|call|ring|phone)\b/i,
  /\b(tell|let .+ know|notify|remind|follow.?up)\b/i,
  /\b(on my way|running late|otw|eta)\b/i,
];

const FLOW_CONTROL_PATTERNS = [
  /^\s*(next|confirm|cancel|ok|okay|yes|no|done|undo|thanks|thank you|great|good|skip)\s*[.!]?\s*$/i,
];

const REPORTING_PATTERNS = [
  /\b(revenue|earnings|income|profit|how much .*(earn|made|make))\b/i,
  /\b(report|summary|stats|statistics|dashboard|pipeline|overview)\b/i,
  /\b(this week|this month|last month|this quarter|year to date|ytd)\b/i,
];

const CONTACT_PATTERNS = [
  /\b(find|search|look up|lookup|who is|contact info|details for)\b/i,
  /\b(customer|client|their number|their email|their address)\b/i,
];

const INVOICE_PATTERNS = [
  /\b(invoice|invoiced|create invoice|send invoice|draft invoice|mark.*paid|void)\b/i,
  /\b(payment|paid|unpaid|outstanding|overdue)\b/i,
];

const SUPPORT_PATTERNS = [
  /\b(help|support|bug|broken|not working|issue|problem|can't|cannot)\b/i,
];

// ─── Classifier ─────────────────────────────────────────────────────

export function preClassify(text: string): PreClassification {
  const trimmed = text.trim();
  if (!trimmed) {
    return { intent: "general", confidence: 0, contextHints: [], suggestedTools: [], requiresCalculator: false };
  }

  // Flow control is the fastest path — exact match on short strings
  if (FLOW_CONTROL_PATTERNS.some((p) => p.test(trimmed))) {
    return {
      intent: "flow_control",
      confidence: 1.0,
      contextHints: [],
      suggestedTools: [],
      requiresCalculator: false,
    };
  }

  // Score each intent by pattern matches
  const scores: { intent: IntentHint; score: number }[] = [
    { intent: "pricing", score: countMatches(trimmed, PRICING_PATTERNS) },
    { intent: "scheduling", score: countMatches(trimmed, SCHEDULING_PATTERNS) },
    { intent: "communication", score: countMatches(trimmed, COMMUNICATION_PATTERNS) },
    { intent: "reporting", score: countMatches(trimmed, REPORTING_PATTERNS) },
    { intent: "contact_lookup", score: countMatches(trimmed, CONTACT_PATTERNS) },
    { intent: "invoice", score: countMatches(trimmed, INVOICE_PATTERNS) },
    { intent: "support", score: countMatches(trimmed, SUPPORT_PATTERNS) },
  ];

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0];

  if (best.score === 0) {
    return { intent: "general", confidence: 0.3, contextHints: [], suggestedTools: [], requiresCalculator: false };
  }

  const confidence = Math.min(1.0, 0.5 + best.score * 0.15);

  return {
    intent: best.intent,
    confidence,
    contextHints: getContextHints(best.intent),
    suggestedTools: getSuggestedTools(best.intent),
    requiresCalculator: best.intent === "pricing" || best.intent === "invoice",
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((p) => p.test(text)).length;
}

function getContextHints(intent: IntentHint): string[] {
  switch (intent) {
    case "pricing":
      return [
        "PRICING QUERY DETECTED: You MUST use the pricingLookup tool to fetch approved prices before responding.",
        "Use the pricingCalculator tool for ALL arithmetic (totals, tax, discounts). NEVER calculate in your head.",
        "If no approved price exists, say a firm quote requires an on-site assessment. Do NOT estimate.",
      ];
    case "scheduling":
      return [
        "SCHEDULING QUERY: Use getSchedule or getAvailability before answering. Never guess availability.",
      ];
    case "communication":
      return [
        "COMMUNICATION REQUEST: Identify the contact and use sendSms/sendEmail/makeCall. Send the user's exact words.",
      ];
    case "reporting":
      return [
        "REPORT REQUEST: Use getFinancialReport or getTodaySummary to fetch real data. Never estimate revenue.",
      ];
    case "contact_lookup":
      return [
        "CONTACT QUERY: Use searchContacts or getClientContext to find the person first.",
      ];
    case "invoice":
      return [
        "INVOICE REQUEST: Use the invoice tools (createDraftInvoice, issueInvoice, etc.).",
        "Use the pricingCalculator tool for any amount calculations. NEVER calculate in your head.",
      ];
    case "support":
      return [
        "SUPPORT REQUEST: Try to help first. If unable, use contactSupport to escalate.",
      ];
    default:
      return [];
  }
}

function getSuggestedTools(intent: IntentHint): string[] {
  switch (intent) {
    case "pricing":
      return ["pricingLookup", "pricingCalculator"];
    case "scheduling":
      return ["getSchedule", "getAvailability"];
    case "communication":
      return ["sendSms", "sendEmail", "makeCall"];
    case "reporting":
      return ["getFinancialReport", "getTodaySummary"];
    case "contact_lookup":
      return ["searchContacts", "getClientContext"];
    case "invoice":
      return ["createDraftInvoice", "issueInvoice", "getInvoiceStatus", "pricingCalculator"];
    case "support":
      return ["contactSupport"];
    default:
      return [];
  }
}
