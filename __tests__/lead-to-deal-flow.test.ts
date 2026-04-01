import { beforeEach, describe, expect, it, vi } from "vitest";

type ContactRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  avatarUrl: string | null;
  address: string | null;
  workspaceId: string;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

type DealRecord = {
  id: string;
  title: string;
  value: number;
  stage: string;
  contactId: string;
  workspaceId: string;
  address: string | null;
  metadata?: Record<string, unknown>;
  isDraft: boolean;
  stageChangedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  assignedToId: string | null;
  scheduledAt: Date | null;
  latitude?: number | null;
  longitude?: number | null;
  invoicedAmount?: number | null;
  isStale?: boolean;
  actualOutcome?: string | null;
  outcomeNotes?: string | null;
  agentFlags?: string[] | null;
  source?: string | null;
};

type ActivityRecord = {
  id: string;
  type: string;
  title: string;
  content: string;
  dealId?: string;
  contactId?: string;
  createdAt: Date;
};

const {
  db,
  enrichFromEmail,
  fuzzySearch,
  evaluateAutomations,
  requireCurrentWorkspaceAccess,
  requireContactInCurrentWorkspace,
  requireDealInCurrentWorkspace,
  triageIncomingLead,
  saveTriageRecommendation,
  findNearbyBookings,
  syncGoogleCalendarEventForDeal,
  removeGoogleCalendarEventForDeal,
  recordWorkspaceAuditEvent,
  recordSyncIssue,
  getDealHealth,
  logger,
  monitoringTrackEvent,
  monitoringLogError,
} = vi.hoisted(() => ({
  db: {
    contact: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    deal: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    task: {
      findFirst: vi.fn(),
    },
  },
  enrichFromEmail: vi.fn(),
  fuzzySearch: vi.fn(),
  evaluateAutomations: vi.fn(),
  requireCurrentWorkspaceAccess: vi.fn(),
  requireContactInCurrentWorkspace: vi.fn(),
  requireDealInCurrentWorkspace: vi.fn(),
  triageIncomingLead: vi.fn(),
  saveTriageRecommendation: vi.fn(),
  findNearbyBookings: vi.fn(),
  syncGoogleCalendarEventForDeal: vi.fn(),
  removeGoogleCalendarEventForDeal: vi.fn(),
  recordWorkspaceAuditEvent: vi.fn(),
  recordSyncIssue: vi.fn(),
  getDealHealth: vi.fn(),
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  monitoringTrackEvent: vi.fn(),
  monitoringLogError: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/enrichment", () => ({ enrichFromEmail }));
vi.mock("@/lib/search", () => ({ fuzzySearch }));
vi.mock("@/actions/automation-actions", () => ({ evaluateAutomations }));
vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess,
  requireContactInCurrentWorkspace,
  requireDealInCurrentWorkspace,
}));
vi.mock("@/lib/ai/triage", () => ({
  triageIncomingLead,
  saveTriageRecommendation,
}));
vi.mock("@/actions/geo-actions", () => ({ findNearbyBookings }));
vi.mock("@/lib/workspace-calendar", () => ({
  syncGoogleCalendarEventForDeal,
  removeGoogleCalendarEventForDeal,
}));
vi.mock("@/lib/workspace-audit", () => ({ recordWorkspaceAuditEvent }));
vi.mock("@/lib/sync-issues", () => ({ recordSyncIssue }));
vi.mock("@/lib/pipeline", () => ({
  getDealHealth,
}));
vi.mock("@/lib/logging", () => ({ logger }));
vi.mock("@/lib/monitoring", () => ({
  MonitoringService: {
    trackEvent: monitoringTrackEvent,
    logError: monitoringLogError,
  },
}));
vi.mock("@/lib/pricing-learning", () => ({
  maybeCreatePricingSuggestionFromConfirmedJob: vi.fn(),
}));
vi.mock("./learning-actions", () => ({
  checkForDeviation: vi.fn(),
}));
vi.mock("@/actions/learning-actions", () => ({
  checkForDeviation: vi.fn(),
}));
vi.mock("@/actions/task-actions", () => ({
  createTask: vi.fn(),
}));
vi.mock("@/actions/notification-actions", () => ({
  createNotification: vi.fn(),
}));
vi.mock("@/lib/deal-stage-rules", () => ({
  kanbanStageRequiresScheduledDate: vi.fn(() => false),
}));
vi.mock("@/lib/kanban-columns", () => ({
  KANBAN_COLUMN_SORT_ORDER: [
    "new_request",
    "quote_sent",
    "scheduled",
    "ready_to_invoice",
    "pending_approval",
    "completed",
    "lost",
    "deleted",
  ],
  kanbanColumnIdForDealStage: vi.fn((stage: string) => stage),
}));
vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn().mockResolvedValue({ id: "user_1", name: "Owner", email: "owner@example.com" }),
}));

import { createContact } from "@/actions/contact-actions";
import { createDeal, getDeals } from "@/actions/deal-actions";

