import twilio from "twilio";
import { buildManagedSubaccountFriendlyName } from "@/lib/voice-number-metadata";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

// Debug logging for Twilio credentials
console.log("[TWILIO] Credential check:", {
  hasAccountSid: !!accountSid,
  hasAuthToken: !!authToken,
  accountSidPrefix: accountSid ? accountSid.substring(0, 8) + "..." : "missing",
  accountSidLength: accountSid ? accountSid.length : 0,
  authTokenLength: authToken ? authToken.length : 0,
  isTestAccount: accountSid?.startsWith("AC") ? "✅ Valid format" : "❌ Invalid format"
});

// Initialize the master Twilio client (the Platform Provider's account)
export const twilioMasterClient =
    accountSid && authToken ? twilio(accountSid, authToken) : null;

type WorkspaceTwilioConfig = {
    twilioSubaccountId?: string | null;
    twilioSubaccountAuthToken?: string | null;
};

/**
 * Creates a unique Twilio Subaccount for a Tradie (Workspace).
 * This ensures their usage is billed separately and their data is isolated.
 * 
 * @param friendlyName - Usually the Tradie's Business Name (e.g., "Bob's Plumbing")
 */
export async function createTwilioSubaccount(
    friendlyName: string,
    options?: { workspaceId?: string | null },
) {
    if (!twilioMasterClient) {
        console.warn("TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN is missing. Subaccount creation skipped.");
        return null;
    }

    try {
        const subaccount = await twilioMasterClient.api.v2010.accounts.create({
            friendlyName: options?.workspaceId
                ? buildManagedSubaccountFriendlyName(options.workspaceId, friendlyName)
                : `Workspace: ${friendlyName}`,
        });

        return {
            subaccountId: subaccount.sid,
            subaccountAuthToken: subaccount.authToken,
        };
    } catch (error) {
        console.error("Failed to create Twilio Subaccount:", error);
        throw error instanceof Error ? error : new Error("Failed to create Twilio Subaccount");
    }
}

/**
 * Initializes a Twilio client scoped to a specific Tradie's Subaccount.
 * Used for sending/receiving SMS on behalf of that specific Tradie.
 */
export function getSubaccountClient(subaccountId: string, subaccountAuthToken: string) {
    return twilio(subaccountId, subaccountAuthToken);
}

export function getWorkspaceTwilioClient(workspace: WorkspaceTwilioConfig) {
    if (
        workspace.twilioSubaccountId &&
        workspace.twilioSubaccountAuthToken &&
        twilioMasterClient &&
        workspace.twilioSubaccountId !== accountSid
    ) {
        return getSubaccountClient(workspace.twilioSubaccountId, workspace.twilioSubaccountAuthToken);
    }

    return twilioMasterClient;
}
