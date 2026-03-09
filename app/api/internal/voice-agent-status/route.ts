import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  deployGitSha: z.string().optional(),
  runtimeFingerprint: z.string().min(1),
  pid: z.number().int().positive().optional(),
  startedAt: z.string().optional(),
  heartbeatAt: z.string().optional(),
  summary: z.record(z.string(), z.unknown()).optional(),
});

function getExpectedSecret() {
  return process.env.VOICE_AGENT_WEBHOOK_SECRET || process.env.LIVEKIT_API_SECRET || "";
}

export async function POST(req: NextRequest) {
  try {
    const expectedSecret = getExpectedSecret();
    const providedSecret = req.headers.get("x-voice-agent-secret") || "";

    if (!expectedSecret || providedSecret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    await db.webhookEvent.create({
      data: {
        provider: "livekit_worker_status",
        eventType: "heartbeat",
        status: "success",
        payload: parsed.data as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[voice-agent-status] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
