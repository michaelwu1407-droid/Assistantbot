"use server";

import { db } from "@/lib/db";

/**
 * Pricing Lookup — the single source of truth for any price the LLM quotes.
 *
 * Every price in a response MUST originate from this function's output.
 * The LLM is forbidden from inventing, interpolating, or rounding prices
 * on its own. It can only relay what this returns.
 */

export type PricingSource =
  | "glossary"         // RepairItem (owner-approved price list)
  | "service_rule"     // BusinessKnowledge SERVICE entry
  | "historical"       // Past invoiced jobs
  | "call_out_fee"     // Workspace setting
  | "emergency_surcharge"; // BusinessProfile setting

export type PricingMatch = {
  source: PricingSource;
  label: string;
  description: string;
  /** Numeric range — null if price is text-only ("call for quote") */
  minPrice: number | null;
  maxPrice: number | null;
  /** How many past data points inform this (for historical) */
  sampleSize?: number;
  confidence: "exact" | "range" | "estimate";
};

export type PricingLookupResult = {
  query: string;
  matches: PricingMatch[];
  callOutFee: number;
  emergencySurcharge: number | null;
  hasEmergencyService: boolean;
  noMatchAdvice: string | null;
};

/**
 * Look up pricing for a service/task description from all CRM sources.
 * Returns explicitly sourced pricing data — never fabricated.
 */
export async function runPricingLookup(
  workspaceId: string,
  params: { query: string }
): Promise<PricingLookupResult> {
  const query = params.query.trim().toLowerCase();
  const matches: PricingMatch[] = [];

  // ── Parallel: fetch all pricing sources ──
  const [repairItems, serviceRules, settings, businessProfile, historicalDeals] =
    await Promise.all([
      db.repairItem
        .findMany({
          where: { workspaceId },
          select: { title: true, description: true },
        })
        .catch(() => [] as { title: string; description: string | null }[]),

      db.businessKnowledge
        .findMany({
          where: { workspaceId, category: "SERVICE" },
          select: { ruleContent: true, metadata: true },
        })
        .catch(() => [] as { ruleContent: string; metadata: unknown }[]),

      db.workspace
        .findUnique({
          where: { id: workspaceId },
          select: { callOutFee: true },
        })
        .catch(() => null),

      db.businessProfile
        .findFirst({
          where: { user: { workspaceId } },
          select: { emergencyService: true, emergencySurcharge: true },
        })
        .catch(() => null),

      db.deal
        .findMany({
          where: {
            workspaceId,
            stage: "WON",
            title: { contains: query, mode: "insensitive" },
          },
          select: {
            title: true,
            value: true,
            invoicedAmount: true,
            invoices: { select: { total: true }, take: 1 },
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        })
        .catch(() => [] as any[]),
    ]);

  const callOutFee = (settings as any)?.callOutFee ?? 0;
  const emergencySurcharge = businessProfile?.emergencySurcharge ?? null;
  const hasEmergencyService = Boolean(businessProfile?.emergencyService);

  // ── 1. Glossary (approved prices — highest authority) ──
  for (const item of repairItems) {
    const titleLower = item.title.toLowerCase();
    if (!titleLower.includes(query) && !query.includes(titleLower)) continue;

    const range = parseRange(item.description || "");
    matches.push({
      source: "glossary",
      label: item.title,
      description: item.description || "No pricing specified",
      minPrice: range?.min ?? null,
      maxPrice: range?.max ?? null,
      confidence: range ? "exact" : "range",
    });
  }

  // ── 2. Service rules (knowledge base) ──
  for (const rule of serviceRules) {
    const ruleLower = rule.ruleContent.toLowerCase();
    if (!ruleLower.includes(query) && !query.includes(ruleLower)) continue;

    const meta = (rule.metadata as Record<string, string>) || {};
    const range = meta.priceRange ? parseRange(meta.priceRange) : null;
    matches.push({
      source: "service_rule",
      label: rule.ruleContent,
      description: meta.priceRange
        ? `${meta.priceRange}${meta.duration ? ` — est. ${meta.duration}` : ""}`
        : "No price range set",
      minPrice: range?.min ?? null,
      maxPrice: range?.max ?? null,
      confidence: range ? "range" : "estimate",
    });
  }

  // ── 3. Historical invoices (secondary reference) ──
  if (historicalDeals.length > 0) {
    const prices: number[] = [];
    for (const deal of historicalDeals) {
      const total = deal.invoices?.[0]?.total
        ? Number(deal.invoices[0].total)
        : deal.invoicedAmount
          ? Number(deal.invoicedAmount)
          : deal.value
            ? Number(deal.value)
            : null;
      if (total && total > 0) prices.push(total);
    }

    if (prices.length > 0) {
      const min = Math.min(...prices);
      const max = Math.max(...prices);
      const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
      matches.push({
        source: "historical",
        label: `Past jobs matching "${params.query}"`,
        description: `${prices.length} past job(s): $${min}–$${max} (avg $${avg})`,
        minPrice: min,
        maxPrice: max,
        sampleSize: prices.length,
        confidence: "estimate",
      });
    }
  }

  // ── 4. Call-out fee (always include if nonzero) ──
  if (callOutFee > 0) {
    matches.push({
      source: "call_out_fee",
      label: "Call-out / assessment fee",
      description: `$${callOutFee} — waived if issue is fixed on first visit`,
      minPrice: callOutFee,
      maxPrice: callOutFee,
      confidence: "exact",
    });
  }

  // ── 5. Emergency surcharge ──
  if (hasEmergencyService && emergencySurcharge && emergencySurcharge > 0) {
    matches.push({
      source: "emergency_surcharge",
      label: "After-hours / emergency surcharge",
      description: `+$${emergencySurcharge} for emergency or after-hours callouts`,
      minPrice: emergencySurcharge,
      maxPrice: emergencySurcharge,
      confidence: "exact",
    });
  }

  const noMatchAdvice =
    matches.filter((m) => m.source !== "call_out_fee" && m.source !== "emergency_surcharge").length === 0
      ? "No approved pricing found for this service. Advise the customer that a firm quote requires an on-site assessment."
      : null;

  return { query: params.query, matches, callOutFee, emergencySurcharge, hasEmergencyService, noMatchAdvice };
}

// ─── Helpers ────────────────────────────────────────────────────────

function parseRange(desc: string): { min: number; max: number } | null {
  const cleaned = desc.replace(/\$/g, "");
  // "$100-200", "$100 to $200", "100–200"
  const rangeMatch = cleaned.match(/(\d+(?:\.\d+)?)\s*(?:-|to|–)\s*(\d+(?:\.\d+)?)/i);
  if (rangeMatch) {
    return { min: parseFloat(rangeMatch[1]), max: parseFloat(rangeMatch[2]) };
  }
  // Single number: "$150", "150"
  const singleMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (singleMatch) {
    const v = parseFloat(singleMatch[1]);
    return { min: v, max: v };
  }
  return null;
}
