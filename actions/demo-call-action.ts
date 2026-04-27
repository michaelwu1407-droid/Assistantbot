"use server";

import { headers } from "next/headers";
import { initiateDemoCall } from "@/lib/demo-call";
import {
    markDemoLeadFailed,
    markDemoLeadInitiated,
    persistDemoLeadAttempt,
} from "@/lib/demo-lead-store";

/**
 * Demo call action — triggered from the homepage "Interview Tracey" form.
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

export async function requestDemoCall(data: DemoCallData): Promise<DemoCallResult> {
    const validation = validate(data);
    if (!validation.ok) {
        return { success: false, error: validation.error, field: validation.field, leadId: null };
    }

    const meta = await readRequestMeta();

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
        const result = await initiateDemoCall({
            phone: data.phone,
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            businessName: data.businessName,
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

        return { success: true, message: "Tracey is calling you now!", leadId };
    } catch (err) {
        console.error("[Demo Call] Failed:", err);
        await markDemoLeadFailed(leadId, err);

        const message = err instanceof Error ? err.message : "";
        const userMessage = /phone number/i.test(message)
            ? message
            : "Could not reach voice service. Please try again shortly — we have your details and will call you back.";

        return { success: false, error: userMessage, leadId };
    }
}
