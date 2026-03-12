"use client";

import dynamic from "next/dynamic";

export const DeferredChatInterface = dynamic(
  () => import("@/components/chatbot/chat-interface").then((mod) => mod.ChatInterface),
  {
    ssr: false,
    loading: () => <div className="h-full w-full bg-background" />,
  },
);
