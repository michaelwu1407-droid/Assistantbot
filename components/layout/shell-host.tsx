"use client"

import { Shell } from "@/components/layout/Shell"

export function ShellHost({ children, chatbot }: { children: React.ReactNode; chatbot?: React.ReactNode }) {
  return <Shell chatbot={chatbot}>{children}</Shell>
}

