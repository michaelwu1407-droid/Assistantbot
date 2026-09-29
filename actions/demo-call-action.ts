"use server";

import { headers } from "next/headers";
import { initiateDemoCall } from "@/lib/demo-call";
import { dispatchDemoCallFailureAlert } from "@/lib/demo-call-failure-alert";
import { getDemoCallUserMessage } from "@/lib/demo-call-errors";
import { sendDemoLeadNotificationEmail } from "@/lib/demo-lead-email";
import {
    markDemoLeadFailed,
    markDemoLeadInitiated,
    persistDemoLeadAttempt,
} from "@/lib/demo-lead-store";
import { rateLimit } from "@/lib/rate-limit";
import { normalizePhone } from "@/lib/phone-utils";

/**
 * This action is unauthenticated by design — it's the homepage "Interview Tracey"
 * form — but it places a real outbound PSTN call to whatever number is submitted.
 * Without limits that is both a Twilio cost bomb and a way to make Earlymark
 * repeatedly ring a stranger, so every submission is capped twice:
 *
 * - per IP, to stop one actor dialling in bulk;
 * - per destination number, so rotating IPs still can't harass one handset.
 */
const DEMO_CALLS_PER_IP = 3;
const DEMO_CALLS_PER_IP_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const DEMO_CALLS_PER_PHONE = 2;
const DEMO_CALLS_PER_PHONE_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 day

/**
 * Demo call action - triggered from the homepage "Interview Tracey" form.
 *
 * VOICE PLATFORM: LiveKit
 * Creates an outbound SIP call via /api/demo-call which uses livekit-server-sdk
 * to dial the prospect through the Twilio SIP trunk. The LiveKit agent joins
 * the room with demo metadata, triggering the 5-min sales-oriented prompt.
 *
 * Resilience contract:
 * - Always persists the lead to DemoLead BEFORE dialing so a prospect is never
 *   lost even if LiveKit, Twilio, or the network is down.
 * - Validates every required field client-trustlessly so that a malformed
 *   submission returns a clear field-specific error instead of a generic 500.
 * - Catches every error from `initiateDemoCall` and returns a structured
 *   result. The form layer never has to handle an unhandled rejection.
 */

type DemoCallData = {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    businessName: string;
};

type DemoCallResult =
    | { success: true; message: string; leadId: string | null }
    | { success: false; error: string; field?: keyof DemoCallData; leadId: string | null };

function validate(data: DemoCallData):
    | { ok: true }
    | { ok: false; error: string; field?: keyof DemoCallData } {
    if (!data.firstName?.trim()) {
        return { ok: false, error: "Please enter your first name.", field: "firstName" };
    }
    if (!data.lastName?.trim()) {
        return { ok: false, error: "Please enter your last name.", field: "lastName" };
    }
    if (!data.phone?.trim()) {
        return { ok: false, error: "Please enter your phone number.", field: "phone" };
    }
    if (!data.email?.trim()) {
        return { ok: false, error: "Please enter your email address.", field: "email" };
    }
    if (!data.businessName?.trim()) {
        return { ok: false, error: "Please enter your business name.", field: "businessName" };
    }
    return { ok: true };
}

async function readRequestMeta(): Promise<{ ipAddress?: string; userAgent?: string }> {
    try {
        const h = await headers();
        const forwarded = h.get("x-forwarded-for");
        const ipAddress = forwarded?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;
        const userAgent = h.get("user-agent") || undefined;
        return { ipAddress, userAgent };
    } catch {
        return {};
    }
}

/**
 * Returns a customer-facing message when this submission should be refused, or
 * null to let it through. Deliberately vague about which limit was hit — the
 * caller doesn't need to know, and it gives an abuser less to work with.
 */
