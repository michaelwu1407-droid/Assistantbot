import React, { Suspense } from 'react';
import { ShellHost } from '@/components/layout/shell-host';
import { DashboardProvider } from "@/components/providers/dashboard-provider";
import { SyncProvider } from "@/components/providers/sync-provider";
import { IndustryProvider } from "@/components/providers/industry-provider";
import { DashboardClientChrome } from "@/components/providers/dashboard-client-chrome";
import { Toaster } from "@/components/ui/sonner";
import { DeferredChatInterface } from "@/components/chatbot/deferred-chat-interface";
import { ShellInitializer } from "@/components/layout/shell-initializer";
import { redirect } from "next/navigation";
import { logger } from "@/lib/logging";
import { getDashboardShellState } from "@/lib/dashboard-shell";
import type { UserRole } from "@/lib/store";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveHeaderDisplayName } from "@/lib/display-name";

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
  let shouldRedirectToNoWorkspace = false;

  let shouldRedirectToAuth = false;
  let headerDisplayName = "";
  let workspaceIndustryType: "TRADES" | "REAL_ESTATE" | null = null;

  try {
    const dashboardState = await getDashboardShellState();
    if (!dashboardState) {
      logger.authFlow("No userId in dashboard layout, redirecting to /auth", { component: "DashboardLayout" });
      shouldRedirectToAuth = true;
    } else if ('noWorkspace' in dashboardState && dashboardState.noWorkspace) {
      shouldRedirectToNoWorkspace = true;
    } else {
      userId = dashboardState.userId;
      logger.authFlow("Getting workspace for dashboard layout", { userId, component: "DashboardLayout" });
      const workspace = dashboardState.workspace;
      workspaceId = workspace.id;
      userRole = dashboardState.userRole;
      tutorialComplete = workspace.tutorialComplete;
      workspaceIndustryType = (workspace.industryType as "TRADES" | "REAL_ESTATE") ?? null;

      logger.authFlow("Dashboard layout workspace data", {
        component: "DashboardLayout",
        workspaceId,
        subscriptionStatus: workspace.subscriptionStatus,
        tutorialComplete
      });

      // Gating mechanism - explicitly mandate a paid Stripe tier.
      // Grace-period exception: a cancelled subscription still grants access
      // until stripeCurrentPeriodEnd so the customer isn't locked out mid-period.
      const isCancelledInGracePeriod =
        workspace.subscriptionStatus === "canceled" &&
        workspace.stripeCurrentPeriodEnd != null &&
        workspace.stripeCurrentPeriodEnd > new Date();

      if (workspace.subscriptionStatus !== "active" && !isCancelledInGracePeriod) {
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

  if (shouldRedirectToNoWorkspace) {
    redirect("/no-workspace");
  }

  if (shouldRedirectToBilling) {
    redirect("/billing");
  }

  if (shouldRedirectToSetup) {
    redirect("/setup");
  }

  const authUser = await getAuthUser();
  if (authUser) {
    try {
      const appUserRow = await db.user.findFirst({
        where: {
          OR: [{ id: authUser.id }, ...(authUser.email ? [{ email: authUser.email }] : [])],
        },
        select: { name: true, email: true },
      });
      headerDisplayName = resolveHeaderDisplayName({
        authName: authUser.name,
        dbName: appUserRow?.name ?? null,
        email: appUserRow?.email ?? authUser.email ?? null,
      });
    } catch {
      headerDisplayName = authUser.name ?? authUser.email?.split("@")[0] ?? "User";
    }
  }

  return (
    <IndustryProvider>
      <DashboardProvider>
        <SyncProvider>
          <ShellInitializer
            workspaceId={workspaceId}
            userId={userId}
            userRole={userRole}
            tutorialComplete={tutorialComplete}
            headerDisplayName={headerDisplayName}
            workspaceIndustryType={workspaceIndustryType}
          />
          <Suspense fallback={
            <div className="h-dvh w-full bg-paper flex overflow-hidden">
              <div className="w-[45px] shrink-0 h-full" style={{ background: "var(--color-forest)" }} />
              <div className="flex flex-col flex-1 min-w-0">
                <div className="h-12 shrink-0 w-full" style={{ background: "var(--color-forest)" }} />
              </div>
            </div>
          }>
            <ShellHost chatbot={<DeferredChatInterface workspaceId={workspaceId} />}>{children}</ShellHost>
          </Suspense>
          <Toaster />
          <DashboardClientChrome />
        </SyncProvider>
      </DashboardProvider>
    </IndustryProvider>
  );
}
