import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted mocks
const db = vi.hoisted(() => ({
  notificationChannelPref: {
    findUnique: vi.fn(),
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
  notification: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  user: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
  },
  webhookEvent: {
    create: vi.fn(),
  },
}));

const sendWhatsAppMock = vi.hoisted(() => vi.fn());
const approveDraftMock = vi.hoisted(() => vi.fn());
const approveCompletionMock = vi.hoisted(() => vi.fn());
const markAsReadMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/twilio/whatsapp", () => ({ sendWhatsApp: sendWhatsAppMock }));
vi.mock("@/actions/deal-actions", () => ({
  approveDraft: approveDraftMock,
  approveCompletion: approveCompletionMock,
}));
vi.mock("@/actions/notification-actions", () => ({
  markAsRead: markAsReadMock,
}));

import { dispatchWhatsAppForNotification } from "@/lib/notifications/whatsapp-dispatch";
import { parseActionCode, resolveAndExecute } from "@/lib/notifications/whatsapp-reply-parser";
import { formatWhatsAppNotification } from "@/lib/notifications/whatsapp-formatters";
import { executeNotificationAction } from "@/lib/notifications/action-executor";
import type { Notification } from "@prisma/client";

const baseNotification: Notification = {
  id: "cltest1234567890",
  userId: "user_1",
  title: "New Lead",
  message: "Lead from website",
  type: "INFO" as Notification["type"],
  read: false,
  link: null,
  actionType: "CONFIRM_JOB",
  actionPayload: { dealId: "deal_1", contactName: "Jane Smith" },
  createdAt: new Date("2026-04-20T08:00:00Z"),
};

// ─── Dispatch gating ────────────────────────────────────────────────────────

describe("dispatchWhatsAppForNotification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.WHATSAPP_NOTIFICATIONS_ENABLED = "true";
    db.webhookEvent.create.mockResolvedValue({});
  });

  it("no-ops when notificationType is undefined", async () => {
    await dispatchWhatsAppForNotification({
      notification: baseNotification,
      userId: "user_1",
      notificationType: undefined,
    });
    expect(sendWhatsAppMock).not.toHaveBeenCalled();
  });

  it("skips when feature flag is off", async () => {
    process.env.WHATSAPP_NOTIFICATIONS_ENABLED = "false";
    await dispatchWhatsAppForNotification({
      notification: baseNotification,
      userId: "user_1",
      notificationType: "new_lead",
    });
    expect(sendWhatsAppMock).not.toHaveBeenCalled();
  });

  it("skips when pref is disabled", async () => {
    db.notificationChannelPref.findUnique.mockResolvedValue({ enabled: false });
    await dispatchWhatsAppForNotification({
      notification: baseNotification,
      userId: "user_1",
      notificationType: "new_lead",
    });
    expect(sendWhatsAppMock).not.toHaveBeenCalled();
    expect(db.webhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "skipped_disabled" }),
      }),
    );
  });

  it("skips when pref is enabled but user has no phone", async () => {
    db.notificationChannelPref.findUnique.mockResolvedValue({ enabled: true });
    db.user.findUnique.mockResolvedValue({ phone: null });
    await dispatchWhatsAppForNotification({
      notification: baseNotification,
      userId: "user_1",
      notificationType: "new_lead",
    });
    expect(sendWhatsAppMock).not.toHaveBeenCalled();
    expect(db.webhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "skipped_no_phone" }),
      }),
    );
  });

  it("sends when pref is enabled and user has phone", async () => {
    db.notificationChannelPref.findUnique.mockResolvedValue({ enabled: true });
    db.user.findUnique.mockResolvedValue({ phone: "+61400000001" });
    sendWhatsAppMock.mockResolvedValue({ sid: "SM123" });
    await dispatchWhatsAppForNotification({
      notification: baseNotification,
      userId: "user_1",
      notificationType: "new_lead",
    });
    expect(sendWhatsAppMock).toHaveBeenCalledWith("+61400000001", expect.any(String));
    expect(db.webhookEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "success" }),
      }),
    );
  });
});

// ─── Formatter snapshots ─────────────────────────────────────────────────────

