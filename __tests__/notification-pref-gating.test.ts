import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    workspace: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    notification: { create: vi.fn() },
  },
  runIdempotent: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));
vi.mock("@/lib/idempotency", () => ({ runIdempotent: hoisted.runIdempotent }));

import { shouldSendNotificationEmail, createNotification } from "@/actions/notification-actions";

describe("shouldSendNotificationEmail (notif-01/02/03)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true by default when workspace has no notification preferences set", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue({
      settings: {},
    });

    expect(await shouldSendNotificationEmail("ws_1", "emailDealUpdates")).toBe(true);
    expect(await shouldSendNotificationEmail("ws_1", "emailNewContacts")).toBe(true);
    expect(await shouldSendNotificationEmail("ws_1", "emailWeeklySummary")).toBe(true);
  });

  it("returns false when the specific pref is explicitly disabled (notif-01 — deal updates)", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue({
      settings: {
        notificationPreferences: { emailDealUpdates: false, emailNewContacts: true, emailWeeklySummary: true },
      },
    });

    expect(await shouldSendNotificationEmail("ws_1", "emailDealUpdates")).toBe(false);
    expect(await shouldSendNotificationEmail("ws_1", "emailNewContacts")).toBe(true);
  });

  it("returns false when emailNewContacts is disabled (notif-02 — new contacts)", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue({
      settings: {
        notificationPreferences: { emailDealUpdates: true, emailNewContacts: false, emailWeeklySummary: true },
      },
    });

    expect(await shouldSendNotificationEmail("ws_1", "emailNewContacts")).toBe(false);
    expect(await shouldSendNotificationEmail("ws_1", "emailDealUpdates")).toBe(true);
  });

  it("returns false when emailWeeklySummary is disabled (notif-03 — weekly digest)", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue({
      settings: {
        notificationPreferences: { emailDealUpdates: true, emailNewContacts: true, emailWeeklySummary: false },
      },
    });

    expect(await shouldSendNotificationEmail("ws_1", "emailWeeklySummary")).toBe(false);
    expect(await shouldSendNotificationEmail("ws_1", "emailDealUpdates")).toBe(true);
  });

  it("returns true when workspace does not exist (graceful default)", async () => {
    hoisted.db.workspace.findUnique.mockResolvedValue(null);

    expect(await shouldSendNotificationEmail("ws_missing", "emailDealUpdates")).toBe(true);
  });
});

describe("createNotification stale_deal gate (notif-05)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.runIdempotent.mockResolvedValue({ created: true, result: { notificationId: "n_1" } });
    hoisted.db.notification = { create: vi.fn().mockResolvedValue({ id: "n_1" }) };
  });

  it("skips creating a stale_deal notification when inAppStaleDealAlerts is false (notif-05)", async () => {
    hoisted.db.user.findUnique.mockResolvedValue({ workspaceId: "ws_1" });
    hoisted.db.workspace.findUnique.mockResolvedValue({
      settings: { notificationPreferences: { inAppStaleDealAlerts: false } },
    });

    const result = await createNotification({
      userId: "user_1",
      title: "Stale deal",
      message: "Deal hasn't moved in 7 days",
      notificationType: "stale_deal",
    });

    expect(result).toEqual({ success: true });
    expect(hoisted.runIdempotent).not.toHaveBeenCalled();
  });

  it("creates a stale_deal notification when inAppStaleDealAlerts is true (default)", async () => {
    hoisted.db.user.findUnique.mockResolvedValue({ workspaceId: "ws_1" });
    hoisted.db.workspace.findUnique.mockResolvedValue({ settings: {} });
    hoisted.runIdempotent.mockResolvedValue({ created: true, result: { notificationId: "n_1" } });

    await createNotification({
      userId: "user_1",
      title: "Stale deal",
      message: "Deal hasn't moved in 7 days",
      notificationType: "stale_deal",
    });

    expect(hoisted.runIdempotent).toHaveBeenCalled();
  });
});
