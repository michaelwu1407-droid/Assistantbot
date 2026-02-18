"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";

export interface AgentLead {
  id: string;
  name: string;
  source: string;
  createdAt: Date;
  phone: string | null;
  email: string | null;
  avatar?: string;
  interestedLevel?: number;
}

export interface MatchedContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  matchScore: number;
  matchReasons: string[];
  budget?: number;
  bedroomsReq?: number;
}

export interface MatchResult {
  success: boolean;
  matches: MatchedContact[];
  listingPrice?: number;
  listingBedrooms?: number;
  error?: string;
}

export interface MatchFeedItem {
  dealId: string;
  dealTitle: string;
  matchCount: number;
  topMatchName?: string;
}

const AttendeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  dealId: z.string(),
  interestedLevel: z.number().min(0).max(5).default(3),
  notes: z.string().optional(),
});

const FeedbackSchema = z.object({
  dealId: z.string(),
  contactId: z.string(),
  interestLevel: z.enum(["HOT", "WARM", "COLD"]),
  priceOpinion: z.number().optional(),
  notes: z.string().optional(),
});

/**
 * Fetch "Fresh" leads for the Speed-to-Lead widget.
 * Definition: Created within the last 24 hours (for demo visibility, usually it's < 30 mins)
 * and status is 'NEW'.
 */
export async function getFreshLeads(workspaceId: string): Promise<AgentLead[]> {
  // For demo purposes, we might not have data < 30 mins old.
  // So we'll fetch all NEW leads and sort by desc.
  const deals = await db.deal.findMany({
    where: {
      workspaceId,
      stage: "NEW"
    },
    include: {
      contact: true
    },
    orderBy: {
      createdAt: "desc"
    },
    take: 10
  });

  return deals.map(d => ({
    id: d.id,
    name: d.contact.name,
    source: "Domain.com.au", // Mock source, or add to metadata
    createdAt: d.createdAt,
    phone: d.contact.phone,
    email: d.contact.email,
    interestedLevel: (d.metadata as any)?.interestedLevel || 3
  }));
}

/**
 * Fetch pipeline for Kanban board.
 */
export async function getAgentPipeline(workspaceId: string) {
  const deals = await db.deal.findMany({
    where: { workspaceId },
    include: { contact: true },
    orderBy: { updatedAt: "desc" }
  });

  // Group by stage? Or return flat list and let client group.
  // Flat list is better for dnd-kit.
  return deals.map(d => ({
    id: d.id,
    title: d.title,
    stage: d.stage,
    value: d.value ? Number(d.value) : 0,
    contactName: d.contact.name,
    updatedAt: d.updatedAt
  }));
}

/**
 * Find contacts that match a listing's criteria.
 * Matches based on budget (within 10%) and bedrooms (>= listing bedrooms).
 */
