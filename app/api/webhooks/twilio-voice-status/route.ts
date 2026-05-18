/**
 * Twilio Voice Dial-Action Webhook — /api/webhooks/twilio-voice-status
 *
 * Fires when the <Dial> verb in the inbound voice gateway completes. We use
 * it to catch *missed* inbound calls — situations where the LiveKit agent
 * didn't pick up (`no-answer`, `busy`, `failed`) — and convert them into a
 * lead in the tradie's CRM with an auto-callback queued via the voice agent.
 *
 * Twilio POSTs application/x-www-form-urlencoded with at least:
 *   From               — the caller's phone number
 *   To / Called        — the workspace's Twilio number
 *   DialCallStatus     — completed | no-answer | busy | failed | canceled
 *   DialCallDuration   — seconds the dialled leg was up (string)
 *
 * We return a TwiML <Hangup /> so the caller-facing leg cleanly ends.
 */
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runIdempotent } from "@/lib/idempotency";
import {
  getTwilioRequestPublicUrl,
  readTwilioFormParams,
  verifyTwilioSignature,
} from "@/lib/twilio/verify-signature";
import { findContactByPhone, findWorkspaceByTwilioNumber } from "@/lib/workspace-routing";
import { isWithinAllowedCallWindow } from "@/lib/call-window";
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

export const dynamic = "force-dynamic";

const HANGUP_TWIML = `<?xml version="1.0" encoding="UTF-8"?>\n<Response><Hangup /></Response>`;

function twimlHangup() {
  return new NextResponse(HANGUP_TWIML, {
    status: 200,
    headers: { "Content-Type": "text/xml; charset=utf-8" },
  });
}

function isMissedCallStatus(dialStatus: string): boolean {
  const s = (dialStatus || "").toLowerCase();
  return s === "no-answer" || s === "busy" || s === "failed" || s === "canceled";
}

