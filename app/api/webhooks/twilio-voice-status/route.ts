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
import {
  getTwilioRequestPublicUrl,
  readTwilioFormParams,
  verifyTwilioSignature,
} from "@/lib/twilio/verify-signature";
import { findContactByPhone, findWorkspaceByTwilioNumber } from "@/lib/workspace-routing";
import { isWithinAllowedCallWindow } from "@/lib/call-window";
import { initiateOutboundCall } from "@/lib/outbound-call";

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

    // Idempotency: if we've already logged this CallSid as a missed call,
    // don't create a duplicate Deal or queue a second callback.
    if (callSid) {
      const existing = await db.webhookEvent.findFirst({
        where: {
          provider: "twilio",
          eventType: "missed_call",
          payload: { path: ["callSid"], equals: callSid },
        },
        select: { id: true },
      });
      if (existing) return twimlHangup();
    }

    // Find or create the caller contact in this workspace.
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

    // Queue an automatic callback if the workspace has opted in and we're
    // inside the configured calling window. Fire-and-forget so the Twilio
    // webhook still responds quickly.
    const withinCallWindow = isWithinAllowedCallWindow(workspace.settings);
    const wantsAutoCall = Boolean(workspace.voiceEnabled) && withinCallWindow;
    if (wantsAutoCall) {
      initiateOutboundCall({
        workspaceId: workspace.id,
        contactPhone: callerNumber,
        contactName: contact.name || `Caller ${callerNumber}`,
        dealId: deal.id,
        reason: `missed_call_callback:${dialStatus}`,
      }).catch((err) => {
        console.error("[twilio-voice-status] Callback failed:", err);
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
          blockReason: wantsAutoCall ? null : (!workspace.voiceEnabled ? "voice_disabled" : "after_hours"),
        },
      },
    }).catch(() => {});

    return twimlHangup();
  } catch (error) {
    console.error("[twilio-voice-status] Error:", error);
    return twimlHangup();
  }
}
