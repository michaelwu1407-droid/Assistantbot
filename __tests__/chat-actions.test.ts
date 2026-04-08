import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    workspace: {
      findUnique: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    activity: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    deal: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    invoice: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    chatMessage: {
      findMany: vi.fn(),
    },
  },
  revalidatePath: vi.fn(),
  getAuthUser: vi.fn(),
  runIdempotent: vi.fn(),
  getWorkspaceSettingsById: vi.fn(),
  getDeals: vi.fn(),
  createDeal: vi.fn(),
  updateDealStage: vi.fn(),
  updateDealMetadata: vi.fn(),
  updateDealAssignedTo: vi.fn(),
  appendTicketNote: vi.fn(),
  logActivity: vi.fn(),
  createContact: vi.fn(),
  searchContacts: vi.fn(),
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
  recordWorkspaceAuditEventForCurrentActor: vi.fn(),
  allocateWorkspaceInvoiceNumber: vi.fn(),
  getInvoiceSyncStatus: vi.fn(),
  titleCase: vi.fn((value: string) => value),
  categoriseWork: vi.fn(),
  resolveSchedule: vi.fn(),
  enrichAddress: vi.fn(),
  canExecuteCustomerContact: vi.fn(),
  getCustomerContactModeLabel: vi.fn(),
  normalizeAgentMode: vi.fn(),
  requiresCustomerContactApproval: vi.fn(),
  getAttentionSignalsForDeal: vi.fn(),
  loggerError: vi.fn(),
  resendSend: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("next/cache", () => ({
  revalidatePath: hoisted.revalidatePath,
}));
vi.mock("@/lib/auth", () => ({
  getAuthUser: hoisted.getAuthUser,
}));
vi.mock("@/lib/idempotency", () => ({
  runIdempotent: hoisted.runIdempotent,
}));
vi.mock("@/actions/settings-actions", () => ({
  getWorkspaceSettingsById: hoisted.getWorkspaceSettingsById,
}));
vi.mock("@/actions/deal-actions", () => ({
  getDeals: hoisted.getDeals,
  createDeal: hoisted.createDeal,
  updateDealStage: hoisted.updateDealStage,
  updateDealMetadata: hoisted.updateDealMetadata,
  updateDealAssignedTo: hoisted.updateDealAssignedTo,
}));
vi.mock("@/actions/activity-actions", () => ({
  appendTicketNote: hoisted.appendTicketNote,
  logActivity: hoisted.logActivity,
}));
vi.mock("@/actions/contact-actions", () => ({
  createContact: hoisted.createContact,
  searchContacts: hoisted.searchContacts,
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
vi.mock("@/lib/workspace-audit", () => ({
  recordWorkspaceAuditEventForCurrentActor: hoisted.recordWorkspaceAuditEventForCurrentActor,
}));
vi.mock("@/lib/invoice-number", () => ({
  allocateWorkspaceInvoiceNumber: hoisted.allocateWorkspaceInvoiceNumber,
}));
vi.mock("@/actions/accounting-actions", () => ({
  getInvoiceSyncStatus: hoisted.getInvoiceSyncStatus,
}));
vi.mock("@/lib/chat-utils", () => ({
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
  requiresCustomerContactApproval: hoisted.requiresCustomerContactApproval,
}));
vi.mock("@/lib/deal-attention", () => ({
  getAttentionSignalsForDeal: hoisted.getAttentionSignalsForDeal,
}));
vi.mock("@/lib/logging", () => ({
  logger: {
    error: hoisted.loggerError,
  },
}));
vi.mock("resend", () => ({
  Resend: class {
    emails = {
      send: hoisted.resendSend,
    };
  },
}));

import {
  getChatHistory,
  handleSupportRequest,
  runAddDealNote,
  runCreateDeal,
  runCreateDraftInvoice,
  runCreateJobNatural,
  runCreateTask,
  runGetDealContext,
  runGetInvoiceStatusAction,
  runMarkInvoicePaidAction,
  runListDeals,
  runListIncompleteOrBlockedJobs,
  runListInvoiceReadyJobs,
  runMoveDeal,
  runRestoreDeal,
  runSearchContacts,
  runUnassignDeal,
  runUndoLastAction,
} from "@/actions/chat-actions";

describe("chat-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("RESEND_API_KEY", "test-resend-key");
    vi.stubEnv("SUPPORT_EMAIL_TO", "support@earlymark.ai");
    vi.stubEnv("SUPPORT_EMAIL_FROM", "support@earlymark.ai");
    hoisted.getDeals.mockResolvedValue([]);
    hoisted.updateDealStage.mockResolvedValue({ success: true });
    hoisted.createDeal.mockResolvedValue({ success: true, dealId: "deal_1" });
    hoisted.createContact.mockResolvedValue({ success: true, contactId: "contact_1" });
    hoisted.searchContacts.mockResolvedValue([]);
    hoisted.resendSend.mockResolvedValue({ data: { id: "email_1" }, error: null });
    hoisted.db.invoice.findFirst.mockResolvedValue(null);
    hoisted.db.invoice.create.mockResolvedValue({});
    hoisted.db.invoice.update.mockResolvedValue({});
    hoisted.db.deal.findMany.mockResolvedValue([]);
    hoisted.allocateWorkspaceInvoiceNumber.mockResolvedValue("INV-1001");
    hoisted.getInvoiceSyncStatus.mockResolvedValue({ synced: false, provider: null });
  });

  it("moves a deal to the resolved stage label and revalidates CRM views", async () => {
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "Hot Water Fix",
        assignedToId: "user_2",
        contactId: "contact_1",
        scheduledAt: new Date("2026-04-10T10:00:00.000Z"),
      },
    ]);

    const result = await runMoveDeal("ws_1", "Hot Water Fix", "scheduled");

    expect(result).toEqual({
      success: true,
      message: 'Moved "Hot Water Fix" to Scheduled.',
      dealId: "deal_1",
    });
    expect(hoisted.updateDealStage).toHaveBeenCalledWith("deal_1", "scheduled");
    expect(hoisted.revalidatePath).toHaveBeenCalledWith("/crm", "layout");
    expect(hoisted.revalidatePath).toHaveBeenCalledWith("/crm/deals");
  });

  it("moves a deal when the target text is a customer name with one active job", async () => {
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "Blocked Drain",
        assignedToId: "user_2",
        contactId: "contact_42",
        scheduledAt: new Date("2026-04-10T10:00:00.000Z"),
      },
    ]);
    hoisted.searchContacts.mockResolvedValue([
      { id: "contact_42", name: "Alex Harper", phone: "0400000101", email: null, company: null },
    ]);
    hoisted.db.deal.findMany.mockResolvedValue([
      {
        id: "deal_1",
        title: "Blocked Drain",
        stage: "NEW",
        updatedAt: new Date("2026-04-06T00:00:00.000Z"),
        createdAt: new Date("2026-04-05T00:00:00.000Z"),
        contactId: "contact_42",
      },
    ]);

    const result = await runMoveDeal("ws_1", "ZZZ AUTO LIVE Alex Harper", "quote sent");

    expect(result.success).toBe(true);
    expect(result.message).toContain('Moved "Blocked Drain" to Quote sent.');
    expect(hoisted.updateDealStage).toHaveBeenCalledWith("deal_1", "quote_sent");
  });

  it("returns requiresAssignment and a helpful message when moving unassigned deal to Scheduled", async () => {
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "Hot Water Fix",
        assignedToId: null,
        contactId: "contact_1",
      },
    ]);

    const result = await runMoveDeal("ws_1", "Hot Water Fix", "scheduled");

    expect(result.success).toBe(false);
    expect(result.requiresAssignment).toBe(true);
    expect(result.message).toContain("needs a team member");
    expect(hoisted.updateDealStage).not.toHaveBeenCalled();
  });

  it("returns requiresSchedule and a helpful message when moving deal with no scheduled date to Scheduled", async () => {
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "Hot Water Fix",
        assignedToId: "user_2",   // has assignee
        contactId: "contact_1",
        scheduledAt: null,         // but no date
      },
    ]);

    const result = await runMoveDeal("ws_1", "Hot Water Fix", "scheduled");

    expect(result.success).toBe(false);
    expect(result.requiresSchedule).toBe(true);
    expect(result.message).toContain("needs a scheduled date");
    expect(hoisted.updateDealStage).not.toHaveBeenCalled();
  });

  it("adds a note to a deal by fuzzy title match", async () => {
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "Hot Water Fix - Unit 5",
        assignedToId: "user_1",
        contactId: "contact_1",
      },
    ]);
    hoisted.logActivity.mockResolvedValue({ success: true });

    const result = await runAddDealNote("ws_1", {
      dealTitle: "Hot Water Fix",
      note: "Customer asked for the side gate to stay shut.",
    });

    expect(result).toEqual({
      success: true,
      message: 'Added a note to "Hot Water Fix - Unit 5".',
      dealId: "deal_1",
    });
    expect(hoisted.logActivity).toHaveBeenCalledWith({
      type: "NOTE",
      title: "AI note added",
      content: "Customer asked for the side gate to stay shut.",
      dealId: "deal_1",
      contactId: "contact_1",
    });
  });

  it("returns deal context with invoice and recent notes", async () => {
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "Blocked Drain",
        assignedToId: "user_1",
        contactId: "contact_1",
      },
    ]);
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: "deal_1",
      title: "Blocked Drain",
      stage: "SCHEDULED",
      value: 480,
      address: "12 Test St",
      scheduledAt: new Date("2026-04-05T01:30:00.000Z"),
      assignedTo: { name: "Sam Chen" },
      contact: {
        name: "Alex Jones",
        phone: "0400000000",
        email: "alex@example.com",
        company: null,
        address: "12 Test St",
      },
      invoices: [
        {
          number: "INV-001",
          status: "DRAFT",
          total: 480,
          createdAt: new Date("2026-04-04T00:00:00.000Z"),
        },
      ],
    });
    hoisted.db.activity.findMany.mockResolvedValue([
      {
        title: "AI note added",
        content: "Bring ladder.",
        createdAt: new Date("2026-04-04T00:00:00.000Z"),
      },
    ]);

    const result = await runGetDealContext("ws_1", { dealTitle: "Blocked Drain" });

    expect(result).toContain("Job: Blocked Drain");
    expect(result).toContain("Stage: Scheduled");
    expect(result).toContain("Assigned to: Sam Chen");
    expect(result).toContain("Latest invoice: INV-001 (DRAFT) $480");
    expect(result).toContain("Next steps:");
    expect(result).toContain("Recent notes:");
    expect(result).toContain("Bring ladder.");
  });

  it("includes concrete next-step guidance for new requests", async () => {
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "Gutter Repair",
        assignedToId: "user_1",
        contactId: "contact_1",
      },
    ]);
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: "deal_1",
      title: "Gutter Repair",
      stage: "NEW",
      value: 650,
      address: "8 Harbour Road Manly",
      scheduledAt: null,
      assignedTo: null,
      contact: {
        name: "Delta Cafe",
        phone: "0290011002",
        email: "ops@deltacafe.example.com",
        company: null,
        address: "8 Harbour Road Manly",
      },
      invoices: [],
    });
    hoisted.db.activity.findMany.mockResolvedValue([]);

    const result = await runGetDealContext("ws_1", { dealTitle: "Gutter Repair" });

    expect(result).toContain("Stage: New request");
    expect(result).toContain("Next steps: Review the request, then either send a quote or assign a team member and set a scheduled date before moving it forward.");
  });

  it("lists only matching jobs that are awaiting payment or already invoiced", async () => {
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "ZZZ AUTO test Blocked Drain",
        company: "",
        contactName: "Alex Harper",
        stage: "ready_to_invoice",
        invoicedAmount: undefined,
      },
      {
        id: "deal_2",
        title: "ZZZ AUTO test Hot Water Service",
        company: "",
        contactName: "Brianna Cole",
        stage: "completed",
        invoicedAmount: 2680,
      },
      {
        id: "deal_3",
        title: "Other Workspace Job",
        company: "",
        contactName: "Charlie",
        stage: "ready_to_invoice",
        invoicedAmount: undefined,
      },
    ]);

    const result = await runListInvoiceReadyJobs("ws_1", { query: "ZZZ AUTO test" });

    expect(result).toBe(
      'Jobs matching "ZZZ AUTO test" that are awaiting payment or already invoiced:\n- ZZZ AUTO test Blocked Drain (awaiting payment)\n- ZZZ AUTO test Hot Water Service (invoice $2680)',
    );
  });

  it("lists only matching jobs that still look incomplete or blocked", async () => {
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "ZZZ AUTO test Blocked Drain",
        company: "",
        contactName: "Alex Harper",
        stage: "scheduled",
        health: { status: "STALE" },
        scheduledAt: null,
        actualOutcome: null,
        metadata: null,
      },
      {
        id: "deal_2",
        title: "ZZZ AUTO test Completed Job",
        company: "",
        contactName: "Brianna Cole",
        stage: "completed",
        health: { status: "HEALTHY" },
        scheduledAt: null,
        actualOutcome: null,
        metadata: null,
      },
    ]);
    hoisted.getAttentionSignalsForDeal
      .mockReturnValueOnce([{ key: "stale", label: "Stale" }])
      .mockReturnValueOnce([]);

    const result = await runListIncompleteOrBlockedJobs("ws_1", { query: "ZZZ AUTO test" });

    expect(result).toBe(
      'Jobs matching "ZZZ AUTO test" that still look incomplete or blocked:\n- ZZZ AUTO test Blocked Drain (Scheduled; Stale)',
    );
  });

  it("creates a contact on demand before creating a deal from chat", async () => {
    const result = await runCreateDeal("ws_1", {
      title: "Blocked Drain",
      company: "Acme Plumbing",
      value: 420,
    });

    expect(hoisted.createContact).toHaveBeenCalledWith({
      name: "Acme Plumbing",
      contactType: "BUSINESS",
      workspaceId: "ws_1",
    });
    expect(hoisted.createDeal).toHaveBeenCalledWith({
      title: "Blocked Drain",
      company: "Acme Plumbing",
      value: 420,
      stage: "new",
      contactId: "contact_1",
      workspaceId: "ws_1",
      assignedToId: null,
    });
    expect(result).toEqual({
      success: true,
      message: 'Created deal "Blocked Drain" worth $420.',
      dealId: "deal_1",
    });
    expect(hoisted.revalidatePath).toHaveBeenCalledWith("/crm", "layout");
    expect(hoisted.revalidatePath).toHaveBeenCalledWith("/crm/deals");
  });

  it("reuses an existing contact when creating a job naturally", async () => {
    hoisted.searchContacts.mockResolvedValue([
      {
        id: "contact_existing",
        name: "Alex Harper",
      },
    ]);

    const result = await runCreateJobNatural("ws_1", {
      clientName: "Alex Harper",
      workDescription: "Blocked Drain",
      address: "12 Test Street Sydney",
      price: 420,
    });

    expect(hoisted.createContact).not.toHaveBeenCalled();
    expect(hoisted.createDeal).toHaveBeenCalledWith({
      title: "Blocked Drain",
      company: "Alex Harper",
      value: 420,
      stage: "new",
      contactId: "contact_existing",
      workspaceId: "ws_1",
      address: "12 Test Street Sydney",
      scheduledAt: undefined,
      assignedToId: null,
      metadata: {
        address: "12 Test Street Sydney",
        schedule: undefined,
        scheduleDisplay: "",
        workDescription: "Blocked Drain",
        notes: undefined,
      },
    });
    expect(result).toEqual({
      success: true,
      message: "Job created: Blocked Drain for Alex Harper, $420.",
      dealId: "deal_1",
    });
  });

  it("returns phone-support guidance and records a support ticket", async () => {
    hoisted.db.user.findUnique.mockResolvedValue({
      email: "owner@example.com",
      name: "Owner",
      phone: "0400000000",
    });
    hoisted.db.workspace.findUnique.mockResolvedValue({
      name: "Acme Plumbing",
      twilioPhoneNumber: "+61400000000",
      type: "TRADES",
      twilioSubaccountId: "ACsub123",
      twilioSipTrunkSid: "TK123",
    });
    hoisted.db.activity.create.mockResolvedValue({ id: "ticket_1" });

    const result = await handleSupportRequest(
      "My AI agent phone number is not working",
      "user_1",
      "ws_1",
    );

    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Chatbot Support Request: Phone/AI Agent Issue",
      }),
    });
    expect(result.ticketId).toBe("ticket_1");
    expect(result.SYSTEM_CONTEXT_SIGNAL).toContain("TICKET_ID: ticket_1");
    expect(result.displayMessage).toContain("Ticket #ticket_1 created for phone/Tracey support.");
    expect(result.displayMessage).toContain("Tracey Number: +61400000000");
    expect(hoisted.resendSend).toHaveBeenCalledWith(expect.objectContaining({
      to: ["support@earlymark.ai"],
      subject: "[Chat Support:MEDIUM] Phone/AI Agent Issue",
      replyTo: "owner@example.com",
    }));
  });

  it("treats feedback-like messages as product feedback tickets", async () => {
    hoisted.db.user.findUnique.mockResolvedValue({
      email: "owner@example.com",
      name: "Owner",
      phone: "0400000000",
    });
    hoisted.db.workspace.findUnique.mockResolvedValue({
      name: "Acme Plumbing",
      twilioPhoneNumber: "+61400000000",
      type: "TRADES",
      twilioSubaccountId: "ACsub123",
      twilioSipTrunkSid: "TK123",
    });
    hoisted.db.activity.create.mockResolvedValue({ id: "ticket_2" });

    const result = await handleSupportRequest(
      "I have feedback: the chatbot answered this in a confusing way and I'd love to suggest a better flow",
      "user_1",
      "ws_1",
    );

    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Chatbot Support Request: Product Feedback",
      }),
    });
    expect(result.ticketId).toBe("ticket_2");
    expect(result.displayMessage).toContain("ticket #ticket_2 created for your product feedback");
    expect(result.displayMessage).toContain("attach it to the same ticket");
    expect(hoisted.resendSend).toHaveBeenCalledWith(expect.objectContaining({
      to: ["support@earlymark.ai"],
      subject: "[Chat Support:LOW] Product Feedback",
      replyTo: "owner@example.com",
    }));
  });

  it("still creates a product feedback ticket when support email delivery is unavailable", async () => {
    hoisted.db.user.findUnique.mockResolvedValue({
      email: "owner@example.com",
      name: "Owner",
      phone: "0400000000",
    });
    hoisted.db.workspace.findUnique.mockResolvedValue({
      name: "Acme Plumbing",
      twilioPhoneNumber: "+61400000000",
      type: "TRADES",
      twilioSubaccountId: "ACsub123",
      twilioSipTrunkSid: "TK123",
    });
    hoisted.db.activity.create.mockResolvedValue({ id: "ticket_3" });
    hoisted.resendSend.mockRejectedValue(new Error("provider offline"));

    const result = await handleSupportRequest(
      "feedback: the wording here was confusing",
      "user_1",
      "ws_1",
    );

    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Chatbot Support Request: Product Feedback",
      }),
    });
    expect(result.ticketId).toBe("ticket_3");
    expect(result.displayMessage).toContain("ticket #ticket_3 created for your product feedback");
    expect(hoisted.loggerError).toHaveBeenCalled();
  });

  it("returns an empty history array if chat history lookup fails", async () => {
    hoisted.db.chatMessage.findMany.mockRejectedValue(new Error("db down"));

    await expect(getChatHistory("ws_1")).resolves.toEqual([]);
  });

  it("searchContacts includes email in output", async () => {
    hoisted.searchContacts.mockResolvedValue([
      { id: "c1", name: "Alex Harper", company: null, phone: "0400000101", email: "alex@example.com" },
      { id: "c2", name: "Delta Cafe", company: "Delta Cafe Group", phone: null, email: null },
    ]);

    const result = await runSearchContacts("ws_1", "alex");

    expect(result).toContain("Alex Harper");
    expect(result).toContain("Ph: 0400000101");
    expect(result).toContain("Email: alex@example.com");
    expect(result).toContain("Delta Cafe");
    expect(result).not.toContain("Email: null");
  });

  it("getDealContext shows (unassigned) when no team member is assigned", async () => {
    hoisted.getDeals.mockResolvedValue([
      { id: "deal_1", title: "Gutter Repair", assignedToId: null, contactId: "contact_1" },
    ]);
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: "deal_1",
      title: "Gutter Repair",
      stage: "NEW",
      value: 650,
      address: null,
      scheduledAt: null,
      assignedTo: null,
      contact: { name: "Delta Cafe", phone: null, email: null, company: null, address: null },
      invoices: [],
    });
    hoisted.db.activity.findMany.mockResolvedValue([]);

    const result = await runGetDealContext("ws_1", { dealTitle: "Gutter Repair" });

    expect(result).toContain("Assigned to: (unassigned)");
  });

  it("createTask resolves dealTitle to dealId and links the task", async () => {
    hoisted.getDeals.mockResolvedValue([
      { id: "deal_99", title: "Hot Water Service", assignedToId: null, contactId: "contact_1" },
    ]);
    hoisted.searchContacts.mockResolvedValue([]);
    hoisted.createTask.mockResolvedValue({ success: true, taskId: "task_1" });

    const result = await runCreateTask("ws_1", {
      title: "Follow up about access",
      dueAtISO: "2026-04-07T09:00:00.000Z",
      dealTitle: "Hot Water Service",
    });

    expect(hoisted.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Follow up about access", dealId: "deal_99" })
    );
    expect(result).toContain("Task created:");
    expect(result).toContain("Follow up about access");
    expect(result).toContain("linked to job");
  });

  it("createTask resolves contactName to contactId and links the task", async () => {
    hoisted.getDeals.mockResolvedValue([]);
    hoisted.searchContacts.mockResolvedValue([
      { id: "contact_42", name: "Alex Harper", phone: "0400000101", email: null, company: null },
    ]);
    hoisted.createTask.mockResolvedValue({ success: true, taskId: "task_2" });

    const result = await runCreateTask("ws_1", {
      title: "Call Alex about quote",
      dueAtISO: "2026-04-08T08:00:00.000Z",
      contactName: "Alex Harper",
    });

    expect(hoisted.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Call Alex about quote", contactId: "contact_42" })
    );
    expect(result).toContain("linked to contact");
  });

  it("createTask works without dealTitle or contactName (standalone task)", async () => {
    hoisted.getDeals.mockResolvedValue([]);
    hoisted.searchContacts.mockResolvedValue([]);
    hoisted.createTask.mockResolvedValue({ success: true, taskId: "task_3" });

    const result = await runCreateTask("ws_1", {
      title: "Order supplies",
      dueAtISO: "2026-04-09T09:00:00.000Z",
    });

    expect(hoisted.createTask).toHaveBeenCalledWith(
      expect.objectContaining({ title: "Order supplies", dealId: undefined, contactId: undefined })
    );
    expect(result).toContain("Task created:");
    expect(result).not.toContain("linked to");
  });

  it("creates a draft invoice when the prompt target is a contact with one active job", async () => {
    hoisted.getDeals.mockResolvedValue([]);
    hoisted.searchContacts.mockResolvedValue([
      { id: "contact_42", name: "Alex Harper", phone: "0400000101", email: null, company: null },
    ]);
    hoisted.db.deal.findMany.mockResolvedValue([
      {
        id: "deal_99",
        title: "Blocked Drain",
        stage: "NEW",
        updatedAt: new Date("2026-04-06T00:00:00.000Z"),
        createdAt: new Date("2026-04-05T00:00:00.000Z"),
        contactId: "contact_42",
      },
    ]);
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: "deal_99",
      title: "Blocked Drain",
      value: 350,
      contactId: "contact_42",
    });

    const result = await runCreateDraftInvoice("ws_1", { dealTitle: "Alex Harper" });

    expect(hoisted.db.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dealId: "deal_99",
          total: 350,
        }),
      }),
    );
    expect(result.success).toBe(true);
    expect(result.message).toContain('Draft invoice INV-1001 created for "Blocked Drain"');
    expect(result.resolvedDealTitle).toBe("Blocked Drain");
  });

  it("creates a draft invoice when the target includes a QA prefix before the contact name", async () => {
    hoisted.getDeals.mockResolvedValue([]);
    hoisted.searchContacts
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        { id: "contact_42", name: "Alex Harper", phone: "0400000101", email: null, company: null },
      ]);
    hoisted.db.deal.findMany.mockResolvedValue([
      {
        id: "deal_99",
        title: "Blocked Drain",
        stage: "NEW",
        updatedAt: new Date("2026-04-06T00:00:00.000Z"),
        createdAt: new Date("2026-04-05T00:00:00.000Z"),
        contactId: "contact_42",
      },
    ]);
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: "deal_99",
      title: "Blocked Drain",
      value: 350,
      contactId: "contact_42",
    });

    const result = await runCreateDraftInvoice("ws_1", { dealTitle: "ZZZ AUTO LIVE Alex Harper" });

    expect(hoisted.searchContacts).toHaveBeenNthCalledWith(1, "ws_1", "ZZZ AUTO LIVE Alex Harper");
    expect(hoisted.searchContacts).toHaveBeenNthCalledWith(2, "ws_1", "Alex Harper");
    expect(result.success).toBe(true);
    expect(result.message).toContain('Draft invoice INV-1001 created for "Blocked Drain"');
    expect(result.resolvedDealTitle).toBe("Blocked Drain");
  });

  it("prefers a later matching contact that actually has an active deal", async () => {
    hoisted.getDeals.mockResolvedValue([]);
    hoisted.searchContacts
      .mockResolvedValueOnce([
        { id: "contact_old", name: "ZZZ AUTO liveprobe Alex Harper", phone: null, email: null, company: null },
        { id: "contact_live", name: "ZZZ AUTO LIVE Alex Harper", phone: null, email: null, company: null },
      ])
      .mockResolvedValueOnce([
        { id: "contact_live", name: "ZZZ AUTO LIVE Alex Harper", phone: null, email: null, company: null },
      ]);
    hoisted.db.deal.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: "deal_live",
          title: "Blocked Drain",
          stage: "NEW",
          updatedAt: new Date("2026-04-06T00:00:00.000Z"),
          createdAt: new Date("2026-04-05T00:00:00.000Z"),
          contactId: "contact_live",
        },
      ]);
    hoisted.db.deal.findUnique.mockResolvedValue({
      id: "deal_live",
      title: "Blocked Drain",
      value: 350,
      contactId: "contact_live",
    });

    const result = await runCreateDraftInvoice("ws_1", { dealTitle: "ZZZ AUTO LIVE Alex Harper" });

    expect(result.success).toBe(true);
    expect(hoisted.db.invoice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dealId: "deal_live",
        }),
      }),
    );
  });

  it("asks for clarification when a contact has multiple active jobs for invoice creation", async () => {
    hoisted.getDeals.mockResolvedValue([]);
    hoisted.searchContacts.mockResolvedValue([
      { id: "contact_42", name: "Alex Harper", phone: "0400000101", email: null, company: null },
    ]);
    hoisted.db.deal.findMany.mockResolvedValue([
      {
        id: "deal_1",
        title: "Blocked Drain",
        stage: "NEW",
        updatedAt: new Date("2026-04-06T00:00:00.000Z"),
        createdAt: new Date("2026-04-05T00:00:00.000Z"),
        contactId: "contact_42",
      },
      {
        id: "deal_2",
        title: "Hot Water Service",
        stage: "NEW",
        updatedAt: new Date("2026-04-06T00:00:00.000Z"),
        createdAt: new Date("2026-04-05T00:00:00.000Z"),
        contactId: "contact_42",
      },
    ]);

    const result = await runCreateDraftInvoice("ws_1", { dealTitle: "Alex Harper" });

    expect(result.success).toBe(false);
    expect(result.message).toContain('I found multiple jobs for "Alex Harper"');
    expect(result.message).toContain('"Blocked Drain"');
    expect(result.message).toContain('"Hot Water Service"');
    expect(hoisted.db.invoice.create).not.toHaveBeenCalled();
  });

  it("gets invoice status when the target text is a contact name rather than a deal title", async () => {
    hoisted.searchContacts.mockResolvedValue([
      { id: "contact_42", name: "Alex Harper", phone: "0400000101", email: "alex@example.com", company: null },
    ]);
    hoisted.db.deal.findMany.mockResolvedValue([
      {
        id: "deal_99",
        title: "Blocked Drain",
        stage: "NEW",
        updatedAt: new Date("2026-04-06T00:00:00.000Z"),
        createdAt: new Date("2026-04-05T00:00:00.000Z"),
        contactId: "contact_42",
      },
    ]);
    hoisted.db.invoice.findFirst.mockResolvedValue({
      id: "inv_1",
      number: "INV-1002",
      status: "ISSUED",
      total: 350,
      dealId: "deal_99",
      deal: {
        title: "Blocked Drain",
        contact: {
          id: "contact_42",
          name: "Alex Harper",
        },
      },
    });
    hoisted.getInvoiceSyncStatus.mockResolvedValue({ synced: true, provider: "xero" });

    const result = await runGetInvoiceStatusAction("ws_1", { dealTitle: "Alex Harper" });

    expect(hoisted.db.invoice.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ dealId: "deal_99" }),
      }),
    );
    expect(result.success).toBe(true);
    expect(result.message).toContain("Invoice INV-1002");
    expect(result.message).toContain("Deal: Blocked Drain");
    expect(result.message).toContain("Contact: Alex Harper");
    expect(result.message).toContain("Accounting sync: synced via xero");
  });

  it("gives a specific no-invoice message when a matching deal exists for invoice status", async () => {
    hoisted.searchContacts.mockResolvedValue([
      { id: "contact_42", name: "Alex Harper", phone: "0400000101", email: "alex@example.com", company: null },
    ]);
    hoisted.db.deal.findMany.mockResolvedValue([
      {
        id: "deal_99",
        title: "Blocked Drain",
        stage: "NEW",
        updatedAt: new Date("2026-04-06T00:00:00.000Z"),
        createdAt: new Date("2026-04-05T00:00:00.000Z"),
        contactId: "contact_42",
      },
    ]);
    hoisted.db.invoice.findFirst.mockResolvedValue(null);

    const result = await runGetInvoiceStatusAction("ws_1", { dealTitle: "Alex Harper" });

    expect(result.success).toBe(false);
    expect(result.message).toContain('There isn’t an invoice yet for "Blocked Drain"');
    expect(result.quickActions[0]).toMatchObject({
      label: "Create draft invoice",
      prompt: 'Create a draft invoice for "Blocked Drain"',
    });
  });

  it("gives a specific no-invoice message when marking paid on a deal with no invoice", async () => {
    hoisted.searchContacts.mockResolvedValue([
      { id: "contact_42", name: "Alex Harper", phone: "0400000101", email: "alex@example.com", company: null },
    ]);
    hoisted.db.deal.findMany.mockResolvedValue([
      {
        id: "deal_99",
        title: "Blocked Drain",
        stage: "NEW",
        updatedAt: new Date("2026-04-06T00:00:00.000Z"),
        createdAt: new Date("2026-04-05T00:00:00.000Z"),
        contactId: "contact_42",
      },
    ]);
    hoisted.db.invoice.findFirst.mockResolvedValue(null);

    const result = await runMarkInvoicePaidAction("ws_1", { dealTitle: "Alex Harper" });

    expect(result.success).toBe(false);
    expect(result.message).toContain('There isn’t an invoice yet for "Blocked Drain"');
    expect(result.quickActions[0]).toMatchObject({
      label: "Create draft invoice",
      prompt: 'Create a draft invoice for "Blocked Drain"',
    });
  });

  it("unassignDeal resolves by dealTitle and removes assignee", async () => {
    hoisted.getDeals.mockResolvedValue([
      { id: "deal_1", title: "Hot Water Service", assignedToId: "user_2", contactId: "contact_1" },
    ]);
    hoisted.db.deal.findFirst.mockResolvedValue({
      id: "deal_1",
      title: "Hot Water Service",
      assignedToId: "user_2",
      contactId: "contact_1",
    });
    hoisted.updateDealAssignedTo.mockResolvedValue({ success: true });
    hoisted.logActivity.mockResolvedValue({});

    const result = await runUnassignDeal("ws_1", { dealTitle: "Hot Water Service" });

    expect(hoisted.updateDealAssignedTo).toHaveBeenCalledWith("deal_1", null);
    expect(result).toContain("Unassigned");
    expect(result).toContain("Hot Water Service");
  });

  it("unassignDeal returns helpful message when deal is not currently assigned", async () => {
    hoisted.getDeals.mockResolvedValue([
      { id: "deal_1", title: "Gutter Repair", assignedToId: null, contactId: "contact_1" },
    ]);
    hoisted.db.deal.findFirst.mockResolvedValue({
      id: "deal_1",
      title: "Gutter Repair",
      assignedToId: null,
      contactId: "contact_1",
    });

    const result = await runUnassignDeal("ws_1", { dealTitle: "Gutter Repair" });

    expect(hoisted.updateDealAssignedTo).not.toHaveBeenCalled();
    expect(result).toContain("not currently assigned");
  });

  it("restoreDeal resolves by dealTitle and restores to previous stage", async () => {
    hoisted.getDeals.mockResolvedValue([
      { id: "deal_1", title: "Blocked Drain", assignedToId: null, contactId: "contact_1" },
    ]);
    hoisted.db.deal.findFirst.mockResolvedValue({
      id: "deal_1",
      title: "Blocked Drain",
      stage: "DELETED",
      metadata: { previousStage: "PIPELINE" },  // PIPELINE → quote_sent in PRISMA_STAGE_TO_CHAT_STAGE
      contactId: "contact_1",
    });
    hoisted.updateDealStage.mockResolvedValue({ success: true });
    hoisted.logActivity.mockResolvedValue({});

    const result = await runRestoreDeal("ws_1", { dealTitle: "Blocked Drain" });

    expect(hoisted.updateDealStage).toHaveBeenCalledWith("deal_1", "quote_sent");
    expect(result).toContain("Restored");
    expect(result).toContain("Blocked Drain");
  });

  it("listDeals includes contactName in each deal entry", async () => {
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "Blocked Drain",
        stage: "new_request",
        value: 420,
        contactName: "Alex Harper",
      },
      {
        id: "deal_2",
        title: "Office Fitout",
        stage: "quote_sent",
        value: 2400,
        contactName: "Charlie Dental",
      },
    ]);

    const result = await runListDeals("ws_1");

    expect(result.deals).toHaveLength(2);
    expect(result.deals[0]).toMatchObject({
      title: "Blocked Drain",
      contactName: "Alex Harper",
      stage: expect.any(String),
    });
    expect(result.deals[1]).toMatchObject({
      title: "Office Fitout",
      contactName: "Charlie Dental",
    });
  });

  it("undoLastAction detects stage moves by activity title not description field", async () => {
    hoisted.db.activity.findFirst.mockResolvedValue({
      id: "activity_1",
      title: "Moved to Quote sent",
      description: "— Sam",   // actor stored in description, NOT the action keyword
      content: "Stage changed to Quote sent.",
      deal: {
        id: "deal_1",
        title: "Hot Water Fix",
        metadata: { previousStage: "NEW" },
      },
    });
    hoisted.db.deal.update.mockResolvedValue({});
    hoisted.db.activity.delete.mockResolvedValue({});

    const result = await runUndoLastAction("ws_1");

    expect(result).toContain("Undone");
    expect(result).toContain("Hot Water Fix");
    expect(result).toContain("New request");  // user-facing label for NEW
    expect(hoisted.db.deal.update).toHaveBeenCalledWith({
      where: { id: "deal_1" },
      data: { stage: "NEW" },
    });
  });
});
