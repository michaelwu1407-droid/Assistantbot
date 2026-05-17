"use server";

/**
 * getLeadChannels — returns every lead source the app can capture, with an
 * honest status per channel. Used by the "Where your leads come from" panel
 * so the tradie can see exactly what's working and what they still need to
 * configure on the platform's own side. We deliberately distinguish
 * "platform_setup_required" (inbox is connected but the platform itself
 * needs the lead email turned on) from "live" so we don't lie about
 * coverage.
 */
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { getOrCreateWorkspace } from "./workspace-actions";

export type LeadChannelStatus =
  | "live"
  | "platform_setup_required"
  | "needs_inbox"
  | "needs_phone"
  | "needs_form_check"
  | "phone_not_provisioned";  // teammate-visible: workspace has no number, but it's not on this user to fix

export type LeadChannel = {
  id: string;
  name: string;
  category: "Lead platforms" | "Your own channels" | "Phone & SMS";
  status: LeadChannelStatus;
  description: string;
  setupSteps?: string[];
  shareableLink?: { label: string; path: string };  // rendered prominently with copy button
};

export async function getLeadChannels(): Promise<{
  inboxConnected: boolean;
  hasPhoneNumber: boolean;
  isOwner: boolean;
  channels: LeadChannel[];
}> {
  const userId = await getAuthUserId();
  if (!userId) {
    return { inboxConnected: false, hasPhoneNumber: false, isOwner: false, channels: [] };
  }

  const workspaceView = await getOrCreateWorkspace(userId);
  const workspaceId = workspaceView.id;

  // Count inboxes across every member of the workspace — not just the
  // current user. A teammate who hasn't connected their own Gmail still
  // benefits from the owner's connection (e.g. hipages emails the owner's
  // registered address, not each teammate). Per-user counts here would
  // misleadingly tell teammates the workspace isn't capturing leads when
  // it actually is.
  const [inboxCount, workspace] = await Promise.all([
    db.emailIntegration.count({ where: { user: { workspaceId }, isActive: true } }),
    db.workspace.findUnique({
      where: { id: workspaceId },
      select: { twilioPhoneNumber: true, ownerId: true },
    }),
  ]);

  const inboxConnected = inboxCount > 0;
  const hasPhoneNumber = !!workspace?.twilioPhoneNumber;
  const isOwner = workspace?.ownerId === userId;

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
        id: params.id, name: params.name, category: "Phone & SMS",
        status: "live", description: params.liveDescription, setupSteps: params.liveSteps,
      };
    }
    if (params.isOwner) {
      return {
        id: params.id, name: params.name, category: "Phone & SMS",
        status: "needs_phone", description: params.pendingDescription,
        setupSteps: ["Open Settings → Phone & call handling and click \"Claim my business number\"."],
      };
    }
    return {
      id: params.id, name: params.name, category: "Phone & SMS",
      status: "phone_not_provisioned",
      description: "Your business hasn't been assigned a Tracey number yet. The workspace owner can set this up in their settings.",
      setupSteps: [],
    };
  }

  // Platforms that *default* to emailing the tradie's registered address.
  // Once the inbox is connected and the tradie's platform login email
  // matches that inbox, leads flow with zero extra config.
  const defaultEmailPlatform = (name: string, displayName: string): LeadChannel => ({
    id: name,
    name: displayName,
    category: "Lead platforms",
    status: inboxConnected ? "live" : "needs_inbox",
    description: inboxConnected
      ? `New ${displayName} leads land in Tracey as long as your ${displayName} account uses the inbox you connected above.`
      : `${displayName} emails new leads to your registered email. Connect that inbox above and Tracey will start capturing them.`,
    setupSteps: inboxConnected
      ? [
          `Check that your ${displayName} account login email matches the inbox you connected above. If it doesn't, change it in ${displayName} settings.`,
        ]
      : [
          "Connect your Gmail or Outlook on this page.",
          `Make sure that inbox is the same email address you use to log in to ${displayName}.`,
        ],
  });

  const channels: LeadChannel[] = [
    defaultEmailPlatform("hipages", "hipages"),
    defaultEmailPlatform("airtasker", "Airtasker"),
    defaultEmailPlatform("oneflare", "Oneflare"),
    defaultEmailPlatform("serviceseeking", "Service Seeking"),
    defaultEmailPlatform("bark", "Bark"),

    // Google LSA — even with inbox connected, lead email notifications are
    // off by default in the LSA dashboard. We must say so honestly.
    {
      id: "google_lsa",
      name: "Google Local Services Ads",
      category: "Lead platforms",
      status: inboxConnected ? "platform_setup_required" : "needs_inbox",
      description: inboxConnected
        ? "One more step on Google's side. Once you turn on lead email notifications inside Google LSA, those leads will land here."
        : "Captured via email — Google LSA emails the lead details when you turn on notifications in their dashboard.",
      setupSteps: [
        ...(inboxConnected ? [] : ["Connect your Gmail or Outlook on this page."]),
        "Open ads.google.com → Local Services → Settings → Notifications.",
        "Turn on \"Email lead notifications\" and set the email to the inbox you connected here.",
        "Save. The next lead Google sends you will show up in Tracey within a minute.",
      ],
    },

    // Meta Lead Ads — Facebook Pages only email leads to addresses listed
    // under Lead Access. Inbox connection alone doesn't unlock anything.
    {
      id: "meta_lead_ads",
      name: "Facebook / Instagram Lead Ads",
      category: "Lead platforms",
      status: inboxConnected ? "platform_setup_required" : "needs_inbox",
      description: inboxConnected
        ? "One more step on Meta's side. Add your connected inbox to your Facebook Page's Lead Access list and new lead-form submissions will land here."
        : "Captured via email — Meta forwards Lead Ad submissions to email addresses you nominate on your Page.",
      setupSteps: [
        ...(inboxConnected ? [] : ["Connect your Gmail or Outlook on this page."]),
        "Open business.facebook.com → your Page → Settings → Lead Access (under Page Roles).",
        "Click \"Assign new CRM\" → add the inbox you connected here as a CRM email recipient.",
        "Save. The next lead from any Lead Ad on this Page will land in Tracey.",
      ],
    },

    // Website form — we host the form ourselves. The tradie shares the
    // /quote/<workspaceId> link from their site (or anywhere — business
    // cards, GMB, SMS). No tradie-side email-forwarding setup, no testing,
    // no dependency on their site builder. Works 100% out of the box.
    {
      id: "website_form",
      name: "Your website contact form",
      category: "Your own channels",
      status: "live",
      description: `Your hosted quote form is live and ready. Share the link below from your website ("Get a Quote" button), Google Business profile, SMS replies — anywhere customers can click. Every submission lands in Tracey and triggers a callback.`,
      shareableLink: { label: "Your quote form", path: `/quote/${workspaceId}` },
      setupSteps: [
        `Add a button on your website labelled "Get a Quote" that links to your quote form URL. Most site builders (Wix, Squarespace, WordPress, GoDaddy) have a one-click "Add button" widget.`,
        `Also paste the link in your Google Business profile, your email signature, and your SMS auto-replies so customers can reach you anywhere.`,
      ],
    },

    // Phone & SMS — all tied to the Tracey number being provisioned.
    // Owner sees a "claim it" CTA on the unprovisioned case. Teammates
    // can't manage workspace infra so they get a read-only status and no
    // "click here to fix" steps.
    phoneChannel({
      id: "inbound_calls",
      name: "Inbound phone calls",
      liveDescription: "Tracey answers every call to your business number, qualifies the customer and books the job.",
      pendingDescription: "Once your business number is provisioned, every inbound call is answered by Tracey.",
      liveSteps: ["Give your business number out to customers (van signage, quotes, invoices, website footer)."],
      isOwner, hasPhoneNumber,
    }),
    phoneChannel({
      id: "missed_calls",
      name: "Missed calls (auto-callback)",
      liveDescription: "If a call isn't answered, Tracey creates a lead and calls the customer back automatically — closing the biggest leak in most tradie businesses.",
      pendingDescription: "Once your business number is provisioned, missed calls become leads with an auto-callback.",
      liveSteps: [],
      isOwner, hasPhoneNumber,
    }),
    phoneChannel({
      id: "inbound_sms",
      name: "Inbound SMS",
      liveDescription: "Texts to your business number become leads and trigger an auto-callback.",
      pendingDescription: "Once your business number is provisioned, inbound SMS becomes leads with an auto-callback.",
      liveSteps: [],
      isOwner, hasPhoneNumber,
    }),
  ];

  return { inboxConnected, hasPhoneNumber, isOwner, channels };
}
