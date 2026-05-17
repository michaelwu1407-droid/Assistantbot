import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/lib/db";
import { processIncomingEmailWithGemini } from "@/lib/ai/email-agent";
import { saveTriageRecommendation, triageIncomingLead } from "@/lib/ai/triage";
import * as Sentry from "@sentry/nextjs";
import { isTrackableResendEvent, processResendStatusEvent } from "@/lib/resend-status-events";
import { assertSafeRecipient } from "@/lib/messaging/safe-recipient";
import { withCostCeiling } from "@/lib/cost-ceiling";
import { isUrgentLead, isWithinAllowedCallWindow } from "@/lib/call-window";
import { scheduleLeadCallback } from "@/lib/lead-callback";
import { canAutoCallLead } from "@/lib/auto-call-eligibility";
import {
  hasRecentAutomaticCallbackAttempt,
  recordCallbackEvent,
} from "@/lib/callback-events";
import {
  assessInboundLeadGuard,
  buildInboundLeadGuardCopy,
  recordInboundLeadGuardEvent,
} from "@/lib/inbound-lead-guard";
import { normalizePhone } from "@/lib/phone-utils";

const RESEND_EMAIL_COST_USD = 0.001;

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

/** Detect platform from From or Subject. */
function detectLeadPlatform(from: string, subject: string): string | null {
  const combined = `${from} ${subject}`.toLowerCase();
  if (combined.includes("hipages")) return "HiPages";
  if (combined.includes("airtasker")) return "Airtasker";
  if (combined.includes("serviceseeking")) return "ServiceSeeking";
  if (combined.includes("oneflare")) return "Oneflare";
  if (combined.includes("servicetasker")) return "ServiceTasker";
  if (combined.includes("bark.com")) return "Bark";
  if (combined.includes("local-services-noreply@google.com") || combined.includes("localservices-noreply@google.com")) return "Google LSA";
  if (combined.includes("facebookmail.com") || combined.includes("new lead for") || combined.includes("instant form")) return "Meta Lead Ads";
  return null;
}

