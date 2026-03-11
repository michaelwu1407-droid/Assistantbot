/**
 * VOICE ARCHITECTURE — for AI agents and developers
 * ──────────────────────────────────────────────────
 * Voice platform: LiveKit (NOT Retell — Retell was fully removed)
 *
 * Call flow:
 *   Inbound:  PSTN → Twilio number → Elastic SIP trunk → LiveKit SIP ingest
 *             → livekit-agent TypeScript microservice (/livekit-agent/agent.ts)
 *   Outbound: livekit-agent → Twilio SIP trunk → PSTN
 *
 * Agent stack (see /livekit-agent/agent.ts):
 *   STT  → Deepgram
 *   LLM  → DeepInfra (Llama-3.3-70B-Instruct via OpenAI-compatible API)
 *   TTS  → Cartesia
 *
 * Required env vars:
 *   LIVEKIT_URL          wss://your-project.livekit.cloud
 *   LIVEKIT_API_KEY      LiveKit API key
 *   LIVEKIT_API_SECRET   LiveKit API secret
 *   LIVEKIT_SIP_URI      sip: URI for the Twilio origination URL (LiveKit inbound)
 *   DEEPINFRA_API_KEY    DeepInfra API key (for LLM)
 *   DEEPGRAM_API_KEY     Deepgram API key (for STT)
 *   CARTESIA_API_KEY     Cartesia API key (for TTS)
 *
 * Legacy routes at /app/api/retell/ are kept for reference only — they receive no traffic.
 */

import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone-utils";
import { twilioMasterClient, createTwilioSubaccount, getSubaccountClient } from "@/lib/twilio";
import { getExpectedSmsWebhookUrl, getExpectedVoiceGatewayUrl } from "@/lib/earlymark-inbound-config";
import { buildManagedVoiceNumberFriendlyName } from "@/lib/voice-number-metadata";

// ─── Types ──────────────────────────────────────────────────────────

interface CommsSetupResult {
  success: boolean;
  phoneNumber?: string;
  error?: string;
  /** Partial progress indicator for debugging */
  stageReached?: string;
}

type ManagedTwilioClient = NonNullable<typeof twilioMasterClient>;

// ─── Main Onboarding Function ───────────────────────────────────────

/**
 * Provisions dedicated telephony for a Tradie workspace:
 *
 * 1. Creates a Twilio Subaccount (isolated billing & data)
 * 2. Buys an Australian mobile (+61) number with SMS + Voice
 * 3. Creates an Elastic SIP Trunk pointing to LiveKit SIP
 * 4. Persists everything to the database
 * 5. Sends a Welcome SMS to the Tradie's mobile
 * 6. Logs every step to the Activity Feed
 *
 * Designed to be called once at the end of /setup onboarding.
 */
