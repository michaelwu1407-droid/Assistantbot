"use server";

/**
 * getLeadChannels — returns every lead source the app can capture, with a
 * live status badge for the current tradie's workspace. Powers the
 * customer-facing "Where your leads come from" panel on the integrations
 * page and dashboard, so the tradie can see at a glance which channels are
 * working and which still need a one-time setup step.
 */
import { db } from "@/lib/db";
import { getAuthUserId } from "@/lib/auth";
import { getOrCreateWorkspace } from "./workspace-actions";

export type LeadChannelStatus = "live" | "needs_setup" | "auto";

export type LeadChannel = {
  id: string;
  name: string;
  category: "Lead platforms" | "Your own channels" | "Phone & SMS";
  status: LeadChannelStatus;
  description: string;
  setupHint?: string;
};

export async function getLeadChannels(): Promise<{
  inboxConnected: boolean;
  hasPhoneNumber: boolean;
  channels: LeadChannel[];
}> {
  const userId = await getAuthUserId();
  if (!userId) {
    return { inboxConnected: false, hasPhoneNumber: false, channels: [] };
  }

  const workspaceView = await getOrCreateWorkspace(userId);
  const workspaceId = workspaceView.id;

  const [inboxCount, workspace] = await Promise.all([
    db.emailIntegration.count({ where: { userId, isActive: true } }),
    db.workspace.findUnique({
      where: { id: workspaceId },
      select: { twilioPhoneNumber: true },
    }),
  ]);

  const inboxConnected = inboxCount > 0;
  const hasPhoneNumber = !!workspace?.twilioPhoneNumber;

  const inboxStatus = (): LeadChannelStatus => (inboxConnected ? "live" : "needs_setup");
  const phoneStatus = (): LeadChannelStatus => (hasPhoneNumber ? "live" : "needs_setup");

  const channels: LeadChannel[] = [
    // ─── Paid lead platforms — all email-based ─────────────────────────
    {
      id: "hipages",
      name: "hipages",
      category: "Lead platforms",
      status: inboxStatus(),
      description: "Auto-captured from your hipages lead emails.",
      setupHint: inboxConnected ? undefined : "Connect your inbox above to start capturing hipages leads.",
    },
    {
      id: "airtasker",
      name: "Airtasker",
      category: "Lead platforms",
      status: inboxStatus(),
      description: "Auto-captured from your Airtasker notification emails.",
      setupHint: inboxConnected ? undefined : "Connect your inbox above.",
    },
    {
      id: "oneflare",
      name: "Oneflare",
      category: "Lead platforms",
      status: inboxStatus(),
      description: "Auto-captured from your Oneflare lead emails.",
      setupHint: inboxConnected ? undefined : "Connect your inbox above.",
    },
    {
      id: "serviceseeking",
      name: "Service Seeking",
      category: "Lead platforms",
      status: inboxStatus(),
      description: "Auto-captured from Service Seeking notifications.",
      setupHint: inboxConnected ? undefined : "Connect your inbox above.",
    },
    {
      id: "bark",
      name: "Bark",
      category: "Lead platforms",
      status: inboxStatus(),
      description: "Auto-captured from Bark lead emails.",
      setupHint: inboxConnected ? undefined : "Connect your inbox above.",
    },
    {
      id: "google_lsa",
      name: "Google Local Services Ads",
      category: "Lead platforms",
      status: inboxStatus(),
      description: inboxConnected
        ? "Captured once you turn on email notifications in your Google LSA dashboard."
        : "Auto-captured from Google LSA email notifications.",
      setupHint: inboxConnected
        ? "In Google Ads → Local Services → Settings, set the lead email to the inbox you connected here. New LSA leads will land in Tracey automatically."
        : "Connect your inbox above, then turn on lead email notifications in Google LSA.",
    },
    {
      id: "meta_lead_ads",
      name: "Facebook / Instagram Lead Ads",
      category: "Lead platforms",
      status: inboxStatus(),
      description: inboxConnected
        ? "Captured once you set your Facebook Page to email new leads."
        : "Auto-captured from Meta Lead Ads notification emails.",
      setupHint: inboxConnected
        ? "In Facebook Page → Settings → Lead Access, add the inbox you connected here as a CRM email recipient. New Lead Ad submissions will land in Tracey."
        : "Connect your inbox above, then enable Lead Access email forwarding on your Facebook Page.",
    },

    // ─── Channels the tradie owns ──────────────────────────────────────
    {
      id: "website_form",
      name: "Your website contact form",
      category: "Your own channels",
      status: inboxStatus(),
      description: inboxConnected
        ? "Your existing website form keeps emailing you — Tracey captures those too."
        : "Most website forms already email you. Once your inbox is connected, those leads are captured automatically.",
      setupHint: inboxConnected ? undefined : "Connect your inbox above.",
    },

    // ─── Phone & SMS — all tied to the Tracey number ───────────────────
    {
      id: "inbound_calls",
      name: "Inbound phone calls",
      category: "Phone & SMS",
      status: phoneStatus(),
      description: "Tracey answers every call to your business number, qualifies the customer and books the job.",
      setupHint: hasPhoneNumber ? undefined : "Claim your business phone number in Settings.",
    },
    {
      id: "missed_calls",
      name: "Missed calls",
      category: "Phone & SMS",
      status: phoneStatus(),
      description: "If a call isn't answered, Tracey creates a lead and calls the customer back automatically.",
      setupHint: hasPhoneNumber ? undefined : "Claim your business phone number in Settings.",
    },
    {
      id: "inbound_sms",
      name: "Inbound SMS",
      category: "Phone & SMS",
      status: phoneStatus(),
      description: "Texts to your business number become leads and trigger an auto-callback.",
      setupHint: hasPhoneNumber ? undefined : "Claim your business phone number in Settings.",
    },
  ];

  return { inboxConnected, hasPhoneNumber, channels };
}
