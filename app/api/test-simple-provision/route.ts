import { NextRequest, NextResponse } from "next/server";
import { initializeSimpleComms } from "@/lib/comms-simple";

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { workspaceId, businessName, ownerPhone } = body;

  if (!workspaceId || !businessName) {
    return NextResponse.json(
      { error: "workspaceId and businessName are required" },
      { status: 400 }
    );
  }

  try {
    const result = await initializeSimpleComms(workspaceId, businessName, ownerPhone || "");
    
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      result
    });
  } catch (error) {
    console.error("Test simple provision failed:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
