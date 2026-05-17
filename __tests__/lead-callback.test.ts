import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, initiateOutboundCall, recordCallbackEvent } = vi.hoisted(() => ({
  db: { task: { create: vi.fn() } },
  initiateOutboundCall: vi.fn(),
  recordCallbackEvent: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/outbound-call", () => ({ initiateOutboundCall }));
vi.mock("@/lib/callback-events", () => ({ recordCallbackEvent }));

import { scheduleLeadCallback } from "@/lib/lead-callback";

describe("scheduleLeadCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.task.create.mockResolvedValue({ id: "task_1" });
    initiateOutboundCall.mockResolvedValue({
      roomName: "room_1",
      resolvedTrunkId: "trunk_1",
      callerNumber: "+61411111111",
    });
    recordCallbackEvent.mockResolvedValue(undefined);
  });

  it("dispatches immediately when delaySec is 0", async () => {
    const result = await scheduleLeadCallback({
      workspaceId: "ws_1",
      contactId: "contact_1",
      contactPhone: "+61400000000",
      contactName: "Alex",
      dealId: "deal_1",
      reason: "test",
      delaySec: 0,
      triggerSource: "inbound_sms",
      callbackKind: "automatic",
    });

    expect(result).toEqual({ dispatched: "immediate" });
    expect(initiateOutboundCall).toHaveBeenCalledWith({
      workspaceId: "ws_1",
      contactPhone: "+61400000000",
      contactName: "Alex",
      dealId: "deal_1",
      reason: "test",
    });
    expect(db.task.create).not.toHaveBeenCalled();
    await Promise.resolve();
    expect(recordCallbackEvent).toHaveBeenCalledWith({
      eventType: "callback_requested",
      payload: expect.objectContaining({
        workspaceId: "ws_1",
        contactId: "contact_1",
        contactPhone: "+61400000000",
        triggerSource: "inbound_sms",
        callbackKind: "automatic",
        dispatchMode: "immediate",
      }),
    });
    expect(recordCallbackEvent).toHaveBeenCalledWith({
      eventType: "callback_dispatched",
      payload: expect.objectContaining({
        workspaceId: "ws_1",
        roomName: "room_1",
        callerNumber: "+61411111111",
      }),
    });
  });

  it("creates a scheduled-call task with dueAt = now + delaySec when delaySec > 0", async () => {
    const before = Date.now();
    const result = await scheduleLeadCallback({
      workspaceId: "ws_1",
      contactId: "contact_1",
      contactPhone: "+61400000000",
      contactName: "Alex",
      dealId: "deal_1",
      reason: "webform_lead:website",
      delaySec: 60,
      triggerSource: "webform",
      callbackKind: "automatic",
    });
    const after = Date.now();

    expect(result.dispatched).toBe("scheduled");
    expect(initiateOutboundCall).not.toHaveBeenCalled();
    expect(db.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        dealId: "deal_1",
        title: "Scheduled call: auto-callback (webform_lead:website)",
        completed: false,
      }),
      select: { id: true },
    });

    const createCall = db.task.create.mock.calls[0][0];
    const dueAtMs = (createCall.data.dueAt as Date).getTime();
    expect(dueAtMs).toBeGreaterThanOrEqual(before + 60_000);
    expect(dueAtMs).toBeLessThanOrEqual(after + 60_000);
    expect(recordCallbackEvent).toHaveBeenCalledWith({
      eventType: "callback_requested",
      payload: expect.objectContaining({
        workspaceId: "ws_1",
        contactId: "contact_1",
        triggerSource: "webform",
        callbackKind: "automatic",
        dispatchMode: "scheduled",
        taskId: "task_1",
      }),
    });
  });

  it("treats negative or non-finite delays as immediate dispatch", async () => {
    await scheduleLeadCallback({
      workspaceId: "ws_1",
      contactPhone: "+61400000000",
      dealId: "deal_1",
      reason: "x",
      delaySec: -10,
    });
    expect(initiateOutboundCall).toHaveBeenCalled();
    expect(db.task.create).not.toHaveBeenCalled();
  });
});