export async function findMatches(dealId: string): Promise<MatchResult> {
  const deal = await db.deal.findUnique({
    where: { id: dealId },
  });

  if (!deal) return { success: false, matches: [], error: "Deal not found" };

  const meta = (deal.metadata as Record<string, any>) || {};
  const price = Number(deal.value) || Number(meta.price) || 0;
  const bedrooms = Number(meta.bedrooms) || 0;

  if (price === 0 && bedrooms === 0) return { success: true, matches: [], listingPrice: price, listingBedrooms: bedrooms };

  // Fetch all contacts in workspace
  const contacts = await db.contact.findMany({
    where: { workspaceId: deal.workspaceId },
  });

  const matches: MatchedContact[] = [];

  for (const contact of contacts) {
    const prefs = (contact.preferences as Record<string, any>) || {};
    const budget = Number(prefs.budget) || 0;
    const minBedrooms = Number(prefs.bedrooms) || 0;

    if (budget === 0 && minBedrooms === 0) continue;

    const reasons: string[] = [];
    let score = 0;

    // Budget match (within 10% range)
    if (budget > 0 && price > 0) {
      if (budget >= price) {
        score += 50;
        reasons.push(`Budget OK ($${budget.toLocaleString()})`);
      } else if (budget >= price * 0.9) {
        score += 30;
        reasons.push(`Budget close ($${budget.toLocaleString()})`);
      }
    }

    // Bedroom match
    if (minBedrooms > 0 && bedrooms > 0) {
      if (bedrooms >= minBedrooms) {
        score += 40;
        reasons.push(`Bedrooms match (${minBedrooms}+)`);
      }
    }

    // Location match (mock)
    if (prefs.location && meta.address && String(meta.address).includes(prefs.location)) {
      score += 10;
      reasons.push("Location match");
    }

    if (score > 0) {
      matches.push({
        id: contact.id,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        matchScore: score,
        matchReasons: reasons,
        budget: budget > 0 ? budget : undefined,
        bedroomsReq: minBedrooms > 0 ? minBedrooms : undefined,
      });
    }
  }

  return {
    success: true,
    matches: matches.sort((a, b) => b.matchScore - a.matchScore),
    listingPrice: price > 0 ? price : undefined,
    listingBedrooms: bedrooms > 0 ? bedrooms : undefined,
  };
}

/**
 * Log an attendee at an open house.
 * Creates/Updates contact and logs visit.
 */
export async function logOpenHouseAttendee(input: z.infer<typeof AttendeeSchema>) {
  const parsed = AttendeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { name, email, phone, dealId, interestedLevel, notes } = parsed.data;

  const deal = await db.deal.findUnique({ where: { id: dealId } });
  if (!deal) return { success: false, error: "Deal not found" };

  // 1. Find or Create Contact
  let contact = await db.contact.findFirst({
    where: {
      workspaceId: deal.workspaceId,
      OR: [
        { email: email || undefined },
        { phone: phone || undefined }
      ]
    }
  });

  if (!contact) {
    contact = await db.contact.create({
      data: {
        name,
        email,
        phone,
        workspaceId: deal.workspaceId,
        preferences: {
          source: "Open House",
          last_seen: new Date().toISOString()
        }
      }
    });
  }

  // 2. Log Open House Entry
  await db.openHouseLog.create({
    data: {
      attendeeName: name,
      attendeeEmail: email,
      attendeePhone: phone,
      interestedLevel,
      notes,
      dealId
    }
  });

  // 3. Log Activity on Deal
  await db.activity.create({
    data: {
      type: "MEETING",
      title: "Open House Visit",
      content: `${name} visited. Interest: ${interestedLevel}/5. ${notes || ""}`,
      dealId,
      contactId: contact.id
    }
  });

  // 4. Create OpenHouseLog record
  await db.openHouseLog.create({
    data: {
      attendeeName: name,
      attendeeEmail: email,
      attendeePhone: phone,
      interestedLevel: interestedLevel,
      notes: notes,
      dealId: dealId
    }
  });

  revalidatePath(`/kiosk/open-house`);
  return { success: true };
}

/**
 * Collect buyer feedback on a listing.
 * NOTE: Stubbed - requires BuyerFeedback model to be added to Prisma schema.
 */
export async function collectFeedback(input: z.infer<typeof FeedbackSchema>) {
  const parsed = FeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  // Create BuyerFeedback record
  await db.buyerFeedback.create({
    data: {
      dealId: parsed.data.dealId,
      contactId: parsed.data.contactId,
      interestLevel: parsed.data.interestLevel,
      priceOpinion: parsed.data.priceOpinion ? new Prisma.Decimal(parsed.data.priceOpinion) : null,
      notes: parsed.data.notes
    }
  });

  // Log activity instead
  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Buyer Feedback",
      content: `Feedback: ${parsed.data.interestLevel}. ${parsed.data.notes || ""}`,
      dealId: parsed.data.dealId,
      contactId: parsed.data.contactId
    }
  });

  return { success: true };
}

