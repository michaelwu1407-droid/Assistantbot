import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
  assignedToId: string | null;
  address: string | null;
  metadata?: Record<string, unknown>;
  scheduledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
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

type ChatMessageRecord = {
  id: string;
  role: string;
  content: string;
  workspaceId: string;
  createdAt: Date;
};

const hoisted = vi.hoisted(() => ({
  store: {
    contacts: [] as ContactRecord[],
    deals: [] as DealRecord[],
    activities: [] as ActivityRecord[],
    chatMessages: [] as ChatMessageRecord[],
  },
  db: {
    contact: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    deal: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
    chatMessage: {
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
  streamText: vi.fn(),
  convertToModelMessages: vi.fn(),
  stepCountIs: vi.fn(),
  createUIMessageStream: vi.fn(),
  createUIMessageStreamResponse: vi.fn(),
  createGoogleGenerativeAI: vi.fn(),
  getAgentToolsForIntent: vi.fn(),
  buildAgentContext: vi.fn(),
  fetchMemoryContext: vi.fn(),
  addMem0Memory: vi.fn(),
  buildCrmChatSystemPrompt: vi.fn(),
  preClassify: vi.fn(),
  validatePricingInResponse: vi.fn(),
  instrumentToolsWithLatency: vi.fn((tools: unknown) => tools),
  nowMs: vi.fn(() => 0),
  recordLatencyMetric: vi.fn(),
  rateLimit: vi.fn(),
  extractAllJobsFromParagraph: vi.fn(),
  parseJobWithAI: vi.fn(),
  parseMultipleJobsWithAI: vi.fn(),
  buildJobDraftFromParams: vi.fn(),
  appendTicketNote: vi.fn(),
  revalidatePath: vi.fn(),
  requireCurrentWorkspaceAccess: vi.fn(),
  requireContactInCurrentWorkspace: vi.fn(),
  requireDealInCurrentWorkspace: vi.fn(),
  enrichFromEmail: vi.fn(),
  evaluateAutomations: vi.fn(),
  triageIncomingLead: vi.fn(),
  saveTriageRecommendation: vi.fn(),
  findNearbyBookings: vi.fn(),
  recordWorkspaceAuditEvent: vi.fn(),
  recordWorkspaceAuditEventForCurrentActor: vi.fn(),
  recordSyncIssue: vi.fn(),
  getDealHealth: vi.fn(),
  syncGoogleCalendarEventForDeal: vi.fn(),
  removeGoogleCalendarEventForDeal: vi.fn(),
  getWorkspaceSettingsById: vi.fn(),
  completeTask: vi.fn(),
  createTask: vi.fn(),
  deleteTask: vi.fn(),
  getTasks: vi.fn(),
  createNotification: vi.fn(),
  generateMorningDigest: vi.fn(),
  generateEveningDigest: vi.fn(),
  getTemplates: vi.fn(),
  renderTemplate: vi.fn(),
  findDuplicateContacts: vi.fn(),
  generateQuote: vi.fn(),
  fuzzyScore: vi.fn(),
  allocateWorkspaceInvoiceNumber: vi.fn(),
  titleCase: vi.fn((value: string) => value),
  categoriseWork: vi.fn(),
  resolveSchedule: vi.fn(),
  enrichAddress: vi.fn(),
  canExecuteCustomerContact: vi.fn(),
  getCustomerContactModeLabel: vi.fn(),
  normalizeAgentMode: vi.fn(),
  normalizeAppAgentMode: vi.fn(),
  requiresCustomerContactApproval: vi.fn(),
  getAttentionSignalsForDeal: vi.fn(),
  loggerError: vi.fn(),
  loggerWarn: vi.fn(),
  loggerInfo: vi.fn(),
  loggerDebug: vi.fn(),
  monitoringTrackEvent: vi.fn(),
  monitoringLogError: vi.fn(),
}));

vi.mock("ai", () => ({
  streamText: hoisted.streamText,
  convertToModelMessages: hoisted.convertToModelMessages,
  stepCountIs: hoisted.stepCountIs,
  createUIMessageStream: hoisted.createUIMessageStream,
  createUIMessageStreamResponse: hoisted.createUIMessageStreamResponse,
}));

vi.mock("@ai-sdk/google", () => ({
  createGoogleGenerativeAI: hoisted.createGoogleGenerativeAI,
}));

vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));

vi.mock("next/cache", () => ({
  revalidatePath: hoisted.revalidatePath,
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess: hoisted.requireCurrentWorkspaceAccess,
  requireContactInCurrentWorkspace: hoisted.requireContactInCurrentWorkspace,
  requireDealInCurrentWorkspace: hoisted.requireDealInCurrentWorkspace,
}));

