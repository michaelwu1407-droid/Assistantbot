import { db } from "@/lib/db";
import { getSubaccountClient, twilioMasterClient } from "@/lib/twilio";

function getWorkspaceSettings(settings: unknown): Record<string, unknown> {
  if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
    return {};
  }

  return settings as Record<string, unknown>;
}

export function getTraceyHandbookUrl(): string {
  const configured = process.env.TRACEY_HANDBOOK_URL?.trim();
  if (configured) return configured;

  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://earlymark.ai").replace(/\/$/, "");
  return `${appUrl}/crm/settings/help`;
}

export function buildTraceyWelcomeSmsBody(businessName: string, phoneNumber: string): string {
  const handbookUrl = getTraceyHandbookUrl();
  return `Welcome to Earlymark AI. Tracey is now live on ${phoneNumber} for ${businessName}. Tracey handbook: ${handbookUrl}`;
}

export async function sendProvisionedWelcomeSmsIfNeeded(params: {
  workspaceId: string;
  businessName: string;
  ownerPhone?: string | null;
}): Promise<{ sent: boolean; reason?: string; phoneNumber?: string }> {
  if (!params.ownerPhone) {
    return { sent: false, reason: "missing-owner-phone" };
  }

  const workspace = await db.workspace.findUnique({
    where: { id: params.workspaceId },
    select: {
      settings: true,
      twilioPhoneNumber: true,
      twilioSubaccountId: true,
      twilioSubaccountAuthToken: true,
    },
  });

  if (!workspace?.twilioPhoneNumber) {
    return { sent: false, reason: "missing-provisioned-number" };
  }

  const settings = getWorkspaceSettings(workspace.settings);
  if (settings.welcomeSmsSentAt) {
    return {
      sent: false,
      reason: "already-sent",
      phoneNumber: workspace.twilioPhoneNumber,
    };
  }

  const client =
    workspace.twilioSubaccountId &&
    workspace.twilioSubaccountAuthToken &&
    twilioMasterClient &&
    workspace.twilioSubaccountId !== process.env.TWILIO_ACCOUNT_SID
      ? getSubaccountClient(workspace.twilioSubaccountId, workspace.twilioSubaccountAuthToken)
      : twilioMasterClient;

  if (!client) {
    return {
      sent: false,
      reason: "missing-twilio-client",
      phoneNumber: workspace.twilioPhoneNumber,
    };
  }

  await client.messages.create({
    to: params.ownerPhone,
    from: workspace.twilioPhoneNumber,
    body: buildTraceyWelcomeSmsBody(params.businessName, workspace.twilioPhoneNumber),
  });

  await db.workspace.update({
    where: { id: params.workspaceId },
    data: {
      settings: {
        ...settings,
        welcomeSmsSentAt: new Date().toISOString(),
        welcomeSmsFromNumber: workspace.twilioPhoneNumber,
        traceyHandbookUrl: getTraceyHandbookUrl(),
      },
    },
  });

  return {
    sent: true,
    phoneNumber: workspace.twilioPhoneNumber,
  };
}
