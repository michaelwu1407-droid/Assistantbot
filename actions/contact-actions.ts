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
}

interface SearchableContact extends SearchableItem {
  contact: ContactView;
}

// ─── Validation ─────────────────────────────────────────────────────

const CreateContactSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
  workspaceId: z.string(),
});

const UpdateContactSchema = z.object({
  contactId: z.string(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  company: z.string().optional(),
});

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Fetch all contacts for a workspace.
 */
export async function getContacts(workspaceId: string): Promise<ContactView[]> {
  const contacts = await db.contact.findMany({
    where: { workspaceId },
    include: {
      deals: { select: { id: true } },
      activities: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },

  });

  return contacts.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    company: c.company,
    avatarUrl: c.avatarUrl,
    address: c.address,
    metadata: (c.metadata as Record<string, unknown>) ?? undefined,
    dealCount: c.deals.length,
    lastActivityDate: c.activities[0]?.createdAt ?? null,
  }));
}

/**
 * Fetch a single contact by ID.
 */
export async function getContact(contactId: string): Promise<ContactView | null> {
  const contact = await db.contact.findUnique({
    where: { id: contactId },
    include: {
      deals: { orderBy: { updatedAt: "desc" } },
      activities: { orderBy: { createdAt: "desc" } }
    },
  });

  if (!contact) return null;

  return {
    id: contact.id,
    name: contact.name,
    email: contact.email,
    phone: contact.phone,
    company: contact.company,
    avatarUrl: contact.avatarUrl,
    address: contact.address,
    metadata: (contact.metadata as Record<string, unknown>) ?? undefined,
    dealCount: contact.deals.length,
    lastActivityDate: contact.activities[0]?.createdAt ?? null,
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
    // Merge Strategy: Update missing fields only (except Name/Company might be override?)
    // For now, we'll only fill in blanks to be safe, or update if provided explicitly?
    // Let's go with: Update provided fields if they are currently null on the record. 
    // AND update the latest info if provided strings are longer/newer? 
    // Simple Merge: Overwrite with new data if provided.

    await db.contact.update({
      where: { id: existingContact.id },
      data: {
        name: parsed.data.name, // Accept new name as "latest"
        email: parsed.data.email || existingContact.email,
        phone: parsed.data.phone || existingContact.phone,
        company: parsed.data.company || existingContact.company,
        address: parsed.data.address || existingContact.address,
      }
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

  const contact = await db.contact.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone,
      address: parsed.data.address,
      company: parsed.data.company ?? enriched?.name ?? null,
      avatarUrl: enriched?.logoUrl ?? null,
      workspaceId: parsed.data.workspaceId,
      metadata: enriched
        ? JSON.parse(JSON.stringify({
          enriched: true,
          domain: enriched.domain,
          industry: enriched.industry,
          size: enriched.size,
          linkedinUrl: enriched.linkedinUrl,
        }))
        : undefined,
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
