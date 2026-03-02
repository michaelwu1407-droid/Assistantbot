import { NextRequest, NextResponse } from "next/server";
import { twilioMasterClient, createTwilioSubaccount } from "@/lib/twilio";
import { initializeTradieComms } from "@/lib/comms";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    environment: {},
    twilio: {
      configured: false,
      accountSid: null as string | null,
      testSubaccount: null as { success: boolean; subaccountId?: string } | null,
      availableNumbers: null as { local: string[]; mobile: string[]; totalAvailable: number } | { error: string } | null,
      error: null as string | null
    },
    livekit: {
      configured: false,
      url: false,
      apiKey: false,
      apiSecret: false,
    },
    provisioning: {
      lastResult: null as { success: boolean; phoneNumber?: string; stageReached?: string; error?: string } | null,
      error: null as string | null
    }
  };

  // Check environment variables
  results.environment = {
    TWILIO_ACCOUNT_SID: !!process.env.TWILIO_ACCOUNT_SID,
    TWILIO_AUTH_TOKEN: !!process.env.TWILIO_AUTH_TOKEN,
    LIVEKIT_URL: !!process.env.LIVEKIT_URL,
    LIVEKIT_API_KEY: !!process.env.LIVEKIT_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL
  };

  // Test Twilio connection
  try {
    if (twilioMasterClient) {
      results.twilio.configured = true;
      results.twilio.accountSid = process.env.TWILIO_ACCOUNT_SID?.substring(0, 8) + "...";

      // Test subaccount creation
      const testSubaccount = await createTwilioSubaccount("Test-Comms-Diagnostic");
      if (testSubaccount) {
        results.twilio.testSubaccount = {
          success: true,
          subaccountId: testSubaccount.subaccountId.substring(0, 8) + "..."
        };

        // Test number availability
        try {
          const { getSubaccountClient } = await import("@/lib/twilio");
          const subClient = getSubaccountClient(testSubaccount.subaccountId, testSubaccount.subaccountAuthToken);
          
          const localNumbers = await subClient.availablePhoneNumbers("AU")
            .local.list({ smsEnabled: true, voiceEnabled: true, limit: 3 });
          
          const mobileNumbers = await subClient.availablePhoneNumbers("AU")
            .mobile.list({ smsEnabled: true, voiceEnabled: true, limit: 3 });

          results.twilio.availableNumbers = {
            local: localNumbers.map(n => n.phoneNumber),
            mobile: mobileNumbers.map(n => n.phoneNumber),
            totalAvailable: localNumbers.length + mobileNumbers.length
          };
        } catch (numberError) {
          results.twilio.availableNumbers = {
            error: numberError instanceof Error ? numberError.message : "Unknown error"
          };
        }
      } else {
        results.twilio.testSubaccount = { success: false };
      }
    } else {
      results.twilio.error = "Twilio client not initialized";
    }
  } catch (error) {
    results.twilio.error = error instanceof Error ? error.message : "Unknown error";
  }

  // Check LiveKit configuration
  results.livekit = {
    configured: !!(process.env.LIVEKIT_URL && process.env.LIVEKIT_API_KEY && process.env.LIVEKIT_API_SECRET),
    url: !!process.env.LIVEKIT_URL,
    apiKey: !!process.env.LIVEKIT_API_KEY,
    apiSecret: !!process.env.LIVEKIT_API_SECRET,
  };

  // Test full provisioning with sample data
  try {
    if (results.twilio.configured && results.livekit.configured) {
      const testResult = await initializeTradieComms(
        "test-workspace-" + Date.now(),
        "Test Business",
        "+61400000000"
      );
      results.provisioning.lastResult = {
        success: testResult.success,
        phoneNumber: testResult.phoneNumber,
        stageReached: testResult.stageReached,
        error: testResult.error
      };
    } else {
      results.provisioning.error = "Cannot test provisioning - missing configuration";
    }
  } catch (error) {
    results.provisioning.error = error instanceof Error ? error.message : "Unknown error";
  }

  return NextResponse.json(results);
}
