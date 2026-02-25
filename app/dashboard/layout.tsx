import React, { Suspense } from 'react';
import { Shell } from '@/components/layout/Shell';
import { ChatInterface } from "@/components/chatbot/chat-interface";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { DashboardProvider } from "@/components/providers/dashboard-provider";
import { SyncProvider } from "@/components/providers/sync-provider";
import { getAuthUserId } from "@/lib/auth";
import { ShellInitializer } from "@/components/layout/shell-initializer";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logging";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  logger.authFlow("Dashboard layout - initializing", { component: "DashboardLayout" });
  
  let workspaceId = "";
  let userId = "";
  let tutorialComplete = false;
  let shouldRedirectToBilling = false;

  try {
    userId = await getAuthUserId();
    if (!userId) {
      logger.authFlow("No userId in dashboard layout, redirecting to /auth", { component: "DashboardLayout" });
      redirect("/auth");
    }
    
    logger.authFlow("Getting workspace for dashboard layout", { userId, component: "DashboardLayout" });
    const workspace = await getOrCreateWorkspace(userId);
    workspaceId = workspace.id;
    tutorialComplete = workspace.tutorialComplete;

    logger.authFlow("Dashboard layout workspace data", {
      component: "DashboardLayout",
      workspaceId,
      subscriptionStatus: workspace.subscriptionStatus,
      tutorialComplete
    });

    // Gating mechanism - explicitly mandate a paid Stripe tier
    if (workspace.subscriptionStatus !== "active") {
      logger.authFlow("User subscription not active, redirecting to billing", {
        component: "DashboardLayout",
        workspaceId,
        subscriptionStatus: workspace.subscriptionStatus
      });
      shouldRedirectToBilling = true;
    }
  } catch (error) {
    const errorObj = error instanceof Error ? error : new Error(String(error));
    logger.workspaceError("Layout failed to fetch workspace", { 
      component: "DashboardLayout",
      error: errorObj.message
    }, errorObj);
    // If we can't get workspace, try to continue with empty values
    // The dashboard page will handle showing appropriate error states
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

