import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as Sentry from "@sentry/nextjs";
import crypto from "crypto";
import { isTrackableResendEvent, processResendStatusEvent } from "@/lib/resend-status-events";
import { runIdempotent } from "@/lib/idempotency";

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

    // Idempotency key: Svix delivers the same `svix-id` for retries of the
    // same event. Fall back to a hash of the body if the header is missing
    // (dev/local) so we still dedupe within a window.
    const svixId = req.headers.get("svix-id") || "";
    const dedupKey =
      svixId ||
      `${eventType}:${data?.email_id ?? data?.message_id ?? crypto.createHash("sha256").update(rawBody).digest("hex").slice(0, 16)}`;

    const idempotency = await runIdempotent({
      actionType: "resend.webhook",
      parts: [dedupKey],
      bucketAt: new Date(),
      resultFactory: async () => processResendStatusEvent(payload),
      waitForCompletionMs: 4000,
    });

    if (!idempotency.created) {
      return NextResponse.json({ success: true, event: eventType, deduped: true });
    }

    const statusResult = idempotency.result;
    return NextResponse.json({
      success: true,
      event: eventType,
      status: statusResult?.handled ? statusResult.statusLabel : eventType,
      contactId: statusResult?.handled ? statusResult.contactId : null,
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
