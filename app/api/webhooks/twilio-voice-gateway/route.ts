import { NextRequest, NextResponse } from "next/server";
import {
  getExpectedVoiceGatewayUrl,
  getKnownEarlymarkInboundNumbers,
  isKnownEarlymarkInboundNumber,
} from "@/lib/earlymark-inbound-config";
import { getVoiceFleetHealth, isVoiceSurfaceRoutable, type VoiceSurface } from "@/lib/voice-fleet";
import { reconcileVoiceIncidents } from "@/lib/voice-incidents";
import { findWorkspaceByTwilioNumber } from "@/lib/workspace-routing";

export const dynamic = "force-dynamic";

const callCounts = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 60 * 60 * 1000;
const RATE_LIMIT = 3;

function checkRateLimit(callerNumber: string): boolean {
  const now = Date.now();
  const entry = callCounts.get(callerNumber);

  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    callCounts.set(callerNumber, { count: 1, windowStart: now });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT;
}

function twimlResponse(twiml: string): NextResponse {
  return new NextResponse(twiml, {
    status: 200,
    headers: { "Content-Type": "application/xml" },
  });
}

function rejectTwiml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Reject reason="busy" />
</Response>`;
}

function temporarilyUnavailableTwiml() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Nicole">Sorry, this number is temporarily unavailable. Please try again later.</Say>
  <Hangup />
</Response>`;
}

function dtmfChallengeTwiml(gatewayUrl: string, calledNumber: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${gatewayUrl}?dtmf_passed=1&amp;CalledNumber=${encodeURIComponent(calledNumber)}" method="POST" timeout="10">
    <Say voice="Polly.Nicole">To speak with the assistant, please press 1.</Say>
  </Gather>
  <Say voice="Polly.Nicole">We didn't receive a response. Goodbye.</Say>
  <Hangup />
</Response>`;
}

function forwardToLiveKitTwiml(sipTrunkDomain: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Sip>${sipTrunkDomain}</Sip>
  </Dial>
</Response>`;
}

function voicemailFallbackTwiml(params: {
  calledNumber: string;
  callerNumber: string;
  surface: VoiceSurface;
}) {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "");
  const actionUrl = appUrl
    ? `${appUrl}/api/webhooks/twilio-voice-fallback?surface=${encodeURIComponent(params.surface)}&called=${encodeURIComponent(params.calledNumber)}&from=${encodeURIComponent(params.callerNumber)}`
    : "";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Nicole">Our assistant is temporarily unavailable, but we can still take a message for the team.</Say>
  <Record playBeep="true" maxLength="120" timeout="5"${actionUrl ? ` action="${actionUrl}" method="POST"` : ""} />
  <Say voice="Polly.Nicole">We did not receive a recording. Goodbye.</Say>
  <Hangup />
