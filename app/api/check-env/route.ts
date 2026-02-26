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
    retell: {
      apiKey: !!process.env.RETELL_API_KEY,
      agentId: !!process.env.RETELL_AGENT_ID,
      responseEngineId: !!process.env.RETELL_RESPONSE_ENGINE_ID,
      primaryVoiceId: !!process.env.RETELL_PRIMARY_VOICE_ID,
      fallbackVoiceId: !!process.env.RETELL_FALLBACK_VOICE_ID,
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
      retellAgentId: process.env.RETELL_AGENT_ID ? 
        process.env.RETELL_AGENT_ID.substring(0, 8) + "..." : null,
    }
  };

  const missing = [];
  
  if (!env.twilio.accountSid) missing.push("TWILIO_ACCOUNT_SID");
  if (!env.twilio.authToken) missing.push("TWILIO_AUTH_TOKEN");
  if (!env.retell.apiKey) missing.push("RETELL_API_KEY");
  if (!env.retell.agentId) missing.push("RETELL_AGENT_ID");

  return NextResponse.json({
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    provisioningReady: missing.length === 0,
    missing,
    env
  });
}
