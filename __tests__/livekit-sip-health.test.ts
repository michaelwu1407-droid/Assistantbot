import { beforeEach, describe, expect, it, vi } from "vitest";

const { listSipInboundTrunk, listSipDispatchRule } = vi.hoisted(() => ({
  listSipInboundTrunk: vi.fn(),
  listSipDispatchRule: vi.fn(),
}));

vi.mock("livekit-server-sdk", () => ({
  SipClient: class {
    listSipInboundTrunk = listSipInboundTrunk;
    listSipDispatchRule = listSipDispatchRule;
  },
}));

vi.mock("@/lib/earlymark-inbound-config", () => ({
  getKnownEarlymarkInboundNumbers: vi.fn(() => ["+61485010634"]),
}));

import { getLivekitSipHealth } from "@/lib/livekit-sip-health";

describe("getLivekitSipHealth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.LIVEKIT_URL = "wss://live.earlymark.ai";
    process.env.LIVEKIT_API_KEY = "test-key";
    process.env.LIVEKIT_API_SECRET = "test-secret";
  });

  it("reports healthy when an inbound trunk covers the Earlymark number and a dispatch rule exists", async () => {
    listSipInboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_123",
        name: "Earlymark inbound",
        numbers: ["+61485010634"],
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
  });

  it("reports unhealthy when the Earlymark number is missing from inbound trunks", async () => {
    listSipInboundTrunk.mockResolvedValue([
      {
        sipTrunkId: "ST_123",
        name: "Some other trunk",
        numbers: ["+61400000000"],
      },
    ]);
    listSipDispatchRule.mockResolvedValue([]);

    const result = await getLivekitSipHealth();

    expect(result.status).toBe("unhealthy");
    expect(result.missingInboundNumbers).toEqual(["+61485010634"]);
    expect(result.warnings).toContain("No LiveKit SIP dispatch rules are configured.");
  });
});
