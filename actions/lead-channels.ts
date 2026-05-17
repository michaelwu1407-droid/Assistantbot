"use server";

/**
 * getLeadChannels - returns every lead source the app can capture, with an
 * honest status per channel. Used by the "Where your leads come from" panel
 * so the tradie can see exactly what's working and what they still need to
 * configure on the platform's own side.
 */
import { getAuthUserId } from "@/lib/auth";
import {
  getLeadChannelSnapshot,
  type LeadChannel,
  type LeadChannelStatus,
} from "@/lib/lead-channel-health";
import { getOrCreateWorkspace } from "./workspace-actions";

export type { LeadChannel, LeadChannelStatus } from "@/lib/lead-channel-health";

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

  const workspace = await getOrCreateWorkspace(userId);
  const snapshot = await getLeadChannelSnapshot({
    workspaceId: workspace.id,
    viewerUserId: userId,
  });

  return {
    inboxConnected: snapshot.inboxConnected,
    hasPhoneNumber: snapshot.hasPhoneNumber,
    isOwner: snapshot.isOwner,
    channels: snapshot.channels,
  };
}
