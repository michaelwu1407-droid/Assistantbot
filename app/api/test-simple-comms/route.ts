import { NextRequest, NextResponse } from "next/server";
import { twilioMasterClient } from "@/lib/twilio";

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    twilioClient: !!twilioMasterClient,
    accountSid: process.env.TWILIO_ACCOUNT_SID?.substring(0, 8) + "...",
    numberSearch: null as any,
    numberPurchase: null as any,
    error: null as string | null
  };

  try {
    if (!twilioMasterClient) {
      results.error = "Twilio client not initialized";
      return NextResponse.json(results);
    }

    // Test 1: Search for available numbers
    const localNumbers = await twilioMasterClient.availablePhoneNumbers("AU")
      .local.list({ smsEnabled: true, voiceEnabled: true, limit: 3 });

    const mobileNumbers = await twilioMasterClient.availablePhoneNumbers("AU")
      .mobile.list({ smsEnabled: true, voiceEnabled: true, limit: 3 });

    results.numberSearch = {
      localAvailable: localNumbers.length,
      mobileAvailable: mobileNumbers.length,
      sampleLocal: localNumbers[0]?.phoneNumber,
      sampleMobile: mobileNumbers[0]?.phoneNumber
    };

    // Test 2: Try to purchase a number (don't actually buy, just test the API call)
    if (localNumbers.length > 0 || mobileNumbers.length > 0) {
      const chosenNumber = localNumbers[0]?.phoneNumber || mobileNumbers[0]?.phoneNumber;
      results.numberPurchase = {
        canPurchase: !!chosenNumber,
        sampleNumber: chosenNumber,
        note: "Not actually purchasing - just testing API access"
      };
    } else {
      results.numberPurchase = {
        canPurchase: false,
        error: "No numbers available"
      };
    }

  } catch (error) {
    results.error = error instanceof Error ? error.message : "Unknown error";
  }

  return NextResponse.json(results);
}
