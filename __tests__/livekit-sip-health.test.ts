import { beforeEach, describe, expect, it, vi } from "vitest";

const { listSipInboundTrunk, listSipOutboundTrunk, listSipDispatchRule } = vi.hoisted(() => ({
  listSipInboundTrunk: vi.fn(),
  listSipOutboundTrunk: vi.fn(),
  listSipDispatchRule: vi.fn(),
}));

const { getLatestVoiceWorkerSnapshots } = vi.hoisted(() => ({
  getLatestVoiceWorkerSnapshots: vi.fn(),
}));

vi.mock("livekit-server-sdk", () => ({
  SipClient: class {
    listSipInboundTrunk = listSipInboundTrunk;
    listSipOutboundTrunk = listSipOutboundTrunk;
    listSipDispatchRule = listSipDispatchRule;
  },
}));

vi.mock("@/lib/earlymark-inbound-config", () => ({
  getKnownEarlymarkInboundNumbers: vi.fn(() => ["+61485010634"]),
}));

vi.mock("@/lib/voice-fleet", () => ({
  getLatestVoiceWorkerSnapshots,
}));

import { getLivekitSipHealth } from "@/lib/livekit-sip-health";

describe("getLivekitSipHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getLatestVoiceWorkerSnapshots.mockResolvedValue([]);
    process.env.LIVEKIT_URL = "wss://live.earlymark.ai";
    process.env.LIVEKIT_API_KEY = "test-key";
    process.env.LIVEKIT_API_SECRET = "test-secret";
    process.env.LIVEKIT_SIP_TRUNK_ID = "ST_outbound";
    process.env.EARLYMARK_INBOUND_PHONE_NUMBER = "+61485010634";
  });

  it("reports healthy when an inbound trunk covers the Earlymark number and a dispatch rule exists", async () => {
    listSipInboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_123",
        name: "Earlymark inbound",
        numbers: ["+61485010634"],
      },
    ]);
    listSipOutboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_outbound",
        name: "Earlymark outbound",
        numbers: ["+61485010634"],
        address: "earlymark-outbound.pstn.sydney.twilio.com",
      },
    ]);
    listSipDispatchRule.mockResolvedValue([
      {
        sipDispatchRuleId: "SDR_123",
        name: "Earlymark inbound dispatch",
        trunkIds: ["ST_123"],
        rule: {
          dispatchRuleIndividual: {
            roomPrefix: "earlymark-inbound-",
          },
        },
        attributes: { callType: "inbound_demo" },
      },
    ]);

    const result = await getLivekitSipHealth();

    expect(result.status).toBe("healthy");
    expect(result.missingInboundNumbers).toEqual([]);
    expect(result.dispatchRuleCount).toBe(1);
    expect(result.demoOutbound.status).toBe("healthy");
    expect(result.demoOutbound.resolvedTrunkId).toBe("ST_outbound");
  });

  it("prefers fresh worker-reported LiveKit SIP health over the web-side probe", async () => {
    getLatestVoiceWorkerSnapshots.mockResolvedValue([
      {
        hostId: "oci-primary",
        summary: {
          livekitSip: {
            status: "healthy",
            summary: "Worker-reported LiveKit SIP inbound and outbound demo routing are configured.",
            warnings: [],
            checkedAt: "2026-04-29T01:00:00.000Z",
            livekitUrl: "http://127.0.0.1:7880",
            inboundTrunkCount: 1,
            dispatchRuleCount: 1,
            expectedInboundNumbers: ["+61485010634"],
            missingInboundNumbers: [],
            inboundTrunks: [
              {
                sipTrunkId: "ST_123",
                name: "Earlymark inbound",
                numbers: ["+61485010634"],
              },
            ],
            outboundTrunkCount: 1,
            outboundTrunks: [
              {
                sipTrunkId: "ST_outbound",
                name: "Earlymark outbound",
                numbers: ["+61485010634"],
                address: "earlymark-outbound.pstn.sydney.twilio.com",
              },
            ],
            demoOutbound: {
              status: "healthy",
              summary: "LiveKit outbound SIP trunk is ready for demo calls.",
              warnings: [],
              configuredTrunkId: "ST_outbound",
              resolvedTrunkId: "ST_outbound",
              configuredTrunkMatched: true,
              callerNumber: "+61485010634",
            },
            dispatchRules: [
              {
                sipDispatchRuleId: "SDR_123",
                name: "Earlymark inbound dispatch",
                trunkIds: ["ST_123"],
                roomPrefix: "earlymark-inbound-",
                attributes: { callType: "inbound_demo" },
              },
            ],
            source: "worker_control",
          },
        },
      },
    ]);

    const result = await getLivekitSipHealth();

    expect(result.status).toBe("healthy");
    expect(result.source).toBe("worker_summary");
    expect(listSipInboundTrunk).not.toHaveBeenCalled();
  });

  it("accepts the canonical inbound_ room prefix as valid Earlymark inbound routing", async () => {
    listSipInboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_123",
        name: "Earlymark inbound",
        numbers: ["+61485010634"],
      },
    ]);
    listSipOutboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_outbound",
        name: "Earlymark outbound",
        numbers: ["+61485010634"],
        address: "earlymark-outbound.pstn.sydney.twilio.com",
      },
    ]);
    listSipDispatchRule.mockResolvedValue([
      {
        sipDispatchRuleId: "SDR_123",
        name: "Earlymark inbound dispatch",
        trunkIds: [],
        rule: {
          dispatchRuleIndividual: {
            roomPrefix: "inbound_",
          },
        },
        attributes: { callType: "inbound_demo" },
      },
    ]);

    const result = await getLivekitSipHealth();

    expect(result.status).toBe("healthy");
    expect(result.warnings).not.toContain("No LiveKit SIP dispatch rule appears to handle the Earlymark inbound surface.");
  });

  it("normalizes LiveKit trunk numbers before checking Earlymark inbound coverage", async () => {
    listSipInboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_123",
        name: "Earlymark inbound",
        numbers: ["0485 010 634"],
      },
    ]);
    listSipOutboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_outbound",
        name: "Earlymark outbound",
        numbers: ["61 485 010 634"],
        address: "earlymark-outbound.pstn.sydney.twilio.com",
      },
    ]);
    listSipDispatchRule.mockResolvedValue([
      {
        sipDispatchRuleId: "SDR_123",
        name: "Earlymark inbound dispatch",
        trunkIds: ["ST_123"],
        rule: {
          dispatchRuleIndividual: {
            roomPrefix: "earlymark-inbound-",
          },
        },
        attributes: { callType: "inbound_demo" },
      },
    ]);

    const result = await getLivekitSipHealth();

    expect(result.status).toBe("healthy");
    expect(result.missingInboundNumbers).toEqual([]);
    expect(result.inboundTrunks[0]?.numbers).toEqual(["+61485010634"]);
    expect(result.outboundTrunks[0]?.numbers).toEqual(["+61485010634"]);
  });

  it("reports unhealthy when the Earlymark number is missing from inbound trunks", async () => {
    listSipInboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_123",
        name: "Some other trunk",
        numbers: ["+61400000000"],
      },
    ]);
    listSipOutboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_outbound",
        name: "Earlymark outbound",
        numbers: ["+61485010634"],
        address: "earlymark-outbound.pstn.sydney.twilio.com",
      },
    ]);
    listSipDispatchRule.mockResolvedValue([]);

    const result = await getLivekitSipHealth();

    expect(result.status).toBe("unhealthy");
    expect(result.missingInboundNumbers).toEqual(["+61485010634"]);
    expect(result.warnings).toContain("No LiveKit SIP dispatch rules are configured.");
  });

  it("reports degraded when the configured outbound trunk is stale but a fallback outbound trunk exists", async () => {
    process.env.LIVEKIT_SIP_TRUNK_ID = "ST_stale";
    listSipInboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_123",
        name: "Earlymark inbound",
        numbers: ["+61485010634"],
      },
    ]);
    listSipOutboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_outbound_fallback",
        name: "Earlymark outbound",
        numbers: ["+61485010634"],
        address: "earlymark-outbound.pstn.sydney.twilio.com",
      },
    ]);
    listSipDispatchRule.mockResolvedValue([
      {
        sipDispatchRuleId: "SDR_123",
        name: "Earlymark inbound dispatch",
        trunkIds: ["ST_123"],
        rule: {
          dispatchRuleIndividual: {
            roomPrefix: "earlymark-inbound-",
          },
        },
        attributes: { callType: "inbound_demo" },
      },
    ]);

    const result = await getLivekitSipHealth();

    expect(result.status).toBe("degraded");
    expect(result.demoOutbound.status).toBe("degraded");
    expect(result.demoOutbound.resolvedTrunkId).toBe("ST_outbound_fallback");
    expect(result.demoOutbound.warnings[0]).toContain("LIVEKIT_SIP_TRUNK_ID");
  });
});
