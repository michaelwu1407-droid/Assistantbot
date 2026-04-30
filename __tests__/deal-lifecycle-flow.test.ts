import { beforeEach, describe, expect, it, vi } from "vitest";

type WorkspaceRecord = {
  id: string;
  ownerId: string;
  settings: Record<string, unknown>;
};

type UserRecord = {
  id: string;
  workspaceId: string;
  email: string;
  role: string;
  name: string;
};

type ContactRecord = {
  id: string;
  workspaceId: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  avatarUrl: string | null;
  address: string | null;
  metadata?: Record<string, unknown>;
  createdAt: Date;
};

type DealRecord = {
  id: string;
  workspaceId: string;
  contactId: string;
  title: string;
  value: number;
  stage: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  stageChangedAt: Date;
  scheduledAt: Date | null;
  assignedToId: string | null;
  contact?: ContactRecord;
};

type TaskRecord = {
  id: string;
  title: string;
  description: string | null;
  dueAt: Date;
  dealId?: string;
  contactId?: string;
  completed: boolean;
  completedAt: Date | null;
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

type AutomationRecord = {
  id: string;
  name: string;
  workspaceId: string;
  enabled: boolean;
  trigger: Record<string, unknown>;
  action: Record<string, unknown>;
  lastFiredAt: Date | null;
  createdAt: Date;
};

const {
  db,
  getAuthUser,
  requireCurrentWorkspaceAccess,
  requireContactInCurrentWorkspace,
  requireDealInCurrentWorkspace,
  enrichFromEmail,
  fuzzySearch,
  runSendEmail,
  renderTemplate,
  logActivity,
  createNotification,
  runIdempotent,
  triageIncomingLead,
  saveTriageRecommendation,
  findNearbyBookings,
  syncGoogleCalendarEventForDeal,
  removeGoogleCalendarEventForDeal,
  recordWorkspaceAuditEvent,
  recordSyncIssue,
  getDealHealth,
  maybeCreatePricingSuggestionFromConfirmedJob,
  checkForDeviation,
  logger,
  monitoringTrackEvent,
  monitoringLogError,
  kanbanStageRequiresScheduledDate,
  revalidatePath,
} = vi.hoisted(() => ({
  db: {
    contact: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    deal: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    activity: {
      create: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    automation: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
  },
  getAuthUser: vi.fn(),
  requireCurrentWorkspaceAccess: vi.fn(),
  requireContactInCurrentWorkspace: vi.fn(),
  requireDealInCurrentWorkspace: vi.fn(),
  enrichFromEmail: vi.fn(),
  fuzzySearch: vi.fn(),
  runSendEmail: vi.fn(),
  renderTemplate: vi.fn(),
  logActivity: vi.fn(),
  createNotification: vi.fn(),
  runIdempotent: vi.fn(),
  triageIncomingLead: vi.fn(),
  saveTriageRecommendation: vi.fn(),
  findNearbyBookings: vi.fn(),
  syncGoogleCalendarEventForDeal: vi.fn(),
  removeGoogleCalendarEventForDeal: vi.fn(),
  recordWorkspaceAuditEvent: vi.fn(),
  recordSyncIssue: vi.fn(),
  getDealHealth: vi.fn(),
  maybeCreatePricingSuggestionFromConfirmedJob: vi.fn(),
  checkForDeviation: vi.fn(),
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
  monitoringTrackEvent: vi.fn(),
  monitoringLogError: vi.fn(),
  kanbanStageRequiresScheduledDate: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/auth", () => ({ getAuthUser }));
vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess,
  requireContactInCurrentWorkspace,
  requireDealInCurrentWorkspace,
}));
vi.mock("@/lib/enrichment", () => ({ enrichFromEmail }));
vi.mock("@/lib/search", () => ({ fuzzySearch }));
vi.mock("@/actions/chat-actions", async () => {
  const actual = await vi.importActual<typeof import("@/actions/chat-actions")>("@/actions/chat-actions");
  return {
    ...actual,
    runSendEmail,
  };
});
vi.mock("@/actions/template-actions", async () => {
  const actual = await vi.importActual<typeof import("@/actions/template-actions")>("@/actions/template-actions");
  return {
    ...actual,
    renderTemplate,
  };
});
vi.mock("@/actions/activity-actions", () => ({ logActivity }));
vi.mock("@/actions/notification-actions", () => ({ createNotification }));
vi.mock("@/lib/idempotency", () => ({ runIdempotent }));
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
vi.mock("@/lib/pipeline", () => ({ getDealHealth }));
vi.mock("@/lib/pricing-learning", () => ({ maybeCreatePricingSuggestionFromConfirmedJob }));
vi.mock("@/actions/learning-actions", () => ({ checkForDeviation }));
vi.mock("@/lib/logging", () => ({ logger }));
vi.mock("@/lib/monitoring", () => ({
  MonitoringService: {
    trackEvent: monitoringTrackEvent,
    logError: monitoringLogError,
  },
}));
vi.mock("@/lib/deal-stage-rules", () => ({ kanbanStageRequiresScheduledDate }));
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
vi.mock("next/cache", () => ({ revalidatePath }));

const contactActionsPromise = import("@/actions/contact-actions");
const dealActionsPromise = import("@/actions/deal-actions");
const automationActionsPromise = import("@/actions/automation-actions");
const taskActionsPromise = import("@/actions/task-actions");

describe("integration: deal lifecycle with automations", () => {
  let workspace: WorkspaceRecord;
  let users: UserRecord[];
  let contacts: ContactRecord[];
  let deals: DealRecord[];
  let tasks: TaskRecord[];
  let activities: ActivityRecord[];
  let automations: AutomationRecord[];
  let notifications: Array<Record<string, unknown>>;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-02T10:00:00.000Z"));

    workspace = {
      id: "ws_1",
      ownerId: "user_owner",
      settings: { followUpDays: 3, urgentDays: 7 },
    };
    users = [
      { id: "user_owner", workspaceId: "ws_1", email: "owner@example.com", role: "OWNER", name: "Owner" },
      { id: "user_manager", workspaceId: "ws_1", email: "manager@example.com", role: "MANAGER", name: "Manager" },
    ];
    contacts = [];
    deals = [];
    tasks = [];
    activities = [];
    automations = [];
    notifications = [];

    getAuthUser.mockResolvedValue({ id: "user_owner", name: "Owner", email: "owner@example.com" });
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_owner",
      workspaceId: "ws_1",
      name: "Owner",
    });
    requireContactInCurrentWorkspace.mockImplementation(async (contactId: string) => ({
      contact: contacts.find((contact) => contact.id === contactId) ?? null,
    }));
    requireDealInCurrentWorkspace.mockImplementation(async (dealId: string) => ({
      deal: deals.find((deal) => deal.id === dealId) ?? null,
    }));
    enrichFromEmail.mockResolvedValue(null);
    runIdempotent.mockImplementation(async ({ resultFactory }) => ({ result: await resultFactory() }));
    triageIncomingLead.mockResolvedValue({ disposition: "review" });
    getDealHealth.mockReturnValue("healthy");
    findNearbyBookings.mockResolvedValue(null);
    kanbanStageRequiresScheduledDate.mockReturnValue(false);
    syncGoogleCalendarEventForDeal.mockResolvedValue(undefined);
    removeGoogleCalendarEventForDeal.mockResolvedValue(undefined);
    createNotification.mockImplementation(async (payload) => {
      notifications.push(payload);
      return payload;
    });

    db.workspace.findUnique.mockResolvedValue(workspace);
    db.user.findMany.mockImplementation(async ({ where }) =>
      users
        .filter((user) => user.workspaceId === where.workspaceId)
        .map((user) => ({ id: user.id })),
    );
    db.user.findFirst.mockImplementation(async ({ where, select }) => {
      const user = users.find(
        (entry) =>
          entry.workspaceId === where.workspaceId &&
          (where.email === undefined || entry.email === where.email),
      );
      if (!user) return null;
      if (select?.id && select?.role) return { id: user.id, role: user.role };
      if (select?.id) return { id: user.id };
      if (select?.role) return { role: user.role };
      return user;
    });
    db.user.findUnique.mockImplementation(async ({ where }) => users.find((user) => user.id === where.id) ?? null);

    db.contact.findFirst.mockImplementation(async ({ where }) => {
      const candidates = contacts.filter((contact) => contact.workspaceId === where.workspaceId);
      const or = (where.OR as Array<Record<string, string>> | undefined) ?? [];
      return (
        candidates.find((contact) =>
          or.some((condition) =>
            (condition.email && contact.email === condition.email) ||
            (condition.phone && contact.phone === condition.phone),
          ),
        ) ?? null
      );
    });
    db.contact.create.mockImplementation(async ({ data }) => {
      const record: ContactRecord = {
        id: `contact_${contacts.length + 1}`,
        workspaceId: data.workspaceId,
        name: data.name,
        email: data.email ?? null,
        phone: data.phone ?? null,
        company: data.company ?? null,
        avatarUrl: data.avatarUrl ?? null,
        address: data.address ?? null,
        metadata: data.metadata,
        createdAt: new Date(),
      };
      contacts.push(record);
      return record;
    });
    db.contact.update.mockImplementation(async ({ where, data }) => {
      const record = contacts.find((contact) => contact.id === where.id);
      if (!record) return null;
      Object.assign(record, data);
      return record;
    });

    db.deal.create.mockImplementation(async ({ data }) => {
      const record: DealRecord = {
        id: `deal_${deals.length + 1}`,
        workspaceId: data.workspaceId,
        contactId: data.contactId,
        title: data.title,
        value: data.value,
        stage: data.stage,
        metadata: data.metadata ?? {},
        createdAt: new Date(),
        updatedAt: new Date(),
        stageChangedAt: new Date(),
        scheduledAt: data.scheduledAt ?? null,
        assignedToId: data.assignedToId ?? null,
      };
      deals.push(record);
      return record;
    });
    db.deal.findUnique.mockImplementation(async ({ where }) => {
      const record = deals.find((deal) => deal.id === where.id);
      if (!record) return null;
      const contact = contacts.find((entry) => entry.id === record.contactId) ?? null;
      if ("include" in where || true) {
        return {
          ...record,
          contact,
          workspace: { id: workspace.id, name: "Acme Plumbing", ownerId: workspace.ownerId },
          activities: activities
            .filter((activity) => activity.dealId === record.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 1),
          assignedTo: record.assignedToId
            ? users.find((user) => user.id === record.assignedToId)
            : null,
        };
      }
      return record;
    });
    db.deal.findMany.mockImplementation(async ({ where }) =>
      deals
        .filter((deal) => {
          if (where.workspaceId && deal.workspaceId !== where.workspaceId) return false;
          if (where.id?.in && !(where.id.in as string[]).includes(deal.id)) return false;
          return true;
        })
        .map((deal) => ({
          ...deal,
          contact: contacts.find((contact) => contact.id === deal.contactId)!,
          assignedTo: deal.assignedToId ? users.find((user) => user.id === deal.assignedToId) : null,
          activities: activities
            .filter((activity) => activity.dealId === deal.id)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(0, 1),
        })),
    );
    db.deal.updateMany.mockImplementation(async ({ where, data }) => {
      const record = deals.find(
        (deal) =>
          deal.id === where.id &&
          (!where.updatedAt || deal.updatedAt.getTime() === new Date(where.updatedAt).getTime()),
      );
      if (!record) return { count: 0 };
      Object.assign(record, data, { updatedAt: new Date() });
      return { count: 1 };
    });
    db.deal.update.mockImplementation(async ({ where, data }) => {
      const record = deals.find((deal) => deal.id === where.id);
      if (!record) return null;
      Object.assign(record, data, { updatedAt: new Date() });
      return record;
    });

    db.activity.create.mockImplementation(async ({ data }) => {
      const record: ActivityRecord = {
        id: `activity_${activities.length + 1}`,
        type: data.type,
        title: data.title,
        content: data.content,
        dealId: data.dealId,
        contactId: data.contactId,
        createdAt: new Date(),
      };
      activities.push(record);
      return record;
    });
    db.activity.findFirst.mockResolvedValue(null);
    db.activity.update.mockResolvedValue({});

    db.task.findFirst.mockImplementation(async ({ where }) =>
      tasks.find(
        (task) =>
          (!where.dealId || task.dealId === where.dealId) &&
          (!where.title || task.title === where.title) &&
          (where.completedAt === undefined ||
            (where.completedAt === null ? task.completedAt === null : task.completedAt === where.completedAt)),
      ) ?? null,
    );
    db.task.create.mockImplementation(async ({ data }) => {
      const record: TaskRecord = {
        id: `task_${tasks.length + 1}`,
        title: data.title,
        description: data.description ?? null,
        dueAt: data.dueAt,
        dealId: data.dealId,
        contactId: data.contactId,
        completed: false,
        completedAt: null,
      };
      tasks.push(record);
      return record;
    });
    db.task.findMany.mockImplementation(async () => tasks);
    db.task.update.mockImplementation(async ({ where, data }) => {
      const record = tasks.find((task) => task.id === where.id);
      if (!record) return null;
      Object.assign(record, data);
      return record;
    });
    db.task.count.mockResolvedValue(0);
    db.task.delete.mockResolvedValue({});

    db.automation.create.mockImplementation(async ({ data }) => {
      const record: AutomationRecord = {
        id: `automation_${automations.length + 1}`,
        name: data.name,
        workspaceId: data.workspaceId,
        enabled: true,
        trigger: data.trigger,
        action: data.action,
        lastFiredAt: null,
        createdAt: new Date(),
      };
      automations.push(record);
      return record;
    });
    db.automation.findMany.mockImplementation(async ({ where }) =>
      automations.filter(
        (automation) =>
          automation.workspaceId === where.workspaceId &&
          (where.enabled === undefined || automation.enabled === where.enabled),
      ),
    );
    db.automation.updateMany.mockImplementation(async ({ where, data }) => {
      const record = automations.find(
        (automation) =>
          automation.id === where.id &&
          ((where.lastFiredAt === null && automation.lastFiredAt === null) ||
            (where.lastFiredAt instanceof Date &&
              automation.lastFiredAt?.getTime() === where.lastFiredAt.getTime())),
      );
      if (!record) return { count: 0 };
      record.lastFiredAt = data.lastFiredAt;
      return { count: 1 };
    });
    db.automation.findUnique.mockImplementation(async ({ where }) => automations.find((entry) => entry.id === where.id) ?? null);
    db.automation.update.mockImplementation(async ({ where, data }) => {
      const record = automations.find((entry) => entry.id === where.id);
      if (!record) return null;
      Object.assign(record, data);
      return record;
    });
    db.automation.delete.mockResolvedValue({});
  });

  it("moves a lead through contact, automation, and completion follow-up flows", async () => {
    const { createContact } = await contactActionsPromise;
    const { createDeal, updateDealStage } = await dealActionsPromise;
    const { createAutomation } = await automationActionsPromise;
    const { getTasks } = await taskActionsPromise;

    const contact = await createContact({
      name: "Alex Smith",
      email: "alex@example.com",
      phone: "0400000000",
      workspaceId: "ws_1",
    });
    expect(contact.success).toBe(true);

    const deal = await createDeal({
      title: "Kitchen plumbing",
      value: 1200,
      stage: "new",
      contactId: "contact_1",
      workspaceId: "ws_1",
      scheduledAt: new Date("2026-04-05T10:00:00.000Z"),
    });
    expect(deal).toEqual({ success: true, dealId: "deal_1" });

    await createAutomation({
      name: "Contacted follow-up",
      workspaceId: "ws_1",
      trigger: { event: "deal_stage_change", stage: "CONTACTED" },
      action: { type: "create_task", message: "Follow up within 48 hours" },
    });

    await expect(updateDealStage("deal_1", "quote_sent")).resolves.toEqual({ success: true });

    const afterContacted = await getTasks({ workspaceId: "ws_1" });
    expect(afterContacted.map((task) => task.title)).toContain("Follow up within 48 hours");
    expect(activities.map((activity) => activity.title)).toContain("Moved to Quote sent");

    await expect(updateDealStage("deal_1", "completed")).resolves.toEqual({ success: true });

    const finalTasks = await getTasks({ workspaceId: "ws_1" });
    expect(finalTasks.map((task) => task.title)).toEqual(
      expect.arrayContaining(["Follow up within 48 hours", "Post-job follow-up"]),
    );
    expect(notifications).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: "Post-job follow-up needed",
          link: "/crm/deals/deal_1",
        }),
      ]),
    );
    expect(maybeCreatePricingSuggestionFromConfirmedJob).toHaveBeenCalledWith("deal_1", {
      trigger: "completed",
      source: "updateDealStage",
    });
    expect(recordWorkspaceAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws_1",
        action: "deal.stage_changed",
        entityId: "deal_1",
      }),
    );
  }, 45000);
});
