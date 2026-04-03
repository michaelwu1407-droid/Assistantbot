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

import { getChatHistory, handleSupportRequest, runCreateDeal, runMoveDeal } from "@/actions/chat-actions";

describe("chat-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.getDeals.mockResolvedValue([]);
    hoisted.updateDealStage.mockResolvedValue({ success: true });
    hoisted.createDeal.mockResolvedValue({ success: true, dealId: "deal_1" });
    hoisted.createContact.mockResolvedValue({ success: true, contactId: "contact_1" });
    hoisted.searchContacts.mockResolvedValue([]);
  });

  it("moves a deal to the resolved stage label and revalidates CRM views", async () => {
    hoisted.getDeals.mockResolvedValue([
      {
        id: "deal_1",
        title: "Hot Water Fix",
        assignedToId: null,
      },
    ]);
    hoisted.db.workspace.findUnique.mockResolvedValue({
      industryType: null,
    });

    const result = await runMoveDeal("ws_1", "Hot Water Fix", "scheduled");

    expect(result).toEqual({
      success: true,
      message: 'Moved "Hot Water Fix" to Scheduled.',
      dealId: "deal_1",
    });
    expect(hoisted.updateDealStage).toHaveBeenCalledWith("deal_1", "won");
    expect(hoisted.revalidatePath).toHaveBeenCalledWith("/crm", "layout");
    expect(hoisted.revalidatePath).toHaveBeenCalledWith("/crm/deals");
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
  });

  it("returns an empty history array if chat history lookup fails", async () => {
    hoisted.db.chatMessage.findMany.mockRejectedValue(new Error("db down"));

    await expect(getChatHistory("ws_1")).resolves.toEqual([]);
  });
});
