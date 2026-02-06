"use server";

import { db } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────

export interface DuplicateGroup {
  /** The contacts that are likely duplicates of each other */
  contacts: {
    id: string;
    name: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    dealCount: number;
    activityCount: number;
  }[];
  /** Why we think they're duplicates */
  reason: "email" | "phone" | "name";
  /** Confidence: 1.0 = exact match, lower = fuzzy */
  confidence: number;
}

// ─── Helpers ────────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
}

function nameSimilarity(a: string, b: string): number {
  const la = a.toLowerCase().trim();
  const lb = b.toLowerCase().trim();
  if (la === lb) return 1.0;
  const maxLen = Math.max(la.length, lb.length);
  if (maxLen === 0) return 0;
  return 1 - levenshtein(la, lb) / maxLen;
}

// ─── Server Actions ─────────────────────────────────────────────────

/**
 * Find duplicate contacts in a workspace.
 * Matches on: exact email, exact phone, or fuzzy name (>85% similar).
 */
export async function findDuplicateContacts(
  workspaceId: string
): Promise<DuplicateGroup[]> {
  const contacts = await db.contact.findMany({
    where: { workspaceId },
    include: {
      deals: { select: { id: true } },
      activities: { select: { id: true } },
    },
  });

  const groups: DuplicateGroup[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < contacts.length; i++) {
    for (let j = i + 1; j < contacts.length; j++) {
      const a = contacts[i];
      const b = contacts[j];
      const pairKey = [a.id, b.id].sort().join(":");

      if (seen.has(pairKey)) continue;

      // Exact email match
      if (a.email && b.email && a.email.toLowerCase() === b.email.toLowerCase()) {
        seen.add(pairKey);
        groups.push({
          contacts: [a, b].map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            company: c.company,
            dealCount: c.deals.length,
            activityCount: c.activities.length,
          })),
          reason: "email",
          confidence: 1.0,
        });
        continue;
      }

      // Exact phone match (normalize: strip spaces, dashes, parens)
      if (a.phone && b.phone) {
        const normA = a.phone.replace(/[\s\-()]/g, "");
        const normB = b.phone.replace(/[\s\-()]/g, "");
        if (normA === normB) {
          seen.add(pairKey);
          groups.push({
            contacts: [a, b].map((c) => ({
              id: c.id,
              name: c.name,
              email: c.email,
              phone: c.phone,
              company: c.company,
              dealCount: c.deals.length,
              activityCount: c.activities.length,
            })),
            reason: "phone",
            confidence: 1.0,
          });
          continue;
        }
      }

      // Fuzzy name match (>85% similar)
      const similarity = nameSimilarity(a.name, b.name);
      if (similarity > 0.85) {
        seen.add(pairKey);
        groups.push({
          contacts: [a, b].map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            company: c.company,
            dealCount: c.deals.length,
            activityCount: c.activities.length,
          })),
          reason: "name",
          confidence: parseFloat(similarity.toFixed(2)),
        });
      }
    }
  }

  // Sort by confidence descending
  return groups.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Merge two contacts: keep one, merge data from the other, then delete the other.
 * Transfers all deals, activities, and tasks to the kept contact.
 */
export async function mergeContacts(keepId: string, mergeId: string) {
  const [keep, merge] = await Promise.all([
    db.contact.findUnique({ where: { id: keepId } }),
    db.contact.findUnique({ where: { id: mergeId } }),
  ]);

  if (!keep || !merge) {
    return { success: false, error: "One or both contacts not found" };
  }

  // Fill in any missing fields on the kept contact from the merged one
  await db.contact.update({
    where: { id: keepId },
    data: {
      email: keep.email ?? merge.email,
      phone: keep.phone ?? merge.phone,
      company: keep.company ?? merge.company,
      address: keep.address ?? merge.address,
      avatarUrl: keep.avatarUrl ?? merge.avatarUrl,
      metadata: (keep.metadata ?? merge.metadata)
        ? JSON.parse(JSON.stringify(keep.metadata ?? merge.metadata))
        : undefined,
    },
  });

  // Transfer all related records to the kept contact
  await Promise.all([
    db.deal.updateMany({
      where: { contactId: mergeId },
      data: { contactId: keepId },
    }),
    db.activity.updateMany({
      where: { contactId: mergeId },
      data: { contactId: keepId },
    }),
    db.task.updateMany({
      where: { contactId: mergeId },
      data: { contactId: keepId },
    }),
  ]);

  // Delete the merged contact
  await db.contact.delete({ where: { id: mergeId } });

  return { success: true, keptId: keepId, mergedId: mergeId };
}
