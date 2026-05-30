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
  recordCallbackEvent: vi.fn(),
  runIdempotent: vi.fn(),
  recordLatencyMetric: vi.fn(),
}));

vi.mock("@/lib/idempotency", () => ({ runIdempotent: hoisted.runIdempotent }));

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
vi.mock("@/lib/callback-events", () => ({
  recordCallbackEvent: hoisted.recordCallbackEvent,
}));
vi.mock("@/lib/telemetry/latency", async (importOriginal) => {
  const real = await importOriginal<typeof import("@/lib/telemetry/latency")>();
  return { ...real, recordLatencyMetric: hoisted.recordLatencyMetric };
});

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
    hoisted.recordCallbackEvent.mockResolvedValue(undefined);
    hoisted.runIdempotent.mockImplementation(async ({ resultFactory }: { resultFactory: () => Promise<unknown> }) => {
      const result = await resultFactory();
      return { idempotencyKey: "k", created: true, result };
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
      duplicate: false,
      crmSync: {
        contactId: "contact_1",
        dealId: "deal_1",
        contactCreated: false,
        dealCreated: true,
        skipped: false,
      },
    });
  });

  it("on duplicate webhook delivery, returns the cached crmSync result and runs no side effects", async () => {
    hoisted.runIdempotent.mockResolvedValueOnce({
      idempotencyKey: "k",
      created: false,
      result: {
        crmSync: { contactId: "contact_1", dealId: "deal_1", contactCreated: false, dealCreated: false, skipped: false },
      },
    });

    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-calls", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify(makePayload({ callId: "call_dup" })),
      }),
    );

    expect(response.status).toBe(200);
    expect(hoisted.syncVoiceCallToCRM).not.toHaveBeenCalled();
    expect(hoisted.recordCallbackEvent).not.toHaveBeenCalled();
    expect(hoisted.db.task.create).not.toHaveBeenCalled();
    expect(hoisted.db.activity.create).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ duplicate: true });
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

  it("persists outbound callbacks separately and records the callback outcome without CRM sync", async () => {
    const response = await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-calls", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify(
          makePayload({
            transcriptTurns: [],
            transcriptText: "",
            metadata: {
              roomMetadata: {
                outbound: true,
                dealId: "deal_1",
                reason: "manual_recall:inbox",
              },
              sipAttributes: {
                "sip.call_status": "no_answer",
              },
              providerCallIds: {
                twilioCallSid: "CA123",
              },
            },
          }),
        ),
      }),
    );

    expect(response.status).toBe(200);
    expect(hoisted.db.voiceCall.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          callType: "outbound_callback",
          dealId: "deal_1",
          summary: "Tracey called Jane Citizen, but nobody picked up.",
        }),
        update: expect.objectContaining({
          callType: "outbound_callback",
          dealId: "deal_1",
        }),
      }),
    );
    expect(hoisted.syncVoiceCallToCRM).not.toHaveBeenCalled();
    expect(hoisted.db.activity.create).not.toHaveBeenCalled();
    expect(hoisted.recordCallbackEvent).toHaveBeenCalledWith({
      eventType: "callback_call_finished",
      payload: expect.objectContaining({
        workspaceId: "ws_1",
        contactId: "contact_1",
        dealId: "deal_1",
        callbackKind: "manual",
        callStatus: "no_answer",
        providerCallSid: "CA123",
      }),
    });
  });

  it("records per-provider latency metrics when latency blob is present", async () => {
    const latency = {
      sttAvgMs: 120,
      ttsAvgMs: 95,
      ttsTtfbAvgMs: 55,
      llmAvgMs: 310,
      llmByProvider: {
        groq: { turns: 3, llmAvgMs: 280, llmP95Ms: 350, llmTtftAvgMs: 130, llmTtftP95Ms: 190 },
        deepinfra: { turns: 1, llmAvgMs: 410, llmP95Ms: 410, llmTtftAvgMs: 200, llmTtftP95Ms: 200 },
      },
    };

    await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-calls", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify(makePayload({ latency })),
      }),
    );

    const calls = hoisted.recordLatencyMetric.mock.calls as [string, number][];
    const recorded = Object.fromEntries(calls.map(([k, v]) => [k, v]));
    expect(recorded["voice.stt_ms"]).toBe(120);
    expect(recorded["voice.tts_ms"]).toBe(95);
    expect(recorded["voice.tts.ttfb_ms"]).toBe(55);
    expect(recorded["voice.llm.groq_ms"]).toBe(280);
    expect(recorded["voice.llm.groq.ttft_ms"]).toBe(130);
    expect(recorded["voice.llm.deepinfra_ms"]).toBe(410);
    expect(recorded["voice.llm.deepinfra.ttft_ms"]).toBe(200);
  });

  it("skips latency recording when no latency blob is present", async () => {
    await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-calls", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify(makePayload()),
      }),
    );

    expect(hoisted.recordLatencyMetric).not.toHaveBeenCalled();
  });

  it("skips provider metrics when a provider had zero turns", async () => {
    const latency = {
      sttAvgMs: 100,
      llmByProvider: {
        groq: { turns: 2, llmAvgMs: 250, llmTtftAvgMs: 110 },
        deepinfra: { turns: 0, llmAvgMs: 0, llmTtftAvgMs: 0 },
      },
    };

    await POST(
      new NextRequest("https://earlymark.ai/api/internal/voice-calls", {
        method: "POST",
        headers: { "x-voice-agent-secret": "secret" },
        body: JSON.stringify(makePayload({ latency })),
      }),
    );

    const calls = hoisted.recordLatencyMetric.mock.calls as [string, number][];
    const keys = calls.map(([k]) => k);
    expect(keys).not.toContain("voice.llm.deepinfra_ms");
    expect(keys).not.toContain("voice.llm.deepinfra.ttft_ms");
    expect(keys).toContain("voice.llm.groq_ms");
  });
});
