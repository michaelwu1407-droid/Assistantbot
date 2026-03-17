import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, getTwilioVoiceCallHealth } = vi.hoisted(() => ({
  db: {
    workspace: {
      findMany: vi.fn(),
    },
    voiceCall: {
      findMany: vi.fn(),
    },
    webhookEvent: {
      findMany: vi.fn(),
    },
  },
  getTwilioVoiceCallHealth: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db,
}));

vi.mock("@/lib/twilio-voice-call-health", () => ({
  getTwilioVoiceCallHealth,
}));

import { getPassiveProductionHealth } from "@/lib/passive-production-health";

function isoHoursAgo(hours: number) {
  return new Date(Date.now() - hours * 60 * 60 * 1000);
}

function createTwilioScope(scopeId: string, status: "healthy" | "degraded" | "unhealthy") {
  return {
    scopeId,
    label: scopeId,
    surface: scopeId === "earlymark" ? "inbound_demo" : "normal",
    status,
    summary: status === "healthy" ? "healthy scope" : `${scopeId} scope ${status}`,
    warnings: status === "healthy" ? [] : [`${scopeId} scope ${status}`],
    recentCalls: [],
    failingCalls: status === "unhealthy"
      ? [
          {
            sid: `CA_${scopeId}`,
            scopeId,
            label: scopeId,
            surface: scopeId === "earlymark" ? "inbound_demo" : "normal",
            from: "+61400000000",
            to: "+61485010634",
            direction: "trunking-originating",
            status: "failed",
            startTime: isoHoursAgo(1).toISOString(),
            endTime: isoHoursAgo(1).toISOString(),
          },
        ]
      : [],
  };
}