export async function POST(req: NextRequest) {
  try {
    const params = await readTwilioFormParams(req);
    const signatureCheck = verifyTwilioSignature({
      signatureHeader: req.headers.get("x-twilio-signature"),
      fullUrl: getTwilioRequestPublicUrl(req),
      formParams: params,
    });
    if (!signatureCheck.ok) {
      return new NextResponse("forbidden", {
        status: signatureCheck.reason === "missing_signature" ? 401 : 403,
      });
    }

    const callerNumber = (params.From || "").trim();
    const calledNumber = (params.To || params.Called || "").trim();
    const dialStatus = params.DialCallStatus || "";
    const callSid = params.CallSid || "";

    if (!callerNumber || !calledNumber) return twimlHangup();
    if (!isMissedCallStatus(dialStatus)) return twimlHangup();

    const workspace = await findWorkspaceByTwilioNumber(calledNumber);
    if (!workspace) return twimlHangup();

    // Atomic dedupe + create. runIdempotent's actionExecution row carries
    // a unique constraint on the idempotencyKey, so the first concurrent
    // webhook invocation for a callSid wins, and any retry/duplicate
    // delivery from Twilio receives the cached deal+contact ids without
    // creating a second Deal.
    if (!callSid) return twimlHangup();

    const claim = await runIdempotent<{ contactId: string; dealId: string }>({
      actionType: "TWILIO_MISSED_CALL",
      bucketAt: new Date(0),
      parts: [callSid],
      resultFactory: async () => {
        let contact = await findContactByPhone(workspace.id, callerNumber);
        if (!contact) {
          contact = await db.contact.create({
            data: {
              workspaceId: workspace.id,
              name: `Caller ${callerNumber}`,
              phone: callerNumber,
            },
          });
        }

        const deal = await db.deal.create({
          data: {
            workspaceId: workspace.id,
            contactId: contact.id,
            title: `Missed call from ${contact.name || callerNumber}`,
            stage: "NEW",
            value: 0,
            source: "missed_call",
            metadata: { leadSource: "missed_call", twilioCallSid: callSid, dialStatus },
          } as Parameters<typeof db.deal.create>[0]["data"],
        });

        await db.activity.create({
          data: {
            type: "CALL",
            title: "Missed inbound call",
            content: `Caller ${callerNumber} dialled ${calledNumber}; the assistant did not pick up (${dialStatus}).`,
            contactId: contact.id,
            dealId: deal.id,
          },
        }).catch(() => {});

        return { contactId: contact.id, dealId: deal.id };
      },
    });

    if (!claim.created) {
      // Duplicate delivery — first call already created the deal and
      // queued any callback work. Acknowledge with a hangup so Twilio
      // stops retrying.
      return twimlHangup();
    }

    if (!claim.result) {
      // Claim raced and the original work crashed; we didn't create a
      // deal here so don't proceed with callback dispatch.
      return twimlHangup();
    }

    const contact = { id: claim.result.contactId, name: `Caller ${callerNumber}` };
    const deal = { id: claim.result.dealId };

    // Queue an automatic callback if the workspace policy allows it (auto-
    // call on, voice enabled, agent mode EXECUTION, workspace has a number)
    // and we're inside the configured calling window. Fire-and-forget so
    // the Twilio webhook still responds quickly.
    const eligibility = canAutoCallLead(workspace);
    const withinCallWindow = isWithinAllowedCallWindow(workspace.settings);
    const leadGuard = await assessInboundLeadGuard({
      workspaceId: workspace.id,
      channel: "missed_call",
      contactPhone: callerNumber,
    });
    const recentlyAttempted = await hasRecentAutomaticCallbackAttempt({
      workspaceId: workspace.id,
      contactId: contact.id,
      contactPhone: callerNumber,
    });
    const wantsAutoCall = eligibility.allowed && withinCallWindow && !leadGuard.blocked && !recentlyAttempted;
    let blockReason: string | null = null;
    if (!eligibility.allowed) blockReason = eligibility.reason;
    else if (!withinCallWindow) blockReason = "after_hours";
    else if (leadGuard.blocked) blockReason = "spam_review";
    else if (recentlyAttempted) blockReason = "callback_recently_attempted";

    if (wantsAutoCall) {
      scheduleLeadCallback({
        workspaceId: workspace.id,
        contactId: contact.id,
        contactPhone: callerNumber,
        contactName: contact.name || `Caller ${callerNumber}`,
        dealId: deal.id,
        reason: `missed_call_callback:${dialStatus}`,
        delaySec: workspace.autoCallDelaySec === 60 ? 0 : (workspace.autoCallDelaySec ?? 0),
        triggerSource: "missed_call",
        callbackKind: "automatic",
      }).catch((err) => {
        console.error("[twilio-voice-status] scheduleLeadCallback failed:", err);
      });
    } else {
      console.info(
        `[twilio-voice-status] auto-callback blocked for missed call ${callSid} (workspace ${workspace.id}): ${blockReason}`,
      );
      if (leadGuard.blocked && leadGuard.payload) {
        const payload = {
          ...leadGuard.payload,
          contactId: contact.id,
          dealId: deal.id,
          contactPhone: callerNumber,
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
      }
      await recordCallbackEvent({
        eventType: "callback_blocked",
        payload: {
          workspaceId: workspace.id,
          contactId: contact.id,
          contactPhone: callerNumber,
          contactName: contact.name || `Caller ${callerNumber}`,
          dealId: deal.id,
          reason: `missed_call_callback:${dialStatus}`,
          triggerSource: "missed_call",
          callbackKind: "automatic",
          blockReason,
          providerCallSid: callSid,
        },
      });
    }

    await db.webhookEvent.create({
      data: {
        provider: "twilio",
        eventType: "missed_call",
        status: "success",
        payload: {
          workspaceId: workspace.id,
          contactId: contact.id,
          dealId: deal.id,
          callSid,
          callerNumber,
          calledNumber,
          dialStatus,
          callbackQueued: wantsAutoCall,
          blockReason,
        },
      },
    }).catch(() => {});

    return twimlHangup();
  } catch (error) {
    console.error("[twilio-voice-status] Error:", error);
    return twimlHangup();
  }
}
