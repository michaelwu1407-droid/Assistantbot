import { NextRequest, NextResponse } from "next/server";
import {
  getExpectedVoiceGatewayUrl,
  getKnownEarlymarkInboundNumbers,
  isKnownEarlymarkInboundNumber,
} from "@/lib/earlymark-inbound-config";
import { getEarlymarkInboundSipUri } from "@/lib/livekit-sip-config";
import { phoneMatches } from "@/lib/phone-utils";
import { getVoiceFleetHealth, isVoiceSurfaceRoutable, type VoiceSurface } from "@/lib/voice-fleet";
import { reconcileVoiceIncidents } from "@/lib/voice-incidents";
import { findManagedTwilioNumberByPhone } from "@/lib/twilio-drift";
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
  <Say voice="Polly.Olivia">Sorry, this number is temporarily unavailable. Please try again later.</Say>
  <Hangup />
</Response>`;
}

function dtmfChallengeTwiml(gatewayUrl: string, calledNumber: string) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${gatewayUrl}?dtmf_passed=1&amp;CalledNumber=${encodeURIComponent(calledNumber)}" method="POST" timeout="10">
    <Say voice="Polly.Olivia">To speak with the assistant, please press 1.</Say>
  </Gather>
  <Say voice="Polly.Olivia">We didn't receive a response. Goodbye.</Say>
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

function syntheticProbeTwiml(result: "pass" | "fallback" | "orphaned" | "disabled") {
  const message =
    result === "pass"
      ? "VOICE MONITOR PROBE PASS"
      : result === "orphaned"
        ? "VOICE MONITOR PROBE ORPHANED"
        : result === "disabled"
          ? "VOICE MONITOR PROBE DISABLED"
          : "VOICE MONITOR PROBE FALLBACK";

  return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Olivia">${message}</Say>
  <Hangup />
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
  <Say voice="Polly.Olivia">Sorry, we can't reach you right now. Please leave a message for the team and we'll get back to you.</Say>
  <Record playBeep="true" maxLength="120" timeout="5"${actionUrl ? ` action="${actionUrl}" method="POST"` : ""} />
  <Say voice="Polly.Olivia">We did not receive a recording. Goodbye.</Say>
  <Hangup />
</Response>`;
}

function resolveSipTarget(params: {
  calledNumber?: string | null;
  twilioAccountSid?: string | null;
  subaccountId?: string | null;
  isEarlymarkInboundCall?: boolean;
}) {
  if (params.isEarlymarkInboundCall) {
    return getEarlymarkInboundSipUri(params.calledNumber);
  }

  const account = params.subaccountId || params.twilioAccountSid || "";
  return account ? `${account}.pstn.twilio.com` : "";
}

function resolveSurface(params: {
  isEarlymarkInboundCall: boolean;
  workspaceMatched: boolean;
}): VoiceSurface {
  if (params.isEarlymarkInboundCall) return "inbound_demo";
  return params.workspaceMatched ? "normal" : "inbound_demo";
}

function getSyntheticProbeKeys() {
  return Array.from(
    new Set(
      [
        process.env.VOICE_MONITOR_PROBE_GATEWAY_KEY,
        process.env.CRON_SECRET,
        process.env.TELEMETRY_ADMIN_KEY,
      ]
        .map((value) => (value || "").trim())
        .filter(Boolean),
    ),
  );
}

function isAuthenticatedSyntheticProbe(req: NextRequest) {
  const providedKey = (req.headers.get("x-voice-probe-key") || "").trim();
  if (!providedKey) return false;

  const expectedKeys = getSyntheticProbeKeys();
  return expectedKeys.length > 0 && expectedKeys.includes(providedKey);
}

function isConfiguredSpokenProbeCaller(callerNumber: string, calledNumber: string) {
  const configuredCaller = (process.env.VOICE_MONITOR_PROBE_CALLER_NUMBER || "").trim();
  if (!configuredCaller) return false;

  return phoneMatches(configuredCaller, callerNumber) && (
    isKnownEarlymarkInboundNumber(calledNumber) ||
    phoneMatches(process.env.VOICE_MONITOR_PROBE_TARGET_NUMBER || "", calledNumber)
  );
}

async function openGatewayIncident(params: {
  incidentKey: string;
  surface: VoiceSurface | "routing" | "data";
  summary: string;
  callerNumber: string;
  calledNumber: string;
  workspaceId?: string | null;
  details?: Record<string, unknown>;
}) {
  try {
    await reconcileVoiceIncidents(
      [
        {
          incidentKey: params.incidentKey,
          surface: params.surface,
          severity: "critical",
          summary: params.summary,
          details: {
            source: "twilio-voice-gateway",
            callerNumber: params.callerNumber,
            calledNumber: params.calledNumber,
            workspaceId: params.workspaceId || null,
            ...(params.details || {}),
          },
        },
      ],
      { resolveMissing: false },
    );
  } catch (err) {
    // Never block Twilio webhook responses on incident notification/DB work.
    console.error("[voice-gateway] openGatewayIncident failed (swallowed):", err);
  }
}

