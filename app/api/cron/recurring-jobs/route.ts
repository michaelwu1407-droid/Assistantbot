import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { RecurrenceRule } from "@/actions/deal-actions";

export const dynamic = "force-dynamic";

/**
 * Cron: clone recurring deals whose scheduledAt has passed and haven't been cloned yet for the next cycle.
 *
 * Trigger this endpoint from a cron service (e.g. Vercel Cron, Supabase pg_cron) once per day.
 * Secure with the CRON_SECRET env variable.
 *
 * Call: GET /api/cron/recurring-jobs
 * Header: Authorization: Bearer <CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  let cloned = 0;
  let skipped = 0;
  const errors: string[] = [];

  // Find all deals that have a recurrence rule, are past their scheduledAt, and not in terminal stages
  const candidates = await db.deal.findMany({
    where: {
      scheduledAt: { lt: now },
      stage: { in: ["SCHEDULED", "NEGOTIATION", "CONTACTED", "NEW"] },
      jobStatus: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    select: {
      id: true,
      title: true,
      value: true,
      stage: true,
      address: true,
      latitude: true,
      longitude: true,
      workspaceId: true,
      contactId: true,
      assignedToId: true,
      metadata: true,
      scheduledAt: true,
    },
  });

  for (const deal of candidates) {
    const meta = (deal.metadata as Record<string, unknown>) ?? {};
    const rule = meta.recurrence as RecurrenceRule | undefined;
    if (!rule?.unit) continue;

    const lastCloned = meta.recurrenceLastClonedAt as string | undefined;
    const nextOccurrence = computeNextOccurrence(deal.scheduledAt!, rule, lastCloned);

    if (!nextOccurrence) {
      skipped++;
      continue;
    }

    // Check if end date has passed
    if (rule.endDate && nextOccurrence > new Date(rule.endDate)) {
      skipped++;
      continue;
    }

    try {
      // Clone the deal with the new scheduledAt
      await db.deal.create({
        data: {
          title: deal.title,
          value: deal.value,
          stage: deal.stage,
          address: deal.address ?? undefined,
          latitude: deal.latitude,
          longitude: deal.longitude,
          workspaceId: deal.workspaceId,
          contactId: deal.contactId ?? undefined,
          assignedToId: deal.assignedToId ?? undefined,
          scheduledAt: nextOccurrence,
          metadata: JSON.parse(JSON.stringify({
            ...meta,
            recurrence: rule,
            recurrenceSourceId: deal.id,
            recurrenceLastClonedAt: undefined,
          })),
        },
      });

      // Update the original deal's lastClonedAt so we don't clone it again
      await db.deal.update({
        where: { id: deal.id },
        data: {
          metadata: JSON.parse(JSON.stringify({
            ...meta,
            recurrenceLastClonedAt: now.toISOString(),
          })),
        },
      });

      cloned++;
      console.log(`[cron/recurring-jobs] Cloned "${deal.title}" → next: ${nextOccurrence.toISOString()}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      errors.push(`${deal.id}: ${msg}`);
      console.error(`[cron/recurring-jobs] Failed to clone ${deal.id}:`, err);
    }
  }

  return NextResponse.json({
    success: true,
    processed: candidates.length,
    cloned,
    skipped,
    errors,
    runAt: now.toISOString(),
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function addInterval(date: Date, unit: RecurrenceRule["unit"], interval: number): Date {
  const next = new Date(date);
  switch (unit) {
    case "day":
      next.setDate(next.getDate() + interval);
      break;
    case "week":
      next.setDate(next.getDate() + interval * 7);
      break;
    case "fortnight":
      next.setDate(next.getDate() + 14);
      break;
    case "month":
      next.setMonth(next.getMonth() + interval);
      break;
  }
  return next;
}

function computeNextOccurrence(
  scheduledAt: Date,
  rule: RecurrenceRule,
  lastClonedAt?: string
): Date | null {
  const now = new Date();

  if (!lastClonedAt) {
    // Never cloned — next occurrence is one interval after scheduledAt
    const next = addInterval(scheduledAt, rule.unit, rule.interval);
    return next > now ? next : null; // only clone future occurrences
  }

  // Already cloned: next occurrence is one interval after lastClonedAt's derived base
  const lastCloned = new Date(lastClonedAt);
  const elapsed = now.getTime() - lastCloned.getTime();
  const intervalMs = intervalToMs(rule.unit, rule.interval);

  if (elapsed < intervalMs) {
    return null; // too soon
  }

  return addInterval(lastCloned, rule.unit, rule.interval);
}

function intervalToMs(unit: RecurrenceRule["unit"], interval: number): number {
  const DAY_MS = 86400000;
  switch (unit) {
    case "day": return DAY_MS * interval;
    case "week": return DAY_MS * 7 * interval;
    case "fortnight": return DAY_MS * 14;
    case "month": return DAY_MS * 30 * interval;
  }
}
