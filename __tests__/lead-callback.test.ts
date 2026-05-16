import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, initiateOutboundCall } = vi.hoisted(() => ({
  db: { task: { create: vi.fn() } },
  initiateOutboundCall: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/outbound-call", () => ({ initiateOutboundCall }));

import { scheduleLeadCallback } from "@/lib/lead-callback";

describe("scheduleLeadCallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.task.create.mockResolvedValue({ id: "task_1" });
    initiateOutboundCall.mockResolvedValue(undefined);
  });

  it("dispatches immediately when delaySec is 0", async () => {
    const result = await scheduleLeadCallback({
      workspaceId: "ws_1",
      contactPhone: "+61400000000",
      contactName: "Alex",
      dealId: "deal_1",
      reason: "test",
      delaySec: 0,
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
  });

  it("creates a scheduled-call task with dueAt = now + delaySec when delaySec > 0", async () => {
    const before = Date.now();
    const result = await scheduleLeadCallback({
      workspaceId: "ws_1",
      contactPhone: "+61400000000",
      contactName: "Alex",
      dealId: "deal_1",
      reason: "webform_lead:website",
      delaySec: 60,
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
