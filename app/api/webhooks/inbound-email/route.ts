import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processIncomingEmailWithGemini } from "@/lib/ai/email-agent";

// ─── Resend Webhook Signature Verification ───────────────────────────
// Resend signs webhook payloads using a shared secret (configured in
// Resend Dashboard → Webhooks → Signing Secret). If set, every incoming
// request must include a valid `svix-signature` header.

function verifyResendWebhook(
  payload: string,
  headers: Headers
): boolean {
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;

  // If no secret is configured, skip verification (dev/testing mode)
  if (!webhookSecret) return true;

  const svixId = headers.get("svix-id");
  const svixTimestamp = headers.get("svix-timestamp");
  const svixSignature = headers.get("svix-signature");

  // All three Svix headers are required when a secret is configured
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Reject stale webhooks (> 5 minutes old) to prevent replay attacks
  const timestampSec = parseInt(svixTimestamp, 10);
  if (isNaN(timestampSec)) return false;
  const ageMs = Date.now() - timestampSec * 1000;
  if (Math.abs(ageMs) > 5 * 60 * 1000) return false;

  // Compute the expected signature using HMAC-SHA256
  // Svix signature format: v1,<base64-hmac>
  try {
    const crypto = require("crypto") as typeof import("crypto");
    // Svix secrets are prefixed with "whsec_" and base64-encoded
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

    // Svix may send multiple signatures separated by spaces
    const signatures = svixSignature.split(" ");
    return signatures.some((sig) => {
      const sigValue = sig.startsWith("v1,") ? sig.slice(3) : sig;
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(sigValue)
      );
    });
  } catch (err) {
    console.error("[inbound-email] Signature verification error:", err);
    return false;
  }
}

// ─── Subdomain Parsing ───────────────────────────────────────────────
// Extracts the subdomain from an address like:
//   info@tradiesrus.earlymark.ai  →  "tradiesrus"
//   support@acme-plumbing.earlymark.ai  →  "acme-plumbing"

function extractSubdomain(email: string): string | null {
  const domainBase = process.env.RESEND_FROM_DOMAIN ?? "earlymark.ai";
  const atIdx = email.indexOf("@");
  if (atIdx === -1) return null;

  const domain = email.substring(atIdx + 1).toLowerCase();

  // Match pattern: <subdomain>.<baseDomain>
  if (domain.endsWith(`.${domainBase}`)) {
    const subdomain = domain.slice(0, -(domainBase.length + 1));
    return subdomain || null;
  }

  // Also accept a direct match to the domain (no subdomain)
  if (domain === domainBase) return null;

  return null;
}

// ─── Email Address Extraction ────────────────────────────────────────
// Handles both "Name <email@x.com>" and plain "email@x.com" formats.

