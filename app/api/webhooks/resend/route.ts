import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as Sentry from "@sentry/nextjs";

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
    const crypto = require("crypto") as typeof import("crypto");
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

    // Only process delivery tracking events
    const trackableEvents = [
      "email.delivered",
      "email.opened",
      "email.bounced",
      "email.complained",
    ];

    if (!trackableEvents.includes(eventType)) {
      return NextResponse.json({ ok: true, skipped: eventType });
    }

    // Extract recipient email to find the associated contact
    const recipientEmail: string = Array.isArray(data.to)
      ? data.to[0]
      : data.to ?? data.email ?? "";

    if (!recipientEmail) {
      return NextResponse.json({ ok: true, message: "No recipient found" });
    }

    // Map Resend event types to human-readable statuses
    const statusMap: Record<string, string> = {
      "email.delivered": "Delivered",
      "email.opened": "Opened",
      "email.bounced": "Bounced",
      "email.complained": "Spam Report",
    };

    const statusLabel = statusMap[eventType] ?? eventType;

    // Find the contact by email and update the most recent EMAIL activity
    const contact = await db.contact.findFirst({
      where: { email: { equals: recipientEmail, mode: "insensitive" } },
      select: { id: true, name: true, workspaceId: true },
    });

    if (contact) {
      // Find the most recent outbound EMAIL activity for this contact
      const recentActivity = await db.activity.findFirst({
        where: {
          contactId: contact.id,
          type: "EMAIL",
          title: { startsWith: "Email to" },
        },
        orderBy: { createdAt: "desc" },
      });

      if (recentActivity) {
        // Update the activity description with the tracking status
        const timestamp = new Date().toLocaleString("en-AU", {
          timeZone: "Australia/Sydney",
        });

        await db.activity.update({
          where: { id: recentActivity.id },
          data: {
            description: `${statusLabel} at ${timestamp}`,
          },
        });
      }

      // For opened events, also create a notification (read receipt)
      if (eventType === "email.opened") {
        // Find workspace owner for notification
        const workspace = await db.workspace.findUnique({
          where: { id: contact.workspaceId },
          select: { ownerId: true },
        });

        if (workspace?.ownerId) {
          await db.notification.create({
            data: {
              userId: workspace.ownerId,
              title: "Email Read Receipt",
              message: `${contact.name} opened your email`,
              type: "INFO",
              link: "/dashboard",
            },
          });
        }
      }
    }

    // Log the webhook event for diagnostics
    await db.webhookEvent.create({
      data: {
        provider: "resend",
        eventType,
        status: "success",
        payload: JSON.parse(
          JSON.stringify({
            to: recipientEmail,
            contactId: contact?.id,
            emailId: data.email_id ?? data.id,
          })
        ),
      },
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      event: eventType,
      status: statusLabel,
      contactId: contact?.id ?? null,
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
