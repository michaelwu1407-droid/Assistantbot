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
  | "crm_action"
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
  /\b(what('s| is) on my (plate|schedule|agenda)|daily (briefing|digest|summary|rundown)|morning briefing)\b/i,
];

const COMMUNICATION_PATTERNS = [
  /\b(text|sms|message|msg|send|email|call|ring|phone)\b/i,
  /\b(tell|let .+ know|notify|remind|follow.?up)\b/i,
  /\b(on my way|running late|otw|eta|arrived|just arrived|finishing up|running early)\b/i,
];

const FLOW_CONTROL_PATTERNS = [
  /^\s*(next|confirm|cancel|ok|okay|yes|no|done|undo|thanks|thank you|great|good|skip)\s*[.!]?\s*$/i,
];

const REPORTING_PATTERNS = [
  /\b(revenue|earnings|income|profit|how much .*(earn|made|make))\b/i,
  /\b(report|summary|stats|statistics|dashboard|pipeline|overview)\b/i,
  /\b(this week|this month|last month|this quarter|year to date|ytd)\b/i,
  /\b(stale|overdue|rotting|attention|needs attention|at risk|stuck|blocked deal)\b/i,
  /\b(job history|past job|previous job|search.{1,20}job)\b/i,
];

const CONTACT_PATTERNS = [
  /\b(find|search|look up|lookup|who is|contact info|details for)\b/i,
  /\b(customer|client|their number|their email|their address)\b/i,
  /\b(latest note|recent note|last note)\b/i,
  /\b(conversation history|message history|sms history|chat history|what have we sent|what did we send)\b/i,
];

const CRM_ACTION_PATTERNS = [
  /\b(create|add|log|book|schedule|reschedule|move|assign|unassign|update|change|edit|rename|set|mark|complete|delete|restore|reopen|undo|approve|reject|decline|advance|push|next stage)\b/i,
  /\b(job|deal|contact|client|customer|note|task|reminder|invoice|quote|stage|draft|completion|approval)\b/i,
  /\b(advance|move forward|next step|push forward|progress)\b.{0,30}\b(job|deal|quote|stage)\b/i,
  /\b(customer|client|they|he|she).{0,20}\b(approved|accepted|said yes|confirmed|agreed|gave the go-ahead)\b/i,
];

const INVOICE_PATTERNS = [
  /\b(invoice|invoiced|create invoice|send invoice|draft invoice|mark.*paid|void)\b/i,
  /\b(payment|paid|unpaid|outstanding|overdue)\b/i,
  /\b(create|send|draft|generate|write|give|prepare)\b.{0,20}\b(quote|estimate|proposal)\b/i,
  /\b(quote|estimate|proposal)\b.{0,20}\b(for|to)\b/i,
];

const SUPPORT_PATTERNS = [
  /\b(help|support|bug|broken|not working|issue|problem|can't|cannot)\b/i,
  /\b(feedback|feature request|feature|suggestion|idea|complaint|frustrating|annoying)\b/i,
];

// ─── Classifier ─────────────────────────────────────────────────────

export function preClassify(text: string): PreClassification {
  const trimmed = text.trim();
  if (!trimmed) {
    return { intent: "general", confidence: 0, contextHints: [], suggestedTools: [], requiresCalculator: false };
  }

  if (/^create a new job called .+? for .+? at .+? with (?:a quoted value of|value) \$?[\d,]+(?:\.\d+)?[.?!]*$/i.test(trimmed)) {
    return {
      intent: "crm_action",
      confidence: 0.95,
      contextHints: getContextHints("crm_action", trimmed),
      suggestedTools: getSuggestedTools("crm_action", trimmed),
      requiresCalculator: false,
    };
  }

  if (/\b(ready to invoice|already invoiced)\b/i.test(trimmed)) {
    return {
      intent: "invoice",
      confidence: 0.95,
      contextHints: getContextHints("invoice", trimmed),
      suggestedTools: getSuggestedTools("invoice", trimmed),
      requiresCalculator: true,
    };
  }

  if (/\b(status|what.{0,10}invoice|invoice.{0,10}status)\b/i.test(trimmed) && /\binvoice\b/i.test(trimmed)) {
    return {
      intent: "invoice",
      confidence: 0.94,
      contextHints: getContextHints("invoice", trimmed),
      suggestedTools: getSuggestedTools("invoice", trimmed),
      requiresCalculator: false,
    };
  }

  // Fast-path: explicit invoice/quote creation, issue, or payment marking
  // These have a clear primary action verb + invoice/quote noun that should always win over "pricing".
  if (
    /\b(create|draft|generate|write|prepare|make).{0,20}\b(quote|estimate|proposal|invoice)\b/i.test(trimmed) ||
    /\b(send|issue).{0,15}\b(invoice|quote)\b/i.test(trimmed) ||
    /\b(mark|set|record).{0,15}\b(invoice|payment).{0,15}\b(paid|as paid)\b/i.test(trimmed) ||
    /\b(void|cancel|reverse)\b.{0,10}\b(invoice)\b/i.test(trimmed)
  ) {
    return {
      intent: "invoice",
      confidence: 0.93,
      contextHints: getContextHints("invoice", trimmed),
      suggestedTools: getSuggestedTools("invoice", trimmed),
      requiresCalculator: true,
    };
  }

  if (/\b(incomplete|blocked)\b/i.test(trimmed) && /\b(job|jobs)\b/i.test(trimmed)) {
    return {
      intent: "reporting",
      confidence: 0.95,
      contextHints: getContextHints("reporting", trimmed),
      suggestedTools: getSuggestedTools("reporting", trimmed),
      requiresCalculator: false,
    };
  }

  if (/^what still needs to happen before .+ can be completed[.?!]*$/i.test(trimmed)) {
    return {
      intent: "crm_action",
      confidence: 0.92,
      contextHints: getContextHints("crm_action", trimmed),
      suggestedTools: ["getDealContext", "getInvoiceStatus", "updateDealFields"],
      requiresCalculator: false,
    };
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
    { intent: "crm_action", score: countMatches(trimmed, CRM_ACTION_PATTERNS) },
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
    contextHints: getContextHints(best.intent, trimmed),
    suggestedTools: getSuggestedTools(best.intent, trimmed),
    requiresCalculator: best.intent === "pricing" || best.intent === "invoice",
  };
}

// ─── Helpers ────────────────────────────────────────────────────────

function countMatches(text: string, patterns: RegExp[]): number {
  return patterns.filter((p) => p.test(text)).length;
}

function getContextHints(intent: IntentHint, text: string): string[] {
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
        "Treat the workspace's current date/time as authoritative for relative dates like today, tomorrow, this month, or next Monday.",
        /\b(what('s| is) on my (plate|schedule|agenda)|daily (briefing|digest|summary|rundown)|morning briefing|what am i doing today|what('s| is) my day)\b/i.test(text)
          ? "DAILY BRIEFING: Call getTodaySummary for today's jobs and readiness alerts. Then call getAttentionRequired to surface stale/overdue deals. Lead with preparation alerts (missing address, no phone, unassigned) before the schedule, then overdue tasks, then stale deals needing action."
          : null,
      ].filter(Boolean) as string[];
    case "communication":
      return [
        "COMMUNICATION REQUEST: Identify the contact and use sendSms/sendEmail/makeCall immediately.",
        "Extract the message content from what the user said. If the user says 'tell John I'm on my way', the SMS body is 'I'm on my way' — not the full instruction.",
        /\b(on my way|otw|running late|arrived|just arrived|finishing up|running early|eta)\b/i.test(text)
          ? "FIELD ROUTING: This looks like an on-the-road status update. Use sendSms with the status message. If no contact is named, look at today's next job and text that client."
          : null,
      ].filter(Boolean) as string[];
    case "reporting":
      return [
        "REPORT REQUEST: Use getFinancialReport or getTodaySummary to fetch real data. Never estimate revenue.",
        /\b(incomplete|blocked|attention)\b/i.test(text)
          ? "For jobs that look incomplete, blocked, stale, or overdue, use listIncompleteOrBlockedJobs first, then getAttentionRequired or listDeals if needed. Do not say you cannot check. If nothing matches the user's filter, say that clearly instead of substituting similar names."
          : null,
        /\b(stale|rotting|at risk|stuck|needs attention|overdue deal)\b/i.test(text)
          ? /\bfor\b|\bmatching\b|\bof the\b/i.test(text)
            ? "FILTERED STALE QUERY: Use listIncompleteOrBlockedJobs with the specific filter term from the user's message (e.g. 'ZZZ AUTO', a client name). getAttentionRequired has no filter — use listIncompleteOrBlockedJobs when the user is asking about a subset."
            : "STALE DEAL TRIAGE: Use getAttentionRequired to surface overdue, stale, and rotting deals. List them with their stage and suggested next action. Offer to move, assign, or add a follow-up note for each."
          : null,
        /\b(search past job history|job history)\b/i.test(text)
          ? "For job-history lookups, use searchJobHistory with the user's query instead of asking unnecessary follow-up questions."
          : null,
      ].filter(Boolean) as string[];
    case "contact_lookup":
      return [
        "CONTACT QUERY: Use searchContacts or getClientContext to find the person first.",
        /\b(latest note|recent note|last note)\b/i.test(text)
          ? "For latest-note questions about a contact, use getClientContext and answer from the most recent CRM note instead of asking unnecessary follow-up questions."
          : null,
        /\b(conversation history|message history|sms history|chat history|what have we sent|what did we send)\b/i.test(text)
          ? "For conversation or message history queries, use getConversationHistory with the contact name. It returns calls, emails, notes, and SMS in chronological order."
          : null,
      ].filter(Boolean) as string[];
    case "crm_action":
      return [
        "CRM ACTION REQUEST: Prefer using CRM mutation tools directly instead of saying you cannot do it.",
        "For job/deal updates, resolve the existing record first, then mutate it and report the actual outcome.",
        "For notes, reminders, assignments, and stage changes, use the dedicated CRM tools instead of giving advice only.",
        /\b(approve|reject|decline)\b/i.test(text) && /\b(completion|done|finished|complete|draft|job|booking)\b/i.test(text)
          ? "APPROVAL/REJECTION: Use approveCompletion or rejectCompletion for job completion requests. Use approveDraft for draft job approvals. Include a reason if the user provided one."
          : null,
        /\b(what still needs to happen before .+ can be completed)\b/i.test(text)
          ? "For blockers or next-step questions, use getDealContext first, then explain what is still missing instead of asking the user what action they want to take."
          : null,
        /\b(tomorrow|today|this month|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(text)
          ? "Resolve relative dates using the workspace's current date/time. Do not assume an old year or month."
          : null,
        /^create a new job called .+? for .+? at .+? with (?:a quoted value of|value) \$?[\d,]+(?:\.\d+)?[.?!]*$/i.test(text)
          ? 'The user already gave enough information to create the job now. Use createJobNatural, not createDeal or showJobDraftForConfirmation. Do not ask for phone or email unless the tool truly requires it.'
          : null,
        /\b(customer|client|they|he|she).{0,20}\b(approved|accepted|said yes|confirmed|agreed|gave the go-ahead)\b/i.test(text)
          ? "QUOTE ACCEPTED: The customer has approved. Use moveDeal to move the job to 'scheduled' and assign a team member if one is not already set. Log a note about the acceptance."
          : null,
        /\b(advance|move forward|push forward|next stage)\b/i.test(text)
          ? "STAGE ADVANCE: Use getDealContext to find the current stage, then moveDeal to the logical next stage. New request → Quote sent → Scheduled → Awaiting payment → Completed."
          : null,
      ].filter(Boolean) as string[];
    case "invoice":
      return [
        "INVOICE REQUEST: Use the invoice tools (createDraftInvoice, issueInvoice, etc.).",
        /\b(quote|estimate|proposal)\b/i.test(text)
          ? "QUOTE = DRAFT INVOICE: When the user asks to create a quote or estimate, always try createDraftInvoice first (not createJobNatural), even if they named the customer rather than the exact job title. If createDraftInvoice says a draft already exists, say that explicitly and offer the next action — do NOT claim you created a new quote. If createDraftInvoice returns a resolved deal title, use that exact deal title for any follow-up tools like updateInvoiceFields, updateInvoiceAmount, issueInvoice, or moveDeal. If a dollar amount is given, update the actual invoice total via updateInvoiceFields (with total: amount) after creation — this correctly updates the invoice document. Also update the deal's tracked amount via updateInvoiceAmount. After creating the draft and setting the amount, move the deal to 'Quote Sent' if it is still in 'New Request'. Only ask whether to create a new job if createDraftInvoice cannot resolve any existing job."
          : null,
        /\b(send|issue)\b/i.test(text) && /\b(invoice|quote)\b/i.test(text)
          ? "SEND/ISSUE: Use issueInvoice to send a draft invoice to the customer. If no invoice exists yet, create the draft first with createDraftInvoice, set the amount, then issue it."
          : null,
        /\b(mark.*paid|payment received|paid)\b/i.test(text)
          ? "PAYMENT: Use markInvoicePaid to record payment. markInvoicePaid already updates the job to Completed when payment is successfully recorded, so do not call moveDeal separately unless markInvoicePaid succeeded and explicitly says more cleanup is needed."
          : null,
        "Use the pricingCalculator tool for any amount calculations. NEVER calculate in your head.",
        "Resolve relative dates using the workspace's current date/time. Do not assume an old year or month.",
        /\b(ready to invoice|already invoiced)\b/i.test(text)
          ? "For aggregate invoice-ready or already-invoiced job queries, use listInvoiceReadyJobs first, then current invoice/deal state if needed. Do not say you cannot check. If nothing matches the user's filter, say that clearly instead of substituting similar names."
          : null,
        /\b(status|what.{0,10}invoice|invoice.{0,10}status)\b/i.test(text)
          ? "INVOICE STATUS: Use getInvoiceStatus to check the current invoice state. Report: draft/issued/paid/void, amount, due date, and suggest the logical next action."
          : null,
      ].filter(Boolean) as string[];
    case "support":
      return [
        "SUPPORT REQUEST: If the user is giving product feedback, a complaint, a bug report, or a feature suggestion, acknowledge it and use contactSupport so it becomes an internal ticket instead of being handled casually in chat.",
        "For general support, try to help first. If you cannot resolve it confidently, use contactSupport to escalate.",
      ];
    default:
      return [];
  }
}

function getSuggestedTools(intent: IntentHint, text: string): string[] {
  switch (intent) {
    case "pricing":
      return ["pricingLookup", "pricingCalculator"];
    case "scheduling":
      return ["getSchedule", "getAvailability"];
    case "communication":
      return ["sendSms", "sendEmail", "makeCall"];
    case "reporting":
      if (/\b(incomplete|blocked|attention)\b/i.test(text)) {
        return ["listIncompleteOrBlockedJobs", "getAttentionRequired", "listDeals"];
      }
      if (/\b(search past job history|job history|past job|previous job)\b/i.test(text)) {
        return ["searchJobHistory", "listDeals"];
      }
      return ["getFinancialReport", "getTodaySummary"];
    case "contact_lookup":
      return ["searchContacts", "getClientContext", "getConversationHistory"];
    case "crm_action":
      if (/^create a new job called .+? for .+? at .+? with (?:a quoted value of|value) \$?[\d,]+(?:\.\d+)?[.?!]*$/i.test(text)) {
        return ["createJobNatural", "createDeal", "createContact"];
      }
      return [
        "moveDeal",
        "updateDealFields",
        "assignTeamMember",
        "unassignDeal",
        "restoreDeal",
        "createDeal",
        "createContact",
        "updateContactFields",
        "addDealNote",
        "addContactNote",
        "createTask",
        "getDealContext",
      ];
    case "invoice":
      if (/\b(status|what.{0,10}invoice|invoice.{0,10}status)\b/i.test(text)) {
        return ["getInvoiceStatus", "issueInvoice", "markInvoicePaid"];
      }
      if (/\b(ready to invoice|already invoiced)\b/i.test(text)) {
        return ["listInvoiceReadyJobs", "getInvoiceStatus", "listDeals"];
      }
      if (/\b(mark|set|record).{0,15}\b(invoice|payment).{0,15}\b(paid|as paid)\b/i.test(text) || /\b(payment received|paid)\b/i.test(text)) {
        return ["markInvoicePaid", "getInvoiceStatus"];
      }
      if (/\b(send|issue).{0,15}\b(invoice|quote)\b/i.test(text)) {
        return ["issueInvoice", "createDraftInvoice", "getInvoiceStatus"];
      }
      if (/\b(update|change|set).{0,15}\b(invoice|quote).{0,15}(amount|total|price|value|\$)/i.test(text)) {
        return ["updateInvoiceFields", "updateInvoiceAmount", "getInvoiceStatus"];
      }
      return ["createDraftInvoice", "issueInvoice", "updateInvoiceFields", "getInvoiceStatus", "pricingCalculator"];
    case "support":
      return ["contactSupport"];
    default:
      return [];
  }
}
