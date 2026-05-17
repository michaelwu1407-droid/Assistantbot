import { db } from "@/lib/db";

const LEAD_PLATFORM_EVENT_TYPE = "email.received";
const LEAD_HEALTH_WARNING_DAYS = 7;

export type LeadChannelStatus =
  | "live"
  | "platform_setup_required"
  | "needs_inbox"
  | "needs_phone"
  | "needs_form_check"
  | "needs_routing_check"
  | "phone_not_provisioned"
  | "watching_for_first_lead";

export type LeadChannel = {
  id: string;
  name: string;
  category: "Lead platforms" | "Your own channels" | "Phone & SMS";
  status: LeadChannelStatus;
  description: string;
  setupSteps?: string[];
  lastLeadSeenAt?: Date | null;
};

export type LeadChannelSnapshot = {
  inboxConnected: boolean;
  activeInboxCount: number;
  firstActiveInboxAt: Date | null;
  hasPhoneNumber: boolean;
  websiteLeadCount: number;
  isOwner: boolean;
  channels: LeadChannel[];
};

function getInboxOwnerLabel(isOwner: boolean) {
  return isOwner ? "the inbox you connected above" : "the inbox the workspace owner connected above";
}

async function getLastPlatformLeadSeenAt(workspaceId: string, platform: string) {
  const event = await db.webhookEvent.findFirst({
    where: {
      provider: "resend",
      eventType: LEAD_PLATFORM_EVENT_TYPE,
      status: "success",
      AND: [
        { payload: { path: ["workspaceId"], equals: workspaceId } },
        { payload: { path: ["platform"], equals: platform } },
        { payload: { path: ["leadCapture"], equals: true } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  return event?.createdAt ?? null;
}

export async function getLeadChannelSnapshot(input: {
  workspaceId: string;
  viewerUserId?: string | null;
}): Promise<LeadChannelSnapshot> {
  const warningThreshold = new Date(Date.now() - LEAD_HEALTH_WARNING_DAYS * 24 * 60 * 60 * 1000);
  const activeInboxFilter = {
    isActive: true,
    OR: [{ tokenExpiry: null }, { tokenExpiry: { gt: new Date() } }],
  };

  const [
    activeInboxCount,
    firstActiveInbox,
    workspace,
    websiteLeadCount,
    lastWebsiteLead,
    hiPagesSeenAt,
    airtaskerSeenAt,
    oneflareSeenAt,
    serviceSeekingSeenAt,
    barkSeenAt,
  ] = await Promise.all([
    db.emailIntegration.count({
      where: {
        user: { workspaceId: input.workspaceId },
        ...activeInboxFilter,
      },
    }),
    db.emailIntegration.findFirst({
      where: {
        user: { workspaceId: input.workspaceId },
        ...activeInboxFilter,
      },
      orderBy: { createdAt: "asc" },
      select: { createdAt: true },
    }),
    db.workspace.findUnique({
      where: { id: input.workspaceId },
      select: { twilioPhoneNumber: true, ownerId: true },
    }),
    db.deal.count({
      where: {
        workspaceId: input.workspaceId,
        OR: [
          { source: "website" },
          { source: "webform" },
          { metadata: { path: ["leadSource"], equals: "website" } },
          { metadata: { path: ["leadSource"], equals: "webform" } },
        ],
      },
    }),
    db.deal.findFirst({
      where: {
        workspaceId: input.workspaceId,
        OR: [
          { source: "website" },
          { source: "webform" },
          { metadata: { path: ["leadSource"], equals: "website" } },
          { metadata: { path: ["leadSource"], equals: "webform" } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    getLastPlatformLeadSeenAt(input.workspaceId, "HiPages"),
    getLastPlatformLeadSeenAt(input.workspaceId, "Airtasker"),
    getLastPlatformLeadSeenAt(input.workspaceId, "Oneflare"),
    getLastPlatformLeadSeenAt(input.workspaceId, "ServiceSeeking"),
    getLastPlatformLeadSeenAt(input.workspaceId, "Bark"),
  ]);

  const inboxConnected = activeInboxCount > 0;
  const hasPhoneNumber = Boolean(workspace?.twilioPhoneNumber);
  const isOwner = workspace?.ownerId === input.viewerUserId;
  const connectedInboxLabel = getInboxOwnerLabel(isOwner);
  const quietLongEnoughToWarn = Boolean(firstActiveInbox?.createdAt && firstActiveInbox.createdAt <= warningThreshold);
  const stillWatchingForFirstLead = Boolean(firstActiveInbox?.createdAt && firstActiveInbox.createdAt > warningThreshold);

  function phoneChannel(params: {
    id: string;
    name: string;
    liveDescription: string;
    pendingDescription: string;
    liveSteps: string[];
    isOwner: boolean;
    hasPhoneNumber: boolean;
  }): LeadChannel {
    if (params.hasPhoneNumber) {
      return {
        id: params.id,
        name: params.name,
        category: "Phone & SMS",
        status: "live",
        description: params.liveDescription,
        setupSteps: params.liveSteps,
        lastLeadSeenAt: null,
      };
    }
    if (params.isOwner) {
      return {
        id: params.id,
        name: params.name,
        category: "Phone & SMS",
        status: "needs_phone",
        description: params.pendingDescription,
        setupSteps: ["Open Settings -> Phone & call handling and click \"Claim my business number\"."],
        lastLeadSeenAt: null,
      };
    }
    return {
      id: params.id,
      name: params.name,
      category: "Phone & SMS",
      status: "phone_not_provisioned",
      description: "Your business hasn't been assigned a Tracey number yet. The workspace owner can set this up in their settings.",
      setupSteps: [],
      lastLeadSeenAt: null,
    };
  }

  const defaultEmailPlatform = (
    id: string,
    displayName: string,
    seenAt: Date | null,
  ): LeadChannel => {
    if (!inboxConnected) {
      return {
        id,
        name: displayName,
        category: "Lead platforms",
        status: "needs_inbox",
        description: `${displayName} emails new leads to your registered email. Connect Gmail or Outlook here and Tracey will start capturing them.`,
        setupSteps: [
          "Connect your Gmail or Outlook on this page.",
          `Make sure that inbox is the same email address you use to log in to ${displayName}.`,
        ],
        lastLeadSeenAt: null,
      };
    }

    if (seenAt) {
      return {
        id,
        name: displayName,
        category: "Lead platforms",
        status: "live",
        description: `New ${displayName} leads land in Tracey as long as your ${displayName} account uses ${connectedInboxLabel}.`,
        setupSteps: [
          `Check that your ${displayName} account login email matches ${connectedInboxLabel}. If it doesn't, change it in ${displayName} settings.`,
        ],
        lastLeadSeenAt: seenAt,
      };
    }

    if (stillWatchingForFirstLead) {
      return {
        id,
        name: displayName,
        category: "Lead platforms",
        status: "watching_for_first_lead",
        description: `Your inbox is connected. Tracey is now watching for the first ${displayName} lead to land in ${connectedInboxLabel}.`,
        setupSteps: [
          `If you actively use ${displayName}, make sure the account email matches ${connectedInboxLabel}.`,
        ],
        lastLeadSeenAt: null,
      };
    }

    if (quietLongEnoughToWarn) {
      return {
        id,
        name: displayName,
        category: "Lead platforms",
        status: "needs_routing_check",
        description: `Your inbox is connected, but Earlymark still hasn't seen a ${displayName} lead. If you actively use ${displayName}, double-check that it sends to ${connectedInboxLabel}.`,
        setupSteps: [
          `Check that your ${displayName} account login email matches ${connectedInboxLabel}.`,
          `If the emails differ, update ${displayName} to send leads to that inbox instead.`,
        ],
        lastLeadSeenAt: null,
      };
    }

    return {
      id,
      name: displayName,
      category: "Lead platforms",
      status: "watching_for_first_lead",
      description: `Tracey is ready for ${displayName} lead emails as soon as the first one lands in ${connectedInboxLabel}.`,
      setupSteps: [
        `If you actively use ${displayName}, make sure the account email matches ${connectedInboxLabel}.`,
      ],
      lastLeadSeenAt: null,
    };
  };

  const websiteFormChannel: LeadChannel = !inboxConnected
    ? {
        id: "website_form",
        name: "Your website contact form",
        category: "Your own channels",
        status: "needs_inbox",
        description: "Your existing website form can land in Tracey once it emails your connected Gmail or Outlook inbox.",
        setupSteps: ["Connect your Gmail or Outlook on this page."],
        lastLeadSeenAt: null,
      }
    : websiteLeadCount > 0
      ? {
          id: "website_form",
          name: "Your website contact form",
          category: "Your own channels",
          status: "live",
          description: "Website enquiries have already reached Earlymark from this workspace, so the form path is live.",
          setupSteps: [],
          lastLeadSeenAt: lastWebsiteLead?.createdAt ?? null,
        }
      : stillWatchingForFirstLead
        ? {
            id: "website_form",
            name: "Your website contact form",
            category: "Your own channels",
            status: "watching_for_first_lead",
            description: "Your inbox is connected. Tracey is watching for the first website enquiry so this path can be proven live.",
            setupSteps: [
              "Make sure your website form sends enquiries to the same inbox connected above.",
            ],
            lastLeadSeenAt: null,
          }
        : {
            id: "website_form",
            name: "Your website contact form",
            category: "Your own channels",
            status: "needs_form_check",
            description: "Captured automatically if your website form is set to email you. That's the default for Wix, Squarespace Business, and many WordPress setups, but not every site builder or plugin works that way.",
            setupSteps: [
              "Make sure your website form sends enquiries to the same inbox connected above.",
              "If your site uses a custom form or stores submissions only in a dashboard, use the advanced webform endpoint below instead.",
            ],
            lastLeadSeenAt: null,
          };

  const channels: LeadChannel[] = [
    defaultEmailPlatform("hipages", "hipages", hiPagesSeenAt),
    defaultEmailPlatform("airtasker", "Airtasker", airtaskerSeenAt),
    defaultEmailPlatform("oneflare", "Oneflare", oneflareSeenAt),
    defaultEmailPlatform("serviceseeking", "Service Seeking", serviceSeekingSeenAt),
    defaultEmailPlatform("bark", "Bark", barkSeenAt),
    {
      id: "google_lsa",
      name: "Google Local Services Ads",
      category: "Lead platforms",
      status: inboxConnected ? "platform_setup_required" : "needs_inbox",
      description: inboxConnected
        ? `One more step on Google's side. Once you turn on lead email notifications inside Google LSA and point them to ${connectedInboxLabel}, those leads will land here.`
        : "Captured via email - Google LSA emails the lead details when you turn on notifications in their dashboard.",
      setupSteps: [
        ...(inboxConnected ? [] : ["Connect your Gmail or Outlook on this page."]),
        "Open ads.google.com -> Local Services -> Settings -> Notifications.",
        `Turn on "Email lead notifications" and set the email to ${connectedInboxLabel}.`,
        "Save. The next lead Google sends you will show up in Tracey within a minute.",
      ],
      lastLeadSeenAt: null,
    },
    {
      id: "meta_lead_ads",
      name: "Facebook / Instagram Lead Ads",
      category: "Lead platforms",
      status: inboxConnected ? "platform_setup_required" : "needs_inbox",
      description: inboxConnected
        ? `One more step on Meta's side. Add ${connectedInboxLabel} to your Facebook Page's Lead Access list and new lead-form submissions will land here.`
        : "Captured via email - Meta forwards Lead Ad submissions to email addresses you nominate on your Page.",
      setupSteps: [
        ...(inboxConnected ? [] : ["Connect your Gmail or Outlook on this page."]),
        "Open business.facebook.com -> your Page -> Settings -> Lead Access (under Page Roles).",
        `Click "Assign new CRM" and add ${connectedInboxLabel} as a CRM email recipient.`,
        "Save. The next lead from any Lead Ad on this Page will land in Tracey.",
      ],
      lastLeadSeenAt: null,
    },
    websiteFormChannel,
    phoneChannel({
      id: "inbound_calls",
      name: "Inbound phone calls",
      liveDescription: "Tracey answers every call to your business number, qualifies the customer and books the job.",
      pendingDescription: "Once your business number is provisioned, every inbound call is answered by Tracey.",
      liveSteps: ["Give your business number out to customers (van signage, quotes, invoices, website footer)."],
      isOwner,
      hasPhoneNumber,
    }),
    phoneChannel({
      id: "missed_calls",
      name: "Missed calls (auto-callback)",
      liveDescription: "If a call isn't answered, Tracey creates a lead and calls the customer back automatically - closing the biggest leak in most tradie businesses.",
      pendingDescription: "Once your business number is provisioned, missed calls become leads with an auto-callback.",
      liveSteps: [],
      isOwner,
      hasPhoneNumber,
    }),
    phoneChannel({
      id: "inbound_sms",
      name: "Inbound SMS",
      liveDescription: "Texts to your business number become leads and trigger an auto-callback.",
      pendingDescription: "Once your business number is provisioned, inbound SMS becomes leads with an auto-callback.",
      liveSteps: [],
      isOwner,
      hasPhoneNumber,
    }),
  ];

  return {
    inboxConnected,
    activeInboxCount,
    firstActiveInboxAt: firstActiveInbox?.createdAt ?? null,
    hasPhoneNumber,
    websiteLeadCount,
    isOwner,
    channels,
  };
}
