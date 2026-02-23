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
        hasRetellKey: !!process.env.RETELL_API_KEY,
        hasRetellAgent: !!process.env.RETELL_AGENT_ID,
      }
    });
  } catch (error: any) {
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
