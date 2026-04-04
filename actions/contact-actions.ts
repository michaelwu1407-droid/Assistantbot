"use server";

import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { enrichFromEmail, type EnrichedCompany } from "@/lib/enrichment";
import { getUserFacingDealStageLabel } from "@/lib/deal-utils";
import { fuzzySearch, type SearchableItem } from "@/lib/search";
import { evaluateAutomations } from "./automation-actions";
import { requireContactInCurrentWorkspace, requireCurrentWorkspaceAccess } from "@/lib/workspace-access";

// ─── Types ──────────────────────────────────────────────────────────

export interface ContactView {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  avatarUrl: string | null;
  address: string | null;
  metadata?: Record<string, unknown> & { tags?: string[] };
  dealCount: number;
  lastActivityDate: Date | null;
  /** Primary job/deal status for table (e.g. "Scheduled", "Completed"). */
  primaryDealStage: string | null;
  /** Raw deal stage for filtering (e.g. "NEW", "SCHEDULED"). */
  primaryDealStageKey: string | null;
  primaryDealTitle: string | null;
  /** Balance summary for table (e.g. "$120 owed", "Paid", "—"). */
  balanceLabel: string;
  deals?: { title: string; address?: string; stage: string; value: number }[];
}

export interface ContactsPageResult {
  contacts: ContactView[];
  total: number;
  page: number;
  pageSize: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

interface SearchableContact extends SearchableItem {
  contact: ContactView;
}

type UniqueContactClause =
  | { email: string; phone?: undefined }
  | { phone: string; email?: undefined };

// ─── Validation ─────────────────────────────────────────────────────

const CreateContactSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().optional(),
    address: z.string().optional(),
    company: z.string().optional(),
    workspaceId: z.string(),
    /** PERSON | BUSINESS; stored in metadata. Default PERSON. */
    contactType: z.enum(["PERSON", "BUSINESS"]).optional(),
  })
  .refine(
    (data) => {
      if (data.contactType === "BUSINESS") return true;
      const hasEmail = typeof data.email === "string" && data.email.trim() !== "";
      const hasPhone = typeof data.phone === "string" && data.phone.trim() !== "";
      return hasEmail || hasPhone;
    },
    { message: "At least one of phone or email is required." }
  );

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
const DEFAULT_CONTACTS_PAGE_SIZE = 100;
const MAX_CONTACTS_PAGE_SIZE = 500;

function toContactView(c: unknown): ContactView {
  const base = c as {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    avatarUrl: string | null;
    address: string | null;
    metadata: unknown;
  };
  const contactWithRelations = c as typeof c & {
    deals: { id: string; title?: string | null; stage: string; invoices: { total: unknown; status: string }[] }[];
    activities: { createdAt: Date }[];
  };
  const deals = contactWithRelations.deals ?? [];
  const primaryDeal = deals[0];
  const primaryDealStage = primaryDeal ? getUserFacingDealStageLabel(primaryDeal.stage) : null;
  const primaryDealStageKey = primaryDeal?.stage ?? null;
  const primaryDealTitle = primaryDeal?.title ?? null;
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
    id: base.id,
    name: base.name,
    email: base.email,
    phone: base.phone,
    company: base.company,
    avatarUrl: base.avatarUrl,
    address: base.address,
    metadata: (base.metadata as Record<string, unknown>) ?? undefined,
    dealCount: deals.length,
    lastActivityDate: contactWithRelations.activities[0]?.createdAt ?? null,
    primaryDealStage,
    primaryDealStageKey,
    primaryDealTitle,
    balanceLabel,
  };
}

