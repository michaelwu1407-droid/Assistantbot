import { beforeEach, describe, expect, it, vi } from "vitest";

const { requireCurrentWorkspaceAccess, db, revalidatePath, sendNotification } = vi.hoisted(() => ({
  requireCurrentWorkspaceAccess: vi.fn(),
  db: {
    user: {
      findUnique: vi.fn(),
    },
    smsTemplate: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      upsert: vi.fn(),
    },
    deal: {
      findFirst: vi.fn(),
    },
  },
  revalidatePath: vi.fn(),
  sendNotification: vi.fn(),
}));

vi.mock("@/lib/workspace-access", () => ({
  requireCurrentWorkspaceAccess,
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("next/cache", () => ({
  revalidatePath,
}));

vi.mock("@/lib/public-feedback", () => ({
  buildPublicFeedbackUrl: vi.fn(() => "https://feedback.example/token"),
}));

vi.mock("@/lib/messaging/send-notification", () => ({
  sendNotification,
}));

vi.mock("@/lib/messaging/channel-router", () => ({
  NotificationScenario: {
    JOB_COMPLETE_FEEDBACK: "JOB_COMPLETE_FEEDBACK",
    ON_MY_WAY: "ON_MY_WAY",
    RUNNING_LATE: "RUNNING_LATE",
    REMINDER_24H: "REMINDER_24H",
  },
  getNotificationChannel: vi.fn(() => "sms"),
}));

import {
  getMessagePreview,
  getUserSmsTemplates,
  sendTemplateMessage,
  upsertSmsTemplate,
} from "@/actions/sms-templates";

describe("sms-templates actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireCurrentWorkspaceAccess.mockResolvedValue({
      id: "app_user_1",
      role: "OWNER",
      workspaceId: "ws_1",
    });
    db.user.findUnique.mockResolvedValue({
      id: "app_user_1",
      workspace: { name: "Alexandria Plumbing" },
    });
    db.smsTemplate.findMany.mockResolvedValue([]);
    db.smsTemplate.findFirst.mockResolvedValue({
      content: "Hi [Name], on my way. [ReviewRequest]",
      isActive: true,
    });
    db.deal.findFirst.mockResolvedValue({
      id: "deal_1",
      contactId: "contact_1",
      workspaceId: "ws_1",
      contact: { id: "contact_1", name: "Sam", phone: "0400000000", email: "sam@example.com" },
      workspace: {
        id: "ws_1",
        name: "Alexandria Plumbing",
        settings: {},
        twilioPhoneNumber: "+61400000000",
        twilioSubaccountId: "sub",
        twilioSubaccountAuthToken: "token",
      },
    });
    sendNotification.mockResolvedValue({ sent: true, channel: "sms" });
  });

  it("loads and saves templates for the actor app user", async () => {
    const templates = await getUserSmsTemplates();
    expect(templates).toHaveLength(4);
    expect(db.smsTemplate.findMany).toHaveBeenCalledWith({ where: { userId: "app_user_1" } });

    await expect(upsertSmsTemplate("ON_MY_WAY", "Hi [Name], heading over", true)).resolves.toEqual({
      success: true,
    });
    expect(db.smsTemplate.upsert).toHaveBeenCalledWith({
      where: { userId_triggerEvent: { userId: "app_user_1", triggerEvent: "ON_MY_WAY" } },
      create: {
        userId: "app_user_1",
        triggerEvent: "ON_MY_WAY",
        content: "Hi [Name], heading over\nTracey, Alexandria Plumbing",
        isActive: true,
      },
      update: {
        content: "Hi [Name], heading over\nTracey, Alexandria Plumbing",
        isActive: true,
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/crm/settings/sms-templates");
  });

  it("previews and sends only actor-workspace deals", async () => {
    await expect(getMessagePreview("deal_1", "ON_MY_WAY")).resolves.toMatchObject({
      contactName: "Sam",
      messageBody: "Hi Sam, on my way. Feedback: https://feedback.example/token",
      canSend: true,
    });
    expect(db.deal.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "deal_1", workspaceId: "ws_1" },
      }),
    );

    await expect(sendTemplateMessage("deal_1", "ON_MY_WAY")).resolves.toEqual({
      success: true,
      channel: "sms",
    });
    expect(sendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        deal: { id: "deal_1", contactId: "contact_1", workspaceId: "ws_1" },
      }),
    );
  });

  it("returns not found when a deal is outside the actor workspace", async () => {
    db.deal.findFirst.mockResolvedValue(null);

    await expect(getMessagePreview("other_deal", "ON_MY_WAY")).resolves.toBeNull();
    await expect(sendTemplateMessage("other_deal", "ON_MY_WAY")).resolves.toEqual({
      success: false,
      error: "Job not found",
    });
  });
});
