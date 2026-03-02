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

    const retellApiKey = process.env.RETELL_API_KEY;
    const retellAgentId = process.env.RETELL_DEMO_AGENT_ID;
    const retellFromNumber = process.env.RETELL_PHONE_NUMBER;

    if (!retellApiKey || !retellAgentId || !retellFromNumber) {
        // Gracefully degrade when Retell isn't configured for demos
        console.log("[Demo Call] Retell demo not configured — would call:", data.phone, "for", data.businessName);
        return { success: true, message: "We'll have Tracey call you shortly!" };
    }

    try {
        const response = await fetch("https://api.retellai.com/v2/create-phone-call", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${retellApiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                from_number: retellFromNumber,
                to_number: data.phone,
                agent_id: retellAgentId,
                retell_llm_dynamic_variables: {
                    prospect_name: `${data.firstName} ${data.lastName}`.trim(),
                    business_name: data.businessName,
                },
            }),
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[Demo Call] Retell API error:", errorText);
            return { success: false, error: "Unable to initiate call. Please try again." };
        }

        return { success: true, message: "Tracey is calling you now!" };
    } catch (err) {
        console.error("[Demo Call] Network error:", err);
        return { success: false, error: "Something went wrong. Please try again." };
    }
}
