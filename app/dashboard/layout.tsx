import React from 'react';
import { Shell } from '@/components/layout/Shell';
import { ChatInterface } from "@/components/chatbot/chat-interface";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { DashboardProvider } from "@/components/providers/dashboard-provider";
import { SyncProvider } from "@/components/providers/sync-provider";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let workspaceId = "demo-workspace";

  try {
    // Fetch workspace server-side to pass ID to client components
    const workspace = await getOrCreateWorkspace("demo-user");
    workspaceId = workspace.id;
  } catch (error) {
    console.error("Layout failed to fetch workspace:", error);
    // Continue rendering so the page can show the specific DB error
  }

  return (
    <DashboardProvider>
      <SyncProvider>
        <Shell chatbot={<ChatInterface workspaceId={workspaceId} />}>
          {children}
        </Shell>
      </SyncProvider>
    </DashboardProvider>
  );
}
