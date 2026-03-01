import React, { Suspense } from 'react';
import { ShellHost } from '@/components/layout/shell-host';
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { DashboardProvider } from "@/components/providers/dashboard-provider";
import { SyncProvider } from "@/components/providers/sync-provider";
import { getAuthUserId } from "@/lib/auth";
import { ShellInitializer } from "@/components/layout/shell-initializer";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logging";
import { ChatInterface } from "@/components/chatbot/chat-interface";
import { db } from "@/lib/db";
import type { UserRole } from "@/lib/store";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  logger.authFlow("Dashboard layout - initializing", { component: "DashboardLayout" });

  let workspaceId = "";
  let userId = "";
  let userRole: UserRole = "OWNER";
  let tutorialComplete = false;
  let onboardingComplete = false;
  let shouldRedirectToBilling = false;
  let shouldRedirectToSetup = false;

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
    onboardingComplete = workspace.onboardingComplete;

    // Fetch user role for RBAC
    try {
      const dbUser = await db.user.findUnique({
        where: { id: userId },
        select: { role: true },
      });
      if (dbUser?.role) userRole = dbUser.role as UserRole;
    } catch {
      // Default to OWNER if lookup fails
    }

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

    if (workspace.subscriptionStatus === "active" && !workspace.onboardingComplete) {
      shouldRedirectToSetup = true;
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

  if (shouldRedirectToSetup) {
    redirect("/setup");
  }

  return (
    <DashboardProvider>
      <SyncProvider>
        <ShellInitializer workspaceId={workspaceId} userId={userId} userRole={userRole} tutorialComplete={tutorialComplete} />
        <Suspense fallback={<div className="h-screen w-full bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
          <ShellHost chatbot={<ChatInterface workspaceId={workspaceId} />}>{children}</ShellHost>
        </Suspense>
      </SyncProvider>
    </DashboardProvider>
  );
}

