import React, { Suspense } from 'react';
import { Shell } from '@/components/layout/Shell';
import { ChatInterface } from "@/components/chatbot/chat-interface";
import { OnboardingModal } from "@/components/dashboard/onboarding-modal";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { getAuthUserId } from "@/lib/auth";
import { ShellInitializer } from "@/components/layout/shell-initializer";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let workspaceId = "";
  let userId = "";
  let tutorialComplete = false;

  try {
    const authUserId = await getAuthUserId();
    if (!authUserId) {
      throw new Error("User not authenticated");
    }
    userId = authUserId;
    const workspace = await getOrCreateWorkspace(userId);
    workspaceId = workspace.id;
    tutorialComplete = workspace.tutorialComplete;
  } catch (error) {
    console.error("Layout failed to fetch workspace:", error);
  }

  return (
    <>
      <ShellInitializer workspaceId={workspaceId} userId={userId} tutorialComplete={tutorialComplete} />
      <Suspense fallback={<div className="h-screen w-full bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
        <Shell chatbot={<ChatInterface workspaceId={workspaceId} />}>
          <OnboardingModal />
          {children}
        </Shell>
      </Suspense>
    </>
  );
}

