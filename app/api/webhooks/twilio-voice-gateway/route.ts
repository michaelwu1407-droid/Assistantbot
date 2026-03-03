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
import { db } from "@/lib/db";

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

// ─── POST Handler ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const callerNumber = formData.get("From")?.toString() || "";
        const calledNumber = formData.get("To")?.toString() || formData.get("Called")?.toString() || "";
        const stirVerstat = formData.get("StirVerstat")?.toString() || "";
        const dtmfPassed = req.nextUrl.searchParams.get("dtmf_passed");
        const digits = formData.get("Digits")?.toString() || "";

        // ── Step 0: DTMF challenge callback ─────────────────────────────
        // If this is a callback from a DTMF challenge and caller pressed 1
        if (dtmfPassed === "1" && digits === "1") {
            const workspace = await db.workspace.findFirst({
                where: { twilioPhoneNumber: calledNumber },
                select: { twilioSipTrunkSid: true, twilioSubaccountId: true },
            });
            const sipDomain = workspace?.twilioSubaccountId
                ? `${workspace.twilioSubaccountId}.pstn.twilio.com`
                : `${process.env.TWILIO_ACCOUNT_SID}.pstn.twilio.com`;
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
            const gatewayUrl = `${process.env.NEXT_PUBLIC_APP_URL || ""}/api/webhooks/twilio-voice-gateway`;
            return twimlResponse(dtmfChallengeTwiml(gatewayUrl, calledNumber));
        }

        // ── Step 3: Workspace lookup & voice enabled check ──────────────
        const workspace = calledNumber
            ? await db.workspace.findFirst({
                where: { twilioPhoneNumber: calledNumber },
                select: {
                    twilioSipTrunkSid: true,
                    twilioSubaccountId: true,
                    voiceEnabled: true,
                },
            })
            : null;

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
        const sipDomain = workspace?.twilioSubaccountId
            ? `${workspace.twilioSubaccountId}.pstn.twilio.com`
            : `${process.env.TWILIO_ACCOUNT_SID}.pstn.twilio.com`;

        return twimlResponse(forwardToLiveKitTwiml(sipDomain));
    } catch (error) {
        console.error("[voice-gateway] Error:", error);
        // Fail open: forward to SIP trunk anyway rather than dropping a real call
        const fallbackSip = `${process.env.TWILIO_ACCOUNT_SID}.pstn.twilio.com`;
        return twimlResponse(forwardToLiveKitTwiml(fallbackSip));
    }
}