describe("getPassiveProductionHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    db.workspace.findMany.mockResolvedValue([]);
    db.voiceCall.findMany.mockResolvedValue([]);
    db.webhookEvent.findMany.mockResolvedValue([]);
    getTwilioVoiceCallHealth.mockResolvedValue({
      status: "healthy",
      summary: "Recent Twilio voice call activity looks healthy across Tracey surfaces",
      warnings: [],
      lookbackMinutes: 360,
      scopes: [createTwilioScope("earlymark", "healthy")],
      failingCalls: [],
    });
  });

  it("keeps global status healthy when low-traffic customer workspaces are unknown but Earlymark is healthy", async () => {
    db.workspace.findMany.mockResolvedValue([
      {
        id: "ws_active",
        name: "Alpha Plumbing",
        voiceEnabled: true,
        twilioPhoneNumber: "+61400000001",
        inboundEmail: "alpha@inbound.earlymark.ai",
        inboundEmailAlias: "alpha",
      },
      {
        id: "ws_idle",
        name: "Bravo Electrical",
        voiceEnabled: true,
        twilioPhoneNumber: "+61400000002",
        inboundEmail: null,
        inboundEmailAlias: null,
      },
    ]);
    db.voiceCall.findMany.mockResolvedValue([
      {
        workspaceId: null,
        callType: "inbound_demo",
        startedAt: isoHoursAgo(12),
      },
    ]);
    db.webhookEvent.findMany
      .mockResolvedValueOnce([
        {
          status: "success",
          createdAt: isoHoursAgo(12),
          payload: { workspaceId: "ws_active" },
        },
      ])
      .mockResolvedValueOnce([]);
    getTwilioVoiceCallHealth.mockResolvedValue({
      status: "healthy",
      summary: "healthy",
      warnings: [],
      lookbackMinutes: 360,
      scopes: [
        createTwilioScope("earlymark", "healthy"),
        createTwilioScope("ws_active", "healthy"),
        createTwilioScope("ws_idle", "healthy"),
      ],
      failingCalls: [],
    });

    const result = await getPassiveProductionHealth();

    expect(result.status).toBe("healthy");
    expect(result.voice.status).toBe("healthy");
    expect(result.sms.status).toBe("healthy");
    expect(result.email.status).toBe("healthy");
    expect(result.unknownWorkspaceCount).toBe(2);
    expect(result.workspaceRows.find((row) => row.workspaceId === "ws_active")?.overallClassification).toBe("unknown");
    expect(result.workspaceRows.find((row) => row.workspaceId === "ws_active")?.contributesToGlobalRollup).toBe(false);
    expect(result.workspaceRows.find((row) => row.workspaceId === "ws_active")?.sms.classification).toBe("unknown");
  });

  it("marks global voice unhealthy when an active customer workspace has real recent voice failures", async () => {
    db.workspace.findMany.mockResolvedValue([
      {
        id: "ws_active",
        name: "Alpha Plumbing",
        voiceEnabled: true,
        twilioPhoneNumber: "+61400000001",
        inboundEmail: null,
        inboundEmailAlias: null,
      },
    ]);
    db.voiceCall.findMany.mockResolvedValue([
      {
        workspaceId: null,
        callType: "inbound_demo",
        startedAt: isoHoursAgo(2),
      },
      {
        workspaceId: "ws_active",
        callType: "normal",
        startedAt: isoHoursAgo(2),
      },
    ]);
    db.webhookEvent.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);
    getTwilioVoiceCallHealth.mockResolvedValue({
      status: "unhealthy",
      summary: "Recent Twilio voice call failures detected",
      warnings: ["Recent Twilio voice call failures detected"],
      lookbackMinutes: 360,
      scopes: [
        createTwilioScope("earlymark", "healthy"),
        createTwilioScope("ws_active", "unhealthy"),
      ],
      failingCalls: [],
    });

    const result = await getPassiveProductionHealth();

    expect(result.status).toBe("unhealthy");
    expect(result.voice.status).toBe("unhealthy");
    expect(result.voice.failureWorkspaceCount).toBe(1);
    expect(result.unhealthyActiveWorkspaceCount).toBe(1);
    expect(result.workspaceRows[0]?.contributesToGlobalRollup).toBe(true);
    expect(result.workspaceRows[0]?.voice.classification).toBe("failure");
  });

  it("marks global email unhealthy when recent unscoped inbound processing failures are present", async () => {
    db.voiceCall.findMany.mockResolvedValue([
      {
        workspaceId: null,
        callType: "inbound_demo",
        startedAt: isoHoursAgo(2),
      },
    ]);
    db.webhookEvent.findMany
      .mockResolvedValueOnce([
        {
          status: "error",
          createdAt: isoHoursAgo(1),
          payload: null,
        },
      ])
      .mockResolvedValueOnce([]);

    const result = await getPassiveProductionHealth();

    expect(result.status).toBe("unhealthy");
    expect(result.email.status).toBe("unhealthy");
    expect(result.email.recentInboundEmailFailureCount).toBe(1);
  });

  it("marks SMS unhealthy when active customer workspace SMS processing failures are present", async () => {
    db.workspace.findMany.mockResolvedValue([
      {
        id: "ws_sms",
        name: "SMS Plumbing",
        voiceEnabled: true,
        twilioPhoneNumber: "+61400000009",
        inboundEmail: null,
        inboundEmailAlias: null,
      },
    ]);
    db.voiceCall.findMany.mockResolvedValue([
      {
        workspaceId: "ws_sms",
        callType: "normal",
        startedAt: isoHoursAgo(3),
      },
    ]);
    db.webhookEvent.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          eventType: "sms.reply",
          status: "error",
          createdAt: isoHoursAgo(1),
          payload: { workspaceId: "ws_sms" },
        },
      ]);
    getTwilioVoiceCallHealth.mockResolvedValue({
      status: "healthy",
      summary: "healthy",
      warnings: [],
      lookbackMinutes: 360,
      scopes: [
        createTwilioScope("earlymark", "healthy"),
        createTwilioScope("ws_sms", "healthy"),
      ],
      failingCalls: [],
    });

    const result = await getPassiveProductionHealth();

    expect(result.status).toBe("unhealthy");
    expect(result.sms.status).toBe("unhealthy");
    expect(result.sms.failureWorkspaceCount).toBe(1);
    expect(result.workspaceRows[0]?.sms.classification).toBe("failure");
    expect(result.workspaceRows[0]?.contributesToGlobalRollup).toBe(true);
  });
});
