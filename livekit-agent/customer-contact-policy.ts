export type CanonicalCustomerContactMode = "execute" | "review_approve" | "info_only";
export type CanonicalAppAgentMode = "EXECUTION" | "DRAFT" | "INFO_ONLY";
export type CustomerFacingChannel = "voice" | "sms" | "email";
export type CustomerContactViolation =
  | "firm_quote"
  | "firm_booking"
  | "outbound_commitment"
  | "timing_promise";

export type CustomerContactCapabilityPolicy = {
  mode: CanonicalCustomerContactMode;
  label: string;
  allowSupportedCommitments: boolean;
  allowFirmQuotes: boolean;
  allowFirmBookings: boolean;
  allowOutboundContact: boolean;
  allowTimingPromises: boolean;
};

export type CustomerFacingResponsePolicyOutcome = {
  allowed: boolean;
  mode: CanonicalCustomerContactMode;
  label: string;
  channel: CustomerFacingChannel;
  violations: CustomerContactViolation[];
  originalText: string;
  finalText: string;
  summary: string;
};

const QUOTE_PATTERNS = [
  /\$\s?\d+/i,
  /\bthe price (?:is|will be)\b/i,
  /\bthat(?:'| i)?s going to be\b/i,
  /\bcall[- ]?out fee (?:is|will be)\b/i,
  /\bwe can quote\b/i,
  /\bquote you\b/i,
  /\bcosts? (?:is|will be)\b/i,
] as const;

const BOOKING_PATTERNS = [
  /\byou(?:'| a)?re booked\b/i,
  /\blocked in\b/i,
  /\bbooked (?:in|for)\b/i,
  /\bconfirmed for\b/i,
  /\bscheduled (?:you|it|that)\b/i,
  /\bsee you (?:on|at)\b/i,
  /\byou(?:'| wi)?ll be seen\b/i,
] as const;

const OUTBOUND_COMMITMENT_PATTERNS = [
  /\bi(?:'| wi)?ll call\b/i,
  /\bwe(?:'| wi)?ll call\b/i,
  /\bi(?:'| wi)?ll send\b/i,
  /\bwe(?:'| wi)?ll send\b/i,
  /\bi(?:'| wi)?ll text\b/i,
  /\bwe(?:'| wi)?ll text\b/i,
  /\bi(?:'| wi)?ll email\b/i,
  /\bwe(?:'| wi)?ll email\b/i,
  /\byou(?:'| wi)?ll hear from us\b/i,
] as const;

const TIMING_PROMISE_PATTERNS = [
  /\bwithin the hour\b/i,
  /\bwithin the day\b/i,
  /\bthis afternoon\b/i,
  /\bthis morning\b/i,
  /\bfirst thing tomorrow\b/i,
  /\bstraight away\b/i,
  /\bshortly\b/i,
] as const;

function compactText(value?: string | null) {
  return (value || "").trim();
}

export function normalizeCustomerContactMode(raw?: string | null): CanonicalCustomerContactMode {
  switch (compactText(raw).toUpperCase()) {
    case "EXECUTE":
    case "EXECUTION":
      return "execute";
    case "ORGANIZE":
    case "DRAFT":
    case "REVIEW_APPROVE":
    case "REVIEW & APPROVE":
      return "review_approve";
    case "FILTER":
    case "INFO_ONLY":
      return "info_only";
    default:
      return "review_approve";
  }
}

export function normalizeAppAgentMode(raw?: string | null): CanonicalAppAgentMode {
  switch (compactText(raw).toUpperCase()) {
    case "EXECUTE":
    case "EXECUTION":
      return "EXECUTION";
    case "FILTER":
    case "INFO_ONLY":
      return "INFO_ONLY";
    case "ORGANIZE":
    case "DRAFT":
    case "REVIEW_APPROVE":
    case "REVIEW & APPROVE":
    default:
      return "DRAFT";
  }
}

export function getCustomerContactModeLabel(mode: CanonicalCustomerContactMode): string {
  switch (mode) {
    case "execute":
      return "Execute";
    case "review_approve":
      return "Review & approve";
    case "info_only":
      return "Info only";
  }
}

export function getAppAgentModeLabel(mode: CanonicalAppAgentMode): string {
  switch (mode) {
    case "EXECUTION":
      return "Execution";
    case "DRAFT":
      return "Review & approve";
    case "INFO_ONLY":
      return "Info only";
  }
}

export function getCustomerContactCapabilityPolicy(
  rawMode?: string | null,
): CustomerContactCapabilityPolicy {
  const mode = normalizeCustomerContactMode(rawMode);
  const label = getCustomerContactModeLabel(mode);

  if (mode === "execute") {
    return {
      mode,
      label,
      allowSupportedCommitments: true,
      allowFirmQuotes: true,
      allowFirmBookings: true,
      allowOutboundContact: true,
      allowTimingPromises: true,
    };
  }

  if (mode === "review_approve") {
    return {
      mode,
      label,
      allowSupportedCommitments: false,
      allowFirmQuotes: false,
      allowFirmBookings: false,
      allowOutboundContact: false,
      allowTimingPromises: false,
    };
  }

  return {
    mode,
    label,
    allowSupportedCommitments: false,
    allowFirmQuotes: false,
    allowFirmBookings: false,
    allowOutboundContact: false,
    allowTimingPromises: false,
  };
}

export function canExecuteCustomerContact(rawMode?: string | null) {
  return getCustomerContactCapabilityPolicy(rawMode).allowOutboundContact;
}

export function requiresCustomerContactApproval(rawMode?: string | null) {
  return normalizeCustomerContactMode(rawMode) === "review_approve";
}

export function buildCustomerModePolicyLines(rawMode?: string | null): string[] {
  const policy = getCustomerContactCapabilityPolicy(rawMode);
  const shared = [
    `Current customer-contact mode: ${policy.label}.`,
    "This same mode applies across Tracey for users calls, texts, emails, and outbound follow-up.",
  ];

  if (policy.mode === "execute") {
    return [
      ...shared,
      "You may answer supported questions and make routine commitments only when they are backed by approved business rules, tools, and current workspace data.",
    ];
  }

  if (policy.mode === "review_approve") {
    return [
      ...shared,
      "You may answer, screen, and capture details, but any quote, booking, or firm next step must be framed as pending team confirmation.",
    ];
  }

  return [
    ...shared,
    "You may answer FAQs and capture details, but you must not quote, schedule, confirm, promise follow-up timing, or initiate outbound customer contact.",
  ];
}

export function getCustomerContactModePolicySummary(rawMode?: string | null): string {
  const policy = getCustomerContactCapabilityPolicy(rawMode);

  if (policy.mode === "execute") {
    return `\nTRACEY FOR USERS CUSTOMER-CONTACT MODE: ${policy.label}. This mode applies to customer-facing calls, texts, emails, and outbound follow-up. Internal CRM work inside the chatbox is still allowed. When contacting customers, Tracey may act directly using approved business rules and tools.`;
  }

  if (policy.mode === "review_approve") {
    return `\nTRACEY FOR USERS CUSTOMER-CONTACT MODE: ${policy.label}. This mode applies to customer-facing calls, texts, emails, and outbound follow-up. Internal CRM work inside the chatbox is still allowed. When contacting customers, Tracey may gather details, answer questions, and prepare drafts, but final outbound contact or firm commitments should wait for approval.`;
  }

  return `\nTRACEY FOR USERS CUSTOMER-CONTACT MODE: ${policy.label}. This mode applies to customer-facing calls, texts, emails, and outbound follow-up. Internal CRM work inside the chatbox is still allowed. When contacting customers, Tracey may answer, screen, and capture details, but must not make commitments or execute outbound customer contact.`;
}

function detectViolations(
  policy: CustomerContactCapabilityPolicy,
  text: string,
): CustomerContactViolation[] {
  if (!text || policy.mode === "execute") {
    return [];
  }

  const violations: CustomerContactViolation[] = [];

  if (!policy.allowFirmQuotes && QUOTE_PATTERNS.some((pattern) => pattern.test(text))) {
    violations.push("firm_quote");
  }
  if (!policy.allowFirmBookings && BOOKING_PATTERNS.some((pattern) => pattern.test(text))) {
    violations.push("firm_booking");
  }
  if (!policy.allowOutboundContact && OUTBOUND_COMMITMENT_PATTERNS.some((pattern) => pattern.test(text))) {
    violations.push("outbound_commitment");
  }
  if (!policy.allowTimingPromises && TIMING_PROMISE_PATTERNS.some((pattern) => pattern.test(text))) {
    violations.push("timing_promise");
  }

  return Array.from(new Set(violations));
}

function buildSafeCustomerFacingResponse(
  policy: CustomerContactCapabilityPolicy,
  channel: CustomerFacingChannel,
): string {
  if (policy.mode === "review_approve") {
    if (channel === "email") {
      return "I can help with the details, but the team will confirm any quote, booking, or next step before it is locked in.";
    }
    return "I can help with the details, but the team will confirm any quote, booking, or next step before it is locked in.";
  }

  if (channel === "email") {
    return "I can answer questions and capture the details for the team, but the team will need to confirm any quote, booking, or follow-up timing.";
  }
  return "I can answer questions and take the details for the team, but the team will need to confirm any quote, booking, or follow-up timing.";
}

export function enforceCustomerFacingResponsePolicy(args: {
  modeRaw?: string | null;
  text: string;
  channel: CustomerFacingChannel;
}): CustomerFacingResponsePolicyOutcome {
  const policy = getCustomerContactCapabilityPolicy(args.modeRaw);
  const originalText = compactText(args.text);
  const violations = detectViolations(policy, originalText);

  if (violations.length === 0) {
    return {
      allowed: true,
      mode: policy.mode,
      label: policy.label,
      channel: args.channel,
      violations: [],
      originalText,
      finalText: originalText,
      summary: `Customer-facing ${args.channel} reply complies with ${policy.label} mode.`,
    };
  }

  return {
    allowed: false,
    mode: policy.mode,
    label: policy.label,
    channel: args.channel,
    violations,
    originalText,
    finalText: buildSafeCustomerFacingResponse(policy, args.channel),
    summary: `Customer-facing ${args.channel} reply was rewritten to comply with ${policy.label} mode.`,
  };
}
