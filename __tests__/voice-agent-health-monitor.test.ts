import { describe, expect, it } from "vitest";
import { buildVoiceAgentHealthMonitorDetails, type VoiceAgentHealthMonitorResult } from "@/lib/voice-agent-health-monitor";

describe("buildVoiceAgentHealthMonitorDetails", () => {
  it("includes livekit SIP status and the first non-healthy component in persisted details", () => {
    const result = {
      status: "unhealthy",
      checkedAt: "2026-04-27T14:26:21.531Z",
      fleet: {
        status: "healthy",
        summary: "fleet healthy",
        warnings: [],
      },
      customerSaturation: {
        status: "healthy",
        summary: "saturation healthy",
        warnings: [],
      },
      twilioRouting: {
        status: "healthy",
        summary: "routing healthy",
        warnings: [],
      },
      livekitSip: {
        status: "unhealthy",
        summary: "LiveKit SIP is missing the inbound trunk or dispatch state required for Earlymark inbound.",
        warnings: ["No LiveKit SIP dispatch rules are configured."],
      },
      demoCalls: {
        status: "healthy",
        summary: "demo callbacks healthy",
        warnings: [],
      },
      outboundCalls: {
        status: "degraded",
        summary: "1 recent queued outbound call request(s) failed, but at least one succeeded.",
        warnings: ["1 recent queued outbound call request(s) failed."],
      },
      invariants: {
        status: "healthy",
        summary: "invariants healthy",
        warnings: [],
      },
      recentCalls: {
        status: "degraded",
        summary: "1 recent call ended as failed/no-answer/busy/canceled.",
        warnings: ["1 recent call ended as failed/no-answer/busy/canceled."],
      },
      latency: {
        status: "healthy",
        summary: "latency healthy",
        warnings: [],
      },
      incidents: {
        opened: ["voice:livekit:sip"],
        resolved: [],
      },
    } as unknown as VoiceAgentHealthMonitorResult;

    const details = buildVoiceAgentHealthMonitorDetails(result);

    expect(details.livekitSipStatus).toBe("unhealthy");
    expect(details.demoCallStatus).toBe("healthy");
    expect(details.outboundCallStatus).toBe("degraded");
    expect(details.primaryIssue).toEqual({
      key: "livekitSip",
      status: "unhealthy",
      summary: "LiveKit SIP is missing the inbound trunk or dispatch state required for Earlymark inbound.",
      warnings: ["No LiveKit SIP dispatch rules are configured."],
    });
    expect(details.nonHealthyChecks).toEqual([
      {
        key: "livekitSip",
        status: "unhealthy",
        summary: "LiveKit SIP is missing the inbound trunk or dispatch state required for Earlymark inbound.",
        warnings: ["No LiveKit SIP dispatch rules are configured."],
      },
      {
        key: "outboundCalls",
        status: "degraded",
        summary: "1 recent queued outbound call request(s) failed, but at least one succeeded.",
        warnings: ["1 recent queued outbound call request(s) failed."],
      },
      {
        key: "recentCalls",
        status: "degraded",
        summary: "1 recent call ended as failed/no-answer/busy/canceled.",
        warnings: ["1 recent call ended as failed/no-answer/busy/canceled."],
      },
    ]);
    expect(details.incidentCounts).toEqual({ opened: 1, resolved: 0 });
  });
});
