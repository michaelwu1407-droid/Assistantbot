import { beforeEach, describe, expect, it, vi } from "vitest";
import { Prisma } from "@prisma/client";

const hoisted = vi.hoisted(() => ({
  db: {
    deal: {
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    invoice: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
    task: {
      findFirst: vi.fn(),
    },
  },
  revalidatePath: vi.fn(),
  sendSMS: vi.fn(),
  createNotification: vi.fn(),
  trackEvent: vi.fn(),
  logError: vi.fn(),
  maybeCreatePricingSuggestionFromConfirmedJob: vi.fn(),
  createTask: vi.fn(),
  requireDealInCurrentWorkspace: vi.fn(),
  syncGoogleCalendarEventForDeal: vi.fn(),
  recordWorkspaceAuditEvent: vi.fn(),
  allocateWorkspaceInvoiceNumber: vi.fn(),
  loggerError: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("next/cache", () => ({
  revalidatePath: hoisted.revalidatePath,
}));
vi.mock("@/actions/messaging-actions", () => ({
  sendSMS: hoisted.sendSMS,
}));
vi.mock("@/actions/notification-actions", () => ({
  createNotification: hoisted.createNotification,
}));
vi.mock("@/lib/monitoring", () => ({
  MonitoringService: {
    trackEvent: hoisted.trackEvent,
    logError: hoisted.logError,
  },
}));
vi.mock("@/lib/pricing-learning", () => ({
  maybeCreatePricingSuggestionFromConfirmedJob: hoisted.maybeCreatePricingSuggestionFromConfirmedJob,
}));
vi.mock("@/actions/task-actions", () => ({
  createTask: hoisted.createTask,
}));
vi.mock("@/lib/workspace-access", () => ({
  requireDealInCurrentWorkspace: hoisted.requireDealInCurrentWorkspace,
}));
vi.mock("@/lib/workspace-calendar", () => ({
  syncGoogleCalendarEventForDeal: hoisted.syncGoogleCalendarEventForDeal,
}));
vi.mock("@/lib/workspace-audit", () => ({
  recordWorkspaceAuditEvent: hoisted.recordWorkspaceAuditEvent,
}));
vi.mock("@/lib/invoice-number", () => ({
  allocateWorkspaceInvoiceNumber: hoisted.allocateWorkspaceInvoiceNumber,
}));
vi.mock("@/lib/logging", () => ({
  logger: {
    error: hoisted.loggerError,
  },
}));

import { generateQuote, markInvoicePaid, sendOnMyWaySMS } from "@/actions/tradie-actions";

describe("tradie-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.requireDealInCurrentWorkspace.mockResolvedValue({
      actor: { id: "user_1", workspaceId: "ws_1" },
      deal: { id: "deal_1", workspaceId: "ws_1" },
    });
    hoisted.allocateWorkspaceInvoiceNumber.mockResolvedValue("INV-100");
    hoisted.db.deal.findFirst.mockResolvedValue({
      id: "deal_1",
      workspaceId: "ws_1",
      contactId: "contact_1",
      metadata: { source: "chat" },
    });
  });

  it("generates a GST-inclusive quote, updates the deal, and creates a draft invoice", async () => {
    const result = await generateQuote("deal_1", [
      { desc: "Labour", price: 100 },
      { desc: "Parts", price: 50 },
    ]);

    expect(result).toEqual({
      success: true,
      total: 165,
      invoiceNumber: "INV-100",
      dealId: "deal_1",
    });
    expect(hoisted.db.deal.update).toHaveBeenCalledWith({
      where: { id: "deal_1" },
      data: expect.objectContaining({
        stage: "INVOICED",
        metadata: expect.objectContaining({
          line_items: [
            { desc: "Labour", price: 100 },
            { desc: "Parts", price: 50 },
          ],
          subtotal: 150,
          tax: 15,
        }),
      }),
    });

    const invoiceCreateArgs = hoisted.db.invoice.create.mock.calls[0]?.[0];
    expect(invoiceCreateArgs?.data.number).toBe("INV-100");
    expect(invoiceCreateArgs?.data.status).toBe("DRAFT");
    expect(Number(invoiceCreateArgs?.data.subtotal)).toBe(150);
    expect(Number(invoiceCreateArgs?.data.tax)).toBe(15);
    expect(Number(invoiceCreateArgs?.data.total)).toBe(165);
    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Quote generated",
        dealId: "deal_1",
        contactId: "contact_1",
      }),
    });
  });

  it("marks invoices paid, moves the deal to WON, and records audit metadata", async () => {
    hoisted.db.invoice.findUnique.mockResolvedValue({
      id: "inv_1",
      number: "INV-100",
      status: "ISSUED",
      dealId: "deal_1",
      deal: {
        id: "deal_1",
        contactId: "contact_1",
      },
    });
    hoisted.db.invoice.update.mockResolvedValue({
      id: "inv_1",
      number: "INV-100",
      total: new Prisma.Decimal("165.00"),
      dealId: "deal_1",
      deal: {
        id: "deal_1",
        contactId: "contact_1",
      },
    });

    const result = await markInvoicePaid("inv_1");

    expect(result).toEqual({ success: true });
    expect(hoisted.db.deal.update).toHaveBeenCalledWith({
      where: { id: "deal_1" },
      data: { stage: "WON" },
    });
    expect(hoisted.maybeCreatePricingSuggestionFromConfirmedJob).toHaveBeenCalledWith(
      "deal_1",
      expect.objectContaining({
        trigger: "completed",
        source: "markInvoicePaid",
      }),
    );
    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Invoice paid",
        dealId: "deal_1",
        contactId: "contact_1",
        userId: "user_1",
      }),
    });
    expect(hoisted.recordWorkspaceAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws_1",
        action: "invoice.paid",
        metadata: expect.objectContaining({
          invoiceNumber: "INV-100",
          previousStatus: "ISSUED",
          nextStatus: "PAID",
          total: 165,
        }),
      }),
    );
    expect(hoisted.revalidatePath).toHaveBeenCalledWith("/crm", "layout");
    expect(hoisted.revalidatePath).toHaveBeenCalledWith("/crm/dashboard");
    expect(hoisted.revalidatePath).toHaveBeenCalledWith("/crm/deals");
    expect(hoisted.revalidatePath).toHaveBeenCalledWith("/crm/deals/deal_1");
    expect(hoisted.revalidatePath).toHaveBeenCalledWith("/crm/contacts");
    expect(hoisted.revalidatePath).toHaveBeenCalledWith("/crm/contacts/contact_1");
  });

  it("scopes on-my-way SMS through the shared deal access guard before sending", async () => {
    hoisted.db.deal.findFirst.mockResolvedValue({
      id: "deal_1",
      workspaceId: "ws_1",
      contactId: "contact_1",
      title: "Blocked drain",
      contact: {
        id: "contact_1",
        name: "Taylor",
        phone: "0400000000",
      },
    });
    hoisted.sendSMS.mockResolvedValue({ success: true });

    const result = await sendOnMyWaySMS("deal_1");

    expect(result).toEqual({ success: true });
    expect(hoisted.requireDealInCurrentWorkspace).toHaveBeenCalledWith("deal_1");
    expect(hoisted.db.deal.findFirst).toHaveBeenCalledWith({
      where: {
        id: "deal_1",
        workspaceId: "ws_1",
      },
      include: { contact: true },
    });
    expect(hoisted.sendSMS).toHaveBeenCalledWith("contact_1", "Hi Taylor, I'm on my way to Blocked drain. See you soon!");
  });
});
