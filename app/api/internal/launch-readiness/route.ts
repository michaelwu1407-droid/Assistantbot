import { NextRequest, NextResponse } from "next/server";
import { getLaunchReadiness } from "@/lib/launch-readiness";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";
import { isVoiceAgentSecretAuthorized } from "@/lib/voice-agent-auth";

export const dynamic = "force-dynamic";

function isVoiceAgentAuthorized(req: NextRequest) {
  return isVoiceAgentSecretAuthorized(req.headers.get("x-voice-agent-secret"));
}

export async function GET(req: NextRequest) {
  if (!isOpsAuthorized(req) && !isVoiceAgentAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const expectedWorkerSha = req.nextUrl.searchParams.get("expectedWorkerSha");
  const hostId = req.nextUrl.searchParams.get("hostId");
  const readiness = await getLaunchReadiness({
    expectedWorkerSha,
    hostId,
  });

  return NextResponse.json(readiness, { status: readiness.status === "unhealthy" ? 500 : 200 });
}
