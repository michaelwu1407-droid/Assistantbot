import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as Sentry from "@sentry/nextjs";
import crypto from "crypto";
import { isTrackableResendEvent, processResendStatusEvent } from "@/lib/resend-status-events";

// ─── Resend Webhook Signature Verification ───────────────────────────
// Reuses the same Svix-based verification as the inbound-email webhook.

function verifyResendWebhook(payload: string, headers: Headers): boolean {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
  if (!webhookSecret) return true;

  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) return false;

  const timestampSec = parseInt(svixTimestamp, 10);
  if (isNaN(timestampSec)) return false;
  const ageMs = Date.now() - timestampSec * 1000;
  if (Math.abs(ageMs) > 5 * 60 * 1000) return false;

  try {
    const secretBytes = Buffer.from(
      webhookSecret.startsWith("whsec_")
        ? webhookSecret.slice(6)
        : webhookSecret,
      "base64"
    );
    const signedContent = `${svixId}.${svixTimestamp}.${payload}`;
    const expectedSignature = crypto
      .createHmac("sha256", secretBytes)
      .update(signedContent)
      .digest("base64");

    const signatures = svixSignature.split(" ");
    return signatures.some((sig) => {
      const sigValue = sig.startsWith("v1,") ? sig.slice(3) : sig;
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(sigValue)
      );
    });
  } catch {
    return false;
  }
}

// ─── Email Status Tracking ───────────────────────────────────────────
// Handles Resend webhook events for email delivery tracking:
//   email.delivered  — Email reached the recipient's inbox
//   email.opened     — Recipient opened the email (read receipt)
//   email.bounced    — Email bounced
//   email.complained — Recipient marked as spam

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    if (!verifyResendWebhook(rawBody, req.headers)) {
      const verifyError = new Error("Resend status webhook verification failed");
      Sentry.captureException(verifyError, {
        tags: { webhook: "resend-status", stage: "verification" },
      });

      await db.webhookEvent.create({
        data: {
          provider: "resend",
          eventType: "verification_failed",
          status: "error",
          error: "Invalid webhook signature",
        },
      }).catch(() => {});

      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);
    const eventType: string = payload.type ?? "";
    const data = payload.data ?? {};

    if (!isTrackableResendEvent(eventType)) {
      return NextResponse.json({ ok: true, skipped: eventType });
    }
    const statusResult = await processResendStatusEvent(payload);

    return NextResponse.json({
      success: true,
      event: eventType,
      status: statusResult.handled ? statusResult.statusLabel : eventType,
      contactId: statusResult.handled ? statusResult.contactId : null,
    });
  } catch (err) {
    Sentry.captureException(err, {
      tags: { webhook: "resend-status", stage: "processing" },
    });

    await db.webhookEvent.create({
      data: {
        provider: "resend",
        eventType: "processing_error",
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      },
    }).catch(() => {});

    console.error("[resend-status] Webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
