import { NextResponse } from "next/server";
import { auditTwilioVoiceRouting } from "@/lib/twilio-drift";
import { getVoiceAgentRuntimeDrift } from "@/lib/voice-agent-runtime";

export const dynamic = "force-dynamic";

function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const provided = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return provided === secret;
}

export async function GET(req: Request) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [twilio, voiceWorker] = await Promise.all([
    auditTwilioVoiceRouting({ apply: true }),
    getVoiceAgentRuntimeDrift(),
  ]);

  const unhealthy = twilio.status === "unhealthy" || voiceWorker.status === "unhealthy";

  return NextResponse.json(
    {
      status: unhealthy ? "unhealthy" : twilio.status === "degraded" || voiceWorker.status === "degraded" ? "degraded" : "healthy",
      twilio,
      voiceWorker,
      checkedAt: new Date().toISOString(),
    },
    { status: unhealthy ? 500 : 200 },
  );
}
