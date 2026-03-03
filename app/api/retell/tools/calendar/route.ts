/**
 * ╔══════════════════════════════════════════════════════════════════╗
 * ║  ARCHIVED — Retell calendar tool endpoint (INACTIVE)           ║
 * ║  Voice platform migrated to LiveKit Agents (2026-03).          ║
 * ║  This route returns 410 Gone. Do NOT re-enable.                ║
 * ║  For the active voice stack see: /livekit-agent/ and lib/comms  ║
 * ╚══════════════════════════════════════════════════════════════════╝
 */

import { NextResponse } from "next/server";

export async function POST() {
  return new NextResponse(
    JSON.stringify({
      error: "Gone",
      message: "Retell AI integration has been deprecated. Voice is now handled by LiveKit Agents.",
    }),
    { status: 410, headers: { "Content-Type": "application/json" } }
  );
}
