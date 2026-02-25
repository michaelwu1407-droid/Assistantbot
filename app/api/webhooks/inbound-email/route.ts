import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { processIncomingEmailWithGemini } from "@/lib/ai/email-agent";
import * as Sentry from "@sentry/nextjs";

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

/** Lead capture domain for [alias]@inbound.earlymark.ai style addresses. */
const INBOUND_LEAD_DOMAIN = process.env.INBOUND_LEAD_DOMAIN ?? "inbound.earlymark.ai";

/** Extract alias from To address when it is alias@inbound.earlymark.ai. */
function extractLeadAlias(toEmail: string): string | null {
  const at = toEmail.indexOf("@");
  if (at === -1) return null;
  const local = toEmail.slice(0, at).trim().toLowerCase();
  const domain = toEmail.slice(at + 1).trim().toLowerCase();
  if (domain !== INBOUND_LEAD_DOMAIN || !local) return null;
  return local;
}

/** Detect platform from From or Subject (HiPages, Airtasker, ServiceSeeking). */
function detectLeadPlatform(from: string, subject: string): string | null {
  const combined = `${from} ${subject}`.toLowerCase();
  if (combined.includes("hipages")) return "HiPages";
  if (combined.includes("airtasker")) return "Airtasker";
  if (combined.includes("serviceseeking")) return "ServiceSeeking";
  return null;
}

/** Australian mobile: 04... or +61 4... (with optional spaces/dashes). */
const AUS_MOBILE_REGEX = /(?:04|\+61\s?4)(?:\d(?:[\s-]?\d){7,8})/g;
/** Name after "Name:" or "Client:". */
const NAME_REGEX = /(?:Name|Client):\s*([A-Za-z][A-Za-z ]*)/i;

