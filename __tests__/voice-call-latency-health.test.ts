import { beforeEach, describe, expect, it, vi } from "vitest";

const db = vi.hoisted(() => ({
  voiceCall: {
    findMany: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  db,
}));

import { getVoiceLatencyHealth } from "@/lib/voice-call-latency-health";

describe("getVoiceLatencyHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps healthy inbound demo latency healthy when only TTS TTFB is around 1.0s but turn-start stays healthy", async () => {
    db.voiceCall.findMany.mockResolvedValue([
      {
        callId: "inbound-1",
        callType: "inbound_demo",
        roomName: "room-1",
        createdAt: new Date("2026-04-07T08:00:00.000Z"),
        latency: {
          llmTtftAvgMs: 220,
          ttsTtfbAvgMs: 1020,
          totalTurnStartAvgMs: 980,
          firstTurnStartMs: 240,
        },
        metadata: {
          ttsVoiceId: "voice-id",
          ttsLanguage: "en-AU",
        },
      },
      {
        callId: "inbound-2",
        callType: "inbound_demo",
        roomName: "room-2",
        createdAt: new Date("2026-04-07T08:10:00.000Z"),
        latency: {
          llmTtftAvgMs: 210,
          ttsTtfbAvgMs: 1040,
          totalTurnStartAvgMs: 1010,
          firstTurnStartMs: 235,
        },
        metadata: {
          ttsVoiceId: "voice-id",
          ttsLanguage: "en-AU",
        },
      },
      {
        callId: "inbound-3",
        callType: "inbound_demo",
        roomName: "room-3",
        createdAt: new Date("2026-04-07T08:20:00.000Z"),
        latency: {
          llmTtftAvgMs: 230,
          ttsTtfbAvgMs: 1030,
          totalTurnStartAvgMs: 990,
          firstTurnStartMs: 250,
        },
        metadata: {
          ttsVoiceId: "voice-id",
          ttsLanguage: "en-AU",
        },
      },
    ]);

    const result = await getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 });
    const inboundDemo = result.scopes.find((scope) => scope.surface === "inbound_demo");

    expect(inboundDemo?.status).toBe("healthy");
    expect(inboundDemo?.warnings).toEqual([]);
    expect(result.status).toBe("healthy");
  });

  it("still degrades inbound demo latency when TTS first-byte time is materially above the PSTN threshold", async () => {
    db.voiceCall.findMany.mockResolvedValue([
      {
        callId: "inbound-1",
        callType: "inbound_demo",
        roomName: "room-1",
        createdAt: new Date("2026-04-07T08:00:00.000Z"),
        latency: {
          llmTtftAvgMs: 220,
          ttsTtfbAvgMs: 1260,
          totalTurnStartAvgMs: 1240,
          firstTurnStartMs: 260,
        },
        metadata: {},
      },
      {
        callId: "inbound-2",
        callType: "inbound_demo",
        roomName: "room-2",
        createdAt: new Date("2026-04-07T08:10:00.000Z"),
        latency: {
          llmTtftAvgMs: 240,
          ttsTtfbAvgMs: 1280,
          totalTurnStartAvgMs: 1270,
          firstTurnStartMs: 275,
        },
        metadata: {},
      },
      {
        callId: "inbound-3",
        callType: "inbound_demo",
        roomName: "room-3",
        createdAt: new Date("2026-04-07T08:20:00.000Z"),
        latency: {
          llmTtftAvgMs: 230,
          ttsTtfbAvgMs: 1275,
          totalTurnStartAvgMs: 1265,
          firstTurnStartMs: 270,
        },
        metadata: {},
      },
    ]);

    const result = await getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 });
    const inboundDemo = result.scopes.find((scope) => scope.surface === "inbound_demo");

    expect(inboundDemo?.status).toBe("degraded");
    expect(inboundDemo?.warnings).toContain("Average TTS TTFB is 1272ms (threshold 1100ms).");
    expect(result.status).toBe("degraded");
  });

  it("keeps inbound demo latency healthy when speculative heads keep perceived start fast", async () => {
    db.voiceCall.findMany.mockResolvedValue([
      {
        callId: "inbound-fast-1",
        callType: "inbound_demo",
        roomName: "room-fast-1",
        createdAt: new Date("2026-04-07T09:00:00.000Z"),
        latency: {
          llmTtftAvgMs: 140,
          ttsTtfbAvgMs: 1230,
          totalTurnStartAvgMs: 1010,
          firstTurnStartMs: 150,
        },
        metadata: {},
      },
      {
        callId: "inbound-fast-2",
        callType: "inbound_demo",
        roomName: "room-fast-2",
        createdAt: new Date("2026-04-07T09:10:00.000Z"),
        latency: {
          llmTtftAvgMs: 135,
          ttsTtfbAvgMs: 1210,
          totalTurnStartAvgMs: 980,
          firstTurnStartMs: 180,
        },
        metadata: {},
      },
      {
        callId: "inbound-fast-3",
        callType: "inbound_demo",
        roomName: "room-fast-3",
        createdAt: new Date("2026-04-07T09:20:00.000Z"),
        latency: {
          llmTtftAvgMs: 145,
          ttsTtfbAvgMs: 1215,
          totalTurnStartAvgMs: 1000,
          firstTurnStartMs: 160,
        },
        metadata: {},
      },
    ]);

    const result = await getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 });
    const inboundDemo = result.scopes.find((scope) => scope.surface === "inbound_demo");

    expect(inboundDemo?.status).toBe("healthy");
    expect(inboundDemo?.warnings).toEqual([]);
    expect(inboundDemo?.averages.firstTurnStartMs).toBe(163);
    expect(result.status).toBe("healthy");
  });

  it("tolerates one slow first-turn outlier when the majority of inbound demo calls stay fast", async () => {
    db.voiceCall.findMany.mockResolvedValue([
      {
        callId: "inbound-majority-fast-1",
        callType: "inbound_demo",
        roomName: "room-majority-fast-1",
        createdAt: new Date("2026-04-07T10:00:00.000Z"),
        latency: {
          llmTtftAvgMs: 121,
          ttsTtfbAvgMs: 1049,
          totalTurnStartAvgMs: 645,
          firstTurnStartMs: 1179,
        },
        metadata: {},
      },
      {
        callId: "inbound-majority-fast-2",
        callType: "inbound_demo",
        roomName: "room-majority-fast-2",
        createdAt: new Date("2026-04-07T10:10:00.000Z"),
        latency: {
          llmTtftAvgMs: 156,
          ttsTtfbAvgMs: 1231,
          totalTurnStartAvgMs: 566,
          firstTurnStartMs: 249,
        },
        metadata: {},
      },
      {
        callId: "inbound-majority-fast-3",
        callType: "inbound_demo",
        roomName: "room-majority-fast-3",
        createdAt: new Date("2026-04-07T10:20:00.000Z"),
        latency: {
          llmTtftAvgMs: 124,
          ttsTtfbAvgMs: 1233,
          totalTurnStartAvgMs: 1018,
          firstTurnStartMs: 145,
        },
        metadata: {},
      },
      {
        callId: "inbound-majority-fast-4",
        callType: "inbound_demo",
        roomName: "room-majority-fast-4",
        createdAt: new Date("2026-04-07T10:30:00.000Z"),
        latency: {
          llmTtftAvgMs: 159,
          ttsTtfbAvgMs: 1208,
          totalTurnStartAvgMs: 911,
          firstTurnStartMs: 208,
        },
        metadata: {},
      },
      {
        callId: "inbound-majority-fast-5",
        callType: "inbound_demo",
        roomName: "room-majority-fast-5",
        createdAt: new Date("2026-04-07T10:40:00.000Z"),
        latency: {
          llmTtftAvgMs: 131,
          ttsTtfbAvgMs: 1214,
          totalTurnStartAvgMs: 1009,
          firstTurnStartMs: 160,
        },
        metadata: {},
      },
    ]);

    const result = await getVoiceLatencyHealth({ lookbackMinutes: 60, limitPerSurface: 20 });
    const inboundDemo = result.scopes.find((scope) => scope.surface === "inbound_demo");

    expect(inboundDemo?.status).toBe("healthy");
    expect(inboundDemo?.warnings).toEqual([]);
    expect(inboundDemo?.averages.firstTurnStartMs).toBe(388);
    expect(result.status).toBe("healthy");
  });
});
