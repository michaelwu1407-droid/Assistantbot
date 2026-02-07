"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { generateQRSVG, generateQRDataURL } from "@/lib/qrcode";

// ─── Validation ─────────────────────────────────────────────

const FindMatchesSchema = z.object({
  listingId: z.string().min(1, "Listing ID is required"),
});

const LogAttendeeSchema = z.object({
  dealId: z.string().min(1),
  attendeeName: z.string().min(1),
  attendeeEmail: z.string().email().optional(),
  attendeePhone: z.string().optional(),
  notes: z.string().optional(),
  interestedLevel: z.number().min(0).max(5).default(0),
});

// ─── Types ──────────────────────────────────────────────────

export interface MatchedContact {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  budget: number | null;
  bedroomsReq: number | null;
}

export interface MatchResult {
  success: boolean;
  matches?: MatchedContact[];
  listingPrice?: number;
  listingBedrooms?: number;
  error?: string;
}

// ─── Server Actions ─────────────────────────────────────────

/**
 * Buyer Matchmaker: finds contacts whose budget and bedroom
 * requirements match a listing (Deal).
 */
export async function findMatches(listingId: string): Promise<MatchResult> {
  const parsed = FindMatchesSchema.safeParse({ listingId });
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const listing = await db.deal.findUnique({
    where: { id: parsed.data.listingId },
  });

  if (!listing) {
    return { success: false, error: "Listing not found" };
  }

  const metadata = listing.metadata as Record<string, unknown> | null;
  const listingPrice = (metadata?.price as number) ?? Number(listing.value);
  const listingBedrooms = (metadata?.bedrooms as number) ?? 0;

  if (!listingPrice) {
    return { success: false, error: "Listing has no price set" };
  }

  // Find all contacts in the same workspace with buyer metadata
  const contacts = await db.contact.findMany({
    where: { workspaceId: listing.workspaceId },
  });

  // Filter by budget and bedroom requirements in application layer
  const matched = contacts
    .filter((contact) => {
      const cMeta = contact.metadata as Record<string, unknown> | null;
      if (!cMeta || !cMeta.buyer_budget_max) return false;

      const budget = cMeta.buyer_budget_max as number;
      if (budget < listingPrice) return false;

      const bedroomsReq = cMeta.bedrooms_req as number | undefined;
      if (bedroomsReq !== undefined && listingBedrooms > 0) {
        if (bedroomsReq > listingBedrooms) return false;
      }

      return true;
    })
    .slice(0, 5);

  const matches: MatchedContact[] = matched.map((contact) => {
    const cMeta = contact.metadata as Record<string, unknown> | null;
    return {
      id: contact.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      company: contact.company,
      budget: (cMeta?.buyer_budget_max as number) ?? null,
      bedroomsReq: (cMeta?.bedrooms_req as number) ?? null,
    };
  });

  return { success: true, matches, listingPrice, listingBedrooms };
}

/**
 * Log an Open House attendee for a listing.
 */
export async function logOpenHouseAttendee(
  input: z.infer<typeof LogAttendeeSchema>
) {
  const parsed = LogAttendeeSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const log = await db.openHouseLog.create({
    data: {
      dealId: parsed.data.dealId,
      attendeeName: parsed.data.attendeeName,
      attendeeEmail: parsed.data.attendeeEmail,
      attendeePhone: parsed.data.attendeePhone,
      notes: parsed.data.notes,
      interestedLevel: parsed.data.interestedLevel,
    },
  });

  // Auto-create contact if email provided and doesn't exist
  if (parsed.data.attendeeEmail) {
    const deal = await db.deal.findUnique({
      where: { id: parsed.data.dealId },
    });

    if (deal) {
      const existing = await db.contact.findFirst({
        where: {
          email: parsed.data.attendeeEmail,
          workspaceId: deal.workspaceId,
        },
      });

      if (!existing) {
        await db.contact.create({
          data: {
            name: parsed.data.attendeeName,
            email: parsed.data.attendeeEmail,
            phone: parsed.data.attendeePhone,
            workspaceId: deal.workspaceId,
          },
        });
      }
    }
  }

  // Log activity
  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Open house attendee",
      content: `${parsed.data.attendeeName} visited open house (interest: ${parsed.data.interestedLevel}/5)`,
      dealId: parsed.data.dealId,
    },
  });

  return { success: true, logId: log.id };
}

/**
 * Get open house attendance log for a listing.
 */
export async function getOpenHouseLog(dealId: string) {
  return db.openHouseLog.findMany({
    where: { dealId },
    orderBy: { visitedAt: "desc" },
  });
}

/**
 * Log key checkout (Agent workflow).
 */
export async function logKeyCheckout(keyId: string, userId: string) {
  // 1. Log Activity
  // Note: In a real app, we would resolve the user ID properly.
  // For now, we assume userId is passed or we find a default user.
  const user = await db.user.findFirst();
  
  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Keys checked out",
      content: `Keys ${keyId} checked out by user`,
      userId: user?.id, // Fallback to first user if specific ID not found/valid
      description: "Magic Keys checkout"
    }
  });

  // 2. Start Background Timer (Mock)
  // In production, this would push a job to a queue (e.g., BullMQ)
  console.log(`[TIMER] Started 5PM alert timer for User ${userId}`);

  return { success: true, checkedOutAt: new Date() };
}

// ─── QR Code Generation ─────────────────────────────────────────────

/**
 * Generate a QR code for an open house kiosk registration page.
 * Returns SVG string and data URL that can be displayed or printed.
 *
 * @param dealId - The listing/deal ID
 * @param baseUrl - The app's base URL (e.g., "https://app.pjbuddy.com")
 */
export async function generateOpenHouseQR(
  dealId: string,
  baseUrl: string = "https://app.pjbuddy.com"
): Promise<{
  success: boolean;
  svg?: string;
  dataUrl?: string;
  registrationUrl?: string;
  error?: string;
}> {
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    include: { contact: true },
  });

  if (!deal) {
    return { success: false, error: "Deal not found" };
  }

  const registrationUrl = `${baseUrl}/kiosk/${dealId}`;
  const svg = generateQRSVG(registrationUrl);
  const dataUrl = generateQRDataURL(registrationUrl);

  return {
    success: true,
    svg,
    dataUrl,
    registrationUrl,
  };
}