function parseLeadContactDetails(textBody: string): { phone: string | null; name: string | null } {
  const normalized = (textBody || "").replace(/\s+/g, " ");
  const phoneMatch = normalized.match(AUS_MOBILE_REGEX);
  const phone = phoneMatch ? phoneMatch[0].replace(/\s+/g, "").replace(/^\+61/, "0") : null;
  const nameMatch = normalized.match(NAME_REGEX);
  const name = nameMatch ? nameMatch[1].trim() : null;
  return { phone, name };
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
      const verifyError = new Error("Resend webhook signature verification failed");
      Sentry.captureException(verifyError, {
        tags: { webhook: "resend", stage: "verification" },
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

    // 3. Parse the recipient address
    const toAddress = parseEmailAddress(rawTo);
    const leadAlias = extractLeadAlias(toAddress.email);
    const subdomain = extractSubdomain(toAddress.email);

    // 4. Tenant identification — by lead alias, full inbound email, or subdomain
    let workspace = leadAlias
      ? await db.workspace.findFirst({
          where: { inboundEmailAlias: leadAlias },
          select: {
            id: true,
            name: true,
            ownerId: true,
            inboundEmail: true,
            inboundEmailAlias: true,
            autoCallLeads: true,
            retellAgentId: true,
            twilioPhoneNumber: true,
          },
        })
      : null;

    if (!workspace) {
      if (!subdomain) {
        return NextResponse.json(
          { error: "Could not extract subdomain or lead alias from recipient address" },
          { status: 400 }
        );
      }
      workspace = await db.workspace.findFirst({
        where: {
          OR: [
            { inboundEmail: toAddress.email },
            {
              name: {
                equals: subdomain.replace(/-/g, " "),
                mode: "insensitive",
              },
            },
          ],
        },
        select: {
          id: true,
          name: true,
          ownerId: true,
          inboundEmail: true,
          inboundEmailAlias: true,
          autoCallLeads: true,
          retellAgentId: true,
          twilioPhoneNumber: true,
        },
      });
    }

    if (!workspace) {
      console.warn(
        `[inbound-email] No workspace found (to: ${toAddress.email}, leadAlias: ${leadAlias ?? "—"}, subdomain: ${subdomain ?? "—"})`
      );
      return NextResponse.json(
        { error: "No business found for this address" },
        { status: 404 }
      );
    }

    const sender = parseEmailAddress(rawFrom);
    const platform = detectLeadPlatform(sender.email, subject);

    // ─── Lead Won path: HiPages / Airtasker / ServiceSeeking ─────────────
    if (platform) {
      const { phone, name } = parseLeadContactDetails(textBody);
      const leadName = name || sender.name || "Lead";
      const displayPhone = phone || null;
      const leadEmail = (sender.email && sender.email.trim()) || null;
      if (!displayPhone && !leadEmail) {
        await db.webhookEvent.create({
          data: {
            provider: "resend",
            eventType: "email.received",
            status: "error",
            error: "Lead email had no phone in body and no sender email",
            payload: { leadCapture: true, platform, workspaceId: workspace!.id, subject },
          },
        }).catch(() => {});
        return NextResponse.json(
          { error: "Lead email could not be processed: no phone number in body and no sender email" },
          { status: 400 }
        );
      }

      let contact = displayPhone
        ? await db.contact.findFirst({
            where: { workspaceId: workspace!.id, phone: displayPhone },
          })
        : null;
      if (!contact) {
        contact = await db.contact.create({
          data: {
            workspaceId: workspace!.id,
            name: leadName,
            email: leadEmail ?? undefined,
            phone: displayPhone ?? undefined,
          },
        });
      } else if (name && contact.name !== name) {
        await db.contact.update({
          where: { id: contact.id },
          data: { name },
        });
        contact = { ...contact, name };
      }

      const deal = await db.deal.create({
        data: {
          workspaceId: workspace!.id,
          contactId: contact.id,
          title: `Lead from ${platform}`,
          stage: "NEW",
          value: 0,
          metadata: { leadSource: platform, leadWonEmail: true },
        },
      });

      const leadActivity = await db.activity.create({
        data: {
          type: "EMAIL",
          title: `Lead Won from ${platform}`,
          description: subject,
          content: textBody.substring(0, 10000),
          contactId: contact.id,
          dealId: deal.id,
        },
      });

      let callTriggered = false;
      if (
        workspace!.autoCallLeads &&
        displayPhone &&
        workspace!.retellAgentId &&
        workspace!.twilioPhoneNumber
      ) {
        try {
          const tradieName = workspace!.name;
          const Retell = (await import("retell-sdk")).default;
          const retell = new Retell({ apiKey: process.env.RETELL_API_KEY! });
          await retell.call.createPhoneCall({
            from_number: workspace!.twilioPhoneNumber,
            to_number: displayPhone.startsWith("0") ? `+61${displayPhone.slice(1)}` : displayPhone,
            metadata: {
              workspace_id: workspace!.id,
              contact_id: contact.id,
              platform_name: platform,
              lead_name: leadName,
              script_context: `You are calling because ${tradieName} just accepted a lead on ${platform}. You want to book the quote immediately.`,
            },
            override_agent_id: workspace!.retellAgentId!,
          } as any);
          callTriggered = true;
          await db.activity.create({
            data: {
              type: "CALL",
              title: "Outbound call to lead (auto)",
              content: `Auto call triggered for ${platform} lead ${leadName}`,
              contactId: contact.id,
              dealId: deal.id,
            },
          });
        } catch (callErr) {
          const errMsg = callErr instanceof Error ? callErr.message : String(callErr);
          console.error("[inbound-email] Retell lead call failed:", callErr);
          Sentry.captureException(callErr, {
            tags: { webhook: "resend", stage: "lead_auto_call", workspaceId: workspace!.id },
            extra: { platform, contactId: contact.id, dealId: deal.id, leadName },
          });
          await db.activity.create({
            data: {
              type: "NOTE",
              title: "Auto call to lead failed",
              content: `Could not place automatic call to ${leadName}: ${errMsg}`,
              contactId: contact.id,
              dealId: deal.id,
            },
          }).catch(() => {});
        }
      }

      await db.webhookEvent.create({
        data: {
          provider: "resend",
          eventType: "email.received",
          status: "success",
          payload: {
            leadCapture: true,
            platform,
            workspaceId: workspace!.id,
            contactId: contact.id,
            dealId: deal.id,
            callTriggered,
          },
        },
      }).catch(() => {});

      return NextResponse.json({
        success: true,
        leadCapture: true,
        platform,
        workspaceId: workspace!.id,
        contactId: contact.id,
        dealId: deal.id,
        activityId: leadActivity.id,
        callTriggered,
      });
    }

    // 5. Contact matching — find or create a Contact from the sender (normal inbound path)

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

    // Log the successful webhook event
    await db.webhookEvent.create({
      data: {
        provider: "resend",
        eventType: "email.received",
        status: "success",
        payload: JSON.parse(JSON.stringify({
          from: sender.email,
          to: toAddress.email,
          subject,
          workspaceId: workspace.id,
        })),
      },
    }).catch(() => {});

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
    Sentry.captureException(err, {
      tags: { webhook: "resend", stage: "processing" },
    });

    await db.webhookEvent.create({
      data: {
        provider: "resend",
        eventType: "email.received",
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      },
    }).catch(() => {});

    console.error("[inbound-email] Webhook error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
