import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { twilioMasterClient } = await import("@/lib/twilio");
    
    if (!twilioMasterClient) {
      return NextResponse.json({
        error: "Twilio client not initialized",
        envCheck: {
          TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? "✅ SET" : "❌ MISSING",
          TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? "✅ SET" : "❌ MISSING"
        }
      }, { status: 400 });
    }

    // Test authentication
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const account = await twilioMasterClient.api.v2010.accounts(accountSid).fetch();
    
    // Test number search (this is where it might fail)
    let numberSearchResult: any = "❌ NOT TESTED";
    try {
      const localNumbers = await twilioMasterClient.availablePhoneNumbers("AU")
        .local.list({ smsEnabled: true, voiceEnabled: true, limit: 1 });
      
      numberSearchResult = {
        success: true,
        count: localNumbers.length,
        sampleNumber: localNumbers[0]?.phoneNumber || "none available"
      };
    } catch (searchError) {
      numberSearchResult = {
        success: false,
        error: searchError instanceof Error ? searchError.message : "Unknown error",
        code: (searchError as any)?.code || "NO_CODE"
      };
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      account: {
        sid: account.sid,
        friendlyName: account.friendlyName,
        status: account.status,
        type: account.type,
        dateCreated: account.dateCreated
      },
      numberSearchResult,
      envCheck: {
        TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? "✅ SET" : "❌ MISSING",
        TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? "✅ SET" : "❌ MISSING"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
