"use server";

import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";

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
}

const AttendeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  dealId: z.string(),
  interestedLevel: z.number().min(0).max(5).default(3),
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
export async function findMatches(dealId: string): Promise<MatchedContact[]> {
  const deal = await db.deal.findUnique({
    where: { id: dealId },
  });

  if (!deal) return [];

  const meta = (deal.metadata as Record<string, any>) || {};
  const price = Number(deal.value) || Number(meta.price) || 0;
  const bedrooms = Number(meta.bedrooms) || 0;

  if (price === 0 && bedrooms === 0) return [];

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
      });
    }
  }

  return matches.sort((a, b) => b.matchScore - a.matchScore);
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

  revalidatePath(`/kiosk/open-house`);
  return { success: true };
}
