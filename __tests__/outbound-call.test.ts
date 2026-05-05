import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  db: {
    workspace: {
      findUnique: vi.fn(),
    },
    actionExecution: {
      create: vi.fn(),
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));

describe("initiateOutboundCall", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = {
      ...originalEnv,
      NODE_ENV: "production",
    };

    hoisted.db.workspace.findUnique.mockResolvedValue({
      name: "Acme Plumbing",
      twilioPhoneNumber: "0400000000",
      twilioPhoneNumberNormalized: "+61400000000",
    });
    hoisted.db.actionExecution.updateMany.mockResolvedValue({ count: 0 });
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("queues the outbound request and waits for the worker result", async () => {
    hoisted.db.actionExecution.create.mockResolvedValue({});
    hoisted.db.actionExecution.findUnique.mockResolvedValueOnce({
      status: "COMPLETED",
      result: {
        roomName: "room_123",
        normalizedPhone: "+61412345678",
        resolvedTrunkId: "ST_123",
        callerNumber: "+61400000000",
        transport: "worker_queue",
      },
      error: null,
    });

    const { initiateOutboundCall } = await import("@/lib/outbound-call");
    const result = await initiateOutboundCall({
      workspaceId: "ws_1",
      contactPhone: "0412345678",
      contactName: "Alex",
      dealId: "deal_1",
      reason: "Call now",
    });

    expect(hoisted.db.actionExecution.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actionType: "voice_outbound_call",
        status: "IN_PROGRESS",
      }),
    });
    expect(result).toEqual({
      roomName: "room_123",
      normalizedPhone: "+61412345678",
      resolvedTrunkId: "ST_123",
      callerNumber: "+61400000000",
      transport: "worker_queue",
    });
  });

  it("throws the worker failure back to the caller", async () => {
    hoisted.db.actionExecution.create.mockResolvedValue({});
    hoisted.db.actionExecution.findUnique.mockResolvedValueOnce({
      status: "FAILED",
      result: null,
      error: "No outbound SIP trunk available for this workspace.",
    });

    const { initiateOutboundCall } = await import("@/lib/outbound-call");

    await expect(
      initiateOutboundCall({
        workspaceId: "ws_1",
        contactPhone: "0412345678",
      }),
    ).rejects.toThrow("No outbound SIP trunk available for this workspace.");
  });
});
