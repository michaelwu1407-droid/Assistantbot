import { db } from "@/lib/db";
import { twilioMasterClient } from "@/lib/twilio";

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
 * 1. Buy a local Australian (+61) number with SMS + Voice on main account
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
    const error = "Twilio credentials not configured";
    console.error("[SIMPLE-COMMS] ERROR:", error);
    return { success: false, error, stageReached: "pre-check" };
  }

  let stageReached = "init";

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

    // Search for available AU numbers with SMS + Voice.
    // Try local first, fall back to mobile if none available.
    let chosenNumber: string | null = null;

    console.log("[SIMPLE-COMMS] Searching for local numbers...");
    const localNumbers = await twilioMasterClient.availablePhoneNumbers("AU")
      .local.list({ smsEnabled: true, voiceEnabled: true, limit: 5 });
    
    console.log("[SIMPLE-COMMS] Found local numbers:", localNumbers.length);

    if (localNumbers.length > 0) {
      chosenNumber = localNumbers[0].phoneNumber;
      console.log("[SIMPLE-COMMS] Selected local number:", chosenNumber);
    } else {
      console.log("[SIMPLE-COMMS] No local numbers, searching mobile...");
      const mobileNumbers = await twilioMasterClient.availablePhoneNumbers("AU")
        .mobile.list({ smsEnabled: true, voiceEnabled: true, limit: 5 });

      console.log("[SIMPLE-COMMS] Found mobile numbers:", mobileNumbers.length);

      if (mobileNumbers.length > 0) {
        chosenNumber = mobileNumbers[0].phoneNumber;
        console.log("[SIMPLE-COMMS] Selected mobile number:", chosenNumber);
      }
    }

    if (!chosenNumber) {
      console.error("[SIMPLE-COMMS] No numbers available");
      await logActivity(
        workspaceId,
        "Phone Number Provisioning Failed",
        "No Australian numbers available with SMS + Voice. Will retry or escalate."
      );
      return {
        success: false,
        error: "No Australian numbers available with SMS + Voice capability",
        stageReached: "number-search",
      };
    }

    stageReached = "number-purchase";
    console.log("[SIMPLE-COMMS] Stage: number-purchase, purchasing:", chosenNumber);

    const purchasedNumber = await twilioMasterClient.incomingPhoneNumbers.create({
      phoneNumber: chosenNumber,
      friendlyName: `${businessName} - Pj Buddy`,
    });

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

    // Associate the purchased number with the SIP trunk
    await twilioMasterClient.trunking.v1
      .trunks(trunk.sid)
      .phoneNumbers.create({
        phoneNumberSid: purchasedNumber.sid,
      });

    // Build the termination URI (using main account SID for simple setup)
    const accountSid = process.env.TWILIO_ACCOUNT_SID!;
    const terminationUri = `${accountSid}.pstn.twilio.com`;

    await logActivity(
      workspaceId,
      "SIP Trunk Configured",
      `Trunk SID: ${trunk.sid}, Termination: ${terminationUri}${livekitSipUri ? `, LiveKit SIP: ${livekitSipUri}` : ""}`
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
        twilioPhoneNumberSid: purchasedNumber.sid,
        twilioSipTrunkSid: trunk.sid,
      },
    });

    await logActivity(
      workspaceId,
      "LiveKit Voice Agent Connected",
      `Number ${purchasedNumber.phoneNumber} routed via LiveKit SIP trunk`
    );

    // ────────────────────────────────────────────────────────────────
    // 4. Send Welcome SMS to the Tradie
    // ────────────────────────────────────────────────────────────────
    stageReached = "welcome-sms";

    if (ownerPhone) {
      try {
        await twilioMasterClient.messages.create({
          to: ownerPhone,
          from: purchasedNumber.phoneNumber,
          body: `G'day from Pj Buddy! Your AI assistant is live on this number (${purchasedNumber.phoneNumber}). Clients who call or text this number will be handled by your voice agent. Manage everything at ${appUrl}/dashboard`,
        });

        await logActivity(
          workspaceId,
          "Welcome SMS Sent",
          `Sent setup confirmation to ${ownerPhone}`
        );
      } catch (smsErr) {
        // Non-fatal: the comms infra is set up even if welcome SMS fails
        console.error("[initializeSimpleComms] Welcome SMS failed:", smsErr);
        await logActivity(
          workspaceId,
          "Welcome SMS Failed",
          `Could not send to ${ownerPhone}: ${smsErr instanceof Error ? smsErr.message : "Unknown error"}`
        );
      }
    }

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
    const errorCode = (error as any)?.code;
    const status = (error as any)?.status;
    
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

    await logActivity(
      workspaceId,
      "Comms Setup Failed",
      `Failed at stage '${stageReached}': ${detailedError}`
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
