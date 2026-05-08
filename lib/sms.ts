import { db } from "@/lib/db";
import { getWorkspaceTwilioClient } from "@/lib/twilio";
import { buildPublicJobPortalUrl } from "@/lib/public-job-portal";
import { assertSafeRecipient } from "@/lib/messaging/safe-recipient";
import { withCostCeiling } from "@/lib/cost-ceiling";

// AU/US SMS rates land around $0.04-0.05 per outbound segment.
const TWILIO_SMS_COST_USD = 0.05;

/**
 * Sends an introductory SMS to a new lead.
 * Includes a portal link so later status updates can be mirrored there too.
 */
export async function sendIntroSms(options: {
  to: string;
  workspaceId: string;
  dealId: string;
  contactId: string;
}) {
  const workspace = await db.workspace.findUnique({
    where: { id: options.workspaceId },
    select: {
      name: true,
      twilioPhoneNumber: true,
      twilioSubaccountId: true,
      twilioSubaccountAuthToken: true,
      ownerId: true,
    },
  });

  if (!workspace || !workspace.twilioPhoneNumber) {
    throw new Error("Workspace not configured for SMS");
  }

  const owner = await db.user.findUnique({
    where: { id: workspace.ownerId || "" },
    select: { name: true },
  });

  const portalUrl = buildPublicJobPortalUrl({
    dealId: options.dealId,
    contactId: options.contactId,
    workspaceId: options.workspaceId,
  });

  const introMessage = `Hi! This is ${owner?.name || workspace.name} from ${workspace.name}. Thanks for your interest! I've received your request and will get back to you shortly with a quote. Best way to reach me is replying to this message.\n\nTrack your job here: ${portalUrl}`;

  const twilioClient = getWorkspaceTwilioClient(workspace);
  if (!twilioClient) {
    throw new Error("No usable Twilio client for this workspace");
  }

  const safeTo = assertSafeRecipient("sms", options.to);
  const fromNumber = workspace.twilioPhoneNumber;
  const message = await withCostCeiling("twilio", TWILIO_SMS_COST_USD, () =>
    twilioClient.messages.create({
      body: introMessage,
      from: fromNumber,
      to: safeTo,
    }),
  );

  await db.activity.create({
    data: {
      type: "CALL",
      title: "Intro SMS sent to lead",
      description: "Automated introductory message with portal link",
      content: introMessage,
      contactId: options.contactId,
      dealId: options.dealId,
    },
  });

  return message;
}
