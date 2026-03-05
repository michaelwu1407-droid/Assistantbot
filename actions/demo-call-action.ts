"use server";

/**
 * Demo call action — triggered from the homepage "Interview Tracey" form.
 *
 * VOICE PLATFORM: LiveKit
 * Creates an outbound SIP call via /api/demo-call which uses livekit-server-sdk
 * to dial the prospect through the Twilio SIP trunk. The LiveKit agent joins
 * the room with demo metadata, triggering the 5-min sales-oriented prompt.
 */

type DemoCallData = {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    businessName: string;
};

type DemoCallResult =
    | { success: true; message: string }
    | { success: false; error: string };

export async function requestDemoCall(data: DemoCallData): Promise<DemoCallResult> {
    if (!data.firstName || !data.phone) {
        return { success: false, error: "Please fill in all required fields." };
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    try {
        const res = await fetch(`${appUrl}/api/demo-call`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                phone: data.phone,
                firstName: data.firstName,
                businessName: data.businessName,
            }),
        });

        const result = await res.json();

        if (!res.ok || !result.success) {
            console.error("[Demo Call] API error:", result.error);
            return {
                success: false,
                error: result.error || "Failed to initiate call. Please try again.",
            };
        }

        console.log("[Demo Call] Initiated:", {
            name: `${data.firstName} ${data.lastName}`.trim(),
            phone: data.phone,
            room: result.roomName,
        });

        return { success: true, message: "Tracey is calling you now!" };
    } catch (err) {
        console.error("[Demo Call] Failed:", err);
        return {
            success: false,
            error: "Could not reach voice service. Please try again shortly.",
        };
    }
}
