/**
 * "Magic" Data Enrichment
 *
 * Extracts company info from an email domain. In production this would
 * call Clearbit / Apollo / LinkedIn API. For now we use a combination of
 * a known-domain lookup table and a favicon/logo URL derivation so the
 * CRM feels "alive" immediately on data entry.
 */

export interface EnrichedCompany {
  domain: string;
  name: string;
  logoUrl: string;
  industry: string | null;
  size: string | null;
  linkedinUrl: string | null;
}

// Known companies for instant enrichment (no API call needed)
const KNOWN_DOMAINS: Record<string, Omit<EnrichedCompany, "domain" | "logoUrl">> = {
  "tesla.com": { name: "Tesla", industry: "Automotive & Energy", size: "10,000+", linkedinUrl: "https://linkedin.com/company/tesla-motors" },
  "google.com": { name: "Google", industry: "Technology", size: "10,000+", linkedinUrl: "https://linkedin.com/company/google" },
  "apple.com": { name: "Apple", industry: "Consumer Electronics", size: "10,000+", linkedinUrl: "https://linkedin.com/company/apple" },
  "microsoft.com": { name: "Microsoft", industry: "Technology", size: "10,000+", linkedinUrl: "https://linkedin.com/company/microsoft" },
  "amazon.com": { name: "Amazon", industry: "E-Commerce & Cloud", size: "10,000+", linkedinUrl: "https://linkedin.com/company/amazon" },
  "stripe.com": { name: "Stripe", industry: "Fintech", size: "1,000-5,000", linkedinUrl: "https://linkedin.com/company/stripe" },
  "shopify.com": { name: "Shopify", industry: "E-Commerce", size: "5,000-10,000", linkedinUrl: "https://linkedin.com/company/shopify" },
  "atlassian.com": { name: "Atlassian", industry: "Software", size: "5,000-10,000", linkedinUrl: "https://linkedin.com/company/atlassian" },
  "canva.com": { name: "Canva", industry: "Design Software", size: "1,000-5,000", linkedinUrl: "https://linkedin.com/company/canva" },
};

/**
 * Extract domain from an email address.
 */
export function extractDomain(email: string): string | null {
  const match = email.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Enrich a contact from their email address.
 * Returns company info including logo, industry, and size.
 */
export async function enrichFromEmail(email: string): Promise<EnrichedCompany | null> {
  const domain = extractDomain(email);
  if (!domain) return null;

  // Skip personal email providers
  const personalDomains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com", "icloud.com", "protonmail.com"];
  if (personalDomains.includes(domain)) return null;

  const logoUrl = `https://logo.clearbit.com/${domain}`;

  const known = KNOWN_DOMAINS[domain];
  if (known) {
    return { domain, logoUrl, ...known };
  }

  // For unknown domains, derive a company name from the domain
  const nameParts = domain.split(".")[0];
  const companyName = nameParts.charAt(0).toUpperCase() + nameParts.slice(1);

  return {
    domain,
    name: companyName,
    logoUrl,
    industry: null,
    size: null,
    linkedinUrl: null,
  };
}
