import { db } from "@/lib/db";
import { twilioMasterClient, createTwilioSubaccount, getSubaccountClient } from "@/lib/twilio";

// ─── Types ──────────────────────────────────────────────────────────

interface CommsSetupResult {
  success: boolean;
  phoneNumber?: string;
  error?: string;
  /** Partial progress indicator for debugging */
  stageReached?: string;
}

// ─── Main Onboarding Function ───────────────────────────────────────

/**
 * Provisions dedicated telephony for a Tradie workspace:
 *
 * 1. Creates a Twilio Subaccount (isolated billing & data)
 * 2. Buys a local Australian (+61) number with SMS + Voice
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
  const livekitSipUri = process.env.LIVEKIT_SIP_URI;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://assistantbot-zeta.vercel.app";

  if (!twilioMasterClient) {
    return { success: false, error: "Twilio credentials not configured", stageReached: "pre-check" };
  }

  let stageReached = "init";

  try {
    // ────────────────────────────────────────────────────────────────
    // 1. Create Twilio Subaccount
    // ────────────────────────────────────────────────────────────────
    stageReached = "subaccount";
    const subaccount = await createTwilioSubaccount(businessName);
    if (!subaccount) {
      return { success: false, error: "Failed to create Twilio subaccount", stageReached };
    }

    const { subaccountId, subaccountAuthToken } = subaccount;
    const subClient = getSubaccountClient(subaccountId, subaccountAuthToken);

    await logActivity(workspaceId, "Twilio Subaccount Created", `SID: ${subaccountId}`);

    // ────────────────────────────────────────────────────────────────
    // 2. Buy Australian +61 Number (SMS + Voice capable)
    // ────────────────────────────────────────────────────────────────
    stageReached = "number-search";

    // Search for available AU numbers with SMS + Voice.
    // Try local first, fall back to mobile if none available.
    let chosenNumber: string | null = null;

    const localNumbers = await subClient.availablePhoneNumbers("AU")
      .local.list({ smsEnabled: true, voiceEnabled: true, limit: 5 });

    if (localNumbers.length > 0) {
      chosenNumber = localNumbers[0].phoneNumber;
    } else {
      const mobileNumbers = await subClient.availablePhoneNumbers("AU")
        .mobile.list({ smsEnabled: true, voiceEnabled: true, limit: 5 });

      if (mobileNumbers.length > 0) {
        chosenNumber = mobileNumbers[0].phoneNumber;
      }
    }

    if (!chosenNumber) {
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

    const purchasedNumber = await subClient.incomingPhoneNumbers.create({
      phoneNumber: chosenNumber,
      friendlyName: `${businessName} - Pj Buddy`,
    });

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

    // Associate the purchased number with the SIP trunk
    await subClient.trunking.v1
      .trunks(trunk.sid)
      .phoneNumbers.create({
        phoneNumberSid: purchasedNumber.sid,
      });

    // Build the termination URI (subaccount SID-based)
    const terminationUri = `${subaccountId}.pstn.twilio.com`;

    await logActivity(
      workspaceId,
      "SIP Trunk Configured",
      `Trunk SID: ${trunk.sid}, Termination: ${terminationUri}${livekitSipUri ? `, LiveKit SIP: ${livekitSipUri}` : ""}`
    );

    // ────────────────────────────────────────────────────────────────
    // 4. Persist Everything to Database
    // ────────────────────────────────────────────────────────────────
    stageReached = "db-update";

    await db.workspace.update({
      where: { id: workspaceId },
      data: {
        twilioSubaccountId: subaccountId,
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
    // 5. Send Welcome SMS to the Tradie
    // ────────────────────────────────────────────────────────────────
    stageReached = "welcome-sms";

    if (ownerPhone) {
      try {
        await subClient.messages.create({
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
        console.error("[initializeTradieComms] Welcome SMS failed:", smsErr);
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
    console.error(`[initializeTradieComms] Failed at stage '${stageReached}':`, error);

    await logActivity(
      workspaceId,
      "Comms Setup Failed",
      `Error at stage '${stageReached}': ${message}`
    ).catch(() => {}); // Don't let logging failure mask the real error

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
