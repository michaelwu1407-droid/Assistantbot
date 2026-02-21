import React, { Suspense } from 'react';
import { Shell } from '@/components/layout/Shell';
import { ChatInterface } from "@/components/chatbot/chat-interface";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { DashboardProvider } from "@/components/providers/dashboard-provider";
import { SyncProvider } from "@/components/providers/sync-provider";
import { getAuthUserId } from "@/lib/auth";
import { ShellInitializer } from "@/components/layout/shell-initializer";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let workspaceId = "";
  let userId = "";
  let tutorialComplete = false;
  let shouldRedirectToBilling = false;

  try {
    userId = await getAuthUserId();
    const workspace = await getOrCreateWorkspace(userId);
    workspaceId = workspace.id;
    tutorialComplete = workspace.tutorialComplete;

    // Gating mechanism - explicitly mandate a paid Stripe tier
    if (workspace.subscriptionStatus !== "active") {
      shouldRedirectToBilling = true;
    }
  } catch (error) {
    console.error("Layout failed to fetch workspace:", error);
    // Continue rendering so the page can show the specific DB error
  }

  // Redirect triggered outside the try/catch to avoid intercepting Next.js internal redirect throws
  if (shouldRedirectToBilling) {
    redirect("/billing");
  }

  return (
    <DashboardProvider>
      <SyncProvider>
        <ShellInitializer workspaceId={workspaceId} userId={userId} tutorialComplete={tutorialComplete} />
        <Suspense fallback={<div className="h-screen w-full bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
          <Shell chatbot={<ChatInterface workspaceId={workspaceId} />}>
            {children}
          </Shell>
        </Suspense>
      </SyncProvider>
    </DashboardProvider>
  );
}

