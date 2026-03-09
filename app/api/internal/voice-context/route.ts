import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspaceVoiceGrounding } from "@/lib/ai/context";
import { findWorkspaceByTwilioNumber } from "@/lib/workspace-routing";

export const dynamic = "force-dynamic";

const payloadSchema = z.object({
  calledPhone: z.string().optional(),
  workspaceId: z.string().optional(),
});

function getExpectedSecret() {
  return process.env.VOICE_AGENT_WEBHOOK_SECRET || process.env.LIVEKIT_API_SECRET || "";
}

async function findWorkspaceIdByCalledNumber(calledPhone?: string) {
  const workspace = await findWorkspaceByTwilioNumber(calledPhone, { id: true });
  return workspace?.id ?? null;
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

    const workspaceId = parsed.data.workspaceId || await findWorkspaceIdByCalledNumber(parsed.data.calledPhone);
    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const grounding = await getWorkspaceVoiceGrounding(workspaceId);
    if (!grounding) {
      return NextResponse.json({ error: "Voice grounding not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, grounding });
  } catch (error) {
    console.error("[voice-context-webhook] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
