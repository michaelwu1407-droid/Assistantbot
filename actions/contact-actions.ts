"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { enrichFromEmail, type EnrichedCompany } from "@/lib/enrichment";
import { fuzzySearch, type SearchableItem } from "@/lib/search";
import { evaluateAutomations } from "./automation-actions";

// ─── Types ──────────────────────────────────────────────────────────

export interface ContactView {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  avatarUrl: string | null;
  address: string | null;
  metadata?: Record<string, unknown>;
  dealCount: number;
  lastActivityDate: Date | null;
  /** Primary job/deal status for table (e.g. "Scheduled", "Completed"). */
  primaryDealStage: string | null;
  /** Raw deal stage for filtering (e.g. "NEW", "SCHEDULED"). */
  primaryDealStageKey: string | null;
  /** Balance summary for table (e.g. "$120 owed", "Paid", "—"). */
  balanceLabel: string;
  deals?: { title: string; address?: string; stage: string; value: number }[];
}

interface SearchableContact extends SearchableItem {
  contact: ContactView;
}

// ─── Validation ─────────────────────────────────────────────────────

const CreateContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
  workspaceId: z.string(),
  /** PERSON | BUSINESS; stored in metadata. Default PERSON. */
  contactType: z.enum(["PERSON", "BUSINESS"]).optional(),
});

