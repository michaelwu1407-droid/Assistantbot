import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { scheduleLeadCallback } from "@/lib/lead-callback";
import type { CallbackJobPayload } from "@/lib/qstash";

export const dynamic = "force-dynamic";

/**
 * QStash callback receiver — fires a scheduled lead callback at the requested
 * time (sub-minute precision, unlike the 5-min cron sweep). QStash signs every
 * delivery; we verify the signature before acting. Dispatches with delaySec: 0
 * so scheduleLeadCallback dials immediately now that the delay has elapsed.
 */
export async function POST(request: NextRequest) {
  const currentSigningKey = (process.env.QSTASH_CURRENT_SIGNING_KEY || "").trim();
  const nextSigningKey = (process.env.QSTASH_NEXT_SIGNING_KEY || "").trim();
  const signature = request.headers.get("upstash-signature");

  const body = await request.text();

  // Verify the QStash signature unless explicitly skipped in dev/test.
  const skipVerify =
    process.env.NODE_ENV !== "production" &&
    process.env.QSTASH_VERIFY_IN_DEV !== "true";

  if (!skipVerify) {
    if (!currentSigningKey || !nextSigningKey) {
      return NextResponse.json({ error: "QStash signing keys not configured" }, { status: 500 });
    }
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 401 });
    }
    try {
      const receiver = new Receiver({ currentSigningKey, nextSigningKey });
      const valid = await receiver.verify({ signature, body });
      if (!valid) {
        return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let payload: CallbackJobPayload;
  try {
    payload = JSON.parse(body) as CallbackJobPayload;
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  if (!payload?.workspaceId || !payload?.dealId || !payload?.contactPhone) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  try {
    await scheduleLeadCallback({
      workspaceId: payload.workspaceId,
      contactId: payload.contactId ?? null,
      contactPhone: payload.contactPhone,
      contactName: payload.contactName ?? undefined,
      dealId: payload.dealId,
      reason: payload.reason,
      delaySec: 0, // delay already elapsed in QStash — dial now
      triggerSource: payload.triggerSource ?? null,
      callbackKind: payload.callbackKind ?? "automatic",
      initiatedByUserId: payload.initiatedByUserId ?? null,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to dispatch scheduled callback",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
