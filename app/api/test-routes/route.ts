import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    message: "✅ Routes are working!",
    timestamp: new Date().toISOString(),
    test: "diagnostic-endpoint"
  });
}
