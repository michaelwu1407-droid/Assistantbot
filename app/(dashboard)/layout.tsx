import React, { Suspense } from 'react';
import { Shell } from '@/components/layout/Shell';
import { ChatInterface } from "@/components/chatbot/chat-interface";
import { OnboardingModal } from "@/components/dashboard/onboarding-modal";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { getAuthUserId } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let workspaceId = "demo-workspace";

  try {
    const userId = await getAuthUserId();
    const workspace = await getOrCreateWorkspace(userId);
    workspaceId = workspace.id;
  } catch (error) {
    console.error("Layout failed to fetch workspace:", error);
  }

  return (
    <Suspense fallback={<div className="h-screen w-full bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
      <Shell chatbot={<ChatInterface workspaceId={workspaceId} />}>
        <OnboardingModal />
        {children}
      </Shell>
    </Suspense>
  );
}

