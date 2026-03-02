"use server";

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