/**
 * Get vendor report data for a listing from real BuyerFeedback records.
 * Computes average price opinion, interest level distribution, and price sentiment.
 */
export async function getVendorReportData(dealId: string): Promise<{
  listingTitle: string;
  vendorGoalPrice: number | null;
  marketFeedback: number | null;
  interestLevel: "High" | "Medium" | "Low";
  priceFeedback: "Soft" | "On Target" | "Strong";
  averagePriceOpinion: number | null;
} | null> {
  try {
    const deal = await db.deal.findUnique({
      where: { id: dealId },
      select: {
        title: true,
        value: true,
        metadata: true,
        buyerFeedback: {
          select: {
            interestLevel: true,
            priceOpinion: true,
          }
        }
      }
    });

    if (!deal) return null;

    const feedback = deal.buyerFeedback;
    if (feedback.length === 0) {
      return {
        listingTitle: deal.title,
        vendorGoalPrice: deal.value ? Number(deal.value) : null,
        marketFeedback: null,
        interestLevel: "Low",
        priceFeedback: "Soft",
        averagePriceOpinion: null,
      };
    }

    // Calculate average price opinion
    const priceOpinions = feedback
      .filter(f => f.priceOpinion !== null)
      .map(f => Number(f.priceOpinion));
    const avgPrice = priceOpinions.length > 0
      ? priceOpinions.reduce((a, b) => a + b, 0) / priceOpinions.length
      : null;

    // Calculate interest level distribution
    const hotCount = feedback.filter(f => f.interestLevel === "HOT").length;
    const warmCount = feedback.filter(f => f.interestLevel === "WARM").length;
    const totalFeedback = feedback.length;
    const hotWarmRatio = (hotCount + warmCount) / totalFeedback;

    let interestLevel: "High" | "Medium" | "Low";
    if (hotWarmRatio >= 0.6) interestLevel = "High";
    else if (hotWarmRatio >= 0.3) interestLevel = "Medium";
    else interestLevel = "Low";

    // Calculate price sentiment relative to vendor goal
    const goalPrice = deal.value ? Number(deal.value) : 0;
    let priceFeedback: "Soft" | "On Target" | "Strong";
    if (avgPrice && goalPrice > 0) {
      const ratio = avgPrice / goalPrice;
      if (ratio >= 1.0) priceFeedback = "Strong";
      else if (ratio >= 0.9) priceFeedback = "On Target";
      else priceFeedback = "Soft";
    } else {
      priceFeedback = "Soft";
    }

    return {
      listingTitle: deal.title,
      vendorGoalPrice: goalPrice || null,
      marketFeedback: avgPrice,
      interestLevel,
      priceFeedback,
      averagePriceOpinion: avgPrice,
    };
  } catch (error) {
    console.error("Error fetching vendor report data:", error);
    return null;
  }
}

/**
 * Get aggregated match feed for the Matchmaker sidebar widget.
 * Returns a list of deals with their match counts.
 */
export async function getMatchFeed(workspaceId: string): Promise<MatchFeedItem[]> {
  try {
    // Get all deals for the workspace that could have matches (active listings)
    const deals = await db.deal.findMany({
      where: {
        workspaceId,
        stage: { in: ["NEW", "CONTACTED", "NEGOTIATION"] }
      },
      select: {
        id: true,
        title: true,
        value: true,
        metadata: true,
      },
      orderBy: { updatedAt: "desc" },
      take: 10, // Limit to most recent 10
    });

    const feedItems: MatchFeedItem[] = [];

    for (const deal of deals) {
      // For each deal, run the matching logic
      const matchResult = await findMatches(deal.id);

      if (matchResult.success && matchResult.matches.length > 0) {
        feedItems.push({
          dealId: deal.id,
          dealTitle: deal.title,
          matchCount: matchResult.matches.length,
          topMatchName: matchResult.matches[0]?.name,
        });
      }
    }

    return feedItems;
  } catch (error) {
    console.error("Error in getMatchFeed:", error);
    return [];
  }
}


