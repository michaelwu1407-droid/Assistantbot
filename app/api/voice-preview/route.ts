import { NextRequest, NextResponse } from "next/server";

const CARTESIA_API_URL = "https://api.cartesia.ai/tts/bytes";
const CARTESIA_MODEL = "sonic-3";

const ALLOWED_VOICE_IDS = new Set([
  "a4a16c5e-5902-4732-b9b6-2a48efd2e11b",
  "8985388c-1332-4ce7-8d55-789628aa3df4",
  "7d7d769c-5ab1-4dd5-bb17-ec8d4b69d03d",
  "ba0add52-783c-4ec0-8b9c-7a6b60f99d1c",
]);

export async function POST(req: NextRequest) {
  const apiKey = process.env.CARTESIA_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "CARTESIA_API_KEY not configured" },
      { status: 500 }
    );
  }

  let voiceId: string;
  let text: string;

  try {
    const body = await req.json();
    voiceId = body.voiceId;
    text = body.text;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!voiceId || !ALLOWED_VOICE_IDS.has(voiceId)) {
    return NextResponse.json({ error: "Invalid voice ID" }, { status: 400 });
  }

  if (!text || typeof text !== "string" || text.length > 500) {
    return NextResponse.json(
      { error: "Text is required and must be under 500 characters" },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(CARTESIA_API_URL, {
      method: "POST",
      headers: {
        "X-API-Key": apiKey,
        "Cartesia-Version": "2024-06-10",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: CARTESIA_MODEL,
        transcript: text,
        voice: { mode: "id", id: voiceId },
        language: "en",
        output_format: {
          container: "mp3",
          encoding: "mp3",
          bit_rate: 128000,
          sample_rate: 44100,
        },
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[voice-preview] Cartesia error:", response.status, errText);
      return NextResponse.json(
        { error: `TTS generation failed: ${response.status} ${errText.slice(0, 200)}` },
        { status: 502 }
      );
    }

    const audioBuffer = Buffer.from(await response.arrayBuffer());
    console.log(`[voice-preview] Success: ${audioBuffer.length} bytes`);

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.length),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("[voice-preview] Error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
