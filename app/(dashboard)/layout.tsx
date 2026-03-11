import React, { Suspense } from 'react';
import dynamic from "next/dynamic";
import { redirect } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { OnboardingModal } from "@/components/dashboard/onboarding-modal";
import { ShellInitializer } from "@/components/layout/shell-initializer";
import { IndustryProvider } from "@/components/providers/industry-provider";
import { DashboardClientChrome } from "@/components/providers/dashboard-client-chrome";
import { Toaster } from "@/components/ui/sonner";
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
  let workspaceId = "";
  let userId = "";
  let userRole: UserRole = "OWNER";
  let tutorialComplete = false;
  let shouldRedirectToSetup = false;

  try {
    const dashboardState = await getDashboardShellState();
    if (!dashboardState) {
      throw new Error("User not authenticated");
    }
    userId = dashboardState.userId;
    const workspace = dashboardState.workspace;
    workspaceId = workspace.id;
    tutorialComplete = workspace.tutorialComplete;
    userRole = dashboardState.userRole;

    if (workspace.subscriptionStatus === "active" && !workspace.onboardingComplete) {
      shouldRedirectToSetup = true;
    }
  } catch (error) {
    console.error("Layout failed to fetch workspace:", error);
    const msg = error instanceof Error ? error.message : String(error);
    const isConnectionError = /fetch|network|supabase|ECONNREFUSED|ETIMEDOUT/i.test(msg);
    redirect(isConnectionError ? "/auth?error=connection" : "/auth");
  }

  if (shouldRedirectToSetup) {
    redirect("/setup");
  }

  return (
    <IndustryProvider>
      <ShellInitializer workspaceId={workspaceId} userId={userId} userRole={userRole} tutorialComplete={tutorialComplete} />
      <Suspense fallback={<div className="h-screen w-full bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
        <Shell chatbot={<DeferredChatInterface workspaceId={workspaceId} />}>
          <OnboardingModal />
          {children}
        </Shell>
      </Suspense>
      <Toaster />
      <DashboardClientChrome />
    </IndustryProvider>
  );
}

