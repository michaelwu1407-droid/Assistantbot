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
      contact: { name: "Jane Smith", phone: overrides.phone ?? "+61400000001" },
      activities: milestones.map((m) => ({
        title: `Auto payment reminder: ${m} days (invoice ${overrides.number ?? "INV-001"})`,
      })),
    },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  hoisted.db.workspace.findUnique.mockResolvedValue({ agentMode: "EXECUTION", name: "Acme Plumbing" });
  hoisted.sendSMS.mockResolvedValue({ success: true });
  hoisted.db.activity.create.mockResolvedValue({ id: "act_1" });
});

describe("ensureAutoPaymentReminders", () => {
  it("skips entirely when agentMode is not EXECUTION", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue({ agentMode: "DRAFT", name: "Acme" });

    await ensureAutoPaymentReminders(WS_ID);

    expect(hoisted.db.invoice.findMany).not.toHaveBeenCalled();
    expect(hoisted.sendSMS).not.toHaveBeenCalled();
  });

  it("skips when workspace is not found", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue(null);

    await ensureAutoPaymentReminders(WS_ID);

    expect(hoisted.db.invoice.findMany).not.toHaveBeenCalled();
  });

  it("sends reminder at 3-day milestone and logs activity", async () => {
    hoisted.db.invoice.findMany.mockResolvedValue([makeInvoice({ ageInDays: 3.2 })]);

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
          title: "Auto payment reminder: 3 days (invoice INV-001)",
        }),
      })
    );
  });

  it("sends reminder at 7-day milestone", async () => {
    hoisted.db.invoice.findMany.mockResolvedValue([makeInvoice({ ageInDays: 7.5 })]);

    await ensureAutoPaymentReminders(WS_ID);

    expect(hoisted.sendSMS).toHaveBeenCalledTimes(1);
    const [, , , ] = hoisted.sendSMS.mock.calls[0];
    const activityTitle = hoisted.db.activity.create.mock.calls[0][0].data.title;
    expect(activityTitle).toContain("7 days");
  });

  it("is idempotent — skips milestone already sent", async () => {
    hoisted.db.invoice.findMany.mockResolvedValue([
      makeInvoice({ ageInDays: 3.5, sentMilestones: [3] }),
    ]);

    await ensureAutoPaymentReminders(WS_ID);

    expect(hoisted.sendSMS).not.toHaveBeenCalled();
  });

  it("skips invoice when contact has no phone", async () => {
    hoisted.db.invoice.findMany.mockResolvedValue([
      makeInvoice({ ageInDays: 3.2, phone: null }),
    ]);

    await ensureAutoPaymentReminders(WS_ID);

    expect(hoisted.sendSMS).not.toHaveBeenCalled();
  });

  it("does not log activity when SMS fails", async () => {
    hoisted.db.invoice.findMany.mockResolvedValue([makeInvoice({ ageInDays: 3.2 })]);
    hoisted.sendSMS.mockResolvedValue({ success: false, error: "Twilio error" });

    await ensureAutoPaymentReminders(WS_ID);

    expect(hoisted.sendSMS).toHaveBeenCalled();
    expect(hoisted.db.activity.create).not.toHaveBeenCalled();
  });

  it("only sends one milestone per invoice even if multiple match", async () => {
    // 7.2 days — inside 7-day window AND 3-day window already passed
    hoisted.db.invoice.findMany.mockResolvedValue([makeInvoice({ ageInDays: 7.2 })]);

    await ensureAutoPaymentReminders(WS_ID);

    // Should only fire once (break after first match)
    expect(hoisted.sendSMS).toHaveBeenCalledTimes(1);
  });
});
