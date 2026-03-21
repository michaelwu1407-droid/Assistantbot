"use server";

import type { DealStage, Prisma } from "@prisma/client";

import { getAuthUserId } from "@/lib/auth";
import { db } from "@/lib/db";

const DAY_MS = 86400000;

type SeedSpec = {
  title: string;
  stage: DealStage;
  value: number;
  contactName: string;
  address: string;
  scheduledAt?: Date | null;
  isDraft?: boolean;
  /** Merged into deal.metadata (dashboardDemoSeed always set). */
  metadata?: Record<string, unknown>;
  agentFlags?: string[];
  /** Creates a NOTE activity with this age so getDealHealth shows STALE / ROTTEN. */
  activityDaysAgo?: number;
};

const BASE_SPECS: SeedSpec[] = [
  { title: "[Demo] Roof leak inspection", stage: "NEW", value: 8900, contactName: "Sarah Jenkins", address: "124 Oak Ave, Sydney" },
  { title: "[Demo] Gutter replacement", stage: "NEW", value: 2400, contactName: "Michael Chen", address: "88 Skyline Rd" },
  { title: "[Demo] Solar panel quote", stage: "CONTACTED", value: 28900, contactName: "Robert Patterson", address: "17 Wyndham St" },
  { title: "[Demo] Hot water system", stage: "CONTACTED", value: 3200, contactName: "Emma Wilson", address: "42 Park Rd" },
  {
    title: "[Demo] Emergency plumbing",
    stage: "SCHEDULED",
    value: 450,
    contactName: "John Smith",
    address: "17 Wyndham St",
    scheduledAt: new Date(Date.now() + DAY_MS),
  },
  {
    title: "[Demo] Bathroom reno scope",
    stage: "NEGOTIATION",
    value: 18500,
    contactName: "Lisa Park",
    address: "9 Marine Pde",
    scheduledAt: new Date(Date.now() + 7 * DAY_MS),
  },
  {
    title: "[Demo] Annual HVAC service",
    stage: "SCHEDULED",
    value: 890,
    contactName: "James Lee",
    address: "3 Station St",
    scheduledAt: new Date(Date.now() + 2 * DAY_MS),
  },
  {
    title: "[Demo] Gas safety check",
    stage: "INVOICED",
    value: 2200,
    contactName: "Anna Brown",
    address: "50 Hill Cres",
    scheduledAt: new Date(Date.now() - 2 * DAY_MS),
  },
  {
    title: "[Demo] Tap replacement",
    stage: "WON",
    value: 650,
    contactName: "Chris Taylor",
    address: "12 River Rd",
    scheduledAt: new Date(Date.now() - 14 * DAY_MS),
  },
  { title: "[Demo] Archived tidy-up", stage: "DELETED", value: 100, contactName: "Old Client", address: "1 Demo Ln" },
];

/** Extra rows to showcase card variants (idempotent by title). */
const SHOWCASE_SPECS: SeedSpec[] = [
  {
    title: "[Demo] Showcase stale follow-up",
    stage: "NEW",
    value: 1800,
    contactName: "Alex Stale",
    address: "10 Quiet St",
    activityDaysAgo: 10,
  },
  {
    title: "[Demo] Showcase rotting lead",
    stage: "NEW",
    value: 900,
    contactName: "Riley Rotting",
    address: "88 Old Lane",
    activityDaysAgo: 20,
  },
  {
    title: "[Demo] Showcase overdue job",
    stage: "SCHEDULED",
    value: 3200,
    contactName: "Pat Overdue",
    address: "5 Late Ave",
    scheduledAt: new Date(Date.now() - 5 * DAY_MS),
  },
  {
    title: "[Demo] Draft quote waiting",
    stage: "NEW",
    value: 4100,
    contactName: "Dana Draft",
    address: "2 Draft Rd",
    isDraft: true,
  },
  {
    title: "[Demo] Pending manager approval",
    stage: "PENDING_COMPLETION",
    value: 5600,
    contactName: "Morgan Pending",
    address: "7 Review Cl",
    scheduledAt: new Date(Date.now() - 3 * DAY_MS),
    metadata: {
      completionRequestedAt: new Date().toISOString(),
    },
  },
  {
    title: "[Demo] Rejected completion",
    stage: "CONTACTED",
    value: 7800,
    contactName: "Casey Reject",
    address: "9 Return Pl",
    metadata: {
      completionRejectedAt: new Date().toISOString(),
      completionRejectionReason: "Photos missing from handover",
    },
  },
  {
    title: "[Demo] Triage flags sample",
    stage: "CONTACTED",
    value: 12000,
    contactName: "Taylor Triage",
    address: "44 Far Suburb",
    agentFlags: ["Far away (45km)", "Potential tire-kicker"],
  },
  {
    title: "[Demo] Unread messages",
    stage: "NEW",
    value: 600,
    contactName: "Jamie Unread",
    address: "1 Inbox St",
    metadata: { unread: true },
  },
];

