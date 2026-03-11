import React, { Suspense } from 'react';
import dynamic from "next/dynamic";
import { ShellHost } from '@/components/layout/shell-host';
import { DashboardProvider } from "@/components/providers/dashboard-provider";
import { SyncProvider } from "@/components/providers/sync-provider";
import { IndustryProvider } from "@/components/providers/industry-provider";
import { DashboardClientChrome } from "@/components/providers/dashboard-client-chrome";
import { Toaster } from "@/components/ui/sonner";
import { ShellInitializer } from "@/components/layout/shell-initializer";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logging";
import { getDashboardShellState } from "@/lib/dashboard-shell";
import type { UserRole } from "@/lib/store";

const DeferredChatInterface = dynamic(
  () => import("@/components/chatbot/chat-interface").then((mod) => mod.ChatInterface),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-background" />,
  },
);

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
  let shouldRedirectToBilling = false;
  let shouldRedirectToSetup = false;

  let shouldRedirectToAuth = false;

  try {
    const dashboardState = await getDashboardShellState();
    if (!dashboardState) {
      logger.authFlow("No userId in dashboard layout, redirecting to /auth", { component: "DashboardLayout" });
      shouldRedirectToAuth = true;
    } else {
      userId = dashboardState.userId;
      logger.authFlow("Getting workspace for dashboard layout", { userId, component: "DashboardLayout" });
      const workspace = dashboardState.workspace;
      workspaceId = workspace.id;
      userRole = dashboardState.userRole;
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

      if (workspace.subscriptionStatus === "active" && !workspace.onboardingComplete) {
        shouldRedirectToSetup = true;
      }
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
  if (shouldRedirectToAuth) {
    redirect("/auth");
  }

  if (shouldRedirectToBilling) {
    redirect("/billing");
  }

  if (shouldRedirectToSetup) {
    redirect("/setup");
  }

  return (
    <IndustryProvider>
      <DashboardProvider>
        <SyncProvider>
          <ShellInitializer workspaceId={workspaceId} userId={userId} userRole={userRole} tutorialComplete={tutorialComplete} />
          <Suspense fallback={<div className="h-screen w-full bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
            <ShellHost chatbot={<DeferredChatInterface workspaceId={workspaceId} />}>{children}</ShellHost>
          </Suspense>
          <Toaster />
          <DashboardClientChrome />
        </SyncProvider>
      </DashboardProvider>
    </IndustryProvider>
  );
}
