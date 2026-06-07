import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    workspace: { findUnique: vi.fn() },
    invoice: { findMany: vi.fn() },
    activity: { create: vi.fn() },
  },
  sendSMS: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/actions/messaging-actions", () => ({ sendSMS: hoisted.sendSMS }));

import { ensureAutoPaymentReminders } from "@/actions/auto-payment-reminders";

const WS_ID = "ws_1";

function daysAgo(n: number) {
  return new Date(Date.now() - n * 86_400_000);
}

function makeWorkspace(overrides: { agentMode?: string; triggerDays?: number } = {}) {
  return {
    agentMode: overrides.agentMode ?? "EXECUTION",
    name: "Acme Plumbing",
    settings: overrides.triggerDays != null ? { invoiceFollowUp: { triggerDays: overrides.triggerDays } } : {},
  };
}

function makeInvoice(overrides: {
  ageInDays: number;
  sentMilestones?: number[];
  phone?: string | null;
  number?: string;
  total?: number;
}) {
  const milestones = overrides.sentMilestones ?? [];
  return {
    id: "inv_1",
    number: overrides.number ?? "INV-001",
    total: overrides.total ?? 500,
    issuedAt: daysAgo(overrides.ageInDays),
    deal: {
      id: "deal_1",
      title: "Drain fix",
      contactId: "contact_1",
      contact: { name: "Jane Smith", phone: overrides.phone === undefined ? "+61400000001" : overrides.phone },
      activities: milestones.map((m) => ({
        title: `Auto payment reminder: ${m} days (invoice ${overrides.number ?? "INV-001"})`,
      })),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.db.workspace.findUnique.mockResolvedValue(makeWorkspace());
  hoisted.db.invoice.findMany.mockResolvedValue([]);
  hoisted.sendSMS.mockResolvedValue({ success: true });
  hoisted.db.activity.create.mockResolvedValue({ id: "act_1" });
});

describe("ensureAutoPaymentReminders", () => {
  it("skips entirely when agentMode is not EXECUTION", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue(makeWorkspace({ agentMode: "DRAFT" }));

    await ensureAutoPaymentReminders(WS_ID);

    expect(hoisted.db.invoice.findMany).not.toHaveBeenCalled();
    expect(hoisted.sendSMS).not.toHaveBeenCalled();
  });

  it("skips when workspace is not found", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue(null);

    await ensureAutoPaymentReminders(WS_ID);

    expect(hoisted.db.invoice.findMany).not.toHaveBeenCalled();
  });

  it("sends reminder at the configured triggerDays milestone", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue(makeWorkspace({ triggerDays: 7 }));
    hoisted.db.invoice.findMany.mockResolvedValue([makeInvoice({ ageInDays: 7.2 })]);

    await ensureAutoPaymentReminders(WS_ID);

    expect(hoisted.sendSMS).toHaveBeenCalledTimes(1);
    const [contactId, body, dealId] = hoisted.sendSMS.mock.calls[0];
    expect(contactId).toBe("contact_1");
    expect(body).toContain("Jane");
    expect(body).toContain("INV-001");
    expect(body).toContain("Acme Plumbing");
    expect(dealId).toBe("deal_1");

    expect(hoisted.db.activity.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          title: "Auto payment reminder: 7 days (invoice INV-001)",
        }),
      })
    );
  });

  it("defaults to 7-day first milestone when invoiceFollowUp is null", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue(makeWorkspace());
    hoisted.db.invoice.findMany.mockResolvedValue([makeInvoice({ ageInDays: 7.3 })]);

    await ensureAutoPaymentReminders(WS_ID);

    expect(hoisted.sendSMS).toHaveBeenCalledTimes(1);
    const actTitle = hoisted.db.activity.create.mock.calls[0][0].data.title;
    expect(actTitle).toContain("7 days");
  });

  it("respects a custom 3-day setting", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue(makeWorkspace({ triggerDays: 3 }));
    hoisted.db.invoice.findMany.mockResolvedValue([makeInvoice({ ageInDays: 3.2 })]);

    await ensureAutoPaymentReminders(WS_ID);

    expect(hoisted.sendSMS).toHaveBeenCalledTimes(1);
    const actTitle = hoisted.db.activity.create.mock.calls[0][0].data.title;
    expect(actTitle).toContain("3 days");
  });

  it("sends follow-up at triggerDays+7 for overdue invoices", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue(makeWorkspace({ triggerDays: 7 }));
    // 14 days in — second milestone (7+7)
    hoisted.db.invoice.findMany.mockResolvedValue([makeInvoice({ ageInDays: 14.3, sentMilestones: [7] })]);

    await ensureAutoPaymentReminders(WS_ID);

    expect(hoisted.sendSMS).toHaveBeenCalledTimes(1);
    const actTitle = hoisted.db.activity.create.mock.calls[0][0].data.title;
    expect(actTitle).toContain("14 days");
  });

  it("is idempotent — skips milestone already sent", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue(makeWorkspace({ triggerDays: 7 }));
    hoisted.db.invoice.findMany.mockResolvedValue([
      makeInvoice({ ageInDays: 7.5, sentMilestones: [7] }),
    ]);

    await ensureAutoPaymentReminders(WS_ID);

    expect(hoisted.sendSMS).not.toHaveBeenCalled();
  });

  it("skips invoice when contact has no phone", async () => {
    hoisted.db.invoice.findMany.mockResolvedValue([
      makeInvoice({ ageInDays: 7.2, phone: null }),
    ]);

    await ensureAutoPaymentReminders(WS_ID);

    expect(hoisted.sendSMS).not.toHaveBeenCalled();
  });

  it("does not log activity when SMS fails", async () => {
    hoisted.db.invoice.findMany.mockResolvedValue([makeInvoice({ ageInDays: 7.2 })]);
    hoisted.sendSMS.mockResolvedValue({ success: false, error: "Twilio error" });

    await ensureAutoPaymentReminders(WS_ID);

    expect(hoisted.sendSMS).toHaveBeenCalled();
    expect(hoisted.db.activity.create).not.toHaveBeenCalled();
  });

  it("only sends one milestone per invoice per day (break after first match)", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue(makeWorkspace({ triggerDays: 7 }));
    // 14.2 days — second milestone window; first milestone already sent
    hoisted.db.invoice.findMany.mockResolvedValue([makeInvoice({ ageInDays: 14.2, sentMilestones: [7] })]);

    await ensureAutoPaymentReminders(WS_ID);

    expect(hoisted.sendSMS).toHaveBeenCalledTimes(1);
  });
});