vi.mock("@/lib/enrichment", () => ({
  enrichFromEmail: hoisted.enrichFromEmail,
}));

vi.mock("@/actions/automation-actions", () => ({
  evaluateAutomations: hoisted.evaluateAutomations,
}));

vi.mock("@/lib/ai/triage", () => ({
  triageIncomingLead: hoisted.triageIncomingLead,
  saveTriageRecommendation: hoisted.saveTriageRecommendation,
}));

vi.mock("@/actions/geo-actions", () => ({
  findNearbyBookings: hoisted.findNearbyBookings,
}));

vi.mock("@/lib/workspace-calendar", () => ({
  syncGoogleCalendarEventForDeal: hoisted.syncGoogleCalendarEventForDeal,
  removeGoogleCalendarEventForDeal: hoisted.removeGoogleCalendarEventForDeal,
}));

vi.mock("@/lib/workspace-audit", () => ({
  recordWorkspaceAuditEvent: hoisted.recordWorkspaceAuditEvent,
  recordWorkspaceAuditEventForCurrentActor: hoisted.recordWorkspaceAuditEventForCurrentActor,
}));

vi.mock("@/lib/sync-issues", () => ({
  recordSyncIssue: hoisted.recordSyncIssue,
}));

vi.mock("@/lib/pipeline", () => ({
  getDealHealth: hoisted.getDealHealth,
}));

vi.mock("@/lib/logging", () => ({
  logger: {
    error: hoisted.loggerError,
    warn: hoisted.loggerWarn,
    info: hoisted.loggerInfo,
    debug: hoisted.loggerDebug,
  },
}));

vi.mock("@/lib/monitoring", () => ({
  MonitoringService: {
    trackEvent: hoisted.monitoringTrackEvent,
    logError: hoisted.monitoringLogError,
  },
}));

vi.mock("@/actions/settings-actions", () => ({
  getWorkspaceSettingsById: hoisted.getWorkspaceSettingsById,
}));

vi.mock("@/actions/activity-actions", () => ({
  appendTicketNote: hoisted.appendTicketNote,
  logActivity: vi.fn(),
}));

vi.mock("@/actions/task-actions", () => ({
  completeTask: hoisted.completeTask,
  createTask: hoisted.createTask,
  deleteTask: hoisted.deleteTask,
  getTasks: hoisted.getTasks,
}));

vi.mock("@/actions/notification-actions", () => ({
  createNotification: hoisted.createNotification,
}));

vi.mock("@/lib/digest", () => ({
  generateMorningDigest: hoisted.generateMorningDigest,
  generateEveningDigest: hoisted.generateEveningDigest,
}));

vi.mock("@/actions/template-actions", () => ({
  getTemplates: hoisted.getTemplates,
  renderTemplate: hoisted.renderTemplate,
}));

vi.mock("@/actions/dedup-actions", () => ({
  findDuplicateContacts: hoisted.findDuplicateContacts,
}));

vi.mock("@/actions/tradie-actions", () => ({
  generateQuote: hoisted.generateQuote,
}));

vi.mock("@/lib/search", () => ({
  fuzzyScore: hoisted.fuzzyScore,
}));

vi.mock("@/lib/invoice-number", () => ({
  allocateWorkspaceInvoiceNumber: hoisted.allocateWorkspaceInvoiceNumber,
}));

vi.mock("@/lib/chat-utils", () => ({
  buildJobDraftFromParams: hoisted.buildJobDraftFromParams,
  titleCase: hoisted.titleCase,
  categoriseWork: hoisted.categoriseWork,
  resolveSchedule: hoisted.resolveSchedule,
  enrichAddress: hoisted.enrichAddress,
  WORK_CATEGORIES: [],
  STREET_ABBREVS: {},
  DAY_ABBREVS: {},
}));

vi.mock("@/lib/agent-mode", () => ({
  canExecuteCustomerContact: hoisted.canExecuteCustomerContact,
  getCustomerContactModeLabel: hoisted.getCustomerContactModeLabel,
  normalizeAgentMode: hoisted.normalizeAgentMode,
  normalizeAppAgentMode: hoisted.normalizeAppAgentMode,
  requiresCustomerContactApproval: hoisted.requiresCustomerContactApproval,
}));

vi.mock("@/lib/deal-attention", () => ({
  getAttentionSignalsForDeal: hoisted.getAttentionSignalsForDeal,
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser: vi.fn().mockResolvedValue({ id: "user_1", email: "owner@example.com", name: "Owner" }),
  getAuthUserId: vi.fn().mockResolvedValue("user_1"),
}));

