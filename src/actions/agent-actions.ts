"use server";

import { z } from "zod";
import { prisma } from "@/lib/db";

// ─── Validation ─────────────────────────────────────────────

const FindMatchesSchema = z.object({
  listingId: z.string().cuid("Invalid listing ID"),
});

// ─── Types ──────────────────────────────────────────────────

export interface MatchedContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  budget: number | null;
}

export interface MatchResult {
  success: boolean;
  matches?: MatchedContact[];
  error?: string;
}

// ─── Server Action ──────────────────────────────────────────

export async function findMatches(listingId: string): Promise<MatchResult> {
  const parsed = FindMatchesSchema.safeParse({ listingId });

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const listing = await prisma.deal.findUnique({
    where: { id: parsed.data.listingId },
  });

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  const metadata = listing.metadata as Record<string, unknown> | null;
  const listingPrice = (metadata?.price as number) ?? listing.value;
  const listingBedrooms = (metadata?.bedrooms as number) ?? 0;

  if (!listingPrice) {
    return { success: false, error: "Listing has no price set" };
  }

  // Find contacts in the same workspace whose metadata.budget >= listing price
  // and whose metadata.bedrooms_req matches (if set)
  const contacts = await prisma.contact.findMany({
    where: {
      workspaceId: listing.workspaceId,
      metadata: {
        path: ["buyer_budget_max"],
        gte: listingPrice,
      },
    },
    take: 20,
  });

  // Filter by bedroom requirements in application layer
  const filtered = contacts
    .filter((contact) => {
      const contactMeta = contact.metadata as Record<string, unknown> | null;
      if (!contactMeta) return false;

      const bedroomsReq = contactMeta.bedrooms_req as number | undefined;
      if (bedroomsReq !== undefined && listingBedrooms > 0) {
        return bedroomsReq <= listingBedrooms;
      }
      return true;
    })
    .slice(0, 5);

  const matches: MatchedContact[] = filtered.map((contact) => {
    const contactMeta = contact.metadata as Record<string, unknown> | null;
    return {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      budget: (contactMeta?.buyer_budget_max as number) ?? null,
    };
  });

  return { success: true, matches };
}