/** Australian mobile: 04... or +61 4... (with optional spaces/dashes). */
const AUS_MOBILE_REGEX = /(?:04|\+61\s?4)(?:\d(?:[\s-]?\d){7,8})/g;
/** Name after "Name:" or "Client:". */
const NAME_REGEX =
  /(?:Name|Client):\s*([A-Za-z][A-Za-z ]*?)(?=\s+(?:Phone|Mobile|Email|Address|Job|Work|Budget)\s*:|$)/i;

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
  // Idempotency state captured by the try/finally below. claimedKey is set
  // after we win a fresh ActionExecution row; didFail flips inside the catch
  // so the finally can mark the row FAILED (lets a future retry re-claim it)
  // instead of COMPLETED.
  let claimedKey: string | null = null;
  let didFail = false;

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

    // Resend wraps webhook events in a `data` envelope.
    // This route intentionally accepts both inbound email and delivery-tracking events
    // so production can run from a single signed Resend webhook endpoint.
    const eventType = payload.type;
    if (eventType && isTrackableResendEvent(eventType)) {
      const statusResult = await processResendStatusEvent(payload);
      return NextResponse.json({
        success: true,
        event: eventType,
        status: statusResult.handled ? statusResult.statusLabel : eventType,
        contactId: statusResult.handled ? statusResult.contactId : null,
      });
    }

    if (eventType && eventType !== "email.received") {
      return NextResponse.json({ ok: true, skipped: eventType });
    }

    // Idempotency claim: Svix delivers the same svix-id for retries of the
    // same event, so we use it as the key. Fall back to a hash of the body
    // when the header is absent (dev/local). Two concurrent deliveries race
    // on the unique constraint; the loser short-circuits with deduped:true.
    {
      const svixId = req.headers.get("svix-id") || "";
      const dedupSeed = svixId
        || crypto.createHash("sha256").update(rawBody).digest("hex").slice(0, 32);
      const dedupKey = `resend.inbound-email:${dedupSeed}`;

      try {
        await db.actionExecution.create({
          data: {
            idempotencyKey: dedupKey,
            actionType: "resend.inbound-email",
            status: "IN_PROGRESS",
          },
        });
        claimedKey = dedupKey;
      } catch (claimErr) {
        // P2002 = duplicate. Look at the existing row to decide.
        const existing = await db.actionExecution.findUnique({
          where: { idempotencyKey: dedupKey },
          select: { status: true },
        }).catch(() => null);

        if (existing?.status === "FAILED") {
          // Allow a manual retry to re-claim the FAILED row. Race-safe via updateMany.
          const reClaim = await db.actionExecution.updateMany({
            where: { idempotencyKey: dedupKey, status: "FAILED" },
            data: { status: "IN_PROGRESS", error: null },
          }).catch(() => ({ count: 0 }));
          if (reClaim.count > 0) {
            claimedKey = dedupKey;
          } else {
            return NextResponse.json({ ok: true, deduped: true });
          }
        } else {
          // COMPLETED or IN_PROGRESS — another worker has it.
          return NextResponse.json({ ok: true, deduped: true });
        }
      }
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
          where: {
            OR: [
              { inboundEmailAlias: leadAlias },
              { inboundEmail: toAddress.email },
              {
                settings: {
                  path: ["legacyInboundLeadAliases"],
                  array_contains: [leadAlias],
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
            autoCallDelaySec: true,
            voiceEnabled: true,
            agentMode: true,
            twilioPhoneNumber: true,
            settings: true,
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
              settings: {
                path: ["legacyInboundLeadAliases"],
                array_contains: [leadAlias || subdomain],
              },
            },
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
          autoCallDelaySec: true,
          voiceEnabled: true,
          agentMode: true,
          twilioPhoneNumber: true,
          settings: true,
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
      // Normalise to E.164 so phone format is consistent with the SMS
      // and missed-call handlers (which get E.164 from Twilio natively).
      const normalised = normalizePhone(phone || "");
      const displayPhone = normalised || null;
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

      // Run triage to check service area and negative scope rules
      const triage = await triageIncomingLead(workspace!.id, {
        title: deal.title,
        description: textBody.substring(0, 500),
      }).catch(() => null);

      if (triage) {
        await saveTriageRecommendation(deal.id, triage).catch(() => {});
      }

      const urgentLead = isUrgentLead(subject, textBody);
      const withinCallWindow = isWithinAllowedCallWindow(workspace!.settings);
      const eligibility = canAutoCallLead(workspace!);
      const hasLeadPhone = Boolean(displayPhone);

      // Decide the single block reason (workspace policy first, then per-lead
      // conditions). Block reasons are logged and stored on the webhook event
      // so operators can debug why a lead wasn't dialled.
      let blockReason: string | null = null;
      let leadGuardReason: string | null = null;
      if (!eligibility.allowed) blockReason = eligibility.reason;
      else if (!hasLeadPhone) blockReason = "no_lead_phone";
      else if (urgentLead) blockReason = "urgent";
      else if (!withinCallWindow) blockReason = "after_hours";
      else if (triage?.recommendation === "HOLD_REVIEW") blockReason = "triage_review";
      else {
        const leadGuard = await assessInboundLeadGuard({
          workspaceId: workspace!.id,
          channel: "inbound_email",
          contactPhone: displayPhone,
          contactEmail: leadEmail,
        });
        if (leadGuard.blocked && leadGuard.payload) {
          blockReason = "spam_review";
          leadGuardReason = leadGuard.payload.reason;
          const payload = {
            ...leadGuard.payload,
            contactId: contact.id,
            dealId: deal.id,
            contactPhone: displayPhone || leadGuard.payload.contactPhone || null,
            contactEmail: leadEmail || leadGuard.payload.contactEmail || null,
          };
          await recordInboundLeadGuardEvent(payload);
          const leadGuardCopy = buildInboundLeadGuardCopy(payload);
          await db.activity.create({
            data: {
              type: "NOTE",
              title: leadGuardCopy.title,
              content: leadGuardCopy.description,
              contactId: contact.id,
              dealId: deal.id,
            },
          }).catch(() => {});
        } else if (await hasRecentAutomaticCallbackAttempt({
          workspaceId: workspace!.id,
          contactId: contact.id,
          contactPhone: displayPhone,
        })) {
          blockReason = "callback_recently_attempted";
        }
      }

      const blockAutoCall = blockReason !== null;
      let callTriggered = false;
      if (!blockAutoCall) {
        callTriggered = true;
        scheduleLeadCallback({
          workspaceId: workspace!.id,
          contactId: contact.id,
          contactPhone: displayPhone!,
          contactName: leadName,
          dealId: deal.id,
          reason: `email_lead:${platform}`,
          delaySec: workspace!.autoCallDelaySec === 60 ? 0 : (workspace!.autoCallDelaySec ?? 0),
          triggerSource: "inbound_email",
          callbackKind: "automatic",
        }).catch((err) => {
          console.error("[inbound-email] scheduleLeadCallback failed:", err);
        });
      } else {
        console.info(
          `[inbound-email] auto-call blocked for deal ${deal.id} (workspace ${workspace!.id}, platform ${platform}): ${blockReason}`,
        );
        await recordCallbackEvent({
          eventType: "callback_blocked",
          payload: {
            workspaceId: workspace!.id,
            contactId: contact.id,
            contactPhone: displayPhone,
            contactName: leadName,
            dealId: deal.id,
            reason: `email_lead:${platform}`,
            triggerSource: "inbound_email",
            callbackKind: "automatic",
            blockReason,
          },
        });
      }

      // Only notify the owner of a "needs manual follow-up" when the
      // workspace IS otherwise eligible to auto-call but a per-lead
      // condition (urgent/after-hours/triage hold) prevented the dial.
      // Workspace-level blocks (auto-call off, mode != EXECUTION) are
      // intentional choices and don't deserve a nag.
      const perLeadBlock = blockAutoCall && eligibility.allowed;
      if (workspace!.ownerId && perLeadBlock) {
        const triageTitle = triage?.recommendation === "HOLD_REVIEW" && triage.flags.length > 0
          ? "Lead flagged for review"
          : urgentLead ? "Urgent lead requires manual follow-up" : "After-hours lead requires manual follow-up";
        const triageDetail = triage?.flags.length ? ` Flags: ${triage.flags.join("; ")}.` : "";
        await db.notification.create({
          data: {
            userId: workspace!.ownerId,
            title: triageTitle,
            message: `${leadName} from ${platform}. Review details and contact the lead directly.${triageDetail}`,
            type: triage?.recommendation === "HOLD_REVIEW" ? "WARNING" : "INFO",
            link: `/crm/deals/${deal.id}`,
          },
        }).catch(() => {});

        await db.activity.create({
          data: {
            type: "NOTE",
              title: "Manual follow-up required",
              content: urgentLead
                ? "Urgent lead detected. Auto-calling is disabled for urgent leads; follow up manually."
                : blockReason === "after_hours"
                  ? "Lead received outside allowed calling hours. Auto-calling skipped; follow up manually."
                  : "Tracey held this lead for review. No auto-call or customer response was sent; review the warning flags before accepting the job.",
            contactId: contact.id,
            dealId: deal.id,
          },
        }).catch(() => {});
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
            autoCallBlocked: blockAutoCall,
            autoCallBlockReason: blockReason,
            leadGuardReason,
            triageRecommendation: triage?.recommendation ?? null,
            triageFlags: triage?.flags ?? [],
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
        autoCallBlocked: blockAutoCall,
        autoCallBlockReason: blockReason,
        leadGuardReason,
        triageRecommendation: triage?.recommendation ?? null,
        triageFlags: triage?.flags ?? [],
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
    const priorEmailActivityCount = await db.activity.count({
      where: {
        contactId: contact.id,
        type: "EMAIL",
      },
    });
    const isFirstReplyForContact = priorEmailActivityCount === 0;

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
      isFirstReplyForContact,
    });

    let replySent = false;

    // 8. Response action — send the reply via Resend from the business subdomain
    if (geminiResult?.reply) {
      await db.chatMessage.create({
        data: {
          workspaceId: workspace.id,
          role: "assistant",
          content: geminiResult.reply,
          metadata: {
            channel: "email",
            activityId: activity.id,
            contactId: contact.id,
            dealId: activeDeal?.id ?? null,
            subject,
            replySent: false,
            customerContactMode: geminiResult.policyOutcome.mode,
            responsePolicyOutcome: geminiResult.policyOutcome,
          },
        },
      });

      const resendKey = process.env.RESEND_API_KEY;

      if (resendKey) {
        try {
          const { Resend } = await import("resend");
          const resend = new Resend(resendKey);

          // Reply from the business's subdomain address
          const fromAddress = `${workspace.name} <${toAddress.email}>`;

          const safeReplyEmailTo = assertSafeRecipient("email", sender.email);
          const { error } = await withCostCeiling("resend", RESEND_EMAIL_COST_USD, () =>
            resend.emails.send({
              from: fromAddress,
              to: [safeReplyEmailTo],
              subject: `Re: ${subject}`,
              text: geminiResult.reply,
            }),
          );

          if (error) {
            console.error("[inbound-email] Resend send error:", error);
          } else {
            replySent = true;

            await db.chatMessage.updateMany({
              where: {
                workspaceId: workspace.id,
                role: "assistant",
                content: geminiResult.reply,
                metadata: {
                  path: ["activityId"],
                  equals: activity.id,
                },
              },
              data: {
                metadata: {
                  channel: "email",
                  activityId: activity.id,
                  contactId: contact.id,
                  dealId: activeDeal?.id ?? null,
                  subject,
                  replySent: true,
                  customerContactMode: geminiResult.policyOutcome.mode,
                  responsePolicyOutcome: geminiResult.policyOutcome,
                },
              },
            });

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
          link: activeDeal ? `/crm/deals/${activeDeal.id}` : "/crm/dashboard",
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
    didFail = true;
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
  } finally {
    if (claimedKey) {
      await db.actionExecution.update({
        where: { idempotencyKey: claimedKey },
        data: {
          status: didFail ? "FAILED" : "COMPLETED",
        },
      }).catch(() => {});
    }
  }
}
