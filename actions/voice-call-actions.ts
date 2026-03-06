"use server";

import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";

export type VoiceCallView = {
  id: string;
  callType: string;
  callerName: string | null;
  callerPhone: string | null;
  businessName: string | null;
  summary: string | null;
  transcriptText: string | null;
  startedAt: Date;
  endedAt: Date | null;
};

export async function getRecentVoiceCallsForWorkspace(limit = 10): Promise<VoiceCallView[]> {
  const authUser = await getAuthUser();
  if (!authUser?.email) return [];

  const user = await db.user.findFirst({
    where: { email: authUser.email },
    select: { workspaceId: true },
  });

  if (!user?.workspaceId) return [];

  const calls = await db.voiceCall.findMany({
    where: { workspaceId: user.workspaceId },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      callType: true,
      callerName: true,
      callerPhone: true,
      businessName: true,
      summary: true,
      transcriptText: true,
      startedAt: true,
      endedAt: true,
    },
  });

  return calls;
}
