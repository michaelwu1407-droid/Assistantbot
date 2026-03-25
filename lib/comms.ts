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
import { describeTwilioProvisioningError, requireAuMobileBusinessBundleSid, findSourceBundleAddressSid } from "@/lib/twilio-regulatory";
import { buildManagedVoiceNumberFriendlyName } from "@/lib/voice-number-metadata";

// ─── Types ──────────────────────────────────────────────────────────

interface CommsSetupResult {
  success: boolean;
  phoneNumber?: string;
  error?: string;
  /** Partial progress indicator for debugging */
  stageReached?: string;
  errorCode?: number;
  status?: number;
  bundleSid?: string;
  subaccountSid?: string;
}

type ManagedTwilioClient = NonNullable<typeof twilioMasterClient>;
type WorkspaceSubaccount = {
  subaccountId: string;
  subaccountAuthToken: string;
  reused: boolean;
};

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
  let bundleSid: string | null = null;
  let subClient: ManagedTwilioClient | null = null;
  let subaccountId: string | null = null;
  /** True after number is transferred to subaccount; cleanup must use subClient. */
  let transferredToSubaccount = false;

  try {
    // ────────────────────────────────────────────────────────────────
    // 1. Create or reuse Twilio Subaccount (per-customer isolation)
    // ────────────────────────────────────────────────────────────────
    stageReached = "subaccount";
    const subaccount = await resolveWorkspaceSubaccount(workspaceId, businessName);
    subaccountId = subaccount.subaccountId;
    subClient = getSubaccountClient(subaccountId, subaccount.subaccountAuthToken);

    await logActivity(
      workspaceId,
      subaccount.reused ? "Twilio Subaccount Reused" : "Twilio Subaccount Created",
      `SID: ${subaccountId}`,
    );

    // ────────────────────────────────────────────────────────────────
    // 2. Resolve bundle + address in MAIN account, purchase in main
    //    (AU bundle/address cannot be used in subaccount for purchase;
    //    Twilio allows transfer to subaccount afterward.)
    // ────────────────────────────────────────────────────────────────
    stageReached = "bundle-resolve";
    bundleSid = requireAuMobileBusinessBundleSid();

    stageReached = "address-resolve";
    const addressSid = await findSourceBundleAddressSid();
    if (process.env.NODE_ENV !== "test") {
      console.log(`[provisioning] bundle=${bundleSid}, address=${addressSid}`);
    }

    stageReached = "number-search";
    const mobileNumbers = await twilioMasterClient.availablePhoneNumbers("AU")
      .mobile.list({ smsEnabled: true, voiceEnabled: true, limit: 5 });
    const chosenNumber = mobileNumbers.length > 0 ? mobileNumbers[0].phoneNumber : null;

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
        bundleSid: bundleSid ?? undefined,
        subaccountSid: subaccountId ?? undefined,
      };
    }

    stageReached = "number-purchase";
    const purchaseParams: Record<string, string> = {
      phoneNumber: chosenNumber,
      friendlyName: managedFriendlyName,
      bundleSid,
    };
    if (addressSid) purchaseParams.addressSid = addressSid;
    if (process.env.NODE_ENV !== "test") {
      console.log(`[number-purchase] params:`, JSON.stringify(purchaseParams));
    }

    const purchasedNumber = await twilioMasterClient.incomingPhoneNumbers.create(purchaseParams);
    purchasedNumberSid = purchasedNumber.sid;
    purchasedPhoneNumber = purchasedNumber.phoneNumber;

    await logActivity(
      workspaceId,
      "Phone Number Purchased",
      `Number: ${purchasedNumber.phoneNumber} (SID: ${purchasedNumber.sid}) in main account`
    );

    // ────────────────────────────────────────────────────────────────
    // 3. Create compliant Address in subaccount (required before transfer)
    // ────────────────────────────────────────────────────────────────
    stageReached = "subaccount-address";
    await subClient.addresses.create({
      friendlyName: "Regulatory",
      customerName: "Earlymark",
      street: "36-42 Henderson Rd",
      city: "Alexandria",
      region: "NSW",
      postalCode: "2015",
      isoCountry: "AU",
      autoCorrectAddress: true,
    });

    // ────────────────────────────────────────────────────────────────
    // 4. Transfer number from main account to subaccount
    // ────────────────────────────────────────────────────────────────
    stageReached = "number-transfer";
    await twilioMasterClient.incomingPhoneNumbers(purchasedNumber.sid).update({
      accountSid: subaccountId,
    });
    transferredToSubaccount = true;

    await logActivity(
      workspaceId,
      "Number Transferred to Subaccount",
      `Number ${purchasedNumber.phoneNumber} moved to subaccount ${subaccountId}`,
    );

    // ────────────────────────────────────────────────────────────────
    // 5. Create SIP trunk and configure number in subaccount
    // ────────────────────────────────────────────────────────────────
    stageReached = "sip-trunk";
    const trunk = await subClient.trunking.v1.trunks.create({
      friendlyName: `${businessName} - LiveKit SIP`,
    });
    trunkSid = trunk.sid;

    if (livekitSipUri) {
      await subClient.trunking.v1.trunks(trunk.sid).originationUrls.create({
        friendlyName: "LiveKit Inbound",
        sipUrl: livekitSipUri,
        priority: 1,
        weight: 1,
        enabled: true,
      });
    }

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
      `Trunk SID: ${trunk.sid}, Termination: ${terminationUri}${livekitSipUri ? `, LiveKit SIP: ${livekitSipUri}` : ""}, Voice: ${expectedVoiceGatewayUrl}, SMS: ${expectedSmsWebhookUrl}`,
    );

    // ────────────────────────────────────────────────────────────────
    // 6. Persist to database
    // ────────────────────────────────────────────────────────────────
    stageReached = "db-update";
    await db.workspace.update({
      where: { id: workspaceId },
      data: {
        twilioSubaccountId: subaccountId,
        twilioSubaccountAuthToken: subaccount.subaccountAuthToken,
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
      `Number ${purchasedNumber.phoneNumber} now routes through the voice gateway before LiveKit.`,
    );

    // ────────────────────────────────────────────────────────────────
    // 7. Usage trigger (billing circuit breaker) in subaccount
    // ────────────────────────────────────────────────────────────────
    stageReached = "usage-trigger";
    try {
      await subClient.usage.triggers.create({
        friendlyName: `${businessName} daily limit`,
        usageCategory: "totalprice",
        triggerBy: "price",
        triggerValue: "50.00",
        recurring: "daily",
        callbackUrl: `${appUrl}/api/webhooks/twilio-usage`,
        callbackMethod: "POST",
      });
      await logActivity(
        workspaceId,
        "Billing Circuit Breaker Active",
        "Voice calls will automatically disable if daily Twilio spend exceeds $50 to prevent unexpected charges.",
      );
    } catch (triggerErr) {
      console.error("[initializeTradieComms] Usage trigger creation failed:", triggerErr);
      await logActivity(
        workspaceId,
        "Billing Circuit Breaker Warning",
        "Failed to configure the $50 daily limit trigger automatically. Please contact support.",
      );
    }

    stageReached = "complete";
    await logActivity(
      workspaceId,
      "Comms Setup Complete",
      `${businessName} is fully provisioned with number ${purchasedNumber.phoneNumber} in subaccount ${subaccountId}`,
    );

    return {
      success: true,
      phoneNumber: purchasedNumber.phoneNumber,
      stageReached: "complete",
      bundleSid: bundleSid ?? undefined,
      subaccountSid: subaccountId ?? undefined,
    };
  } catch (error) {
    const { detailedError, code: errorCode, status } = describeTwilioProvisioningError(error);
    const cleanupClient = transferredToSubaccount && subClient ? subClient : twilioMasterClient;
    if (!workspacePersisted && (purchasedNumberSid || trunkSid)) {
      cleanupWarnings = await cleanupProvisioningArtifacts({
        client: cleanupClient,
        workspaceId,
        phoneNumberSid: purchasedNumberSid,
        phoneNumber: purchasedPhoneNumber,
        trunkSid,
      });
    }

    console.error(`[initializeTradieComms] Failed at stage '${stageReached}':`, error, {
      bundleSid,
      cleanupWarnings,
    });

    await logActivity(
      workspaceId,
      "Comms Setup Failed",
      `Error at stage '${stageReached}': ${detailedError}${cleanupWarnings.length > 0 ? ` Cleanup warnings: ${cleanupWarnings.join(" | ")}` : ""}`,
    ).catch(() => {});

    return {
      success: false,
      error: detailedError,
      stageReached,
      errorCode,
      status,
      bundleSid: bundleSid ?? undefined,
      subaccountSid: subaccountId ?? undefined,
    };
  }
}

// ─── Helpers ────────────────────────────────────────────────────────

async function resolveWorkspaceSubaccount(workspaceId: string, businessName: string): Promise<WorkspaceSubaccount> {
  const masterAccountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { twilioSubaccountId: true, twilioSubaccountAuthToken: true },
  });

  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} was not found before Twilio provisioning started.`);
  }

  if (workspace.twilioSubaccountId && workspace.twilioSubaccountId !== masterAccountSid) {
    if (!workspace.twilioSubaccountAuthToken) {
      throw new Error(
        `Workspace ${workspaceId} already has Twilio subaccount ${workspace.twilioSubaccountId} but no auth token is stored for retry provisioning.`,
      );
    }
    return {
      subaccountId: workspace.twilioSubaccountId,
      subaccountAuthToken: workspace.twilioSubaccountAuthToken,
      reused: true,
    };
  }

  const subaccount = await createTwilioSubaccount(businessName, { workspaceId });
  if (!subaccount) throw new Error("Failed to create Twilio subaccount");

  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      twilioSubaccountId: subaccount.subaccountId,
      twilioSubaccountAuthToken: subaccount.subaccountAuthToken,
    },
  });

  return { ...subaccount, reused: false };
}

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
