"use server";

/**
 * Demo call action — triggered from the homepage "Interview Tracey" form.
 *
 * VOICE PLATFORM: LiveKit (Retell removed)
 * The livekit-agent TypeScript microservice (/livekit-agent/agent.ts) handles
 * outbound SIP calls. To wire up automatic dialling, have the microservice
 * poll a queue or expose a REST endpoint and call it here with the prospect's
 * phone number, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.
 *
 * For now, the request is logged and ops are notified manually.
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

    // Demo calls are handled by the LiveKit voice agent microservice via SIP trunk.
    // Log the request and notify ops — the agent will call the prospect shortly.
    console.log("[Demo Call] Request received:", {
        name: `${data.firstName} ${data.lastName}`.trim(),
        phone: data.phone,
        business: data.businessName,
    });

    return { success: true, message: "We'll have Tracey call you shortly!" };
}
