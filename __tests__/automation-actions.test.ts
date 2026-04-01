import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  db,
  createNotification,
  createTask,
  runSendEmail,
  renderTemplate,
  logActivity,
} = vi.hoisted(() => ({
  db: {
    automation: {
      findMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    deal: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    task: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
    activity: {
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    contact: {
      findUnique: vi.fn(),
    },
    workspace: {
      findUnique: vi.fn(),
    },
  },
  createNotification: vi.fn(),
  createTask: vi.fn(),
  runSendEmail: vi.fn(),
  renderTemplate: vi.fn(),
  logActivity: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/actions/notification-actions", () => ({ createNotification }));
vi.mock("@/actions/task-actions", () => ({ createTask }));
vi.mock("@/actions/chat-actions", () => ({ runSendEmail }));
vi.mock("@/actions/template-actions", () => ({ renderTemplate }));
vi.mock("@/actions/activity-actions", () => ({ logActivity }));

import {
  createAutomation,
  evaluateAutomations,
  toggleAutomation,
} from "@/actions/automation-actions";

describe("automation-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T10:00:00.000Z"));
    db.activity.update.mockResolvedValue({});
  });

  it("validates automation payloads before creating them", async () => {
    const result = await createAutomation({
      name: "",
      workspaceId: "ws_1",
      trigger: { event: "new_lead" },
      action: { type: "notify" },
    } as never);

    expect(result).toEqual({
      success: false,
      error: "Too small: expected string to have >=1 characters",
    });
    expect(db.automation.create).not.toHaveBeenCalled();
  });

  it("toggles an automation's enabled state", async () => {
    db.automation.findUnique.mockResolvedValue({ id: "auto_1", enabled: false });

    await expect(toggleAutomation("auto_1")).resolves.toEqual({ success: true, enabled: true });

    expect(db.automation.update).toHaveBeenCalledWith({
      where: { id: "auto_1" },
      data: { enabled: true },
    });
  });

  it("creates follow-up tasks on matching stage-change events", async () => {
    db.automation.findMany.mockResolvedValue([
      {
        id: "auto_task",
        name: "Contacted follow-up",
        enabled: true,
        trigger: { event: "deal_stage_change", stage: "CONTACTED" },
        action: { type: "create_task", message: "Follow up within 48 hours" },
        lastFiredAt: null,
      },
    ]);
    db.automation.updateMany.mockResolvedValue({ count: 1 });
    db.task.findFirst.mockResolvedValue(null);

    const result = await evaluateAutomations("ws_1", {
      type: "stage_change",
      dealId: "deal_1",
      contactId: "contact_1",
      stage: "CONTACTED",
    });

    expect(result).toEqual({
      triggered: ["[Contacted follow-up] → Follow up within 48 hours"],
    });
    expect(createTask).toHaveBeenCalledWith({
      title: "Follow up within 48 hours",
      dueAt: expect.any(Date),
      dealId: "deal_1",
      contactId: "contact_1",
    });
  });

  it("skips concurrent execution when the optimistic lock cannot claim the automation", async () => {
    db.automation.findMany.mockResolvedValue([
      {
        id: "auto_lock",
        name: "Race-safe automation",
        enabled: true,
        trigger: { event: "new_lead" },
        action: { type: "notify", message: "Lead arrived" },
        lastFiredAt: new Date("2026-04-02T09:00:00.000Z"),
      },
    ]);
    db.automation.updateMany.mockResolvedValue({ count: 0 });

    const result = await evaluateAutomations("ws_1", {
      type: "new_lead",
      contactId: "contact_1",
    });

    expect(result).toEqual({ triggered: [] });
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("notifies every workspace user for each overdue task", async () => {
    db.automation.findMany.mockResolvedValue([
      {
        id: "auto_overdue",
        name: "Overdue escalation",
        enabled: true,
        trigger: { event: "task_overdue", threshold_days: 2 },
        action: { type: "notify", message: "Task overdue" },
        lastFiredAt: null,
      },
    ]);
    db.task.findMany.mockResolvedValue([
      { id: "task_1", title: "Call Alex", deal: { id: "deal_1" } },
      { id: "task_2", title: "Send invoice", deal: { id: "deal_2" } },
    ]);
    db.user.findMany.mockResolvedValue([{ id: "user_1" }, { id: "user_2" }]);
    db.automation.updateMany.mockResolvedValue({ count: 1 });

    const result = await evaluateAutomations("ws_1", { type: "check_tasks" });

    expect(result.triggered).toEqual(["[Overdue escalation] → Task overdue"]);
    expect(createNotification).toHaveBeenCalledTimes(4);
    expect(createNotification).toHaveBeenCalledWith({
      userId: "user_1",
      title: "Overdue escalation",
      message: 'Task overdue: "Call Alex"',
      type: "SYSTEM",
      link: "/crm?dealId=deal_1",
    });
  });

  it("sends templated emails once per day and confirms the pending activity", async () => {
    db.automation.findMany.mockResolvedValue([
      {
        id: "auto_email",
        name: "Welcome lead",
        enabled: true,
        trigger: { event: "new_lead" },
        action: { type: "email", template: "welcome_lead" },
        lastFiredAt: null,
      },
    ]);
    db.automation.updateMany.mockResolvedValue({ count: 1 });
    db.activity.findFirst.mockResolvedValue(null);
    db.deal.findUnique.mockResolvedValue({
      id: "deal_1",
      title: "Kitchen plumbing",
      value: 320,
      contact: {
        id: "contact_1",
        name: "Alex",
        email: "alex@example.com",
      },
      workspace: {
        id: "ws_1",
        name: "Acme Plumbing",
        ownerId: "owner_1",
        inboundEmailAlias: "acme",
      },
    });
    db.user.findUnique.mockResolvedValue({ email: "owner@example.com" });
    renderTemplate.mockResolvedValue({
      subject: "Thanks for your enquiry",
      body: "We will be in touch shortly.",
    });
    logActivity.mockResolvedValue({ activityId: "activity_1" });

    const result = await evaluateAutomations("ws_1", {
      type: "new_lead",
      dealId: "deal_1",
      contactId: "contact_1",
    });

    expect(result.triggered).toEqual(["[Welcome lead] → email"]);
    expect(runSendEmail).toHaveBeenCalledWith("ws_1", {
      contactName: "Alex",
      subject: "Thanks for your enquiry",
      body: "We will be in touch shortly.",
      workspaceAlias: "acme",
      workspaceName: "Acme Plumbing",
      ownerEmail: "owner@example.com",
    });
    expect(db.activity.update).toHaveBeenCalledWith({
      where: { id: "activity_1" },
      data: { title: "Automation: Welcome lead - Thanks for your enquiry" },
    });
  });

  it("moves deals to the resolved Prisma stage and logs the action", async () => {
    db.automation.findMany.mockResolvedValue([
      {
        id: "auto_move",
        name: "Complete job",
        enabled: true,
        trigger: { event: "deal_stage_change", stage: "SCHEDULED" },
        action: { type: "move_stage", targetStage: "completed", message: "Job completed" },
        lastFiredAt: null,
      },
    ]);
    db.automation.updateMany.mockResolvedValue({ count: 1 });

    const result = await evaluateAutomations("ws_1", {
      type: "stage_change",
      dealId: "deal_9",
      contactId: "contact_9",
      stage: "SCHEDULED",
    });

    expect(result.triggered).toEqual(["[Complete job] → Job completed"]);
    expect(db.deal.update).toHaveBeenCalledWith({
      where: { id: "deal_9" },
      data: { stage: "WON", stageChangedAt: expect.any(Date) },
    });
    expect(logActivity).toHaveBeenCalledWith({
      type: "NOTE",
      title: "Automation: Complete job — moved to completed",
      content: "Job completed",
      dealId: "deal_9",
    });
  });
});
