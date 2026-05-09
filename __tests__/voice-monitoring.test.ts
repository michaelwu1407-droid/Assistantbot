import { describe, expect, it } from "vitest";
import { buildMonitorIncidentObservations } from "@/lib/voice-monitoring";

describe("buildMonitorIncidentObservations", () => {
  it("suppresses monitor incidents for fresh proof-only inbound_demo latency gaps", () => {
    const observations = buildMonitorIncidentObservations({
      monitorKey: "voice-agent-health",
      status: "degraded",
      summary: "voice-agent-health is reporting on schedule but last reported degraded",
      warnings: ["voice-agent-health last completed on schedule but reported status degraded."],
      checkedAt: "2026-05-09T09:01:41.230Z",
      lastSuccessAt: "2026-05-09T09:01:37.124Z",
      lastFailureAt: null,
      ageMs: 4_114,
      staleAfterMs: 1_800_000,
      details: {
        primaryIssue: {
          key: "latency",
          status: "degraded",
          summary: "No recent inbound_demo calls have been persisted, so latency cannot be verified.",
          warnings: ["No recent inbound_demo calls have been persisted, so latency cannot be verified."],
        },
        nonHealthyChecks: [
          {
            key: "latency",
            status: "degraded",
            summary: "No recent inbound_demo calls have been persisted, so latency cannot be verified.",
            warnings: ["No recent inbound_demo calls have been persisted, so latency cannot be verified."],
          },
        ],
      },
    });

    expect(observations).toEqual([]);
  });

  it("still opens monitor incidents for actual stale or otherwise unhealthy monitor runs", () => {
    const observations = buildMonitorIncidentObservations({
      monitorKey: "voice-agent-health",
      status: "unhealthy",
      summary: "voice-agent-health last succeeded 31 minute(s) ago, beyond the 30-minute window.",
      warnings: ["stale"],
      checkedAt: "2026-05-09T09:01:41.230Z",
      lastSuccessAt: "2026-05-09T08:20:37.124Z",
      lastFailureAt: null,
      ageMs: 2_460_000,
      staleAfterMs: 1_800_000,
      details: {
        primaryIssue: {
          key: "latency",
          status: "degraded",
          summary: "No recent inbound_demo calls have been persisted, so latency cannot be verified.",
        },
        nonHealthyChecks: [
          {
            key: "latency",
            status: "degraded",
            summary: "No recent inbound_demo calls have been persisted, so latency cannot be verified.",
          },
        ],
      },
    });

    expect(observations).toHaveLength(1);
    expect(observations[0]).toMatchObject({
      incidentKey: "voice:monitor:stale",
      surface: "monitor",
      severity: "critical",
    });
  });
});
