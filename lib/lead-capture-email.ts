export const DEFAULT_INBOUND_LEAD_DOMAIN = "inbound.earlymark.ai";

export function resolveInboundLeadDomain(domain?: string | null) {
  return (domain || "").trim() || DEFAULT_INBOUND_LEAD_DOMAIN;
}

export function toLeadCaptureAlias(value?: string | null) {
  const alias = (value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return alias || "business";
}

export function buildLeadCaptureEmail(alias: string, domain = DEFAULT_INBOUND_LEAD_DOMAIN) {
  return `${toLeadCaptureAlias(alias)}@${resolveInboundLeadDomain(domain)}`;
}

export function buildLeadCaptureEmailPreview(businessName?: string | null, domain?: string | null) {
  return buildLeadCaptureEmail(toLeadCaptureAlias(businessName), resolveInboundLeadDomain(domain));
}
