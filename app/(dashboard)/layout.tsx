import React from 'react';
import { Shell } from '@/components/layout/shell';
import { ChatInterface } from "@/components/chatbot/chat-interface";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Shell chatbot={<ChatInterface />}>
      {children}
    </Shell>
  );
}