function parseEmailAddress(raw: string): { name: string; email: string } {
  const bracketMatch = raw.match(/^(.+?)\s*<([^>]+)>$/);
  if (bracketMatch) {
    return {
      name: bracketMatch[1].replace(/^["']|["']$/g, "").trim(),
      email: bracketMatch[2].trim().toLowerCase(),
    };
  }
  const email = raw.trim().toLowerCase();
  const localPart = email.split("@")[0] ?? "";
  return {
    name: localPart.replace(/[._+]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
    email,
  };
}

// ─── POST Handler ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    // 1. Read raw body for signature verification, then parse as JSON
    const rawBody = await req.text();

    if (!verifyResendWebhook(rawBody, req.headers)) {
      return NextResponse.json(
        { error: "Invalid webhook signature" },
        { status: 401 }
      );
    }

    const payload = JSON.parse(rawBody);

    // Resend wraps inbound emails in a `data` envelope for webhook events.
    // The relevant event type is "email.received".
    const eventType = payload.type;
    if (eventType && eventType !== "email.received") {
      // Acknowledge non-email events (e.g., email.sent, email.bounced)
      return NextResponse.json({ ok: true, skipped: eventType });
    }

    const data = payload.data ?? payload;

    // 2. Extract fields from the Resend inbound email payload
    const rawTo: string = Array.isArray(data.to)
      ? data.to[0]
      : data.to ?? "";
    const rawFrom: string = Array.isArray(data.from)
      ? data.from[0]
      : data.from ?? "";
    const subject: string = data.subject ?? "(No subject)";
    const textBody: string = data.text ?? data.html ?? data.body ?? "";

    if (!rawTo || !rawFrom) {
      return NextResponse.json(
        { error: "Missing 'to' or 'from' in payload" },
        { status: 400 }
      );
    }

    // 3. Parse the recipient address and extract the subdomain
    const toAddress = parseEmailAddress(rawTo);
    const subdomain = extractSubdomain(toAddress.email);

    if (!subdomain) {
      return NextResponse.json(
        { error: "Could not extract subdomain from recipient address" },
        { status: 400 }
      );
    }

    // 4. Tenant identification — match subdomain to a Workspace
    //    The workspace's `inboundEmail` stores the full address (e.g., info@tradiesrus.earlymark.ai)
    //    or we match on the workspace `name` slugified to the subdomain.
    const workspace = await db.workspace.findFirst({
      where: {
        OR: [
          { inboundEmail: toAddress.email },
          {
            // Fallback: match workspace name → subdomain (slug comparison)
            name: {
              equals: subdomain.replace(/-/g, " "),
              mode: "insensitive",
            },
          },
        ],
      },
    });

    if (!workspace) {
      console.warn(
        `[inbound-email] No workspace found for subdomain "${subdomain}" (to: ${toAddress.email})`
      );
      return NextResponse.json(
        { error: "No business found for this subdomain" },
        { status: 404 }
      );
    }

    // 5. Contact matching — find or create a Contact from the sender
    const sender = parseEmailAddress(rawFrom);

    let contact = await db.contact.findFirst({
      where: {
        workspaceId: workspace.id,
        email: { equals: sender.email, mode: "insensitive" },
      },
      include: {
        deals: {
          where: { stage: { notIn: ["WON", "LOST", "DELETED", "ARCHIVED"] } },
          orderBy: { updatedAt: "desc" },
          take: 1,
        },
      },
    });

    if (!contact) {
      contact = await db.contact.create({
        data: {
          workspaceId: workspace.id,
          name: sender.name,
          email: sender.email,
        },
        include: {
          deals: {
            where: { stage: { notIn: ["WON", "LOST", "DELETED", "ARCHIVED"] } },
            orderBy: { updatedAt: "desc" },
            take: 1,
          },
        },
      });
    }

    // Resolve the most relevant active deal/job for this contact
    const activeDeal = contact.deals[0] ?? null;

    // 6. Activity feed logging — save the email as an EMAIL activity
    const activity = await db.activity.create({
      data: {
        type: "EMAIL",
        title: `Inbound email from ${contact.name}: ${subject}`,
        description: subject,
        content: textBody.substring(0, 10000), // cap at 10k chars
        contactId: contact.id,
        dealId: activeDeal?.id,
      },
    });

    // 7. Gemini reply trigger — process the email with AI
    const geminiResult = await processIncomingEmailWithGemini({
      workspaceId: workspace.id,
      senderName: sender.name,
      senderEmail: sender.email,
      subject,
      body: textBody,
      contactId: contact.id,
      dealId: activeDeal?.id,
    });

    let replySent = false;

    // 8. Response action — send the reply via Resend from the business subdomain
    if (geminiResult?.reply) {
      const resendKey = process.env.RESEND_API_KEY;

      if (resendKey) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(resendKey);

          // Reply from the business's subdomain address
          const fromAddress = `${workspace.name} <${toAddress.email}>`;

          const { error } = await resend.emails.send({
            from: fromAddress,
            to: [sender.email],
            subject: `Re: ${subject}`,
            text: geminiResult.reply,
          });

          if (error) {
            console.error("[inbound-email] Resend send error:", error);
          } else {
            replySent = true;

            // Log the outbound reply as a separate activity
            await db.activity.create({
              data: {
                type: "EMAIL",
                title: `Auto-reply to ${contact.name}: Re: ${subject}`,
                description: `AI ${geminiResult.isGenuineLead ? "(Genuine Lead)" : "(Tire Kicker)"} — auto-reply sent`,
                content: geminiResult.reply,
                contactId: contact.id,
                dealId: activeDeal?.id,
              },
            });
          }
        } catch (sendError) {
          console.error("[inbound-email] Failed to send reply:", sendError);
        }
      }
    }

    // 9. Create a notification for the business owner
    if (workspace.ownerId) {
      await db.notification.create({
        data: {
          userId: workspace.ownerId,
          title: "New Inbound Email",
          message: `${contact.name} emailed about: ${subject}${geminiResult ? (geminiResult.isGenuineLead ? " (Genuine Lead)" : " (Tire Kicker)") : ""}`,
          type: geminiResult?.isGenuineLead ? "SUCCESS" : "INFO",
          link: activeDeal ? `/dashboard/deals/${activeDeal.id}` : "/dashboard",
        },
      });
    }

    return NextResponse.json({
      success: true,
      workspaceId: workspace.id,
      contactId: contact.id,
      activityId: activity.id,
      dealId: activeDeal?.id ?? null,
      replySent,
      leadQuality: geminiResult?.isGenuineLead ? "genuine" : "tire_kicker",
    });
  } catch (err) {
    console.error("[inbound-email] Webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