export async function initializeTradieComms(
  workspaceId: string,
  businessName: string,
  ownerPhone: string
): Promise<CommsSetupResult> {
  void ownerPhone;
  const livekitSipUri = process.env.LIVEKIT_SIP_URI;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://assistantbot-zeta.vercel.app";
  const expectedVoiceGatewayUrl = getExpectedVoiceGatewayUrl();
  const expectedSmsWebhookUrl = getExpectedSmsWebhookUrl();
  const managedFriendlyName = buildManagedVoiceNumberFriendlyName({
    scope: "workspace",
    surface: "normal",
    workspaceId,
    label: businessName,
  });

  if (!twilioMasterClient) {
    return { success: false, error: "Twilio credentials not configured", stageReached: "pre-check" };
  }

  if (!expectedVoiceGatewayUrl || !expectedSmsWebhookUrl) {
    return {
      success: false,
      error: "NEXT_PUBLIC_APP_URL is required to configure Twilio voice and SMS webhooks.",
      stageReached: "pre-check",
    };
  }

  let stageReached = "init";
  let purchasedNumberSid: string | null = null;
  let purchasedPhoneNumber: string | null = null;
  let trunkSid: string | null = null;
  let workspacePersisted = false;
  let cleanupWarnings: string[] = [];
  let subClient: ManagedTwilioClient | null = null;

  try {
    // ────────────────────────────────────────────────────────────────
    // 1. Create Twilio Subaccount
    // ────────────────────────────────────────────────────────────────
    stageReached = "subaccount";
    const subaccount = await createTwilioSubaccount(businessName, { workspaceId });
    if (!subaccount) {
      return { success: false, error: "Failed to create Twilio subaccount", stageReached };
    }

    const { subaccountId, subaccountAuthToken } = subaccount;
    subClient = getSubaccountClient(subaccountId, subaccountAuthToken);

    await logActivity(workspaceId, "Twilio Subaccount Created", `SID: ${subaccountId}`);

    // ────────────────────────────────────────────────────────────────
    // 2. Buy Australian +61 Number (SMS + Voice capable)
    // ────────────────────────────────────────────────────────────────
    stageReached = "number-search";

    // Search for available AU mobile numbers with SMS + Voice.
    let chosenNumber: string | null = null;

    const mobileNumbers = await subClient.availablePhoneNumbers("AU")
      .mobile.list({ smsEnabled: true, voiceEnabled: true, limit: 5 });

    if (mobileNumbers.length > 0) {
      chosenNumber = mobileNumbers[0].phoneNumber;
    }

    if (!chosenNumber) {
      await logActivity(
        workspaceId,
        "Phone Number Provisioning Failed",
        "No Australian mobile numbers available with SMS + Voice. Will retry or escalate."
      );
      return {
        success: false,
        error: "No Australian mobile numbers available with SMS + Voice capability",
        stageReached: "number-search",
      };
    }

    stageReached = "number-purchase";

    const purchasedNumber = await subClient.incomingPhoneNumbers.create({
      phoneNumber: chosenNumber,
      friendlyName: managedFriendlyName,
    });
    purchasedNumberSid = purchasedNumber.sid;
    purchasedPhoneNumber = purchasedNumber.phoneNumber;

    await logActivity(
      workspaceId,
      "Phone Number Purchased",
      `Number: ${purchasedNumber.phoneNumber} (SID: ${purchasedNumber.sid})`
    );

    // ────────────────────────────────────────────────────────────────
    // 3. Create Elastic SIP Trunk for LiveKit Voice Agent
    // ────────────────────────────────────────────────────────────────
    stageReached = "sip-trunk";

    const trunk = await subClient.trunking.v1.trunks.create({
      friendlyName: `${businessName} - LiveKit SIP`,
    });
    trunkSid = trunk.sid;

    // Add an origination URI so LiveKit can route inbound calls
    if (livekitSipUri) {
      await subClient.trunking.v1
        .trunks(trunk.sid)
        .originationUrls.create({
          friendlyName: "LiveKit Inbound",
          sipUrl: livekitSipUri,
          priority: 1,
          weight: 1,
          enabled: true,
        });
    }

    // Build the termination URI (subaccount SID-based)
    const terminationUri = `${subaccountId}.pstn.twilio.com`;
    stageReached = "number-config";
    await subClient.incomingPhoneNumbers(purchasedNumber.sid).update({
      voiceUrl: expectedVoiceGatewayUrl,
      voiceMethod: "POST",
      voiceApplicationSid: "",
      smsUrl: expectedSmsWebhookUrl,
      smsMethod: "POST",
      smsApplicationSid: "",
      friendlyName: managedFriendlyName,
    });

    await logActivity(
      workspaceId,
      "SIP Trunk Configured",
      `Trunk SID: ${trunk.sid}, Termination: ${terminationUri}${livekitSipUri ? `, LiveKit SIP: ${livekitSipUri}` : ""}, Voice gateway: ${expectedVoiceGatewayUrl}, SMS webhook: ${expectedSmsWebhookUrl}`
    );

    // ────────────────────────────────────────────────────────────────
    // 4. Persist Everything to Database
    // ────────────────────────────────────────────────────────────────
    stageReached = "db-update";

    await db.workspace.update({
      where: { id: workspaceId },
      data: {
        twilioSubaccountId: subaccountId,
        twilioSubaccountAuthToken: subaccountAuthToken,
        twilioPhoneNumber: purchasedNumber.phoneNumber,
        twilioPhoneNumberNormalized: normalizePhone(purchasedNumber.phoneNumber),
        twilioPhoneNumberSid: purchasedNumber.sid,
        twilioSipTrunkSid: trunk.sid,
      },
    });
    workspacePersisted = true;

    await logActivity(
      workspaceId,
      "LiveKit Voice Agent Connected",
      `Number ${purchasedNumber.phoneNumber} now routes through the voice gateway before LiveKit.`
    );

    // ────────────────────────────────────────────────────────────────
    // 5. Create UsageTrigger (Billing Circuit Breaker)
    // ────────────────────────────────────────────────────────────────
    stageReached = "usage-trigger";

    try {
      await subClient.usage.triggers.create({
        friendlyName: `${businessName} daily limit`,
        usageCategory: 'totalprice',
        triggerBy: 'price',
        triggerValue: '50.00',
        recurring: 'daily',
        callbackUrl: `${appUrl}/api/webhooks/twilio-usage`,
        callbackMethod: 'POST',
      });
      await logActivity(
        workspaceId,
        "Billing Circuit Breaker Active",
        "Voice calls will automatically disable if daily Twilio spend exceeds $50 to prevent unexpected charges."
      );
    } catch (triggerErr) {
      console.error("[initializeTradieComms] Usage trigger creation failed:", triggerErr);
      // Non-fatal, just log and continue
      await logActivity(
        workspaceId,
        "Billing Circuit Breaker Warning",
        "Failed to configure the $50 daily limit trigger automatically. Please contact support."
      );
    }

    // ────────────────────────────────────────────────────────────────
    // 6. Send Welcome SMS to the Tradie
    // ────────────────────────────────────────────────────────────────
    stageReached = "complete";
    await logActivity(
      workspaceId,
      "Comms Setup Complete",
      `${businessName} is fully provisioned with number ${purchasedNumber.phoneNumber}`
    );

    return {
      success: true,
      phoneNumber: purchasedNumber.phoneNumber,
      stageReached: "complete",
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (!workspacePersisted && (purchasedNumberSid || trunkSid)) {
      cleanupWarnings = await cleanupProvisioningArtifacts({
        client: subClient || twilioMasterClient,
        workspaceId,
        phoneNumberSid: purchasedNumberSid,
        phoneNumber: purchasedPhoneNumber,
        trunkSid,
      });
    }

    console.error(`[initializeTradieComms] Failed at stage '${stageReached}':`, error, {
      cleanupWarnings,
    });

    await logActivity(
      workspaceId,
      "Comms Setup Failed",
      `Error at stage '${stageReached}': ${message}${cleanupWarnings.length > 0 ? ` Cleanup warnings: ${cleanupWarnings.join(" | ")}` : ""}`
    ).catch(() => { }); // Don't let logging failure mask the real error

    return { success: false, error: message, stageReached };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

async function logActivity(workspaceId: string, title: string, content: string) {
  await db.activity.create({
    data: {
      type: "NOTE",
      title,
      content,
      // No dealId/contactId — this is a system-level workspace event
    },
  });
}

async function cleanupProvisioningArtifacts(params: {
  client: ManagedTwilioClient;
  workspaceId: string;
  phoneNumberSid?: string | null;
  phoneNumber?: string | null;
  trunkSid?: string | null;
}) {
  const warnings: string[] = [];

  if (params.phoneNumberSid) {
    try {
      await params.client.incomingPhoneNumbers(params.phoneNumberSid).remove();
    } catch (error) {
      warnings.push(
        `Failed to release purchased number ${params.phoneNumber || params.phoneNumberSid}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  if (params.trunkSid) {
    try {
      await params.client.trunking.v1.trunks(params.trunkSid).remove();
    } catch (error) {
      warnings.push(
        `Failed to remove SIP trunk ${params.trunkSid}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  if (warnings.length > 0) {
    await logActivity(params.workspaceId, "Comms Cleanup Warning", warnings.join(" ")).catch(() => { });
  }

  return warnings;
}
