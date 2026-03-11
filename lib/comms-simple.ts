/**
 * VOICE ARCHITECTURE — for AI agents and developers
 * ──────────────────────────────────────────────────
 * Voice platform: LiveKit (NOT Retell — Retell was fully removed)
 * This is the simplified provisioner for trial Twilio accounts (no subaccounts).
 * See lib/comms.ts for full architecture notes.
 *
 * Required env vars: LIVEKIT_SIP_URI (optional — trunk created without origination if missing),
 * TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN
 */

import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phone-utils";
import { twilioMasterClient } from "@/lib/twilio";
import { getExpectedSmsWebhookUrl, getExpectedVoiceGatewayUrl } from "@/lib/earlymark-inbound-config";
import { buildManagedVoiceNumberFriendlyName } from "@/lib/voice-number-metadata";

// ─── Types ──────────────────────────────────────────────────────────

interface CommsSetupResult {
  success: boolean;
  phoneNumber?: string;
  error?: string;
  stageReached?: string;
  errorCode?: number;
  status?: number;
}

// ─── Simple Phone Provisioning (No Subaccounts) ───────────────────────

/**
 * Simplified phone provisioning for trial accounts:
 *
 * 1. Buy an Australian mobile (+61) number with SMS + Voice on main account
 * 2. Create an Elastic SIP Trunk pointing to LiveKit SIP
 * 3. Persist everything to the database
 * 4. Send a Welcome SMS to the Tradie's mobile
 * 5. Log every step to the Activity Feed
 *
 * This version works with trial Twilio accounts that can't create subaccounts.
 */
