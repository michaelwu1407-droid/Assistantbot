import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  db: {
    voiceCall: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
    task: {
      create: vi.fn(),
    },
    activity: {
      create: vi.fn(),
    },
  },
  findContactByPhone: vi.fn(),
  findWorkspaceByTwilioNumber: vi.fn(),
  isVoiceAgentSecretAuthorized: vi.fn(),
  syncVoiceCallToCRM: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: hoisted.db,
}));

vi.mock("@/lib/workspace-routing", () => ({
  findContactByPhone: hoisted.findContactByPhone,
  findWorkspaceByTwilioNumber: hoisted.findWorkspaceByTwilioNumber,
}));

vi.mock("@/lib/voice-agent-auth", () => ({
  isVoiceAgentSecretAuthorized: hoisted.isVoiceAgentSecretAuthorized,
}));

vi.mock("@/lib/post-call-sync", () => ({
  syncVoiceCallToCRM: hoisted.syncVoiceCallToCRM,
}));

import { POST } from "@/app/api/internal/voice-calls/route";

describe("POST /api/internal/voice-calls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.isVoiceAgentSecretAuthorized.mockReturnValue(true);
    hoisted.db.voiceCall.findUnique.mockResolvedValue(null);
    hoisted.db.voiceCall.upsert.mockResolvedValue(undefined);
    hoisted.db.task.create.mockResolvedValue(undefined);
    hoisted.db.activity.create.mockResolvedValue(undefined);
    hoisted.findWorkspaceByTwilioNumber.mockResolvedValue({ id: "ws_1" });
    hoisted.findContactByPhone.mockResolvedValue({ id: "contact_1" });
    hoisted.syncVoiceCallToCRM.mockResolvedValue({
      contactId: "contact_1",
      dealId: "deal_1",
      contactCreated: false,
      dealCreated: true,
      skipped: false,
    });
  });

  function makePayload(overrides: Record<string, unknown> = {}) {
    return {
      callId: "call_1",
      source: "livekit",
      callType: "normal",
      roomName: "room_1",
      participantIdentity: "caller_1",
      callerPhone: "+61400000000",
      calledPhone: "+61485010634",
      callerName: "Jane Citizen",
      businessName: "Citizen Plumbing",
      transcriptTurns: [{ role: "user", text: "Need help today", createdAt: 1710000000000 }],
      transcriptText: "Caller: Need help today",
      startedAt: "2026-04-27T10:00:00.000Z",
      endedAt: "2026-04-27T10:05:00.000Z",
      ...overrides,
    };
  }

  it("rejects unauthorized callers", async () => {
    hoisted.isVoiceAgentSecretAuthorized.mockReturnValue(false);

    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-calls", {
        method: "POST",
        body: JSON.stringify(makePayload()),
      }),
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("rejects invalid payloads", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-calls", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify({ callId: "" }),
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBeTruthy();
  });

  it("persists a normal call and runs CRM sync", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-calls", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify(makePayload()),
      }),
    );

    expect(response.status).toBe(200);
    expect(hoisted.db.voiceCall.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { callId: "call_1" },
        create: expect.objectContaining({
          workspaceId: "ws_1",
          contactId: "contact_1",
          summary: expect.stringContaining("Jane Citizen completed a normal call."),
        }),
      }),
    );
    expect(hoisted.syncVoiceCallToCRM).toHaveBeenCalledWith(
      "ws_1",
      expect.objectContaining({
        callId: "call_1",
        urgentEscalationReason: null,
      }),
    );
    await expect(response.json()).resolves.toEqual({
      success: true,
      crmSync: {
        contactId: "contact_1",
        dealId: "deal_1",
        contactCreated: false,
        dealCreated: true,
        skipped: false,
      },
    });
  });

  it("creates an urgent callback task for new escalated calls", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-calls", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify(
          makePayload({
            metadata: {
              urgentEscalation: {
                toolUsed: true,
                payloads: [{ reason: "Pipe burst" }],
              },
            },
          }),
        ),
      }),
    );

    expect(response.status).toBe(200);
    expect(hoisted.db.task.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        title: "Urgent callback: Jane Citizen",
        description: expect.stringContaining("Reason: Pipe burst"),
        contactId: "contact_1",
        dealId: "deal_1",
      }),
    });
  });

  it("logs activity when CRM sync is skipped", async () => {
    hoisted.syncVoiceCallToCRM.mockResolvedValue({
      contactId: null,
      dealId: null,
      contactCreated: false,
      dealCreated: false,
      skipped: true,
    });

    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-calls", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify(makePayload()),
      }),
    );

    expect(response.status).toBe(200);
    expect(hoisted.db.activity.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: "CALL",
        title: "Voice call handled by Tracey",
        contactId: "contact_1",
      }),
    });
  });
});
