import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";

const { sendSmsMock, sendEmailMock } = vi.hoisted(() => ({
  sendSmsMock: vi.fn(),
  sendEmailMock: vi.fn(),
}));

vi.mock("@/lib/twilio", () => ({
  twilioMasterClient: {
    messages: {
      create: sendSmsMock,
    },
  },
}));

vi.mock("resend", () => ({
  Resend: class MockResend {
    emails = {
      send: sendEmailMock,
    };
  },
}));

import { dispatchVoiceIncidentNotifications } from "@/lib/voice-incident-alert";

const originalEnv = { ...process.env };

describe("dispatchVoiceIncidentNotifications", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.VOICE_ALERT_SMS_ENABLED;
    delete process.env.VOICE_ALERT_SMS_TO;
    delete process.env.VOICE_ALERT_SMS_FROM;
    delete process.env.VOICE_ALERT_EMAIL_TO;
    delete process.env.VOICE_ALERT_EMAIL_FROM;
    delete process.env.TWILIO_PHONE_NUMBER;
    delete process.env.RESEND_FROM_DOMAIN;
    process.env.RESEND_API_KEY = "test-resend-key";
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("skips SMS alerts by default and still sends email alerts", async () => {
    process.env.VOICE_ALERT_EMAIL_TO = "alerts@example.com";

    const result = await dispatchVoiceIncidentNotifications({
      subject: "VOICE ALERT: fleet critical",
      message: "The voice fleet is unhealthy.",
    });

    expect(result.sms).toMatchObject({
      sent: false,
      skipped: true,
      error: "SMS alerting is disabled for voice alerts",
    });
    expect(sendSmsMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        to: ["alerts@example.com"],
        subject: "VOICE ALERT: fleet critical",
      }),
    );
  });

  it("sends SMS alerts again when explicitly re-enabled", async () => {
    process.env.VOICE_ALERT_SMS_ENABLED = "true";
    process.env.VOICE_ALERT_SMS_TO = "+61411111111";
    process.env.VOICE_ALERT_SMS_FROM = "+61422222222";
    process.env.VOICE_ALERT_EMAIL_TO = "alerts@example.com";

    const result = await dispatchVoiceIncidentNotifications({
      subject: "VOICE RECOVERY: fleet",
      message: "The voice fleet recovered.",
      metadata: { monitor: "voice-agent-health" },
    });

    expect(sendSmsMock).toHaveBeenCalledTimes(1);
    expect(sendSmsMock).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "+61422222222",
        to: "+61411111111",
      }),
    );
    expect(result.sms).toMatchObject({
      sent: true,
      skipped: false,
      recipients: ["+61411111111"],
    });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });
});