/** Extra volume for dev stress-testing (idempotent by `[Stress] …` title). */
const STRESS_SPECS: SeedSpec[] = (() => {
  const stages: DealStage[] = [
    "NEW",
    "CONTACTED",
    "NEGOTIATION",
    "SCHEDULED",
    "PIPELINE",
    "INVOICED",
    "WON",
    "LOST",
    "DELETED",
  ];
  const out: SeedSpec[] = [];
  for (let i = 0; i < 36; i++) {
    const stage = stages[i % stages.length]!;
    out.push({
      title: `[Stress] Load test job ${String(i + 1).padStart(2, "0")}`,
      stage,
      value: 500 + (i % 8) * 250,
      contactName: `Stress Contact ${i + 1}`,
      address: `${100 + i} Stress St, Sydney`,
      scheduledAt:
        stage === "SCHEDULED" || stage === "INVOICED"
          ? new Date(Date.now() + ((i % 10) - 3) * DAY_MS)
          : null,
    });
  }
  return out;
})();

/**
 * Dev-only: idempotently seed demo deals for the dashboard Kanban (localhost / NODE_ENV=development).
 * Each deal uses a fixed `[Demo] …` title so re-runs skip existing rows.
 */
export async function ensureDashboardDemoDeals(workspaceId: string): Promise<{ created: number }> {
  if (process.env.NODE_ENV !== "development") {
    return { created: 0 };
  }

  const authUserId = await getAuthUserId();
  if (!authUserId) return { created: 0 };

  const workspace = await db.workspace.findFirst({
    where: { id: workspaceId, ownerId: authUserId },
    select: { id: true },
  });
  if (!workspace) return { created: 0 };

  const specs: SeedSpec[] = [...BASE_SPECS, ...SHOWCASE_SPECS, ...STRESS_SPECS];

  let created = 0;
  for (const s of specs) {
    const exists = await db.deal.findFirst({
      where: { workspaceId, title: s.title },
      select: { id: true },
    });
    if (exists) continue;

    const contact = await db.contact.create({
      data: {
        name: s.contactName,
        workspaceId,
        metadata: { dashboardDemoSeed: true },
      },
    });

    const metadata: Prisma.InputJsonValue = {
      dashboardDemoSeed: true,
      ...(s.metadata ?? {}),
    };

    const deal = await db.deal.create({
      data: {
        title: s.title,
        stage: s.stage,
        value: s.value,
        workspaceId,
        contactId: contact.id,
        address: s.address,
        scheduledAt: s.scheduledAt ?? null,
        isDraft: s.isDraft ?? false,
        metadata,
        ...(s.agentFlags && s.agentFlags.length > 0
          ? { agentFlags: s.agentFlags as unknown as Prisma.InputJsonValue }
          : {}),
      },
    });

    if (s.activityDaysAgo && s.activityDaysAgo > 0) {
      await db.activity.create({
        data: {
          type: "NOTE",
          title: "Last touch",
          dealId: deal.id,
          contactId: contact.id,
          createdAt: new Date(Date.now() - s.activityDaysAgo * DAY_MS),
        },
      });
    }

    created++;
  }

  return { created };
}
