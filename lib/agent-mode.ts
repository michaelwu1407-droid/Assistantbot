export type CanonicalCustomerContactMode = "execute" | "review_approve" | "info_only";

export function normalizeAgentMode(raw?: string | null): CanonicalCustomerContactMode {
  switch ((raw || "").trim().toUpperCase()) {
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

export function canExecuteCustomerContact(mode: CanonicalCustomerContactMode): boolean {
  return mode === "execute";
}

export function requiresCustomerContactApproval(mode: CanonicalCustomerContactMode): boolean {
  return mode === "review_approve";
}

export function getCustomerContactModePolicySummary(raw?: string | null): string {
  const mode = normalizeAgentMode(raw);
  const label = getCustomerContactModeLabel(mode);

  if (mode === "execute") {
    return `\nTRACEY FOR USERS CUSTOMER-CONTACT MODE: ${label}. This mode applies to customer-facing calls, texts, emails, and outbound follow-up. Internal CRM work inside the chatbox is still allowed. When contacting customers, Tracey may act directly using approved business rules and tools.`;
  }

  if (mode === "review_approve") {
    return `\nTRACEY FOR USERS CUSTOMER-CONTACT MODE: ${label}. This mode applies to customer-facing calls, texts, emails, and outbound follow-up. Internal CRM work inside the chatbox is still allowed. When contacting customers, Tracey may gather details, answer questions, and prepare drafts, but final outbound contact or firm commitments should wait for approval.`;
  }

  return `\nTRACEY FOR USERS CUSTOMER-CONTACT MODE: ${label}. This mode applies to customer-facing calls, texts, emails, and outbound follow-up. Internal CRM work inside the chatbox is still allowed. When contacting customers, Tracey may answer, screen, and capture details, but must not make commitments or execute outbound customer contact.`;
}