export async function POST(req: NextRequest) {
  let lastCallerNumber = "";
  let lastCalledNumber = "";
  let lastSurface: VoiceSurface = "inbound_demo";

  try {
    const formData = await req.formData();
    const callerNumber = formData.get("From")?.toString() || "";
    const calledNumber = formData.get("To")?.toString() || formData.get("Called")?.toString() || "";
    const stirVerstat = formData.get("StirVerstat")?.toString() || "";
    const dtmfPassed = req.nextUrl.searchParams.get("dtmf_passed");
    const digits = formData.get("Digits")?.toString() || "";
    const knownInboundNumbers = getKnownEarlymarkInboundNumbers();
    const isEarlymarkInboundCall = isKnownEarlymarkInboundNumber(calledNumber);
    const syntheticProbe = isAuthenticatedSyntheticProbe(req);
    const spokenProbeCaller = isConfiguredSpokenProbeCaller(callerNumber, calledNumber);
    lastCallerNumber = callerNumber;
    lastCalledNumber = calledNumber;

    if (dtmfPassed === "1" && digits === "1") {
      const workspace = await findWorkspaceByTwilioNumber(calledNumber);
      const surface = resolveSurface({
        isEarlymarkInboundCall,
        workspaceMatched: Boolean(workspace),
      });
      lastSurface = surface;
      const fleet = await getVoiceFleetHealth();
      if (!isVoiceSurfaceRoutable(fleet, surface)) {
        void openGatewayIncident({
          incidentKey: `voice:surface:${surface}:workers`,
          surface,
          summary: `Incoming ${surface} call was sent to voicemail because no healthy workers were routable.`,
          callerNumber,
          calledNumber,
          workspaceId: workspace?.id || null,
        });
        return twimlResponse(voicemailFallbackTwiml({ calledNumber, callerNumber, surface }));
      }

      const sipTarget = resolveSipTarget({
        calledNumber,
        twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
        subaccountId: workspace?.twilioSubaccountId,
        isEarlymarkInboundCall,
      });
      if (!sipTarget) {
        console.error("[voice-gateway] Missing Twilio account SID during DTMF callback forwarding.");
        void openGatewayIncident({
          incidentKey: "voice:gateway:missing-sip-target-dtmf",
          surface: "data",
          summary: "DTMF callback could not resolve sipTarget; routing to voicemail.",
          callerNumber,
          calledNumber,
          workspaceId: workspace?.id || null,
          details: {
            subaccountId: workspace?.twilioSubaccountId || null,
            twilioAccountSidProvided: Boolean(process.env.TWILIO_ACCOUNT_SID),
          },
        });
        return twimlResponse(voicemailFallbackTwiml({ calledNumber, callerNumber, surface }));
      }
      return twimlResponse(forwardToLiveKitTwiml(sipTarget));
    }

    const failValues = ["TN-Validation-Failed-C", "TN-Validation-Failed-B", "No-TN-Validation", "no-validation"];
    if (!spokenProbeCaller && stirVerstat && failValues.some((value) => stirVerstat.toLowerCase().includes(value.toLowerCase()))) {
      console.log(`[voice-gateway] Rejected call from ${callerNumber} due to STIR/SHAKEN failure: ${stirVerstat}`);
      const surface = resolveSurface({
        isEarlymarkInboundCall,
        workspaceMatched: false,
      });
      void openGatewayIncident({
        incidentKey: "voice:call:stir-failed",
        surface: "routing",
        summary: "STIR/SHAKEN failure; routing to voicemail.",
        callerNumber,
        calledNumber,
        workspaceId: null,
        details: {
          stirVerstat,
        },
      });
      return twimlResponse(voicemailFallbackTwiml({ calledNumber, callerNumber, surface }));
    }

    if (!syntheticProbe && !spokenProbeCaller && callerNumber && checkRateLimit(callerNumber)) {
      console.log(`[voice-gateway] Rate limited ${callerNumber}; requiring DTMF challenge.`);
      const workspace = calledNumber ? await findWorkspaceByTwilioNumber(calledNumber) : null;
      const surface = resolveSurface({
        isEarlymarkInboundCall,
        workspaceMatched: Boolean(workspace),
      });
      void openGatewayIncident({
        incidentKey: "voice:call:rate-limited",
        surface: "routing",
        summary: "Rate limit exceeded; routing to voicemail.",
        callerNumber,
        calledNumber,
        workspaceId: workspace?.id || null,
      });
      return twimlResponse(voicemailFallbackTwiml({ calledNumber, callerNumber, surface }));
    }

    const workspace = calledNumber ? await findWorkspaceByTwilioNumber(calledNumber) : null;
    if (!workspace && !isEarlymarkInboundCall) {
      const managedNumber = await findManagedTwilioNumberByPhone(calledNumber);
      console.error("[voice-gateway] Incoming call did not match a workspace or configured Earlymark inbound number.", {
        callerNumber,
        calledNumber,
        knownInboundNumbers,
        managedNumber,
      });

      void openGatewayIncident({
        incidentKey: managedNumber?.managed ? "voice:routing:orphaned-number" : "voice:data:missing-critical-mapping",
        surface: managedNumber?.managed ? "routing" : "data",
        summary: managedNumber?.managed
          ? `Incoming call hit managed number ${calledNumber}, but no workspace mapping exists.`
          : `Incoming call hit the voice gateway on unknown number ${calledNumber || "[empty]"}.`,
        callerNumber,
        calledNumber,
        workspaceId: managedNumber?.workspace?.id || null,
        details: {
          managedNumber,
        },
      });

      if (syntheticProbe) {
        return twimlResponse(syntheticProbeTwiml(managedNumber?.managed ? "orphaned" : "fallback"));
      }

      return twimlResponse(
        voicemailFallbackTwiml({
          calledNumber,
          callerNumber,
          surface: managedNumber?.surface || "normal",
        }),
      );
    }

    const surface = resolveSurface({
      isEarlymarkInboundCall,
      workspaceMatched: Boolean(workspace),
    });
    lastSurface = surface;

    if (workspace?.voiceEnabled === false) {
      console.log("[voice-gateway] Voice disabled for workspace; routing to voicemail fallback.");
      if (syntheticProbe) {
        return twimlResponse(syntheticProbeTwiml("disabled"));
      }
      return twimlResponse(voicemailFallbackTwiml({ calledNumber, callerNumber, surface }));
    }

    const fleet = await getVoiceFleetHealth();
    if (!isVoiceSurfaceRoutable(fleet, surface)) {
      console.error("[voice-gateway] No routable workers are available for inbound surface.", {
        callerNumber,
        calledNumber,
        surface,
        fleetSummary: fleet.summary,
      });
      void openGatewayIncident({
        incidentKey: `voice:surface:${surface}:workers`,
        surface,
        summary: `Incoming ${surface} call was sent to voicemail because no healthy workers were routable.`,
        callerNumber,
        calledNumber,
        workspaceId: workspace?.id || null,
      });
      if (syntheticProbe) {
        return twimlResponse(syntheticProbeTwiml("fallback"));
      }
      return twimlResponse(voicemailFallbackTwiml({ calledNumber, callerNumber, surface }));
    }

    const sipTarget = resolveSipTarget({
      calledNumber,
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
      subaccountId: workspace?.twilioSubaccountId,
      isEarlymarkInboundCall,
    });
    if (!sipTarget) {
      console.error("[voice-gateway] Missing Twilio account SID; cannot forward inbound call safely.", {
        callerNumber,
        calledNumber,
        surface,
      });
      if (syntheticProbe) {
        return twimlResponse(syntheticProbeTwiml("fallback"));
      }
      void openGatewayIncident({
        incidentKey: "voice:gateway:missing-sip-target",
        surface: "data",
        summary: "Missing sipTarget; routing to voicemail.",
        callerNumber,
        calledNumber,
        workspaceId: workspace?.id || null,
      });
      return twimlResponse(voicemailFallbackTwiml({ calledNumber, callerNumber, surface }));
    }

    console.log("[voice-gateway] Forwarding inbound call", {
      callerNumber,
      calledNumber,
      routeTarget: workspace ? "workspace" : isEarlymarkInboundCall ? "earlymark_inbound" : "fallback_master",
      workspaceMatched: Boolean(workspace),
      knownInboundConfigured: knownInboundNumbers.length > 0,
      surface,
    });

    return twimlResponse(forwardToLiveKitTwiml(sipTarget));
  } catch (error) {
    console.error("[voice-gateway] Error:", error);

    // Always fail-safe to voicemail so the caller can still leave a message,
    // even if we couldn't fully resolve routing context for this call.
    const callerNumber = lastCallerNumber || "";
    const calledNumber = lastCalledNumber || "";
    const surface: VoiceSurface = (lastSurface as VoiceSurface) || "inbound_demo";

    void openGatewayIncident({
      incidentKey: "voice:gateway:handler-exception",
      surface,
      summary: "Voice gateway handler threw; routing to voicemail.",
      callerNumber,
      calledNumber,
      workspaceId: null,
      details: {
        error: error instanceof Error ? error.message : String(error),
      },
    }).catch(() => {});

    return twimlResponse(
      voicemailFallbackTwiml({
        calledNumber,
        callerNumber,
        surface,
      }),
    );
  }
}