async function isDemoCallThrottled(
    ipAddress: string | undefined,
    phone: string,
): Promise<string | null> {
    const tooManyTries =
        "We've already got a few call requests from you. Give it an hour and try again, or email us and we'll ring you back.";

    const normalizedPhone = normalizePhone(phone) || phone.trim();
    const byPhone = await rateLimit(
        `demo-call:phone:${normalizedPhone}`,
        DEMO_CALLS_PER_PHONE,
        DEMO_CALLS_PER_PHONE_WINDOW_MS,
    );
    if (!byPhone.allowed) {
        return "We've already called this number today. Try again tomorrow, or email us and we'll sort it out.";
    }

    if (ipAddress) {
        const byIp = await rateLimit(
            `demo-call:ip:${ipAddress}`,
            DEMO_CALLS_PER_IP,
            DEMO_CALLS_PER_IP_WINDOW_MS,
        );
        if (!byIp.allowed) return tooManyTries;
    }

    return null;
}

export async function requestDemoCall(data: DemoCallData): Promise<DemoCallResult> {
    const validation = validate(data);
    if (!validation.ok) {
        return { success: false, error: validation.error, field: validation.field, leadId: null };
    }

    const meta = await readRequestMeta();

    // Checked before the lead is persisted so a flood can't fill the table either.
    const throttled = await isDemoCallThrottled(meta.ipAddress, data.phone);
    if (throttled) {
        return { success: false, error: throttled, field: "phone", leadId: null };
    }

    const leadId = await persistDemoLeadAttempt({
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        email: data.email,
        businessName: data.businessName,
        source: "homepage_form",
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
    });

    try {
        // waitForConnection MUST stay true. Without it, createSipParticipant
        // returns immediately and we treat fire-and-forget as success, so a
        // silently-failed outbound leg (rejected, no trunk match, worker not
        // subscribed) never throws and dispatchDemoCallFailureAlert never
        // fires — admins get no failure email.
        const result = await initiateDemoCall({
            phone: data.phone,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            businessName: data.businessName,
        }, {
            // Public demos should behave like a normal phone call first.
            // The direct LiveKit outbound SIP path can stay in a pending state
            // without proving the handset actually rang; the Twilio bridge gives
            // us a real PSTN call leg and then hands that call into LiveKit.
            preferTwilioSipBridge: true,
            waitForConnection: true,
        });

        console.log("[Demo Call] Initiated:", {
            leadId,
            name: `${data.firstName} ${data.lastName}`.trim(),
            phone: data.phone,
            room: result.roomName,
            trunkId: result.resolvedTrunkId,
            callerNumber: result.callerNumber,
            warnings: result.warnings,
        });

        await markDemoLeadInitiated(leadId, {
            roomName: result.roomName,
            resolvedTrunkId: result.resolvedTrunkId,
            callerNumber: result.callerNumber,
            warnings: result.warnings,
        });

        await sendDemoLeadNotificationEmail({
            leadId,
            source: "homepage_form",
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            email: data.email,
            businessName: data.businessName,
            callStatus: "initiated",
            roomName: result.roomName,
            resolvedTrunkId: result.resolvedTrunkId,
            callerNumber: result.callerNumber,
            warnings: result.warnings,
        }).catch((emailError) => {
            console.error("[Demo Call] Failed to send sales lead email:", emailError);
        });

        return { success: true, message: "Tracey is calling you now!", leadId };
    } catch (err) {
        console.error("[Demo Call] Failed:", err);
        await markDemoLeadFailed(leadId, err);
        await dispatchDemoCallFailureAlert({
            leadId,
            source: "homepage_form",
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            phone: data.phone,
            businessName: data.businessName,
            error: err,
        }).catch(() => null);

        await sendDemoLeadNotificationEmail({
            leadId,
            source: "homepage_form",
            firstName: data.firstName,
            lastName: data.lastName,
            phone: data.phone,
            email: data.email,
            businessName: data.businessName,
            callStatus: "failed",
            callError: err instanceof Error ? err.message : String(err),
        }).catch((emailError) => {
            console.error("[Demo Call] Failed to send sales lead email:", emailError);
        });

        return { success: false, error: getDemoCallUserMessage(err), leadId };
    }
}
