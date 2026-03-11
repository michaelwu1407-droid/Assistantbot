import { NextResponse } from "next/server";
import { getUnauthorizedJsonResponse, isOpsAuthorized } from "@/lib/ops-auth";
import { auditTwilioMessagingRouting, auditTwilioVoiceRouting } from "@/lib/twilio-drift";
import { getVoiceAgentRuntimeDrift } from "@/lib/voice-agent-runtime";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (!isOpsAuthorized(req)) {
    return getUnauthorizedJsonResponse();
  }

  const [twilio, twilioMessaging, voiceWorker] = await Promise.all([
    auditTwilioVoiceRouting({ apply: true }),
    auditTwilioMessagingRouting({ apply: true }),
    getVoiceAgentRuntimeDrift(),
  ]);

  const unhealthy =
    twilio.status === "unhealthy" ||
    twilioMessaging.status === "unhealthy" ||
    voiceWorker.status === "unhealthy";

  return NextResponse.json(
    {
      status:
        unhealthy
          ? "unhealthy"
          : twilio.status === "degraded" || twilioMessaging.status === "degraded" || voiceWorker.status === "degraded"
            ? "degraded"
            : "healthy",
      twilio,
      twilioMessaging,
      voiceWorker,
      checkedAt: new Date().toISOString(),
    },
    { status: unhealthy ? 500 : 200 },
  );
}
