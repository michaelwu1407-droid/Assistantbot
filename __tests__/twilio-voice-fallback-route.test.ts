import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const hoisted = vi.hoisted(() => ({
  db: {
    webhookEvent: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ db: hoisted.db }));

import { POST } from "@/app/api/webhooks/twilio-voice-fallback/route";

function buildFallbackRequest() {
  const body = new URLSearchParams({
    From: "+61400000000",
    To: "+61485010634",
    CallSid: "CA123",
    RecordingSid: "RE123",
    RecordingUrl: "https://api.twilio.com/recording",
    RecordingDuration: "18",
    TranscriptionText: "Please call me back about my blocked drain.",
  });

  return new NextRequest("https://app.example.com/api/webhooks/twilio-voice-fallback?surface=voice", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body,
  });
}

describe("POST /api/webhooks/twilio-voice-fallback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    hoisted.db.webhookEvent.create.mockResolvedValue(undefined);
  });

  it("stores the voicemail payload and returns TwiML confirmation", async () => {
    const response = await POST(buildFallbackRequest());
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/xml");
    expect(body).toContain("Your message has been recorded");
    expect(hoisted.db.webhookEvent.create).toHaveBeenCalledWith({
      data: {
        provider: "twilio_voice_fallback",
        eventType: "voicemail_recorded",
        status: "success",
        payload: expect.objectContaining({
          surface: "voice",
          from: "+61400000000",
          called: "+61485010634",
          callSid: "CA123",
          recordingSid: "RE123",
          recordingUrl: "https://api.twilio.com/recording",
          transcriptionText: "Please call me back about my blocked drain.",
        }),
      },
    });
  });

  it("still returns the completion TwiML when webhook persistence fails", async () => {
    hoisted.db.webhookEvent.create.mockRejectedValue(new Error("db unavailable"));

    const response = await POST(buildFallbackRequest());
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain("Your message has been recorded");
  });
});
