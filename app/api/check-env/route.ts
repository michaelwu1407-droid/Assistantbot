import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const env = {
    // Core required for phone provisioning
    twilio: {
      accountSid: !!process.env.TWILIO_ACCOUNT_SID,
      authToken: !!process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: !!process.env.TWILIO_PHONE_NUMBER,
      whatsappNumber: !!process.env.TWILIO_WHATSAPP_NUMBER,
    },
    livekit: {
      url: !!process.env.LIVEKIT_URL,
      apiKey: !!process.env.LIVEKIT_API_KEY,
      apiSecret: !!process.env.LIVEKIT_API_SECRET,
      sipUri: !!process.env.LIVEKIT_SIP_URI,
    },
    // Other important env vars
    app: {
      url: process.env.NEXT_PUBLIC_APP_URL,
      supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      geminiApiKey: !!process.env.GEMINI_API_KEY,
    },
    // Show masked values for debugging (partial)
    masked: {
      twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?
        process.env.TWILIO_ACCOUNT_SID.substring(0, 8) + "..." : null,
      livekitUrl: process.env.LIVEKIT_URL ?? null,
    }
  };

  const missing = [];
  
  if (!env.twilio.accountSid) missing.push("TWILIO_ACCOUNT_SID");
  if (!env.twilio.authToken) missing.push("TWILIO_AUTH_TOKEN");
  if (!env.livekit.url) missing.push("LIVEKIT_URL");
  if (!env.livekit.apiKey) missing.push("LIVEKIT_API_KEY");
  if (!env.livekit.apiSecret) missing.push("LIVEKIT_API_SECRET");

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    provisioningReady: missing.length === 0,
    missing,
    env
  });
}