export async function getContacts(
  workspaceId: string,
  options?: { page?: number; pageSize?: number; unbounded?: boolean }
): Promise<ContactView[]> {
  const pageSize = Math.max(
    1,
    Math.min(options?.pageSize ?? DEFAULT_CONTACTS_PAGE_SIZE, MAX_CONTACTS_PAGE_SIZE)
  );
  const page = Math.max(1, options?.page ?? 1);
  const skip = (page - 1) * pageSize;

  const contacts = await db.contact.findMany({
    where: { workspaceId },
    ...(options?.unbounded ? {} : { take: pageSize, skip }),
    include: {
      deals: {
        orderBy: { lastActivityAt: "desc" },
        select: {
          id: true,
          title: true,
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

  return contacts.map(toContactView);
}

export async function getContactsPage(
  workspaceId: string,
  options?: { page?: number; pageSize?: number }
): Promise<ContactsPageResult> {
  const pageSize = Math.max(
    1,
    Math.min(options?.pageSize ?? DEFAULT_CONTACTS_PAGE_SIZE, MAX_CONTACTS_PAGE_SIZE)
  );
  const page = Math.max(1, options?.page ?? 1);
  const skip = (page - 1) * pageSize;

  const [total, contacts] = await Promise.all([
    db.contact.count({ where: { workspaceId } }),
    db.contact.findMany({
      where: { workspaceId },
      take: pageSize,
      skip,
      include: {
        deals: {
          orderBy: { lastActivityAt: "desc" },
          select: {
            id: true,
            title: true,
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
    }),
  ]);

  return {
    contacts: contacts.map(toContactView),
    total,
    page,
    pageSize,
    hasNextPage: skip + contacts.length < total,
    hasPrevPage: page > 1,
  };
}

/**
 * Fetch a single contact by ID.
 */
export async function getContact(contactId: string): Promise<ContactView | null> {
  const { actor, contact: scopedContact } = await requireContactInCurrentWorkspace(contactId);
  const visibleDealWhere = actor.role === "TEAM_MEMBER" ? { assignedToId: actor.id } : undefined;
  const contact = await db.contact.findFirst({
    where: { id: scopedContact.id, workspaceId: scopedContact.workspaceId },
    include: {
      deals: {
        where: visibleDealWhere,
        orderBy: { lastActivityAt: "desc" },
        include: { invoices: { select: { total: true, status: true } } },
      },
      activities: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!contact) return null;

  const contactWithRelations = contact as typeof contact & {
    deals: { title?: string | null; stage: string; invoices: { total: unknown; status: string }[] }[];
    activities: { createdAt: Date }[];
  };
  const deals = contactWithRelations.deals ?? [];
  const primaryDeal = deals[0];
  const primaryDealStage = primaryDeal ? getUserFacingDealStageLabel(primaryDeal.stage) : null;
  const primaryDealStageKey = primaryDeal?.stage ?? null;
  const primaryDealTitle = primaryDeal?.title ?? null;
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
    primaryDealTitle,
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

  const actor = await requireCurrentWorkspaceAccess();
  if (parsed.data.workspaceId !== actor.workspaceId) {
    return { success: false as const, error: "Unauthorized workspace" };
  }

  const uniqueContactClauses = [
    parsed.data.email ? { email: parsed.data.email } : null,
    parsed.data.phone ? { phone: parsed.data.phone } : null,
  ].filter((value): value is UniqueContactClause => value !== null);

  // 1. Smart Deduplication Check: only reuse by email/phone when the name matches.
  // Otherwise multiple jobs with different client names but same phone would all
  // attach to one contact and show the last name (e.g. all cards showing "John").
  const existingContact = uniqueContactClauses.length > 0
    ? await db.contact.findFirst({
        where: {
          workspaceId: parsed.data.workspaceId,
          OR: uniqueContactClauses,
        },
      })
    : null;

  const nameMatches =
    existingContact &&
    parsed.data.name.trim().toLowerCase() === existingContact.name.trim().toLowerCase();

  if (existingContact && nameMatches) {
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

  let contact;
  try {
    contact = await db.contact.create({
      data: {
        name: parsed.data.name,
        email: emailVal || null,
        phone: parsed.data.phone || null,
        address: parsed.data.address || null,
        company: parsed.data.company ?? enriched?.name ?? null,
        avatarUrl: enriched?.logoUrl ?? null,
        workspaceId: parsed.data.workspaceId,
        metadata: Object.keys(metadata).length > 0 ? (metadata as Prisma.InputJsonValue) : undefined,
      },
    });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const collided = uniqueContactClauses.length > 0
        ? await db.contact.findFirst({
            where: {
              workspaceId: parsed.data.workspaceId,
              OR: uniqueContactClauses,
            },
            select: { id: true },
          })
        : null;
      if (collided) {
        return { success: true as const, contactId: collided.id, enriched: null, merged: true };
      }
      return { success: false as const, error: "This contact already exists." };
    }
    throw error;
  }

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
  const { actor, contact } = await requireContactInCurrentWorkspace(contactId);
  if (!contact) return { success: false, error: "Contact not found" };
  if (actor.role === "TEAM_MEMBER") {
    return { success: false, error: "Only managers can edit contact details." };
  }

  const newEmail = data.email !== undefined ? (data.email && data.email.trim() ? data.email.trim() : null) : contact.email;
  const newPhone = data.phone !== undefined ? (data.phone && data.phone.trim() ? data.phone.trim() : null) : contact.phone;
  const hasEmail = typeof newEmail === "string" && newEmail.length > 0;
  const hasPhone = typeof newPhone === "string" && newPhone.length > 0;
  if (!hasEmail && !hasPhone) {
    return { success: false, error: "At least one of phone or email is required." };
  }

  await db.contact.update({
    where: { id: contactId },
    data: {
      ...data,
      email: data.email !== undefined ? (data.email && data.email.trim() ? data.email.trim() : null) : undefined,
      phone: data.phone !== undefined ? (data.phone && data.phone.trim() ? data.phone.trim() : null) : undefined,
    },
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
  const { actor, contact } = await requireContactInCurrentWorkspace(contactId);
  if (!contact) return { success: false as const, error: "Contact not found" };
  const existing = (contact.metadata as Record<string, unknown>) ?? {};
  const mergedMetadata = { ...existing, ...metadata } as Prisma.InputJsonValue;
  await db.contact.update({
    where: { id: contactId },
    data: { metadata: mergedMetadata },
  });

  const previousNotes = typeof existing.notes === "string" ? existing.notes.trim() : "";
  const nextNotes = typeof metadata.notes === "string" ? metadata.notes.trim() : null;

  if (nextNotes !== null && nextNotes !== previousNotes) {
    const latestDeal = await db.deal.findFirst({
      where: { contactId, workspaceId: actor.workspaceId },
      orderBy: { updatedAt: "desc" },
      select: { id: true },
    });

    await db.activity.create({
      data: {
        type: "NOTE",
        title: previousNotes ? "Contact note updated" : "Contact note added",
        content: nextNotes || "Notes cleared.",
        contactId,
        dealId: latestDeal?.id,
        userId: actor.id,
      },
    });
  }

  return { success: true as const };
}

/**
 * Enrich an existing contact from their email address.
 * Auto-fetches company logo, industry, size, and LinkedIn URL.
 */
export async function enrichContact(contactId: string) {
  const { contact } = await requireContactInCurrentWorkspace(contactId);
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
  const contacts = await getContacts(workspaceId, { unbounded: true });

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
  const { actor } = await requireContactInCurrentWorkspace(contactId);
  if (actor.role === "TEAM_MEMBER") {
    return { success: false, error: "Only managers can delete contacts." };
  }
  await db.contact.delete({ where: { id: contactId } });
  return { success: true };
}

/**
 * Delete multiple contacts.
 */
export async function deleteContacts(contactIds: string[]) {
  const actor = await requireCurrentWorkspaceAccess();
  if (actor.role === "TEAM_MEMBER") {
    return { success: false, error: "Only managers can delete contacts." };
  }
  try {
    await db.contact.deleteMany({
      where: {
        id: { in: contactIds },
        workspaceId: actor.workspaceId,
      },
    });
    return { success: true };
  } catch (error: any) {
    if (error?.code === 'P2003') {
      return { success: false, error: "Cannot delete contacts with existing jobs or activities. Please delete them first." };
    }
    return { success: false, error: "Failed to delete contacts." };
  }
}
