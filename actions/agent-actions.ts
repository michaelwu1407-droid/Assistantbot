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

  revalidatePath(`/kiosk/open-house`);
  return { success: true };
}

/**
 * Collect buyer feedback on a listing.
 */
export async function collectFeedback(input: z.infer<typeof FeedbackSchema>) {
  const parsed = FeedbackSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  await db.buyerFeedback.create({
    data: {
      dealId: parsed.data.dealId,
      contactId: parsed.data.contactId,
      interestLevel: parsed.data.interestLevel,
      priceOpinion: parsed.data.priceOpinion,
      notes: parsed.data.notes
    }
  });

  // Log activity
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
 * Generate a Vendor Report (aggregated stats).
 */
export async function generateVendorReport(dealId: string) {
  const deal = await db.deal.findUnique({
    where: { id: dealId },
    include: {
      openHouseLogs: true,
      buyerFeedback: true
    }
  });

  if (!deal) return null;

  const totalVisitors = deal.openHouseLogs.length;
  const interestedVisitors = deal.openHouseLogs.filter(l => l.interestedLevel >= 4).length;
  
  const feedbackCount = deal.buyerFeedback.length;
  const avgPriceOpinion = deal.buyerFeedback.reduce((sum, f) => sum + (Number(f.priceOpinion) || 0), 0) / (feedbackCount || 1);

  return {
    listingTitle: deal.title,
    totalVisitors,
    interestedVisitors,
    feedbackCount,
    avgPriceOpinion: avgPriceOpinion > 0 ? avgPriceOpinion : null,
    recentFeedback: deal.buyerFeedback.slice(0, 5).map(f => ({
      interest: f.interestLevel,
      note: f.notes
    }))
  };
}

/**
 * Generate a printable Vendor Report HTML.
 */
export async function generateVendorReportPDF(dealId: string) {
  const report = await generateVendorReport(dealId);
  if (!report) return { success: false, error: "Report generation failed" };

  const feedbackRows = report.recentFeedback
    .map(
      (f) =>
        `<tr><td style="padding:8px;border-bottom:1px solid #e2e8f0">${f.interest}</td><td style="padding:8px;border-bottom:1px solid #e2e8f0">${f.note || "-"}</td></tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Vendor Report - ${report.listingTitle}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:0 auto;padding:40px;color:#1e293b}
.header{margin-bottom:40px;border-bottom:2px solid #1e293b;padding-bottom:20px}
.stats{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-bottom:40px}
.stat-box{background:#f8fafc;padding:20px;border-radius:8px;text-align:center}
.stat-val{font-size:24px;font-weight:bold;color:#0f172a}
.stat-label{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:1px}
table{width:100%;border-collapse:collapse;margin:20px 0}th{text-align:left;padding:8px;border-bottom:2px solid #1e293b;font-weight:600}
@media print{body{padding:20px}}</style></head>
<body>
<div class="header"><h1 style="margin:0">Vendor Report</h1><p style="color:#64748b;margin:4px 0 0">${report.listingTitle}</p></div>
<div class="stats">
<div class="stat-box"><div class="stat-val">${report.totalVisitors}</div><div class="stat-label">Total Visitors</div></div>
<div class="stat-box"><div class="stat-val">${report.interestedVisitors}</div><div class="stat-label">Highly Interested</div></div>
<div class="stat-box"><div class="stat-val">${report.avgPriceOpinion ? `$${report.avgPriceOpinion.toLocaleString()}` : "N/A"}</div><div class="stat-label">Avg Price Opinion</div></div>
</div>
<h3>Recent Feedback</h3>
<table><thead><tr><th>Interest</th><th>Notes</th></tr></thead>
<tbody>${feedbackRows.length > 0 ? feedbackRows : '<tr><td colspan="2" style="padding:8px;text-align:center;color:#94a3b8">No feedback recorded yet</td></tr>'}</tbody></table>
<p style="margin-top:40px;font-size:12px;color:#94a3b8;text-align:center">Generated by Pj Buddy</p>
</body></html>`;

  return { success: true, html, data: report };
}

/**
 * Log a key checkout event.
 * Records which key was checked out and by whom.
 */
export async function logKeyCheckout(keyCode: string, holderId: string) {
  const key = await db.key.findFirst({
    where: { code: keyCode },
  });

  if (!key) {
    return { success: false, error: "Key not found" };
  }

  await db.key.update({
    where: { id: key.id },
    data: {
      status: "CHECKED_OUT",
      holderId,
      checkedOutAt: new Date(),
    },
  });

  return { success: true, keyId: key.id };
}
