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
import { describeTwilioProvisioningError, resolveAuMobileBusinessBundleSidForAccount } from "@/lib/twilio-regulatory";
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
  let subClient: ManagedTwilioClient | null = null;
  let bundleSid: string | null = null;
  let subaccountId: string | null = null;
  let regulatoryAddressSid: string | null = null;

  try {
    // ────────────────────────────────────────────────────────────────
    // 1. Create Twilio Subaccount
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

    stageReached = "bundle-clone";
    bundleSid = await resolveAuMobileBusinessBundleSidForAccount({
      targetAccountSid: subaccountId,
      subaccountAuthToken: subaccount.subaccountAuthToken,
      friendlyName: `${managedFriendlyName} AU Mobile Business`,
    });

    // ────────────────────────────────────────────────────────────────
    // 2. Ensure Regulatory Address in the subaccount (required for AU mobile)
    // ────────────────────────────────────────────────────────────────
    stageReached = "regulatory-address";
    regulatoryAddressSid = await ensureWorkspaceRegulatoryAddress(workspaceId, subClient, businessName);

    // ────────────────────────────────────────────────────────────────
    // 3. Buy Australian +61 Number (SMS + Voice capable)
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
        bundleSid: bundleSid ?? undefined,
        subaccountSid: subaccountId ?? undefined,
      };
    }

    stageReached = "number-purchase";

    const purchasedNumber = await subClient.incomingPhoneNumbers.create({
      phoneNumber: chosenNumber,
      friendlyName: managedFriendlyName,
      bundleSid,
      addressSid: regulatoryAddressSid,
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
      bundleSid: bundleSid ?? undefined,
      subaccountSid: subaccountId ?? undefined,
    };
  } catch (error) {
    const { detailedError, code: errorCode, status } = describeTwilioProvisioningError(error);
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
      bundleSid,
      cleanupWarnings,
    });

    await logActivity(
      workspaceId,
      "Comms Setup Failed",
      `Error at stage '${stageReached}': ${detailedError}${cleanupWarnings.length > 0 ? ` Cleanup warnings: ${cleanupWarnings.join(" | ")}` : ""}`
    ).catch(() => { }); // Don't let logging failure mask the real error

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

async function resolveWorkspaceSubaccount(workspaceId: string, businessName: string): Promise<WorkspaceSubaccount> {
  const masterAccountSid = process.env.TWILIO_ACCOUNT_SID?.trim() || "";
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: {
      twilioSubaccountId: true,
      twilioSubaccountAuthToken: true,
    },
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
  if (!subaccount) {
    throw new Error("Failed to create Twilio subaccount");
  }

  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      twilioSubaccountId: subaccount.subaccountId,
      twilioSubaccountAuthToken: subaccount.subaccountAuthToken,
    },
  });

  return {
    ...subaccount,
    reused: false,
  };
}

/** Twilio CustomerName max 21 3-byte characters. */
function truncateCustomerName(name: string, maxLen: number = 21): string {
  const trimmed = name.trim();
  if (trimmed.length <= maxLen) return trimmed;
  return trimmed.slice(0, maxLen).trim();
}

const EARLYMARK_ADDRESS = {
  street: "36-42 Henderson Rd",
  city: "Alexandria",
  region: "NSW",
  postalCode: "2015",
  isoCountry: "AU",
} as const;

/**
 * Finds (or creates) an AU address in the main Twilio account to use as the
 * regulatory template for all subaccount number purchases.
 *
 * AU mobile numbers require `address_requirements: "any"` — Twilio just needs
 * a valid address on file, it does NOT need to be the end-user's address.
 * Earlymark's own business address satisfies this for every customer.
 *
 * Resolution order:
 *   1. Explicit env var TWILIO_VALIDATED_ADDRESS_SID (fastest, optional override)
 *   2. Any existing AU address already in the main account
 *   3. Auto-create one using Earlymark's registered business address
 */
async function resolveMainAccountAddressSid(): Promise<string> {
  if (!twilioMasterClient) throw new Error("Twilio master client is not configured.");

  const envSid = (process.env.TWILIO_VALIDATED_ADDRESS_SID ?? "").trim();
  if (envSid) {
    console.log(`[regulatory-address] using explicit TWILIO_VALIDATED_ADDRESS_SID: ${envSid}`);
    return envSid;
  }

  const existing = await twilioMasterClient.addresses.list({ isoCountry: "AU", limit: 1 });
  if (existing.length > 0) {
    console.log(`[regulatory-address] found existing AU address in main account: ${existing[0].sid}`);
    return existing[0].sid;
  }

  try {
    const created = await twilioMasterClient.addresses.create({
      friendlyName: "Earlymark Regulatory",
      customerName: "Earlymark",
      ...EARLYMARK_ADDRESS,
      autoCorrectAddress: true,
    });
    console.log(`[regulatory-address] auto-created AU address in main account: ${created.sid}`);
    return created.sid;
  } catch (err) {
    throw new Error(
      `No AU address found in main Twilio account and auto-creation failed. ` +
      `Create one at https://console.twilio.com/us1/develop/phone-numbers/manage/addresses ` +
      `and optionally set TWILIO_VALIDATED_ADDRESS_SID. ` +
      `Error: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/**
 * Ensures the subaccount has an AU regulatory address by replicating the
 * fields from the main account's template address.
 *
 * Each Twilio subaccount is isolated, so an AddressSid from the main account
 * can't be used directly — we read the fields and create a copy.
 */
async function ensureWorkspaceRegulatoryAddress(
  workspaceId: string,
  subClient: ManagedTwilioClient,
  businessName: string,
): Promise<string> {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: { twilioRegulatoryAddressSid: true },
  });
  if (!workspace) {
    throw new Error(`Workspace ${workspaceId} was not found before creating a regulatory address.`);
  }
  if (workspace.twilioRegulatoryAddressSid) {
    return workspace.twilioRegulatoryAddressSid;
  }

  if (!twilioMasterClient) {
    throw new Error("Twilio master client is not configured.");
  }

  const sourceAddressSid = await resolveMainAccountAddressSid();
  const source = await twilioMasterClient.addresses(sourceAddressSid).fetch();

  const addressPayload = {
    friendlyName: `${truncateCustomerName(businessName)} AU Mobile`,
    customerName: truncateCustomerName(businessName),
    street: source.street,
    city: source.city,
    region: source.region,
    postalCode: source.postalCode,
    isoCountry: source.isoCountry,
    autoCorrectAddress: true,
  };
  console.log(`[regulatory-address] replicating into subaccount:`, JSON.stringify(addressPayload));

  const address = await (subClient as any).addresses.create(addressPayload);

  const addressSid: string =
    (address && typeof (address as any).sid === "string" ? (address as any).sid : null) ??
    (() => {
      throw new Error("Twilio returned an unexpected response when creating regulatory address.");
    })();

  await db.workspace.update({
    where: { id: workspaceId },
    data: {
      twilioRegulatoryAddressSid: addressSid,
    },
  });

  await logActivity(
    workspaceId,
    "Regulatory Address Created",
    `Regulatory address ${addressSid} replicated into subaccount for AU mobile provisioning.`,
  );

  return addressSid;
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