export async function initializeSimpleComms(
  workspaceId: string,
  businessName: string,
  ownerPhone: string
): Promise<CommsSetupResult> {
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

  // Detailed environment logging
  console.log("[SIMPLE-COMMS] Environment check:", {
    hasTwilioClient: !!twilioMasterClient,
    livekitSipUri: livekitSipUri ? "✅ SET" : "⚠️ NOT SET (optional)",
    appUrl,
    workspaceId,
    businessName,
    ownerPhone
  });

  if (!twilioMasterClient) {
    const error = "Twilio credentials not configured in environment (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN). This happens before any bundle or account-type checks.";
    console.error("[SIMPLE-COMMS] ERROR:", error);
    return { success: false, error, stageReached: "pre-check" };
  }

  if (!expectedVoiceGatewayUrl || !expectedSmsWebhookUrl) {
    const error = "NEXT_PUBLIC_APP_URL is required to configure Twilio voice and SMS webhooks.";
    console.error("[SIMPLE-COMMS] ERROR:", error);
    return { success: false, error, stageReached: "pre-check" };
  }

  let stageReached = "init";
  let purchasedNumberSid: string | null = null;
  let purchasedPhoneNumber: string | null = null;
  let trunkSid: string | null = null;
  let workspacePersisted = false;
  let cleanupWarnings: string[] = [];

  try {
    console.log("[SIMPLE-COMMS] Starting provisioning process...");
    
    // ────────────────────────────────────────────────────────────────
    // 0. Test Twilio Authentication
    // ────────────────────────────────────────────────────────────────
    stageReached = "auth-test";
    console.log("[SIMPLE-COMMS] Stage: auth-test");
    
    try {
      const testAccount = await twilioMasterClient!.api.v2010.accounts(process.env.TWILIO_ACCOUNT_SID!).fetch();
      console.log("[SIMPLE-COMMS] ✅ Twilio auth successful:", {
        accountSid: testAccount.sid,
        friendlyName: testAccount.friendlyName,
        status: testAccount.status,
        type: testAccount.type,
        dateCreated: testAccount.dateCreated
      });
    } catch (authError) {
      console.error("[SIMPLE-COMMS] ❌ Twilio auth failed:", authError);
      return {
        success: false,
        error: `Twilio authentication failed: ${authError instanceof Error ? authError.message : "Unknown error"}`,
        stageReached: "auth-test"
      };
    }
    
    // ────────────────────────────────────────────────────────────────
    // 1. Buy Australian +61 Number (SMS + Voice capable)
    // ────────────────────────────────────────────────────────────────
    stageReached = "number-search";
    console.log("[SIMPLE-COMMS] Stage: number-search");

    // Search for available AU mobile numbers with SMS + Voice.
    let chosenNumber: string | null = null;

    console.log("[SIMPLE-COMMS] Searching for mobile numbers...");
    const mobileNumbers = await twilioMasterClient.availablePhoneNumbers("AU")
      .mobile.list({ smsEnabled: true, voiceEnabled: true, limit: 5 });

    console.log("[SIMPLE-COMMS] Found mobile numbers:", mobileNumbers.length);

    if (mobileNumbers.length > 0) {
      chosenNumber = mobileNumbers[0].phoneNumber;
      console.log("[SIMPLE-COMMS] Selected mobile number:", chosenNumber);
    }

    if (!chosenNumber) {
      console.error("[SIMPLE-COMMS] No numbers available");
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
    console.log("[SIMPLE-COMMS] Stage: number-purchase, purchasing:", chosenNumber);

    const purchasedNumber = await twilioMasterClient.incomingPhoneNumbers.create({
      phoneNumber: chosenNumber,
      friendlyName: managedFriendlyName,
    });
    purchasedNumberSid = purchasedNumber.sid;
    purchasedPhoneNumber = purchasedNumber.phoneNumber;

    console.log("[SIMPLE-COMMS] Number purchased successfully:", purchasedNumber.phoneNumber);
    
    await logActivity(
      workspaceId,
      "Phone Number Purchased",
      `Number: ${purchasedNumber.phoneNumber} (SID: ${purchasedNumber.sid})`
    );

    // ────────────────────────────────────────────────────────────────
    // 2. Create Elastic SIP Trunk for LiveKit Voice Agent
    // ────────────────────────────────────────────────────────────────
    stageReached = "sip-trunk";
    console.log("[SIMPLE-COMMS] Stage: sip-trunk");

    const trunk = await twilioMasterClient.trunking.v1.trunks.create({
      friendlyName: `${businessName} - LiveKit SIP`,
    });
    trunkSid = trunk.sid;

    // Add an origination URI so LiveKit can route inbound calls
    if (livekitSipUri) {
      await twilioMasterClient.trunking.v1
        .trunks(trunk.sid)
        .originationUrls.create({
          friendlyName: "LiveKit Inbound",
          sipUrl: livekitSipUri,
          priority: 1,
          weight: 1,
          enabled: true,
        });
    }

    // Build the termination URI (using main account SID for simple setup)
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const terminationUri = `${accountSid}.pstn.twilio.com`;
    stageReached = "number-config";
    await twilioMasterClient.incomingPhoneNumbers(purchasedNumber.sid).update({
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
    // 3. Persist Everything to Database
    // ────────────────────────────────────────────────────────────────
    stageReached = "db-update";

    await db.workspace.update({
      where: { id: workspaceId },
      data: {
        twilioSubaccountId: accountSid, // Using main account SID for simple setup
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
    // 4. Send Welcome SMS to the Tradie
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
    const stack = error instanceof Error ? error.stack : undefined;
    const errorData = error as { code?: number; status?: number } | null;
    const errorCode = errorData?.code;
    const status = errorData?.status;
    
    // Handle specific Live API errors
    let detailedError = message;
    if (errorCode === 21631) {
      detailedError = "AUSTRALIAN REGULATORY BUNDLE REQUIRED: Your Twilio account needs ABN/identity verification to purchase Australian numbers. Please complete regulatory compliance in Twilio Console.";
    } else if (errorCode === 20003) {
      detailedError = "PERMISSION DENIED: Your Twilio account lacks permissions for Australian number inventory. Check account permissions and geographic restrictions.";
    } else if (errorCode === 21452) {
      detailedError = "INSUFFICIENT FUNDS: Twilio account balance too low to purchase phone number. Add funds to your Twilio account.";
    } else if (status === 401) {
      detailedError = "AUTHENTICATION FAILED: Invalid Twilio credentials. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in Vercel environment.";
    } else if (status === 403) {
      detailedError = "ACCESS FORBIDDEN: Account may be suspended or trial limitations apply. Check Twilio account status.";
    }
    
    console.error(`[SIMPLE-COMMS] FAILED at stage '${stageReached}':`, {
      message,
      detailedError,
      errorCode,
      status,
      stack,
      stageReached,
      workspaceId,
      businessName,
      timestamp: new Date().toISOString()
    });

    if (!workspacePersisted && (purchasedNumberSid || trunkSid)) {
      cleanupWarnings = await cleanupProvisioningArtifacts({
        workspaceId,
        phoneNumberSid: purchasedNumberSid,
        phoneNumber: purchasedPhoneNumber,
        trunkSid,
      });
    }

    await logActivity(
      workspaceId,
      "Comms Setup Failed",
      `Failed at stage '${stageReached}': ${detailedError}${cleanupWarnings.length > 0 ? ` Cleanup warnings: ${cleanupWarnings.join(" | ")}` : ""}`
    );

    return {
      success: false,
      error: detailedError,
      stageReached,
      errorCode,
      status
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

async function cleanupProvisioningArtifacts(params: {
  workspaceId: string;
  phoneNumberSid?: string | null;
  phoneNumber?: string | null;
  trunkSid?: string | null;
}) {
  const warnings: string[] = [];

  if (params.phoneNumberSid) {
    try {
      await twilioMasterClient!.incomingPhoneNumbers(params.phoneNumberSid).remove();
    } catch (error) {
      warnings.push(
        `Failed to release purchased number ${params.phoneNumber || params.phoneNumberSid}: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  if (params.trunkSid) {
    try {
      await twilioMasterClient!.trunking.v1.trunks(params.trunkSid).remove();
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
