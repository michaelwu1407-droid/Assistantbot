/**
 * Twilio Voice Gateway — /api/webhooks/twilio-voice-gateway
 * ═══════════════════════════════════════════════════════════
 * Pre-screening layer between Twilio and LiveKit:
 *
 * 1. STIR/SHAKEN check — reject calls with failed caller ID verification
 * 2. Rate limiter     — 4+ calls/hr from same CID → DTMF challenge
 * 3. Voice enabled    — check workspace hasn't hit billing circuit breaker
 * 4. Pass-through     — forward to LiveKit SIP trunk
 *
 * Configure this as the Voice URL on Twilio incoming phone numbers.
 */

import { NextRequest, NextResponse } from "next/server";
import {
    getExpectedVoiceGatewayUrl,
    getKnownEarlymarkInboundNumbers,
    isKnownEarlymarkInboundNumber,
} from "@/lib/earlymark-inbound-config";
import { findWorkspaceByTwilioNumber } from "@/lib/workspace-routing";

export const dynamic = "force-dynamic";

// ─── In-Memory Rate Limiter (Vercel KV when available) ──────────────
// Key: phone number, Value: { count, windowStart }
// Falls back to in-memory Map (reset on cold start, which is acceptable
// for Vercel serverless — each cold start resets the window).

const callCounts = new Map<string, { count: number; windowStart: number }>();
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const RATE_LIMIT = 3; // calls 1-3 are free, 4+ get DTMF challenge

function checkRateLimit(callerNumber: string): boolean {
    const now = Date.now();
    const entry = callCounts.get(callerNumber);

    if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
        callCounts.set(callerNumber, { count: 1, windowStart: now });
        return false; // not rate limited
    }

    entry.count++;
    return entry.count > RATE_LIMIT;
}

// ─── TwiML Helpers ──────────────────────────────────────────────────

function twimlResponse(twiml: string): NextResponse {
    return new NextResponse(twiml, {
        status: 200,
        headers: { "Content-Type": "application/xml" },
    });
}

function rejectTwiml(): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Reject reason="busy" />
</Response>`;
}

function dtmfChallengeTwiml(gatewayUrl: string, calledNumber: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="${gatewayUrl}?dtmf_passed=1&amp;CalledNumber=${encodeURIComponent(calledNumber)}" method="POST" timeout="10">
    <Say voice="Polly.Nicole">To speak with the assistant, please press 1.</Say>
  </Gather>
  <Say voice="Polly.Nicole">We didn't receive a response. Goodbye.</Say>
  <Hangup />
</Response>`;
}

function forwardToLiveKitTwiml(sipTrunkDomain: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Sip>${sipTrunkDomain}</Sip>
  </Dial>
</Response>`;
}

function resolveSipDomain(twilioAccountSid?: string | null, subaccountId?: string | null) {
    const account = subaccountId || twilioAccountSid || "";
    return account ? `${account}.pstn.twilio.com` : "";
}

// ─── POST Handler ───────────────────────────────────────────────────

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

        // ── Step 0: DTMF challenge callback ─────────────────────────────
        // If this is a callback from a DTMF challenge and caller pressed 1
        if (dtmfPassed === "1" && digits === "1") {
            const workspace = await findWorkspaceByTwilioNumber(calledNumber, {
                twilioSipTrunkSid: true,
                twilioSubaccountId: true,
            });
            const sipDomain = resolveSipDomain(process.env.TWILIO_ACCOUNT_SID, workspace?.twilioSubaccountId);
            if (!sipDomain) {
                console.error("[voice-gateway] Missing Twilio account SID during DTMF callback forwarding.");
                return twimlResponse(rejectTwiml());
            }
            return twimlResponse(forwardToLiveKitTwiml(sipDomain));
        }

        // ── Step 1: STIR/SHAKEN ─────────────────────────────────────────
        // Reject calls that fail caller ID verification
        const failValues = ["TN-Validation-Failed-C", "TN-Validation-Failed-B", "No-TN-Validation", "no-validation"];
        if (stirVerstat && failValues.some((v) => stirVerstat.toLowerCase().includes(v.toLowerCase()))) {
            console.log(`[voice-gateway] Rejected call from ${callerNumber} — STIR/SHAKEN: ${stirVerstat}`);
            return twimlResponse(rejectTwiml());
        }

        // ── Step 2: Rate Limiter ────────────────────────────────────────
        if (callerNumber && checkRateLimit(callerNumber)) {
            console.log(`[voice-gateway] Rate limited ${callerNumber} — DTMF challenge`);
            const gatewayUrl = getExpectedVoiceGatewayUrl();
            if (!gatewayUrl) {
                console.error("[voice-gateway] Cannot issue DTMF challenge because NEXT_PUBLIC_APP_URL is missing. Forwarding call instead.");
                const fallbackSip = resolveSipDomain(process.env.TWILIO_ACCOUNT_SID);
                return fallbackSip
                    ? twimlResponse(forwardToLiveKitTwiml(fallbackSip))
                    : twimlResponse(rejectTwiml());
            }
            return twimlResponse(dtmfChallengeTwiml(gatewayUrl, calledNumber));
        }

        // ── Step 3: Workspace lookup & voice enabled check ──────────────
        const workspace = calledNumber
            ? await findWorkspaceByTwilioNumber(calledNumber, {
                twilioSipTrunkSid: true,
                twilioSubaccountId: true,
                voiceEnabled: true,
            })
            : null;

        if (!workspace && !isEarlymarkInboundCall) {
            console.error("[voice-gateway] Incoming call did not match a workspace number or configured Earlymark inbound number.", {
                callerNumber,
                calledNumber,
                knownInboundNumbers,
            });
        }

        if (workspace && workspace.voiceEnabled === false) {
            console.log(`[voice-gateway] Voice disabled for workspace (billing limit) — rejecting`);
            return twimlResponse(
                `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Nicole">Sorry, this number is temporarily unavailable. Please try again later.</Say>
  <Hangup />
</Response>`
            );
        }

        // ── Step 4: Forward to LiveKit SIP ──────────────────────────────
        const sipDomain = resolveSipDomain(process.env.TWILIO_ACCOUNT_SID, workspace?.twilioSubaccountId);
        if (!sipDomain) {
            console.error("[voice-gateway] Missing Twilio account SID; cannot forward inbound call safely.", {
                callerNumber,
                calledNumber,
            });
            return twimlResponse(rejectTwiml());
        }

        console.log("[voice-gateway] Forwarding inbound call", {
            callerNumber,
            calledNumber,
            routeTarget: workspace ? "workspace" : isEarlymarkInboundCall ? "earlymark_inbound" : "fallback_master",
            workspaceMatched: Boolean(workspace),
            knownInboundConfigured: knownInboundNumbers.length > 0,
        });

        return twimlResponse(forwardToLiveKitTwiml(sipDomain));
    } catch (error) {
        console.error("[voice-gateway] Error:", error);
        // Fail open: forward to SIP trunk anyway rather than dropping a real call
        const fallbackSip = resolveSipDomain(process.env.TWILIO_ACCOUNT_SID);
        return fallbackSip
            ? twimlResponse(forwardToLiveKitTwiml(fallbackSip))
            : twimlResponse(rejectTwiml());
    }
}