</Response>`;
}

function resolveSipDomain(twilioAccountSid?: string | null, subaccountId?: string | null) {
  const account = subaccountId || twilioAccountSid || "";
  return account ? `${account}.pstn.twilio.com` : "";
}

function resolveSurface(params: {
  isEarlymarkInboundCall: boolean;
  workspaceMatched: boolean;
}): VoiceSurface {
  if (params.isEarlymarkInboundCall) return "inbound_demo";
  return params.workspaceMatched ? "normal" : "inbound_demo";
}

async function openGatewayIncident(params: {
  surface: VoiceSurface;
  callerNumber: string;
  calledNumber: string;
  workspaceId?: string | null;
}) {
  await reconcileVoiceIncidents(
    [
      {
        incidentKey: `voice:surface:${params.surface}:workers`,
        surface: params.surface,
        severity: "critical",
        summary: `Incoming ${params.surface} call was sent to voicemail because no healthy workers were routable.`,
        details: {
          source: "twilio-voice-gateway",
          callerNumber: params.callerNumber,
          calledNumber: params.calledNumber,
          workspaceId: params.workspaceId || null,
        },
      },
    ],
    { resolveMissing: false },
  );
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const callerNumber = formData.get("From")?.toString() || "";
    const calledNumber = formData.get("To")?.toString() || formData.get("Called")?.toString() || "";
    const stirVerstat = formData.get("StirVerstat")?.toString() || "";
    const dtmfPassed = req.nextUrl.searchParams.get("dtmf_passed");
    const digits = formData.get("Digits")?.toString() || "";
    const knownInboundNumbers = getKnownEarlymarkInboundNumbers();
    const isEarlymarkInboundCall = isKnownEarlymarkInboundNumber(calledNumber);

    if (dtmfPassed === "1" && digits === "1") {
      const workspace = await findWorkspaceByTwilioNumber(calledNumber);
      const surface = resolveSurface({
        isEarlymarkInboundCall,
        workspaceMatched: Boolean(workspace),
      });
      const fleet = await getVoiceFleetHealth();
      if (!isVoiceSurfaceRoutable(fleet, surface)) {
        await openGatewayIncident({
          surface,
          callerNumber,
          calledNumber,
          workspaceId: workspace?.id || null,
        });
        return twimlResponse(voicemailFallbackTwiml({ calledNumber, callerNumber, surface }));
      }

      const sipDomain = resolveSipDomain(process.env.TWILIO_ACCOUNT_SID, workspace?.twilioSubaccountId);
      if (!sipDomain) {
        console.error("[voice-gateway] Missing Twilio account SID during DTMF callback forwarding.");
        return twimlResponse(rejectTwiml());
      }
      return twimlResponse(forwardToLiveKitTwiml(sipDomain));
    }

    const failValues = ["TN-Validation-Failed-C", "TN-Validation-Failed-B", "No-TN-Validation", "no-validation"];
    if (stirVerstat && failValues.some((value) => stirVerstat.toLowerCase().includes(value.toLowerCase()))) {
      console.log(`[voice-gateway] Rejected call from ${callerNumber} due to STIR/SHAKEN failure: ${stirVerstat}`);
      return twimlResponse(rejectTwiml());
    }

    if (callerNumber && checkRateLimit(callerNumber)) {
      console.log(`[voice-gateway] Rate limited ${callerNumber}; requiring DTMF challenge.`);
      const gatewayUrl = getExpectedVoiceGatewayUrl();
      if (!gatewayUrl) {
        console.error("[voice-gateway] NEXT_PUBLIC_APP_URL is missing, so DTMF challenge cannot be issued safely.");
        return twimlResponse(temporarilyUnavailableTwiml());
      }
      return twimlResponse(dtmfChallengeTwiml(gatewayUrl, calledNumber));
    }

    const workspace = calledNumber ? await findWorkspaceByTwilioNumber(calledNumber) : null;
    if (!workspace && !isEarlymarkInboundCall) {
      console.error("[voice-gateway] Incoming call did not match a workspace or configured Earlymark inbound number.", {
        callerNumber,
        calledNumber,
        knownInboundNumbers,
      });
    }

    if (workspace?.voiceEnabled === false) {
      console.log("[voice-gateway] Voice disabled for workspace; returning temporary unavailable.");
      return twimlResponse(temporarilyUnavailableTwiml());
    }

    const surface = resolveSurface({
      isEarlymarkInboundCall,
      workspaceMatched: Boolean(workspace),
    });
    const fleet = await getVoiceFleetHealth();
    if (!isVoiceSurfaceRoutable(fleet, surface)) {
      console.error("[voice-gateway] No routable workers are available for inbound surface.", {
        callerNumber,
        calledNumber,
        surface,
        fleetSummary: fleet.summary,
      });
      await openGatewayIncident({
        surface,
        callerNumber,
        calledNumber,
        workspaceId: workspace?.id || null,
      });
      return twimlResponse(voicemailFallbackTwiml({ calledNumber, callerNumber, surface }));
    }

    const sipDomain = resolveSipDomain(process.env.TWILIO_ACCOUNT_SID, workspace?.twilioSubaccountId);
    if (!sipDomain) {
      console.error("[voice-gateway] Missing Twilio account SID; cannot forward inbound call safely.", {
        callerNumber,
        calledNumber,
        surface,
      });
      return twimlResponse(rejectTwiml());
    }

    console.log("[voice-gateway] Forwarding inbound call", {
      callerNumber,
      calledNumber,
      routeTarget: workspace ? "workspace" : isEarlymarkInboundCall ? "earlymark_inbound" : "fallback_master",
      workspaceMatched: Boolean(workspace),
      knownInboundConfigured: knownInboundNumbers.length > 0,
      surface,
    });

    return twimlResponse(forwardToLiveKitTwiml(sipDomain));
  } catch (error) {
    console.error("[voice-gateway] Error:", error);
    return twimlResponse(temporarilyUnavailableTwiml());
  }
}
