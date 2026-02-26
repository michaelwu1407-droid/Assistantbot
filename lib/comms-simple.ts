import Retell from "retell-sdk";
import { db } from "@/lib/db";
import { twilioMasterClient } from "@/lib/twilio";

// ─── Types ──────────────────────────────────────────────────────────

interface CommsSetupResult {
  success: boolean;
  phoneNumber?: string;
  error?: string;
  stageReached?: string;
}

// ─── Simple Phone Provisioning (No Subaccounts) ───────────────────────

/**
 * Simplified phone provisioning for trial accounts:
 * 
 * 1. Buy a local Australian (+61) number with SMS + Voice on main account
 * 2. Create an Elastic SIP Trunk so Retell can route calls
 * 3. Import the number into Retell AI and bind the voice agent
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
  const retellApiKey = process.env.RETELL_API_KEY;
  const retellAgentId = process.env.RETELL_AGENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://assistantbot-zeta.vercel.app";

  if (!twilioMasterClient) {
    return { success: false, error: "Twilio credentials not configured", stageReached: "pre-check" };
  }
  if (!retellApiKey || !retellAgentId) {
    return { success: false, error: "Retell API key or Agent ID not configured", stageReached: "pre-check" };
  }

  let stageReached = "init";

  try {
    // ────────────────────────────────────────────────────────────────
    // 1. Buy Australian +61 Number (SMS + Voice capable)
    // ────────────────────────────────────────────────────────────────
    stageReached = "number-search";

    // Search for available AU numbers with SMS + Voice.
    // Try local first, fall back to mobile if none available.
    let chosenNumber: string | null = null;

    const localNumbers = await twilioMasterClient.availablePhoneNumbers("AU")
      .local.list({ smsEnabled: true, voiceEnabled: true, limit: 5 });

    if (localNumbers.length > 0) {
      chosenNumber = localNumbers[0].phoneNumber;
    } else {
      const mobileNumbers = await twilioMasterClient.availablePhoneNumbers("AU")
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

    const purchasedNumber = await twilioMasterClient.incomingPhoneNumbers.create({
      phoneNumber: chosenNumber,
      friendlyName: `${businessName} - Pj Buddy`,
    });

    await logActivity(
      workspaceId,
      "Phone Number Purchased",
      `Number: ${purchasedNumber.phoneNumber} (SID: ${purchasedNumber.sid})`
    );

    // ────────────────────────────────────────────────────────────────
    // 2. Create Elastic SIP Trunk for Retell AI
    // ────────────────────────────────────────────────────────────────
    stageReached = "sip-trunk";

    const trunk = await twilioMasterClient.trunking.v1.trunks.create({
      friendlyName: `${businessName} - Retell SIP`,
    });

    // Add an origination URI so Retell can route inbound calls
    await twilioMasterClient.trunking.v1
      .trunks(trunk.sid)
      .originationUrls.create({
        friendlyName: "Retell Inbound",
        sipUrl: "sip:retell@sip.retellai.com",
        priority: 1,
        weight: 1,
        enabled: true,
      });

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
      `Trunk SID: ${trunk.sid}, Termination: ${terminationUri}`
    );

    // ────────────────────────────────────────────────────────────────
    // 3. Register Number with Retell AI & Bind Agent
    // ────────────────────────────────────────────────────────────────
    stageReached = "retell-import";

    const retellClient = new Retell({ apiKey: retellApiKey });

    const retellPhone = await retellClient.phoneNumber.import({
      phone_number: purchasedNumber.phoneNumber,
      termination_uri: terminationUri,
      inbound_agent_id: retellAgentId,
      outbound_agent_id: retellAgentId,
      nickname: `${businessName} - Pj Buddy`,
      sip_trunk_auth_username: accountSid,
      sip_trunk_auth_password: process.env.TWILIO_AUTH_TOKEN!,
    });

    await logActivity(
      workspaceId,
      "Retell AI Voice Agent Connected",
      `Number ${retellPhone.phone_number} linked to agent ${retellAgentId}`
    );

    // ────────────────────────────────────────────────────────────────
    // 4. Persist Everything to Database
    // ────────────────────────────────────────────────────────────────
    stageReached = "db-update";

    await db.workspace.update({
      where: { id: workspaceId },
      data: {
        twilioSubaccountId: accountSid, // Using main account SID for simple setup
        twilioPhoneNumber: purchasedNumber.phoneNumber,
        twilioPhoneNumberSid: purchasedNumber.sid,
        twilioSipTrunkSid: trunk.sid,
        retellAgentId: retellAgentId,
      },
    });

    // ────────────────────────────────────────────────────────────────
    // 5. Send Welcome SMS to the Tradie
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
    console.error(`[initializeSimpleComms] Failed at stage '${stageReached}':`, error);

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