vi.mock("@/actions/contact-actions", async () => {
  const actual = await vi.importActual<typeof import("@/actions/contact-actions")>("@/actions/contact-actions");

  return {
    ...actual,
    searchContacts: vi.fn(async (workspaceId: string, query: string) =>
      hoisted.store.contacts
        .filter(
          (contact) =>
            contact.workspaceId === workspaceId &&
            (contact.name.toLowerCase().includes(query.toLowerCase()) ||
              (contact.company ?? "").toLowerCase().includes(query.toLowerCase())),
        )
        .map((contact) => ({
          id: contact.id,
          name: contact.name,
          email: contact.email,
          phone: contact.phone,
          company: contact.company,
          avatarUrl: contact.avatarUrl,
          address: contact.address,
          metadata: contact.metadata,
          dealCount: 0,
          lastActivityDate: null,
          primaryDealStage: null,
          primaryDealStageKey: null,
          primaryDealTitle: null,
          balanceLabel: "\u2014",
        })),
    ),
  };
});

vi.mock("@/actions/deal-actions", async () => {
  const actual = await vi.importActual<typeof import("@/actions/deal-actions")>("@/actions/deal-actions");

  return {
    ...actual,
    getDeals: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("@/lib/ai/context", () => ({
  buildAgentContext: hoisted.buildAgentContext,
  fetchMemoryContext: hoisted.fetchMemoryContext,
  addMem0Memory: hoisted.addMem0Memory,
}));

vi.mock("@/lib/ai/prompt-contract", () => ({
  buildCrmChatSystemPrompt: hoisted.buildCrmChatSystemPrompt,
}));

vi.mock("@/lib/ai/pre-classifier", () => ({
  preClassify: hoisted.preClassify,
}));

vi.mock("@/lib/ai/response-validator", () => ({
  validatePricingInResponse: hoisted.validatePricingInResponse,
}));

vi.mock("@/lib/telemetry/latency", () => ({
  instrumentToolsWithLatency: hoisted.instrumentToolsWithLatency,
  nowMs: hoisted.nowMs,
  recordLatencyMetric: hoisted.recordLatencyMetric,
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: hoisted.rateLimit,
}));

vi.mock("@/lib/ai/job-parser", () => ({
  extractAllJobsFromParagraph: hoisted.extractAllJobsFromParagraph,
  parseJobWithAI: hoisted.parseJobWithAI,
  parseMultipleJobsWithAI: hoisted.parseMultipleJobsWithAI,
}));

vi.mock("@/lib/ai/tools", () => ({
  getAgentToolsForIntent: hoisted.getAgentToolsForIntent,
}));

import { POST } from "@/app/api/chat/route";

describe("integration: chat agent CRM mutation flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T11:00:00.000Z"));

    hoisted.store.contacts = [];
    hoisted.store.deals = [];
    hoisted.store.activities = [];
    hoisted.store.chatMessages = [];

    hoisted.requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "user_1",
      workspaceId: "ws_1",
      name: "Owner",
    });
    hoisted.requireContactInCurrentWorkspace.mockImplementation(async (contactId: string) => ({
      contact: hoisted.store.contacts.find((contact) => contact.id === contactId) ?? null,
    }));
    hoisted.requireDealInCurrentWorkspace.mockImplementation(async (dealId: string) => ({
      deal: hoisted.store.deals.find((deal) => deal.id === dealId) ?? null,
    }));
    hoisted.enrichFromEmail.mockResolvedValue(null);
    hoisted.evaluateAutomations.mockResolvedValue(undefined);
    hoisted.triageIncomingLead.mockResolvedValue({ disposition: "review" });
    hoisted.saveTriageRecommendation.mockResolvedValue(undefined);
    hoisted.findNearbyBookings.mockResolvedValue(null);
    hoisted.recordWorkspaceAuditEvent.mockResolvedValue(undefined);
    hoisted.recordWorkspaceAuditEventForCurrentActor.mockResolvedValue(undefined);
    hoisted.recordSyncIssue.mockResolvedValue(undefined);
    hoisted.getDealHealth.mockReturnValue("healthy");
    hoisted.syncGoogleCalendarEventForDeal.mockResolvedValue(undefined);
    hoisted.removeGoogleCalendarEventForDeal.mockResolvedValue(undefined);
    hoisted.getWorkspaceSettingsById.mockResolvedValue({ agentMode: "EXECUTE" });
    hoisted.canExecuteCustomerContact.mockReturnValue(true);
    hoisted.getCustomerContactModeLabel.mockReturnValue("Execute");
    hoisted.normalizeAgentMode.mockImplementation((value: unknown) => value ?? "EXECUTE");
    hoisted.normalizeAppAgentMode.mockImplementation((value: unknown) => value ?? "EXECUTE");
    hoisted.requiresCustomerContactApproval.mockReturnValue(false);
    hoisted.getAttentionSignalsForDeal.mockReturnValue([]);
    hoisted.rateLimit.mockResolvedValue({ allowed: true, retryAfterMs: 0 });
    hoisted.preClassify.mockReturnValue({
      intent: "crm_action",
      confidence: 0.95,
      contextHints: [],
      suggestedTools: ["createDeal"],
    });
    hoisted.extractAllJobsFromParagraph.mockResolvedValue([]);
    hoisted.parseJobWithAI.mockResolvedValue(null);
    hoisted.parseMultipleJobsWithAI.mockResolvedValue([]);
    hoisted.buildAgentContext.mockResolvedValue({
      settings: { agentMode: "EXECUTE" },
      userRole: "OWNER",
      knowledgeBaseStr: "",
      agentModeStr: "",
      workingHoursStr: "",
      agentScriptStr: "",
      allowedTimesStr: "",
      preferencesStr: "",
      pricingRulesStr: "",
      bouncerStr: "",
      attachmentsStr: "",
    });
    hoisted.fetchMemoryContext.mockResolvedValue("");
    hoisted.buildCrmChatSystemPrompt.mockReturnValue("You are a CRM assistant.");
    hoisted.validatePricingInResponse.mockReturnValue({
      valid: true,
      unsourcedAmounts: [],
      sourcedAmounts: [],
      mentionedAmounts: [],
    });
    hoisted.createGoogleGenerativeAI.mockReturnValue(() => "mock-model");
    hoisted.convertToModelMessages.mockImplementation(async (messages: Array<{ role?: string; parts?: Array<{ text?: string }> }>) =>
      messages.map((message) => ({
        role: message.role,
        content: message.parts?.[0]?.text ?? "",
      })),
    );
    hoisted.stepCountIs.mockImplementation((maxSteps: number) => maxSteps);
    hoisted.getAgentToolsForIntent.mockImplementation((workspaceId: string) => ({
      createDeal: {
        execute: async (params: { title: string; company?: string; value?: number }) => {
          const { runCreateDeal } = await import("@/actions/chat-actions");
          return runCreateDeal(workspaceId, params);
        },
      },
    }));
    hoisted.streamText.mockImplementation((options: {
      tools: {
        createDeal: {
          execute: (params: { title: string; company?: string; value?: number }) => Promise<unknown>;
        };
      };
      onChunk?: (payload: { chunk: { type: string; text?: string } }) => void;
      onStepFinish?: (payload: { toolResults: Array<{ output: unknown }> }) => void;
      onFinish?: (payload: { text: string }) => Promise<void> | void;
    }) => {
      const encoder = new TextEncoder();
      let payload = "";

      const run = async () => {
        const toolOutput = await options.tools.createDeal.execute({
          title: "Blocked Drain",
          company: "Acme Plumbing",
          value: 420,
        });

        options.onStepFinish?.({ toolResults: [{ output: toolOutput }] });
        options.onChunk?.({ chunk: { type: "text-delta", text: 'Created deal "Blocked Drain".' } });
        await options.onFinish?.({ text: 'Created deal "Blocked Drain".' });

        payload = JSON.stringify({
          text: 'Created deal "Blocked Drain".',
          toolOutput,
        });
      };

      const pending = run();

      return {
        toUIMessageStreamResponse() {
          return new Response(
            new ReadableStream({
              async start(controller) {
                await pending;
                controller.enqueue(encoder.encode(payload));
                controller.close();
              },
            }),
            {
              status: 200,
              headers: { "Content-Type": "application/json" },
            },
          );
        },
      };
    });

    hoisted.db.contact.findFirst.mockImplementation(async ({ where }: { where: { workspaceId: string; OR?: Array<{ email?: string; phone?: string }> } }) => {
      const or = where.OR ?? [];
      return (
        hoisted.store.contacts.find((contact) =>
          contact.workspaceId === where.workspaceId &&
          or.some((condition) =>
            (condition.email && contact.email === condition.email) ||
            (condition.phone && contact.phone === condition.phone),
          ),
        ) ?? null
      );
    });
    hoisted.db.contact.create.mockImplementation(async ({ data }: { data: Omit<ContactRecord, "id" | "createdAt"> }) => {
      const record: ContactRecord = {
        id: `contact_${hoisted.store.contacts.length + 1}`,
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
      hoisted.store.contacts.push(record);
      return record;
    });
    hoisted.db.contact.update.mockImplementation(async ({ where, data }: { where: { id: string }; data: Partial<ContactRecord> }) => {
      const contact = hoisted.store.contacts.find((entry) => entry.id === where.id);
      if (!contact) return null;
      Object.assign(contact, data);
      return contact;
    });
    hoisted.db.deal.create.mockImplementation(async ({ data }: { data: Omit<DealRecord, "id" | "createdAt" | "updatedAt"> }) => {
      const record: DealRecord = {
        id: `deal_${hoisted.store.deals.length + 1}`,
        title: data.title,
        value: data.value,
        stage: data.stage,
        contactId: data.contactId,
        workspaceId: data.workspaceId,
        assignedToId: data.assignedToId ?? null,
        address: data.address ?? null,
        metadata: data.metadata,
        scheduledAt: data.scheduledAt ?? null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      hoisted.store.deals.push(record);
      return record;
    });
    hoisted.db.activity.create.mockImplementation(async ({ data }: { data: Omit<ActivityRecord, "id" | "createdAt"> }) => {
      const record: ActivityRecord = {
        id: `activity_${hoisted.store.activities.length + 1}`,
        type: data.type,
        title: data.title,
        content: data.content,
        dealId: data.dealId,
        contactId: data.contactId,
        createdAt: new Date(),
      };
      hoisted.store.activities.push(record);
      return record;
    });
    hoisted.db.chatMessage.create.mockImplementation(async ({ data }: { data: Omit<ChatMessageRecord, "id" | "createdAt"> }) => {
      const record: ChatMessageRecord = {
        id: `chat_${hoisted.store.chatMessages.length + 1}`,
        role: data.role,
        content: data.content,
        workspaceId: data.workspaceId,
        createdAt: new Date(),
      };
      hoisted.store.chatMessages.push(record);
      return record;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("creates a contact and deal through the chat route tool flow", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-gemini-key");

    const response = await POST(
      new Request("https://app.example.com/api/chat", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-user-id": "user_1",
        },
        body: JSON.stringify({
          workspaceId: "ws_1",
          messages: [
            {
              role: "user",
              parts: [{ type: "text", text: "Create a new blocked drain job for Acme Plumbing for $420" }],
            },
          ],
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Server-Timing")).toContain("preprocessing");

    const payload = JSON.parse(await response.text()) as {
      text: string;
      toolOutput: { success: boolean; message: string; dealId?: string };
    };

    expect(payload.text).toContain('Created deal "Blocked Drain"');
    expect(payload.toolOutput).toEqual({
      success: true,
      message: 'Created deal "Blocked Drain" worth $420.',
      dealId: "deal_1",
    });

    expect(hoisted.store.chatMessages).toHaveLength(1);
    expect(hoisted.store.chatMessages[0]).toMatchObject({
      role: "user",
      content: "Create a new blocked drain job for Acme Plumbing for $420",
      workspaceId: "ws_1",
    });

    expect(hoisted.store.contacts).toHaveLength(1);
    expect(hoisted.store.contacts[0]).toMatchObject({
      id: "contact_1",
      name: "Acme Plumbing",
      workspaceId: "ws_1",
    });

    expect(hoisted.store.deals).toHaveLength(1);
    expect(hoisted.store.deals[0]).toMatchObject({
      id: "deal_1",
      title: "Blocked Drain",
      value: 420,
      stage: "NEW",
      contactId: "contact_1",
      workspaceId: "ws_1",
    });

    expect(hoisted.store.activities).toContainEqual(
      expect.objectContaining({
        title: "Deal created",
        dealId: "deal_1",
        contactId: "contact_1",
      }),
    );

    expect(hoisted.getAgentToolsForIntent).toHaveBeenCalledWith(
      "ws_1",
      expect.objectContaining({ agentMode: "EXECUTE" }),
      "user_1",
      expect.objectContaining({
        intent: "crm_action",
        suggestedTools: ["createDeal"],
      }),
    );
    expect(hoisted.revalidatePath).toHaveBeenCalledWith("/crm", "layout");
    expect(hoisted.revalidatePath).toHaveBeenCalledWith("/crm/deals");
    expect(hoisted.recordWorkspaceAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws_1",
        action: "deal.created",
        entityId: "deal_1",
      }),
    );
  });
});
