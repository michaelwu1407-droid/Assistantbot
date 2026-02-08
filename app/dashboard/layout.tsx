import React from 'react';
import { Shell } from '@/components/layout/Shell';
import { ChatInterface } from "@/components/chatbot/chat-interface";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";
import { DashboardProvider } from "@/components/providers/dashboard-provider";
import { SyncProvider } from "@/components/providers/sync-provider";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Fetch workspace server-side to pass ID to client components
  const workspace = await getOrCreateWorkspace("demo-user");

  return (
    <DashboardProvider>
      <SyncProvider>
        <Shell chatbot={<ChatInterface workspaceId={workspace.id} />}>
          {children}
        </Shell>
      </SyncProvider>
    </DashboardProvider>
  );
}
