import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function toJson(value: Record<string, unknown>) {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function completionTwiml() {
  return new NextResponse(
    `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Nicole">Thanks. Your message has been recorded and the team will be notified.</Say>
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
    const formData = await req.formData();
    const payload = {
      surface: req.nextUrl.searchParams.get("surface") || formData.get("surface")?.toString() || "unknown",
      from: req.nextUrl.searchParams.get("from") || formData.get("From")?.toString() || "",
      called: req.nextUrl.searchParams.get("called") || formData.get("To")?.toString() || "",
      callSid: formData.get("CallSid")?.toString() || "",
      recordingSid: formData.get("RecordingSid")?.toString() || "",
      recordingUrl: formData.get("RecordingUrl")?.toString() || "",
      recordingDuration: formData.get("RecordingDuration")?.toString() || "",
      transcriptionText: formData.get("TranscriptionText")?.toString() || "",
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