describe("integration: new lead to deal flow", () => {
  let contacts: ContactRecord[];
  let deals: DealRecord[];
  let activities: ActivityRecord[];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T10:00:00.000Z"));

    contacts = [];
    deals = [];
    activities = [];

    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      workspaceId: "ws_1",
      name: "Owner",
    });
    requireContactInCurrentWorkspace.mockImplementation(async (contactId: string) => ({
      contact: contacts.find((contact) => contact.id === contactId) ?? null,
    }));
    requireDealInCurrentWorkspace.mockImplementation(async (dealId: string) => ({
      deal: deals.find((deal) => deal.id === dealId) ?? null,
    }));
    enrichFromEmail.mockResolvedValue({
      name: "Acme Plumbing",
      domain: "acme.com",
      industry: "Trades",
      size: "1-10",
      linkedinUrl: "https://linkedin.com/company/acme",
      logoUrl: "https://cdn.example.com/acme.png",
    });
    triageIncomingLead.mockResolvedValue({ disposition: "review" });
    getDealHealth.mockReturnValue("healthy");
    findNearbyBookings.mockResolvedValue(null);

    db.contact.findFirst.mockImplementation(async ({ where }) => {
      const workspaceId = where.workspaceId as string;
      const or = (where.OR as Array<Record<string, string>> | undefined) ?? [];
      return (
        contacts.find((contact) =>
          contact.workspaceId === workspaceId &&
          or.some((condition) =>
            (condition.email && contact.email === condition.email) ||
            (condition.phone && contact.phone === condition.phone),
          ),
        ) ?? null
      );
    });
    db.contact.create.mockImplementation(async ({ data }) => {
      const contact: ContactRecord = {
        id: `contact_${contacts.length + 1}`,
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        company: data.company ?? null,
        avatarUrl: data.avatarUrl ?? null,
        address: data.address ?? null,
        workspaceId: data.workspaceId,
        metadata: data.metadata,
        createdAt: new Date(),
      };
      contacts.push(contact);
      return contact;
    });
    db.contact.update.mockImplementation(async ({ where, data }) => {
      const contact = contacts.find((entry) => entry.id === where.id);
      if (!contact) return null;
      Object.assign(contact, data);
      return contact;
    });
    db.deal.create.mockImplementation(async ({ data }) => {
      const deal: DealRecord = {
        id: `deal_${deals.length + 1}`,
        title: data.title,
        value: data.value,
        stage: data.stage,
        contactId: data.contactId,
        workspaceId: data.workspaceId,
        address: data.address ?? null,
        metadata: data.metadata,
        isDraft: false,
        stageChangedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
        assignedToId: data.assignedToId ?? null,
        scheduledAt: data.scheduledAt ?? null,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        invoicedAmount: null,
        isStale: false,
        actualOutcome: null,
        outcomeNotes: null,
        agentFlags: null,
        source: null,
      };
      deals.push(deal);
      return deal;
    });
    db.activity.create.mockImplementation(async ({ data }) => {
      const activity: ActivityRecord = {
        id: `activity_${activities.length + 1}`,
        type: data.type,
        title: data.title,
        content: data.content,
        dealId: data.dealId,
        contactId: data.contactId,
        createdAt: new Date(),
      };
      activities.push(activity);
      return activity;
    });
    db.deal.findMany.mockImplementation(async ({ where }) =>
      deals
        .filter((deal) => deal.workspaceId === where.workspaceId)
        .map((deal) => ({
          ...deal,
          contact: contacts.find((contact) => contact.id === deal.contactId)!,
          assignedTo: null,
          activities: activities
            .filter((activity) => activity.dealId === deal.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 1),
        })),
    );
    db.workspace.findUnique.mockResolvedValue({
      settings: { followUpDays: 3, urgentDays: 7 },
    });
  });

  it("creates a contact from a lead, then creates and returns the linked deal", async () => {
    const contactResult = await createContact({
      name: "Alex Smith",
      email: "alex@acme.com",
      workspaceId: "ws_1",
      contactType: "BUSINESS",
    });

    expect(contactResult).toEqual({
      success: true,
      contactId: "contact_1",
      enriched: expect.objectContaining({
        name: "Acme Plumbing",
        domain: "acme.com",
      }),
      merged: false,
    });
    expect(contacts[0]).toMatchObject({
      name: "Alex Smith",
      company: "Acme Plumbing",
      avatarUrl: "https://cdn.example.com/acme.png",
      metadata: expect.objectContaining({
        enriched: true,
        contactType: "BUSINESS",
      }),
    });
    expect(evaluateAutomations).toHaveBeenCalledWith("ws_1", {
      type: "new_lead",
      contactId: "contact_1",
    });

    const dealResult = await createDeal({
      title: "Kitchen plumbing quote",
      value: 1250,
      stage: "new",
      contactId: "contact_1",
      workspaceId: "ws_1",
      address: "1 George St, Sydney",
    });

    expect(dealResult).toEqual({ success: true, dealId: "deal_1" });
    expect(recordWorkspaceAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws_1",
        entityId: "deal_1",
        action: "deal.created",
      }),
    );
    expect(saveTriageRecommendation).toHaveBeenCalledWith("deal_1", {
      disposition: "review",
    });

    const dealsView = await getDeals("ws_1");

    expect(dealsView).toEqual([
      expect.objectContaining({
        id: "deal_1",
        title: "Kitchen plumbing quote",
        company: "Acme Plumbing",
        contactName: "Alex Smith",
        contactId: "contact_1",
        stage: "new_request",
        value: 1250,
        address: "1 George St, Sydney",
        workspaceId: "ws_1",
        health: "healthy",
      }),
    ]);
    expect(activities).toEqual([
      expect.objectContaining({
        type: "NOTE",
        title: "Deal created",
        dealId: "deal_1",
        contactId: "contact_1",
      }),
    ]);
  });
});
