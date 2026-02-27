import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { waitUntil } from "@vercel/functions";
import { processAgentCommand } from "@/lib/services/ai-agent";
import twilio from "twilio";

export const maxDuration = 60; // Allow 60s for Vercel Pro/Hobby wait times

// Initialize twilio client using master config
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioWhatsAppNumber = process.env.NEXT_PUBLIC_TWILIO_WHATSAPP_NUMBER || process.env.TWILIO_WHATSAPP_NUMBER;

const twilioClient = accountSid && authToken ? twilio(accountSid, authToken) : null;

// Initialize Supabase Admin Bypass RLS
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    }
);

export async function POST(req: Request) {
    try {
        const formData = await req.formData();
        const from = formData.get("From")?.toString() || "";
        const body = formData.get("Body")?.toString() || "";
        const profileName = formData.get("ProfileName")?.toString() || "";

        console.log(`[WhatsApp Webhook] Received message from ${from}: ${body}`);

        // Twilio WhatsApp numbers are prefixed with "whatsapp:"
        const cleanNumber = from.replace("whatsapp:", "").trim();

        if (!cleanNumber) {
            console.warn("[WhatsApp Webhook] No 'From' number provided.");
            return new NextResponse("OK", { status: 200 }); // Always 200 to prevent retry loops
        }

        // Authenticate user by phone bypassing RLS
        // In our schema, `phone` is the personal phone field on `User`.
        const { data: users, error } = await supabaseAdmin
            .from("User")
            .select("id, name, workspace:Workspace(agentMode, aiPreferences)")
            .eq("phone", cleanNumber);

        if (error) {
            console.error("[WhatsApp Webhook] Error querying user:", error);
            return new NextResponse("OK", { status: 200 });
        }

        const user = users && users.length > 0 ? users[0] : null;

        if (!user) {
            // Unauthorized fallback
            console.warn(`[WhatsApp Webhook] Unrecognized number: ${cleanNumber}`);
            if (twilioClient && twilioWhatsAppNumber) {
                try {
                    await twilioClient.messages.create({
                        from: `whatsapp:${twilioWhatsAppNumber}`,
                        to: `whatsapp:${cleanNumber}`,
                        body: "🚫 Number not recognized. Please ensure your personal mobile number is saved in your Earlymark settings."
                    });
                } catch (twilioErr) {
                    console.error("[WhatsApp Webhook] Error sending unauthorized message:", twilioErr);
                }
            }
            return new NextResponse("OK", { status: 200 });
        }

        // Authorized User: pass to AI logic handler safely in background
        const processPromise = processAgentCommand(user.id, body)
            .then(async (aiResponse) => {
                // Reply to user
                if (twilioClient && twilioWhatsAppNumber) {
                    await twilioClient.messages.create({
                        from: `whatsapp:${twilioWhatsAppNumber}`,
                        to: `whatsapp:${cleanNumber}`,
                        body: aiResponse
                    });
                }
            })
            .catch(async (aiErr) => {
                console.error("[WhatsApp Webhook] Error processing AI command:", aiErr);
                // Send a generic error reply
                if (twilioClient && twilioWhatsAppNumber) {
                    try {
                        await twilioClient.messages.create({
                            from: `whatsapp:${twilioWhatsAppNumber}`,
                            to: `whatsapp:${cleanNumber}`,
                            body: "⚠️ The system encountered an error while processing your request. Please try again later."
                        });
                    } catch (twilioErr) {
                        console.error("[WhatsApp Webhook] Error sending fallback system error:", twilioErr);
                    }
                }
            });

        waitUntil(processPromise);

        return new NextResponse("OK", { status: 200 });
    } catch (error) {
        console.error("[WhatsApp Webhook] Fatal system error:", error);
        // Always return 200 OK so Twilio doesn't retry indefinitely
        return new NextResponse("OK", { status: 200 });
    }
}