const UpdateContactSchema = z.object({
  contactId: z.string(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
});

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Fetch all contacts for a workspace.
 */
const DEAL_STAGE_LABELS: Record<string, string> = {
  NEW: "New",
  CONTACTED: "Contacted",
  NEGOTIATION: "Negotiation",
  SCHEDULED: "Scheduled",
  PIPELINE: "Pipeline",
  INVOICED: "Invoiced",
  WON: "Completed",
  LOST: "Lost",
  DELETED: "Deleted",
  ARCHIVED: "Archived",
};

export async function getContacts(workspaceId: string): Promise<ContactView[]> {
  const contacts = await db.contact.findMany({
    where: { workspaceId },
    include: {
      deals: {
        orderBy: { lastActivityAt: "desc" },
        select: {
          id: true,
          stage: true,
          invoices: { select: { total: true, status: true } },
        },
      },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return contacts.map((c: any) => {
    const contactWithRelations = c as typeof c & {
      deals: { id: string; stage: string; invoices: { total: any; status: string }[] }[];
      activities: { createdAt: Date }[];
    };
    const deals = contactWithRelations.deals ?? [];
    const primaryDeal = deals[0];
    const primaryDealStage = primaryDeal
      ? (DEAL_STAGE_LABELS[primaryDeal.stage] ?? primaryDeal.stage)
      : null;
    const primaryDealStageKey = primaryDeal?.stage ?? null;
    let owed = 0;
    for (const d of deals) {
      for (const inv of d.invoices ?? []) {
        if (inv.status !== "PAID" && inv.status !== "VOID") {
          owed += Number(inv.total ?? 0);
        }
      }
    }
    const balanceLabel =
      owed > 0 ? `$${owed.toFixed(0)} owed` : deals.length > 0 ? "Paid" : "—";

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      company: c.company,
      avatarUrl: c.avatarUrl,
      address: c.address,
      metadata: (c.metadata as Record<string, unknown>) ?? undefined,
      dealCount: deals.length,
      lastActivityDate: contactWithRelations.activities[0]?.createdAt ?? null,
      primaryDealStage,
      primaryDealStageKey,
      balanceLabel,
    };
  });
}

/**
 * Fetch a single contact by ID.
 */
export async function getContact(contactId: string): Promise<ContactView | null> {
  const contact = await db.contact.findUnique({
    where: { id: contactId },
    include: {
      deals: {
        orderBy: { lastActivityAt: "desc" },
        include: { invoices: { select: { total: true, status: true } } },
      },
      activities: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!contact) return null;

  const contactWithRelations = contact as typeof contact & {
    deals: { stage: string; invoices: { total: any; status: string }[] }[];
    activities: { createdAt: Date }[];
  };
  const deals = contactWithRelations.deals ?? [];
  const primaryDeal = deals[0];
  const primaryDealStage = primaryDeal
    ? (DEAL_STAGE_LABELS[primaryDeal.stage] ?? primaryDeal.stage)
    : null;
  const primaryDealStageKey = primaryDeal?.stage ?? null;
  let owed = 0;
  for (const d of deals) {
    for (const inv of d.invoices ?? []) {
      if (inv.status !== "PAID" && inv.status !== "VOID") {
        owed += Number(inv.total ?? 0);
      }
    }
  }
  const balanceLabel =
    owed > 0 ? `$${owed.toFixed(0)} owed` : deals.length > 0 ? "Paid" : "—";

  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
    avatarUrl: contact.avatarUrl,
    address: contact.address,
    metadata: (contact.metadata as Record<string, unknown>) ?? undefined,
    dealCount: deals.length,
    lastActivityDate: contactWithRelations.activities[0]?.createdAt ?? null,
    primaryDealStage,
    primaryDealStageKey,
    balanceLabel,
    deals: deals.map((d) => {
      const deal = d as { title?: string; address?: string; metadata?: { address?: string }; value?: unknown };
      return {
        title: deal.title ?? "",
        address: (deal.metadata as { address?: string } | undefined)?.address || deal.address,
        stage: d.stage,
        value: Number(deal.value ?? 0),
      };
    }),
  };
}

/**
 * Create a new contact with optional auto-enrichment from email.
 * Includes Smart Deduplication: Merges if email or phone exists.
 */
export async function createContact(input: z.infer<typeof CreateContactSchema>) {
  const parsed = CreateContactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false as const, error: parsed.error.issues[0].message };
  }

  // 1. Smart Deduplication Check
  const existingContact = await db.contact.findFirst({
    where: {
      workspaceId: parsed.data.workspaceId,
      OR: [
        parsed.data.email ? { email: parsed.data.email } : {},
        parsed.data.phone ? { phone: parsed.data.phone } : {},
      ],
    },
  });

  if (existingContact) {
    const existingMeta = (existingContact.metadata as Record<string, unknown>) ?? {};
    await db.contact.update({
      where: { id: existingContact.id },
      data: {
        name: parsed.data.name,
        email: (parsed.data.email && parsed.data.email.trim()) || existingContact.email,
        phone: parsed.data.phone || existingContact.phone,
        company: parsed.data.company || existingContact.company,
        address: parsed.data.address || existingContact.address,
        metadata: parsed.data.contactType
          ? JSON.parse(JSON.stringify({ ...existingMeta, contactType: parsed.data.contactType }))
          : undefined,
      },
    });

    return {
      success: true as const,
      contactId: existingContact.id,
      enriched: null,
      merged: true
    };
  }

  // 2. Enrichment (Only for new contacts)
  let enriched: EnrichedCompany | null = null;
  if (parsed.data.email) {
    enriched = await enrichFromEmail(parsed.data.email);
  }

  const emailVal = parsed.data.email?.trim();
  const metadata: Record<string, unknown> = { ...(enriched ? { enriched: true, domain: enriched.domain, industry: enriched.industry, size: enriched.size, linkedinUrl: enriched.linkedinUrl } : {}) };
  if (parsed.data.contactType) metadata.contactType = parsed.data.contactType;

  const contact = await db.contact.create({
    data: {
      name: parsed.data.name,
      email: emailVal || null,
      phone: parsed.data.phone || null,
      address: parsed.data.address || null,
      company: parsed.data.company ?? enriched?.name ?? null,
      avatarUrl: enriched?.logoUrl ?? null,
      workspaceId: parsed.data.workspaceId,
      metadata: Object.keys(metadata).length > 0 ? (metadata as any) : undefined,
    },
  });

  // Trigger Automation (New Lead)
  await evaluateAutomations(parsed.data.workspaceId, {
    type: "new_lead",
    contactId: contact.id
  });

  return { success: true as const, contactId: contact.id, enriched, merged: false };
}

/**
 * Update an existing contact.
 */
export async function updateContact(input: z.infer<typeof UpdateContactSchema>) {
  const parsed = UpdateContactSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { contactId, ...data } = parsed.data;

  await db.contact.update({
    where: { id: contactId },
    data,
  });

  return { success: true };
}

/**
 * Update contact metadata (e.g. notes). Merges with existing metadata.
 */
export async function updateContactMetadata(
  contactId: string,
  metadata: Record<string, unknown>
) {
  const contact = await db.contact.findUnique({ where: { id: contactId } });
  if (!contact) return { success: false as const, error: "Contact not found" };
  const existing = (contact.metadata as Record<string, unknown>) ?? {};
  await db.contact.update({
    where: { id: contactId },
    data: { metadata: { ...existing, ...metadata } as any },
  });
  return { success: true as const };
}

/**
 * Enrich an existing contact from their email address.
 * Auto-fetches company logo, industry, size, and LinkedIn URL.
 */
export async function enrichContact(contactId: string) {
  const contact = await db.contact.findUnique({ where: { id: contactId } });
  if (!contact) return { success: false, error: "Contact not found" };
  if (!contact.email) return { success: false, error: "No email address" };

  const enriched = await enrichFromEmail(contact.email);
  if (!enriched) return { success: false, error: "Could not enrich this email" };

  const existingMetadata = (contact.metadata as Record<string, unknown>) ?? {};

  await db.contact.update({
    where: { id: contactId },
    data: {
      company: contact.company ?? enriched.name,
      avatarUrl: contact.avatarUrl ?? enriched.logoUrl,
      metadata: JSON.parse(JSON.stringify({
        ...existingMetadata,
        enriched: true,
        domain: enriched.domain,
        industry: enriched.industry,
        size: enriched.size,
        linkedinUrl: enriched.linkedinUrl,
      })),
    },
  });

  return { success: true, enriched };
}

/**
 * Fuzzy search contacts — finds "Jhon" when searching for "John".
 * Searches across name, email, company, and phone.
 */
export async function searchContacts(
  workspaceId: string,
  query: string,
  filters?: {
    hasDeals?: boolean;
    lastContactedWithin?: number; // days
  }
): Promise<ContactView[]> {
  const contacts = await getContacts(workspaceId);

  // Apply filters first
  let filtered = contacts;

  if (filters?.hasDeals) {
    filtered = filtered.filter((c) => c.dealCount > 0);
  }

  if (filters?.lastContactedWithin) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - filters.lastContactedWithin);
    filtered = filtered.filter(
      (c) => c.lastActivityDate && c.lastActivityDate >= cutoff
    );
  }

  // Build searchable items
  const searchable: SearchableContact[] = filtered.map((c) => ({
    id: c.id,
    searchableFields: [
      c.name,
      c.email ?? "",
      c.company ?? "",
      c.phone ?? "",
    ].filter(Boolean),
    contact: c,
  }));

  // Fuzzy search
  const results = fuzzySearch(searchable, query);
  return results.map((r) => r.item.contact);
}

/**
 * Delete a contact.
 */
export async function deleteContact(contactId: string) {
  await db.contact.delete({ where: { id: contactId } });
  return { success: true };
}