describe("formatWhatsAppNotification", () => {
  it("new_lead includes name, service, action code", () => {
    const n: Notification = {
      ...baseNotification,
      actionPayload: { contactName: "Bob", service: "Plumbing", source: "Website", phone: "0411" },
    };
    const body = formatWhatsAppNotification(n, "new_lead");
    expect(body).toContain("Bob");
    expect(body).toContain("Plumbing");
    expect(body).toContain("N-");
    expect(body).toContain("ACCEPT");
  });

  it("ai_call_completed includes contact name and action code", () => {
    const n: Notification = {
      ...baseNotification,
      actionType: null,
      actionPayload: { contactName: "Alice", outcome: "Booked for Tuesday" },
    };
    const body = formatWhatsAppNotification(n, "ai_call_completed");
    expect(body).toContain("Alice");
    expect(body).toContain("Booked for Tuesday");
    expect(body).toContain("N-");
  });

  it("action code suffix uses last 10 chars of notification id", () => {
    const n: Notification = { ...baseNotification, id: "cl_abcde_12345678ab" };
    const body = formatWhatsAppNotification(n, "new_lead");
    expect(body).toContain("N-" + "cl_abcde_12345678ab".slice(-10));
  });
});

// ─── Action code parser ──────────────────────────────────────────────────────

describe("parseActionCode", () => {
  it("parses ACCEPT N-abcdef", () => {
    expect(parseActionCode("ACCEPT N-abcdef")).toEqual({ verb: "ACCEPT", suffix: "abcdef" });
  });

  it("parses case-insensitively with leading whitespace", () => {
    expect(parseActionCode("  accept N-abcdef")).toEqual({ verb: "ACCEPT", suffix: "abcdef" });
  });

  it("parses REJECT with extra whitespace between verb and code", () => {
    expect(parseActionCode("REJECT   N-abcdefgh")).toEqual({ verb: "REJECT", suffix: "abcdefgh" });
  });

  it("returns null for plain text", () => {
    expect(parseActionCode("hi what jobs do I have today")).toBeNull();
  });

  it("returns null for short suffix (< 6 chars)", () => {
    expect(parseActionCode("OK N-abc")).toBeNull();
  });
});

// ─── Reply resolver — ownership ───────────────────────────────────────────────

describe("resolveAndExecute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.webhookEvent.create.mockResolvedValue({});
    markAsReadMock.mockResolvedValue({ success: true });
  });

  it("returns handled=false if notification not found for user", async () => {
    db.notification.findFirst.mockResolvedValue(null);
    const result = await resolveAndExecute({ id: "user_1" }, { verb: "ACCEPT", suffix: "abcdefghij" });
    expect(result.handled).toBe(false);
  });

  it("returns handled=true and executes action when notification found", async () => {
    db.notification.findFirst.mockResolvedValue({ ...baseNotification });
    approveDraftMock.mockResolvedValue({ success: true });
    const result = await resolveAndExecute({ id: "user_1" }, { verb: "ACCEPT", suffix: "567890" });
    expect(result.handled).toBe(true);
    if (result.handled) {
      expect(result.reply).toBe("Job confirmed.");
    }
    expect(approveDraftMock).toHaveBeenCalledWith("deal_1");
  });

  it("does not execute action for a different user's notification suffix (ownership check)", async () => {
    // findFirst returns null when userId does not match (enforced by Prisma query)
    db.notification.findFirst.mockResolvedValue(null);
    const result = await resolveAndExecute({ id: "other_user" }, { verb: "ACCEPT", suffix: "567890" });
    expect(result.handled).toBe(false);
    expect(approveDraftMock).not.toHaveBeenCalled();
  });
});

// ─── executeNotificationAction — verb mapping ─────────────────────────────────

describe("executeNotificationAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    markAsReadMock.mockResolvedValue({ success: true });
    db.notification.update.mockResolvedValue({});
  });

  it("confirms job on ACCEPT + CONFIRM_JOB", async () => {
    approveDraftMock.mockResolvedValue({ success: true });
    const result = await executeNotificationAction(baseNotification, "ACCEPT");
    expect(approveDraftMock).toHaveBeenCalledWith("deal_1");
    expect(result.success).toBe(true);
  });

  it("marks read on OK", async () => {
    const result = await executeNotificationAction(baseNotification, "OK");
    expect(markAsReadMock).toHaveBeenCalledWith(baseNotification.id);
    expect(result.success).toBe(true);
  });

  it("returns error reply when approveDraft fails", async () => {
    approveDraftMock.mockResolvedValue({ success: false, error: "Deal not found" });
    const result = await executeNotificationAction(baseNotification, "ACCEPT");
    expect(result.success).toBe(false);
    expect(result.reply).toContain("Deal not found");
  });
});
