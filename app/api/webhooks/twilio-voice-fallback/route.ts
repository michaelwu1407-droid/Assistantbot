import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { verifyTwilioFormPost } from "@/lib/twilio/verify-signature";

export const dynamic = "force-dynamic";

function toJson(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function completionTwiml() {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Olivia">Thanks. Your message has been recorded and the team will be notified.</Say>
  <Hangup />
</Response>`,
    {
      status: 200,
      headers: { "Content-Type": "application/xml" },
    },
  );
}

export async function POST(req: NextRequest) {
  try {
    const verification = await verifyTwilioFormPost(req);
    if (!verification.ok) {
      return new NextResponse("forbidden", { status: verification.status });
    }

    const payload = {
      surface: req.nextUrl.searchParams.get("surface") || verification.params.surface || "unknown",
      from: req.nextUrl.searchParams.get("from") || verification.params.From || "",
      called: req.nextUrl.searchParams.get("called") || verification.params.To || "",
      callSid: verification.params.CallSid || "",
      recordingSid: verification.params.RecordingSid || "",
      recordingUrl: verification.params.RecordingUrl || "",
      recordingDuration: verification.params.RecordingDuration || "",
      transcriptionText: verification.params.TranscriptionText || "",
      recordedAt: new Date().toISOString(),
    };

    await db.webhookEvent.create({
      data: {
        provider: "twilio_voice_fallback",
        eventType: "voicemail_recorded",
        status: "success",
        payload: toJson(payload),
      },
    });

    return completionTwiml();
  } catch (error) {
    console.error("[twilio-voice-fallback] Error:", error);
    return completionTwiml();
  }
}
