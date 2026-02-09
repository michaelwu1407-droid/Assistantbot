import React, { Suspense } from 'react';
import { Shell } from '@/components/layout/Shell';
import { ChatInterface } from "@/components/chatbot/chat-interface";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { DashboardProvider } from "@/components/providers/dashboard-provider";
import { SyncProvider } from "@/components/providers/sync-provider";
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
    // Continue rendering so the page can show the specific DB error
  }

  return (
    <DashboardProvider>
      <SyncProvider>
        <Suspense fallback={<div className="h-screen w-full bg-background flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading...</div></div>}>
          <Shell chatbot={<ChatInterface workspaceId={workspaceId} />}>
            {children}
          </Shell>
        </Suspense>
      </SyncProvider>
    </DashboardProvider>
  );
}

