import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Simple environment check
    const envCheck = {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? "✅ SET" : "❌ MISSING",
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? "✅ SET" : "❌ MISSING", 
      RETELL_API_KEY: process.env.RETELL_API_KEY ? "✅ SET" : "❌ MISSING",
      RETELL_AGENT_ID: process.env.RETELL_AGENT_ID ? "✅ SET" : "❌ MISSING",
      DATABASE_URL: process.env.DATABASE_URL ? "✅ SET" : "❌ MISSING",
      DIRECT_URL: process.env.DIRECT_URL ? "✅ SET" : "❌ MISSING",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? "✅ SET" : "❌ MISSING",
      RESEND_API_KEY: process.env.RESEND_API_KEY ? "✅ SET" : "❌ MISSING",
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ? "✅ SET" : "❌ MISSING",
      RESEND_FROM_DOMAIN: process.env.RESEND_FROM_DOMAIN ? "✅ SET" : "❌ MISSING"
    };

    // Test database connection
    let dbTest = "❌ NOT TESTED";
    try {
      const { db } = await import("@/lib/db");
      await db.$queryRaw`SELECT 1`;
      dbTest = "✅ CONNECTED";
    } catch (dbError) {
      dbTest = `❌ FAILED: ${dbError instanceof Error ? dbError.message : "Unknown error"}`;
    }

    // Test Twilio client
    let twilioTest = "❌ NOT TESTED";
    try {
      const { twilioMasterClient } = await import("@/lib/twilio");
      twilioTest = twilioMasterClient ? "✅ INITIALIZED" : "❌ NOT INITIALIZED";
    } catch (twilioError) {
      twilioTest = `❌ FAILED: ${twilioError instanceof Error ? twilioError.message : "Unknown error"}`;
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      envCheck,
      dbTest,
      twilioTest
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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Simple environment check
    const envCheck = {
      TWILIO_ACCOUNT_SID: process.env.TWILIO_ACCOUNT_SID ? "✅ SET" : "❌ MISSING",
      TWILIO_AUTH_TOKEN: process.env.TWILIO_AUTH_TOKEN ? "✅ SET" : "❌ MISSING", 
      RETELL_API_KEY: process.env.RETELL_API_KEY ? "✅ SET" : "❌ MISSING",
      RETELL_AGENT_ID: process.env.RETELL_AGENT_ID ? "✅ SET" : "❌ MISSING",
      DATABASE_URL: process.env.DATABASE_URL ? "✅ SET" : "❌ MISSING",
      DIRECT_URL: process.env.DIRECT_URL ? "✅ SET" : "❌ MISSING",
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL ? "✅ SET" : "❌ MISSING",
      RESEND_API_KEY: process.env.RESEND_API_KEY ? "✅ SET" : "❌ MISSING",
      RESEND_FROM_EMAIL: process.env.RESEND_FROM_EMAIL ? "✅ SET" : "❌ MISSING",
      RESEND_FROM_DOMAIN: process.env.RESEND_FROM_DOMAIN ? "✅ SET" : "❌ MISSING"
    };

    // Test database connection
    let dbTest = "❌ NOT TESTED";
    try {
      const { db } = await import("@/lib/db");
      await db.$queryRaw`SELECT 1`;
      dbTest = "✅ CONNECTED";
    } catch (dbError) {
      dbTest = `❌ FAILED: ${dbError instanceof Error ? dbError.message : "Unknown error"}`;
    }

    // Test Twilio client
    let twilioTest = "❌ NOT TESTED";
    try {
      const { twilioMasterClient } = await import("@/lib/twilio");
      twilioTest = twilioMasterClient ? "✅ INITIALIZED" : "❌ NOT INITIALIZED";
    } catch (twilioError) {
      twilioTest = `❌ FAILED: ${twilioError instanceof Error ? twilioError.message : "Unknown error"}`;
    }

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      envCheck,
      dbTest,
      twilioTest,
      requestBody: body
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
