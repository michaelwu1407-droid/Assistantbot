import { NextRequest, NextResponse } from "next/server";
import { getPhoneNumberStatus } from "@/actions/phone-settings";

export async function GET() {
  try {
    const status = await getPhoneNumberStatus();
    return NextResponse.json({ 
      success: true, 
      status,
      env: {
        hasTwilioSid: !!process.env.TWILIO_ACCOUNT_SID,
        hasTwilioToken: !!process.env.TWILIO_AUTH_TOKEN,
        hasLivekitUrl: !!process.env.LIVEKIT_URL,
        hasLivekitKey: !!process.env.LIVEKIT_API_KEY,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
