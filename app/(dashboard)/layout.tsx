import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { Shell } from '@/components/layout/Shell';
import { OnboardingModal } from "@/components/dashboard/onboarding-modal";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { getAuthUserId } from "@/lib/auth";
import { ShellInitializer } from "@/components/layout/shell-initializer";
import { ChatInterface } from "@/components/chatbot/chat-interface";
import { db } from "@/lib/db";
import type { UserRole } from "@/lib/store";

export const dynamic = "force-dynamic";

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
    const authUserId = await getAuthUserId();
    if (!authUserId) {
      throw new Error("User not authenticated");
    }
    userId = authUserId;
    // Run workspace fetch and user role lookup in parallel
    const [workspace, dbUser] = await Promise.all([
      getOrCreateWorkspace(userId),
      db.user.findUnique({
        where: { id: userId },
        select: { role: true },
      }).catch(() => null),
    ]);
    workspaceId = workspace.id;
    tutorialComplete = workspace.tutorialComplete;
    if (dbUser?.role) userRole = dbUser.role as UserRole;

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
    <>
      <ShellInitializer workspaceId={workspaceId} userId={userId} userRole={userRole} tutorialComplete={tutorialComplete} />
      <Suspense fallback={<div className="h-screen w-full bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
        <Shell chatbot={<ChatInterface workspaceId={workspaceId} />}>
          <OnboardingModal />
          {children}
        </Shell>
      </Suspense>
    </>
  );
}

