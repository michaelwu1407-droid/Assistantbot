import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { isVoiceAgentSecretAuthorized } from "@/lib/voice-agent-auth";

export const dynamic = "force-dynamic";

const surfaceSchema = z.enum(["demo", "inbound_demo", "normal"]);

const payloadSchema = z.object({
  deployGitSha: z.string().optional(),
  runtimeFingerprint: z.string().min(1),
  hostId: z.string().min(1),
  workerRole: z.string().min(1),
  surfaceSet: z.array(surfaceSchema).default([]),
  ready: z.boolean().default(false),
  activeCalls: z.number().int().nonnegative().default(0),
  pid: z.number().int().positive().optional(),
  startedAt: z.string().optional(),
  heartbeatAt: z.string().optional(),
  summary: z.record(z.string(), z.unknown()).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const providedSecret = req.headers.get("x-voice-agent-secret") || "";

    if (!isVoiceAgentSecretAuthorized(providedSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const json = await req.json();
    const parsed = payloadSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message || "Invalid payload" }, { status: 400 });
    }

    const heartbeatAt = parsed.data.heartbeatAt ? new Date(parsed.data.heartbeatAt) : new Date();

    await db.voiceWorkerHeartbeat.create({
      data: {
        hostId: parsed.data.hostId,
        workerRole: parsed.data.workerRole,
        surfaceSet: parsed.data.surfaceSet as unknown as Prisma.InputJsonValue,
        deployGitSha: parsed.data.deployGitSha,
        runtimeFingerprint: parsed.data.runtimeFingerprint,
        ready: parsed.data.ready,
        activeCalls: parsed.data.activeCalls,
        summary: {
          ...(parsed.data.summary || {}),
          pid: parsed.data.pid ?? null,
          startedAt: parsed.data.startedAt ?? null,
        } as Prisma.InputJsonValue,
        heartbeatAt,
      },
    });

    await db.webhookEvent.create({
      data: {
        provider: "livekit_worker_status",
        eventType: "heartbeat",
        status: "success",
        payload: {
          ...parsed.data,
          heartbeatAt: heartbeatAt.toISOString(),
        } as unknown as Prisma.InputJsonValue,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[voice-agent-status] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
