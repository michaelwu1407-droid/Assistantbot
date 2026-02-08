"use server";

import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────

export interface PortalListing {
  title: string;
  address: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
  agentName?: string;
  agentEmail?: string;
  agentPhone?: string;
  imageUrl?: string;
  portalUrl: string;
  portal: "rea" | "domain";
}

export interface ImportResult {
  success: boolean;
  dealId?: string;
  contactId?: string;
  error?: string;
}

// ─── Portal Scrapers (Stubs) ────────────────────────────────────────

/**
 * Parse a REA (realestate.com.au) listing URL.
 * STUB: In production, this would scrape/API-call the listing page.
 */
async function parseREAListing(url: string): Promise<PortalListing | null> {
  // Extract listing ID from URL pattern: realestate.com.au/property-xxx-xxx-xxx
  const idMatch = url.match(/property[/-]([a-z0-9-]+)/i);
  if (!idMatch) return null;

  // STUB: Return mock data — in production, call REA API or scrape
  return {
    title: `Property ${idMatch[1].substring(0, 8)}`,
    address: "123 Example St, Sydney NSW 2000",
    price: 850000,
    bedrooms: 3,
    bathrooms: 2,
    propertyType: "House",
    portalUrl: url,
    portal: "rea",
  };
}

/**
 * Parse a Domain.com.au listing URL.
 * STUB: In production, this would use the Domain API.
 */
async function parseDomainListing(url: string): Promise<PortalListing | null> {
  // Extract listing ID from URL pattern: domain.com.au/xxx-xxx-xxx
  const idMatch = url.match(/(\d{6,})/);
  if (!idMatch) return null;

  // STUB: Return mock data — in production, call Domain API
  return {
    title: `Listing ${idMatch[1]}`,
    address: "456 Example Ave, Melbourne VIC 3000",
    price: 1200000,
    bedrooms: 4,
    bathrooms: 2,
    propertyType: "Apartment",
    portalUrl: url,
    portal: "domain",
  };
}

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Import a listing from REA or Domain into the CRM.
 * Creates a Deal + optional Contact from the listing data.
 *
 * @param url - The portal listing URL
 * @param workspaceId - The workspace to import into
 */
export async function importFromPortal(
  url: string,
  workspaceId: string
): Promise<ImportResult> {
  let listing: PortalListing | null = null;

  // Detect portal from URL
  if (url.includes("realestate.com.au")) {
    listing = await parseREAListing(url);
  } else if (url.includes("domain.com.au")) {
    listing = await parseDomainListing(url);
  } else {
    return { success: false, error: "Unsupported portal. Use realestate.com.au or domain.com.au URLs." };
  }

  if (!listing) {
    return { success: false, error: "Could not parse listing from URL" };
  }

  // Create contact if agent info is available
  let contactId: string | undefined;
  if (listing.agentName) {
    const existing = listing.agentEmail
      ? await db.contact.findFirst({
        where: { email: listing.agentEmail, workspaceId },
      })
      : null;

    if (existing) {
      contactId = existing.id;
    } else {
      const contact = await db.contact.create({
        data: {
          name: listing.agentName,
          email: listing.agentEmail,
          phone: listing.agentPhone,
          workspaceId,
        },
      });
      contactId = contact.id;
    }
  }

  // If no contact, create a placeholder
  if (!contactId) {
    const placeholder = await db.contact.create({
      data: {
        name: `${listing.portal.toUpperCase()} Listing`,
        company: listing.portal === "rea" ? "realestate.com.au" : "Domain",
        workspaceId,
      },
    });
    contactId = placeholder.id;
  }

  // Create the deal
  const deal = await db.deal.create({
    data: {
      title: listing.title,
      value: listing.price,
      stage: "NEW",
      stageChangedAt: new Date(),
      address: listing.address,
      contactId,
      workspaceId,
      metadata: JSON.parse(JSON.stringify({
        portal: listing.portal,
        portal_url: listing.portalUrl,
        bedrooms: listing.bedrooms,
        bathrooms: listing.bathrooms,
        property_type: listing.propertyType,
        imported_at: new Date().toISOString(),
      })),
    },
  });

  // Log the import
  await db.activity.create({
    data: {
      type: "NOTE",
      title: "Portal import",
      content: `Imported listing from ${listing.portal.toUpperCase()}: ${listing.title} — ${listing.address}`,
      dealId: deal.id,
      contactId,
    },
  });

  return { success: true, dealId: deal.id, contactId };
}

/**
 * Detect which portal a URL belongs to.
 */
export async function detectPortal(url: string): Promise<"rea" | "domain" | null> {
  if (url.includes("realestate.com.au")) return "rea";
  if (url.includes("domain.com.au")) return "domain";
  return null;
}
