import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  db,
  createNotification,
  createTask,
  logActivity,
  initiateOutboundCall,
} = vi.hoisted(() => ({
  db: {
    deal: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    user: {
      findMany: vi.fn(),
    },
    contact: {
      findUnique: vi.fn(),
    },
  },
  createNotification: vi.fn(),
  createTask: vi.fn(),
  logActivity: vi.fn(),
  initiateOutboundCall: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/actions/notification-actions", () => ({ createNotification }));
vi.mock("@/actions/task-actions", () => ({ createTask }));
vi.mock("@/actions/activity-actions", () => ({ logActivity }));
vi.mock("@/lib/outbound-call", () => ({ initiateOutboundCall }));

import {
  clearEscalation,
  executeKanbanAction,
} from "@/actions/kanban-automation-actions";

describe("kanban-automation-actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-02T10:00:00.000Z"));
    db.deal.findUnique.mockResolvedValue({
      id: "deal_1",
      title: "Kitchen plumbing",
      contact: { id: "contact_1", name: "Alex" },
      workspace: { id: "ws_1", name: "Acme Plumbing", ownerId: "owner_1" },
    });
  });

  it("escalates a deal, creates an urgent task, notifies users, and logs the activity", async () => {
    db.user.findMany.mockResolvedValue([{ id: "user_1" }, { id: "user_2" }]);

    const result = await executeKanbanAction("escalate", {
      dealId: "deal_1",
      message: "Customer complaint needs owner review",
    });

    expect(result).toEqual({ success: true, action: "escalated" });
    expect(db.deal.update).toHaveBeenCalledWith({
      where: { id: "deal_1" },
      data: {
        escalatedAt: expect.any(Date),
        escalationReason: "Customer complaint needs owner review",
      },
    });
    expect(createTask).toHaveBeenCalledWith({
      title: "ESCALATED: Kitchen plumbing",
      description: "Customer complaint needs owner review",
      dueAt: expect.any(Date),
      dealId: "deal_1",
      contactId: "contact_1",
    });
    expect(createNotification).toHaveBeenCalledTimes(2);
    expect(logActivity).toHaveBeenCalledWith({
      type: "NOTE",
      title: "Deal escalated",
      content: "Customer complaint needs owner review",
      dealId: "deal_1",
      contactId: "contact_1",
    });
  });

  it("schedules a future follow-up call as a task and notification", async () => {
    db.user.findMany.mockResolvedValue([{ id: "user_1" }]);

    const result = await executeKanbanAction("schedule-call", {
      dealId: "deal_1",
      message: "Call after quote review",
      followUpDate: "2026-04-05T10:00:00.000Z",
    });

    expect(result).toEqual({
      success: true,
      action: "call-scheduled",
      scheduledAt: "2026-04-05T10:00:00.000Z",
    });
    expect(createTask).toHaveBeenCalledWith({
      title: "Scheduled call: Kitchen plumbing",
      description: "Call after quote review",
      dueAt: new Date("2026-04-05T10:00:00.000Z"),
      dealId: "deal_1",
      contactId: "contact_1",
    });
    expect(createNotification).toHaveBeenCalledWith({
      userId: "user_1",
      title: "Call Scheduled",
      message: "Kitchen plumbing: call on 05/04/2026",
      type: "SYSTEM",
      link: "/crm?dealId=deal_1",
    });
  });

  it("refuses immediate calls when the contact has no phone number", async () => {
    db.contact.findUnique.mockResolvedValue({ phone: null, name: "Alex" });

    const result = await executeKanbanAction("schedule-call", {
      dealId: "deal_1",
      message: "Try calling now",
    });

    expect(result).toEqual({
      success: false,
      error: "Contact has no phone number on file",
    });
    expect(initiateOutboundCall).not.toHaveBeenCalled();
  });

  it("places immediate outbound calls when a contact phone is available", async () => {
    db.contact.findUnique.mockResolvedValue({ phone: "0400000000", name: "Alex" });
    initiateOutboundCall.mockResolvedValue({ roomName: "room_123" });

    const result = await executeKanbanAction("schedule-call", {
      dealId: "deal_1",
      message: "Call now",
    });

    expect(result).toEqual({
      success: true,
      action: "call-placed",
      roomName: "room_123",
    });
    expect(initiateOutboundCall).toHaveBeenCalledWith({
      workspaceId: "ws_1",
      contactPhone: "0400000000",
      contactName: "Alex",
      dealId: "deal_1",
      reason: "Call now",
    });
    expect(logActivity).toHaveBeenCalledWith({
      type: "CALL",
      title: "Outbound call placed",
      content: "Called Alex: Call now",
      dealId: "deal_1",
      contactId: "contact_1",
    });
  });

  it("validates and applies stage moves", async () => {
    await expect(
      executeKanbanAction("move-stage", { dealId: "deal_1" }),
    ).resolves.toEqual({
      success: false,
      error: "Target stage is required",
    });

    await expect(
      executeKanbanAction("move-stage", { dealId: "deal_1", targetStage: "closed-won" }),
    ).resolves.toEqual({
      success: true,
      action: "stage-moved",
      newStage: "WON",
    });

    expect(db.deal.update).toHaveBeenCalledWith({
      where: { id: "deal_1" },
      data: { stage: "WON", stageChangedAt: expect.any(Date) },
    });
    expect(logActivity).toHaveBeenCalledWith({
      type: "NOTE",
      title: "Stage changed to Completed",
      content: "Deal moved to Completed",
      dealId: "deal_1",
      contactId: "contact_1",
    });
  });

  it("creates a next-day follow-up task when no date is provided", async () => {
    const result = await executeKanbanAction("follow-up", {
      dealId: "deal_1",
      message: "Check back tomorrow",
    });

    expect(result).toEqual({ success: true, action: "follow-up" });
    expect(createTask).toHaveBeenCalledWith({
      title: "Follow up: Kitchen plumbing",
      description: "Check back tomorrow",
      dueAt: expect.any(Date),
      dealId: "deal_1",
      contactId: "contact_1",
    });
    const dueAt = createTask.mock.calls[0]?.[0]?.dueAt as Date;
    expect(dueAt.toISOString()).toBe("2026-04-03T10:00:00.000Z");
  });

  it("clears escalation flags on a deal", async () => {
    await expect(clearEscalation("deal_1")).resolves.toEqual({ success: true });

    expect(db.deal.update).toHaveBeenCalledWith({
      where: { id: "deal_1" },
      data: { escalatedAt: null, escalationReason: null },
    });
  });
});
