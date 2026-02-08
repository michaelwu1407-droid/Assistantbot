import React from 'react';
import { Shell } from '@/components/layout/Shell';
import { ChatInterface } from "@/components/chatbot/chat-interface";
import { db } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let workspaceId = "default";
  try {
    const workspace = await db.workspace.findFirst();
    if (workspace) workspaceId = workspace.id;
  } catch (error) {
    console.warn("Failed to fetch workspace in layout:", error);
  }

  return (
    <Shell chatbot={<ChatInterface workspaceId={workspaceId} />}>
      {children}
    </Shell>
  );
}
