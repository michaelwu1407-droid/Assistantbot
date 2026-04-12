import { describe, expect, it } from "vitest";
import { buildFeatureVerificationReport } from "@/lib/feature-verification";

type LaunchReadinessFixture = Parameters<typeof buildFeatureVerificationReport>[0]["launch"];

function buildLaunch(overrides?: Partial<Record<string, unknown>>) {
  return {
    communications: {
      sms: { status: "healthy" },
      email: { status: "healthy" },
    },
    passiveProduction: {
      sms: {
        recentReplySmsSuccessCount: 3,
      },
    },
    canary: {
      monitor: {
        lastSuccessAt: "2026-04-03T11:30:00.000Z",
      },
    },
    ...overrides,
  } as LaunchReadinessFixture;
}

describe("buildFeatureVerificationReport", () => {
  it("keeps portal visibility in watch because observability improved but live proof is still missing", () => {
    const report = buildFeatureVerificationReport({
      launch: buildLaunch(),
      webhookDiagnostics: [],
      env: {
        RESEND_API_KEY: "resend_live",
        SUPPORT_EMAIL_TO: "support@earlymark.ai",
      } as unknown as NodeJS.ProcessEnv,
      checkedAt: "2026-04-03T12:00:00.000Z",
    });

    const portal = report.items.find((item) => item.key === "public-job-portal");

    expect(portal?.overallStatus).toBe("watch");
    expect(portal?.observability.status).toBe("partial");
    expect(portal?.liveProof.status).toBe("missing");
    expect(report.summary.watchCount).toBeGreaterThanOrEqual(1);
  });

  it("downgrades chatbot feedback delivery to a gap when support email delivery is not configured", () => {
    const report = buildFeatureVerificationReport({
      launch: buildLaunch(),
      webhookDiagnostics: [],
      env: {} as unknown as NodeJS.ProcessEnv,
      checkedAt: "2026-04-03T12:00:00.000Z",
    });

    const feedback = report.items.find((item) => item.key === "chatbot-feedback-escalation");

    expect(feedback?.delivery.status).toBe("missing");
    expect(feedback?.overallStatus).toBe("gap");
  });

  it("keeps multilingual voice in watch when the canary is alive but not language-specific", () => {
    const report = buildFeatureVerificationReport({
      launch: buildLaunch(),
      webhookDiagnostics: [],
      env: {
        RESEND_API_KEY: "resend_live",
      } as unknown as NodeJS.ProcessEnv,
      checkedAt: "2026-04-03T12:00:00.000Z",
    });

    const multilingual = report.items.find((item) => item.key === "multilingual-voice-calls");

    expect(multilingual?.liveProof.status).toBe("partial");
    expect(multilingual?.observability.status).toBe("partial");
    expect(multilingual?.overallStatus).toBe("watch");
  });
});
