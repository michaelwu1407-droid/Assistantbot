import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  db: {
    task: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
  initiateOutboundCall: vi.fn(),
  recordCallbackEvent: vi.fn(),
  handleCallbackDispatchFailure: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));

vi.mock("@/lib/outbound-call", () => ({
  initiateOutboundCall: hoisted.initiateOutboundCall,
}));
vi.mock("@/lib/callback-events", () => ({
  recordCallbackEvent: hoisted.recordCallbackEvent,
}));
vi.mock("@/lib/callback-escalation", () => ({
  handleCallbackDispatchFailure: hoisted.handleCallbackDispatchFailure,
}));

import { GET } from "@/app/api/cron/scheduled-calls/route";

describe("GET /api/cron/scheduled-calls", () => {
  const originalCronSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "secret";
    hoisted.db.task.findMany.mockResolvedValue([]);
    hoisted.db.task.update.mockResolvedValue(undefined);
    hoisted.initiateOutboundCall.mockResolvedValue({
      roomName: "room_1",
      resolvedTrunkId: "trunk_1",
      callerNumber: "+61411111111",
    });
    hoisted.recordCallbackEvent.mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (originalCronSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalCronSecret;
  });

  it("rejects unauthorized callers", async () => {
    const response = await GET(new NextRequest("https://earlymark.ai/api/cron/scheduled-calls"));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("processes due calls and skips tasks with missing phone data", async () => {
    hoisted.db.task.findMany.mockResolvedValue([
      {
        id: "task_1",
        title: "Scheduled call: auto-callback (Call about quote)",
        description: "Call about quote",
        deal: {
          id: "deal_1",
          title: "Blocked drain",
          workspaceId: "ws_1",
          contact: { id: "contact_1", name: "Jane", phone: "+61400000000" },
        },
      },
      {
        id: "task_2",
        title: "Scheduled call: auto-callback (Missing phone)",
        description: "Missing phone",
        deal: {
          id: "deal_2",
          title: "Leaking tap",
          workspaceId: "ws_1",
          contact: { id: "contact_2", name: "John", phone: null },
        },
      },
    ]);

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/cron/scheduled-calls", {
        headers: { authorization: "Bearer secret" },
      }),
    );

    expect(response.status).toBe(200);
    expect(hoisted.initiateOutboundCall).toHaveBeenCalledWith({
      workspaceId: "ws_1",
      contactPhone: "+61400000000",
      contactName: "Jane",
      dealId: "deal_1",
      reason: "Call about quote",
    });
    expect(hoisted.db.task.update).toHaveBeenCalledTimes(2);
    expect(hoisted.recordCallbackEvent).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        eventType: "callback_dispatched",
        payload: expect.objectContaining({
          workspaceId: "ws_1",
          contactId: "contact_1",
          contactPhone: "+61400000000",
          callbackKind: "automatic",
          dispatchMode: "scheduled",
        }),
      }),
    );
    expect(hoisted.recordCallbackEvent).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        eventType: "callback_dispatch_failed",
        error: "Missing workspace or contact phone",
        payload: expect.objectContaining({
          workspaceId: "ws_1",
          contactId: "contact_2",
          callbackKind: "automatic",
        }),
      }),
    );
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        success: true,
        callsChecked: 2,
        results: [
          { taskId: "task_1", success: true },
          { taskId: "task_2", success: false, error: "Missing workspace or contact phone" },
        ],
      }),
    );
  });

  it("escalates an auto-callback task when the outbound call fails", async () => {
    hoisted.db.task.findMany.mockResolvedValue([
      {
        id: "task_fail",
        title: "Scheduled call: auto-callback (Call about quote)",
        description: "Call about quote",
        deal: {
          id: "deal_1",
          title: "Blocked drain",
          workspaceId: "ws_1",
          contact: { id: "contact_1", name: "Jane", phone: "+61400000000" },
        },
      },
    ]);
    hoisted.initiateOutboundCall.mockRejectedValueOnce(new Error("trunk down"));

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/cron/scheduled-calls", {
        headers: { authorization: "Bearer secret" },
      }),
    );

    expect(response.status).toBe(200);
    // Failed attempt is marked complete so the 5-min sweep won't loop on it.
    expect(hoisted.db.task.update).toHaveBeenCalledWith({
      where: { id: "task_fail" },
      data: expect.objectContaining({ completed: true }),
    });
    expect(hoisted.handleCallbackDispatchFailure).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: "ws_1",
        dealId: "deal_1",
        contactPhone: "+61400000000",
        callbackKind: "automatic",
        error: "trunk down",
      }),
    );
  });

  it("returns 500 when the scheduled-call query fails", async () => {
    hoisted.db.task.findMany.mockRejectedValue(new Error("db offline"));

    const response = await GET(
      new NextRequest("https://earlymark.ai/api/cron/scheduled-calls", {
        headers: { authorization: "Bearer secret" },
      }),
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({
      error: "Failed to process scheduled calls",
      details: "db offline",
    });
  });
});
