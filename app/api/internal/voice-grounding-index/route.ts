import { NextRequest, NextResponse } from "next/server";
import { getWorkspaceVoiceGrounding } from "@/lib/ai/context";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

function getExpectedSecret() {
  return process.env.VOICE_AGENT_WEBHOOK_SECRET || process.env.LIVEKIT_API_SECRET || "";
}

export async function GET(req: NextRequest) {
  const expectedSecret = getExpectedSecret();
  const providedSecret = req.headers.get("x-voice-agent-secret") || "";

  if (!expectedSecret || providedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workspaces = await db.workspace.findMany({
    where: {
      twilioPhoneNumber: { not: null },
      voiceEnabled: true,
    },
    select: {
      id: true,
      twilioPhoneNumber: true,
      twilioPhoneNumberNormalized: true,
      updatedAt: true,
    },
    orderBy: { updatedAt: "desc" },
    take: 500,
  });

  const groundings = (
    await Promise.all(
      workspaces.map(async (workspace) => {
        const grounding = await getWorkspaceVoiceGrounding(workspace.id);
        if (!grounding) return null;

        return {
          workspaceId: workspace.id,
          calledPhone: workspace.twilioPhoneNumber,
          calledPhoneNormalized: workspace.twilioPhoneNumberNormalized,
          updatedAt: workspace.updatedAt.toISOString(),
          grounding,
        };
      }),
    )
  ).filter(Boolean);

  return NextResponse.json({
    success: true,
    generatedAt: new Date().toISOString(),
    groundings,
  });
}
