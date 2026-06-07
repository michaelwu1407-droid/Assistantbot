import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const callsList = vi.hoisted(() => vi.fn());
const workspaceFindMany = vi.hoisted(() => vi.fn());

vi.mock("@/lib/twilio", () => ({
  twilioMasterClient: { calls: { list: callsList } },
  getWorkspaceTwilioClient: vi.fn(() => null),
}));

vi.mock("@/lib/db", () => ({
  db: { workspace: { findMany: workspaceFindMany } },
}));

import { getTwilioVoiceCallHealth } from "@/lib/twilio-voice-call-health";

function makeCall(overrides: Record<string, unknown>) {
  return {
    sid: "CA" + Math.random().toString(36).slice(2),
    from: "+61468167497",
    to: "sip:+61485010634@live.earlymark.ai:5060;transport=tcp;region=au1",
    direction: "outbound-api",
    status: "no-answer",
    startTime: new Date(),
    dateCreated: new Date(),
    ...overrides,
  };
}

describe("getTwilioVoiceCallHealth probe exclusion", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    workspaceFindMany.mockResolvedValue([]);
    process.env.VOICE_MONITOR_PROBE_CALLER_NUMBER = "+61434955958";
  });

  afterEach(() => {
    delete process.env.VOICE_MONITOR_PROBE_CALLER_NUMBER;
  });

  it("ignores synthetic probe calls so they do not fail recent-call health", async () => {
    callsList.mockResolvedValue([makeCall({ from: "+61434955958", status: "no-answer" })]);

    const health = await getTwilioVoiceCallHealth();
    const earlymark = health.scopes.find((scope) => scope.scopeId === "earlymark");

    expect(earlymark?.recentCalls).toHaveLength(0);
    expect(earlymark?.status).toBe("healthy");
    expect(health.status).toBe("healthy");
  });

  it("still flags a real customer call that failed", async () => {
    callsList.mockResolvedValue([makeCall({ from: "+61468167497", status: "no-answer" })]);

    const health = await getTwilioVoiceCallHealth();
    const earlymark = health.scopes.find((scope) => scope.scopeId === "earlymark");

    expect(earlymark?.failingCalls).toHaveLength(1);
    expect(earlymark?.status).toBe("unhealthy");
  });
});
