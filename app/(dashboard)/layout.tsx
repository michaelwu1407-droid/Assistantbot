import React from 'react';
import { Shell } from '@/components/layout/Shell';
import { ChatInterface } from "@/components/chatbot/chat-interface";
import { OnboardingModal } from "@/components/dashboard/onboarding-modal";
import { getOrCreateWorkspace } from "@/actions/workspace-actions";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let workspaceId = "demo-workspace";

  try {
    // Fetch workspace server-side to pass ID to client components
    // Replace "demo-user" with proper auth if available, but for now stick to demo user
    const workspace = await getOrCreateWorkspace("demo-user");
    workspaceId = workspace.id;
  } catch (error) {
    console.error("Layout failed to fetch workspace:", error);
  }

  return (
    <Shell chatbot={<ChatInterface workspaceId={workspaceId} />}>
      <OnboardingModal />
      {children}
    </Shell>
  );
}
