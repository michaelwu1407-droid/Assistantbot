import { NextRequest, NextResponse } from "next/server";
import { initializeSimpleComms } from "@/lib/comms-simple";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { workspaceId, businessName, ownerPhone } = body;

    // Log incoming request for debugging
    console.log("[TEST-SIMPLE-PROVISION] Request received:", { 
      workspaceId, 
      businessName, 
      ownerPhone,
      timestamp: new Date().toISOString()
    });

    // Check environment variables
    const envCheck = {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? "✅ SET" : "❌ MISSING",
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? "✅ SET" : "❌ MISSING", 
      LIVEKIT_URL: process.env.LIVEKIT_URL ? "✅ SET" : "❌ MISSING",
      LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY ? "✅ SET" : "❌ MISSING",
      DATABASE_URL: process.env.DATABASE_URL ? "✅ SET" : "❌ MISSING",
      DIRECT_URL: process.env.DIRECT_URL ? "✅ SET" : "❌ MISSING",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? "✅ SET" : "❌ MISSING"
    };

    console.log("[TEST-SIMPLE-PROVISION] Environment check:", envCheck);

    if (!workspaceId || !businessName) {
      return NextResponse.json(
        { 
          error: "workspaceId and businessName are required",
          received: { workspaceId, businessName },
          envCheck
        },
        { status: 400 }
      );
    }

    console.log("[TEST-SIMPLE-PROVISION] Calling initializeSimpleComms...");
    const result = await initializeSimpleComms(workspaceId, businessName, ownerPhone || "");
    
    console.log("[TEST-SIMPLE-PROVISION] Success:", result);
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      envCheck,
      result
    });
  } catch (error) {
    console.error("[TEST-SIMPLE-PROVISION] FAILED:", {
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
    
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
