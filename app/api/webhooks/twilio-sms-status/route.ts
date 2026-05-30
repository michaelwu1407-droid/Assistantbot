/**
 * Twilio SMS delivery-status callback — /api/webhooks/twilio-sms-status
 *
 * Twilio POSTs here (StatusCallback) whenever a message transitions to a
 * terminal state: sent, delivered, undelivered, failed, read.
 *
 * On failure (undelivered / failed) we:
 *  1. Find the Activity that logged the outbound SMS (matched by MessageSid
 *     stored in Activity.description).
 *  2. Append a "SMS delivery failed" Activity linked to the same deal/contact.
 *  3. Create an in-app Notification for the workspace owner so they can
 *     follow up by another channel.
 *
 * Twilio's signature is verified before any DB work.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  getTwilioRequestPublicUrl,
  readTwilioFormParams,
  verifyTwilioSignature,
} from "@/lib/twilio/verify-signature";

export const dynamic = "force-dynamic";

const TERMINAL_FAILURE = new Set(["failed", "undelivered"]);

export async function POST(req: NextRequest) {
  const fullUrl = getTwilioRequestPublicUrl(req);
  const formParams = await readTwilioFormParams(req);
  const signatureHeader = req.headers.get("x-twilio-signature");

  const verification = verifyTwilioSignature({ signatureHeader, fullUrl, formParams });
  if (!verification.ok) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const messageSid: string = formParams.MessageSid ?? "";
  const messageStatus: string = formParams.MessageStatus ?? "";

  if (!messageSid || !TERMINAL_FAILURE.has(messageStatus)) {
    return new NextResponse("OK", { status: 200 });
  }

  try {
    const activity = await db.activity.findFirst({
      where: { description: messageSid },
      select: { id: true, dealId: true, contactId: true, content: true },
    });

    if (!activity) {
      return new NextResponse("OK", { status: 200 });
    }

    // Find the workspace owner via the deal
    let workspaceOwnerId: string | null = null;
    let contactName = "your contact";
    if (activity.dealId) {
      const deal = await db.deal.findUnique({
        where: { id: activity.dealId },
        select: {
          workspaceId: true,
          contact: { select: { name: true } },
        },
      });
      if (deal) {
        const owner = await db.user.findFirst({
          where: { workspaceId: deal.workspaceId },
          select: { id: true },
        });
        workspaceOwnerId = owner?.id ?? null;
        contactName = deal.contact?.name ?? contactName;
      }
    }

    await db.activity.create({
      data: {
        type: "NOTE",
        title: "SMS delivery failed",
        description: messageSid,
        content: `Twilio reported this message as "${messageStatus}". The customer may not have received it — try calling or using another channel.`,
        dealId: activity.dealId ?? undefined,
        contactId: activity.contactId ?? undefined,
      },
    });

    if (workspaceOwnerId) {
      await db.notification.create({
        data: {
          userId: workspaceOwnerId,
          title: "SMS failed to deliver",
          message: `A message to ${contactName} could not be delivered. Check the activity log and try another channel.`,
          type: "ERROR",
          link: activity.dealId ? `/crm/deals/${activity.dealId}` : `/crm/inbox`,
        },
      });
    }
  } catch (err) {
    console.error("[twilio-sms-status] DB error:", err);
  }

  return new NextResponse("OK", { status: 200 });
}
