import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  buildQueuedOutboundCallEnvelope,
  VOICE_OUTBOUND_CALL_ACTION_TYPE,
} from "@/lib/outbound-call-queue";

const hoisted = vi.hoisted(() => ({
  isVoiceAgentSecretAuthorized: vi.fn(),
  db: {
    actionExecution: {
      findMany: vi.fn(),
      updateMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/voice-agent-auth", () => ({
  isVoiceAgentSecretAuthorized: hoisted.isVoiceAgentSecretAuthorized,
}));

vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));

import { POST } from "@/app/api/internal/voice-outbound-queue/route";

function makeRequest(body: Record<string, unknown>) {
  return new NextRequest("https://www.earlymark.ai/api/internal/voice-outbound-queue", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-voice-agent-secret": "secret",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/internal/voice-outbound-queue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.isVoiceAgentSecretAuthorized.mockReturnValue(true);
  });

  it("rejects unauthorized callers", async () => {
    hoisted.isVoiceAgentSecretAuthorized.mockReturnValue(false);

    const response = await POST(makeRequest({ action: "claim" }));

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("claims the oldest queued outbound call", async () => {
    hoisted.db.actionExecution.findMany.mockResolvedValue([
      {
        idempotencyKey: "key_1",
        result: buildQueuedOutboundCallEnvelope({
          request: {
            workspaceId: "ws_1",
            workspaceName: "Acme",
            workspaceCallerNumber: "+61400000000",
            contactPhone: "+61412345678",
            contactName: "Alex",
            dealId: "deal_1",
            reason: "Call now",
          },
        }),
        updatedAt: new Date("2026-04-29T01:00:00.000Z"),
      },
    ]);
    hoisted.db.actionExecution.updateMany.mockResolvedValue({ count: 1 });

    const response = await POST(makeRequest({
      action: "claim",
      workerRole: "tracey-customer-agent",
      hostId: "host_1",
    }));

    expect(hoisted.db.actionExecution.findMany).toHaveBeenCalledWith({
      where: {
        actionType: VOICE_OUTBOUND_CALL_ACTION_TYPE,
        status: "IN_PROGRESS",
      },
      orderBy: { createdAt: "asc" },
      take: 10,
      select: {
        idempotencyKey: true,
        result: true,
        updatedAt: true,
      },
    });
    expect(hoisted.db.actionExecution.updateMany).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      claimed: true,
      idempotencyKey: "key_1",
      request: {
        workspaceId: "ws_1",
        workspaceName: "Acme",
        workspaceCallerNumber: "+61400000000",
        contactPhone: "+61412345678",
        contactName: "Alex",
        dealId: "deal_1",
        reason: "Call now",
      },
    });
  });

  it("marks a queued outbound call as completed", async () => {
    hoisted.db.actionExecution.findUnique.mockResolvedValue({
      status: "IN_PROGRESS",
      result: buildQueuedOutboundCallEnvelope({
        request: {
          workspaceId: "ws_1",
          workspaceName: "Acme",
          workspaceCallerNumber: "+61400000000",
          contactPhone: "+61412345678",
          contactName: "Alex",
          dealId: "deal_1",
          reason: "Call now",
        },
      }),
    });
    hoisted.db.actionExecution.update.mockResolvedValue({});

    const response = await POST(makeRequest({
      action: "complete",
      idempotencyKey: "key_1",
      success: true,
      result: {
        roomName: "room_123",
        normalizedPhone: "+61412345678",
        resolvedTrunkId: "ST_123",
        callerNumber: "+61400000000",
        transport: "worker_queue",
      },
    }));

    expect(hoisted.db.actionExecution.update).toHaveBeenCalledWith({
      where: { idempotencyKey: "key_1" },
      data: {
        status: "COMPLETED",
        result: {
          roomName: "room_123",
          normalizedPhone: "+61412345678",
          resolvedTrunkId: "ST_123",
          callerNumber: "+61400000000",
          transport: "worker_queue",
        },
        error: null,
      },
    });
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
