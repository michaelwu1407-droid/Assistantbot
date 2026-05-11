import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  voiceIncidentFindMany: vi.fn(),
  voiceIncidentCreate: vi.fn(),
  voiceIncidentUpdate: vi.fn(),
  voiceIncidentFindUnique: vi.fn(),
  opsMonitorRunFindUnique: vi.fn(),
  recordMonitorRun: vi.fn(),
  dispatchVoiceIncidentNotifications: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    voiceIncident: {
      findMany: mocks.voiceIncidentFindMany,
      create: mocks.voiceIncidentCreate,
      update: mocks.voiceIncidentUpdate,
      findUnique: mocks.voiceIncidentFindUnique,
    },
    opsMonitorRun: {
      findUnique: mocks.opsMonitorRunFindUnique,
    },
  },
}));

vi.mock("@/lib/ops-monitor-runs", () => ({
  recordMonitorRun: mocks.recordMonitorRun,
}));

vi.mock("@/lib/voice-incident-alert", () => ({
  dispatchVoiceIncidentNotifications: mocks.dispatchVoiceIncidentNotifications,
}));

import { reconcileVoiceIncidents } from "@/lib/voice-incidents";

const originalEnv = { ...process.env };

describe("reconcileVoiceIncidents", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.VOICE_INCIDENT_ALERT_COOLDOWN_MINUTES;
    delete process.env.VOICE_NON_CRITICAL_DIGEST_HOURS;
    mocks.voiceIncidentCreate.mockResolvedValue(undefined);
    mocks.voiceIncidentUpdate.mockResolvedValue(undefined);
    mocks.voiceIncidentFindUnique.mockResolvedValue(null);
    mocks.opsMonitorRunFindUnique.mockResolvedValue(null);
    mocks.recordMonitorRun.mockResolvedValue(undefined);
    mocks.dispatchVoiceIncidentNotifications.mockResolvedValue({
      sms: { sent: false, skipped: true },
      email: { sent: true, skipped: false },
    });
  });

  it("sends warning incidents through the daily digest instead of an immediate alert", async () => {
    mocks.voiceIncidentFindMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          incidentKey: "voice:test:warning",
          surface: "monitor",
          severity: "warning",
          status: "open",
          summary: "Monitor warning",
          updatedAt: new Date("2026-05-11T09:00:00.000Z"),
        },
      ])
      .mockResolvedValueOnce([]);

    await reconcileVoiceIncidents([
      {
        incidentKey: "voice:test:warning",
        surface: "monitor",
        severity: "warning",
        summary: "Monitor warning",
      },
    ]);

    expect(mocks.voiceIncidentCreate).toHaveBeenCalledTimes(1);
    expect(mocks.dispatchVoiceIncidentNotifications).toHaveBeenCalledTimes(1);
    expect(mocks.dispatchVoiceIncidentNotifications).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("VOICE DIGEST"),
        channels: {
          sms: false,
          email: true,
        },
      }),
    );
    expect(mocks.recordMonitorRun).toHaveBeenCalledWith(
      expect.objectContaining({
        monitorKey: "voice-incident-digest",
      }),
    );
  });

  it("does not re-alert critical incidents before the longer cooldown expires", async () => {
    process.env.VOICE_INCIDENT_ALERT_COOLDOWN_MINUTES = "60";
    mocks.voiceIncidentFindMany.mockResolvedValueOnce([
      {
        incidentKey: "voice:test:critical",
        surface: "fleet",
        severity: "critical",
        status: "open",
        summary: "Fleet critical",
        details: null,
        detectedAt: new Date("2026-05-11T08:00:00.000Z"),
        lastObservedAt: new Date("2026-05-11T08:30:00.000Z"),
        resolvedAt: null,
        lastAlertedAt: new Date(),
        lastRecoveryAlertedAt: null,
        alertCount: 1,
        createdAt: new Date("2026-05-11T08:00:00.000Z"),
        updatedAt: new Date("2026-05-11T08:30:00.000Z"),
      },
    ]);

    await reconcileVoiceIncidents([
      {
        incidentKey: "voice:test:critical",
        surface: "fleet",
        severity: "critical",
        summary: "Fleet critical",
      },
    ]);

    expect(mocks.voiceIncidentUpdate).toHaveBeenCalledTimes(1);
    expect(mocks.dispatchVoiceIncidentNotifications).not.toHaveBeenCalled();
    expect(mocks.recordMonitorRun).not.toHaveBeenCalled();
  });
});
