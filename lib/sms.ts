import { db } from "@/lib/db";
import { Twilio } from "twilio";

/**
 * Sends an introductory SMS to a new lead
 */
export async function sendIntroSms(options: {
  to: string;
  workspaceId: string;
  dealId: string;
  contactId: string;
}) {
  // Get workspace details
  const workspace = await db.workspace.findUnique({
    where: { id: options.workspaceId },
    select: {
      name: true,
      twilioPhoneNumber: true,
      ownerId: true,
    },
  });

  if (!workspace || !workspace.twilioPhoneNumber) {
    throw new Error("Workspace not configured for SMS");
  }

  // Get owner details
  const owner = await db.user.findUnique({
    where: { id: workspace.ownerId || "" },
    select: { name: true },
  });

  const twilioClient = new Twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
  );

  const introMessage = `Hi! This is ${owner?.name || workspace.name} from Pj Buddy. Thanks for your interest! I've received your request and will get back to you shortly with a quote. Best way to reach me is replying to this message. Cheers!`;

  const message = await twilioClient.messages.create({
    body: introMessage,
    from: workspace.twilioPhoneNumber,
    to: options.to,
  });

  // Log the SMS as an activity
  await db.activity.create({
    data: {
      type: "CALL", // Use CALL for SMS activities
      title: `Intro SMS sent to lead`,
      description: "Automated introductory message",
      content: introMessage,
      contactId: options.contactId,
      dealId: options.dealId,
    },
  });

  return message;
}
