"use client"

import dynamic from "next/dynamic"

const ShellNoSSR = dynamic(
  () => import("@/components/layout/Shell").then((mod) => mod.Shell),
  {
    ssr: false,
    loading: () => <div className="h-[calc(100dvh-57px)] w-full bg-background" />,
  }
)

export function ShellHost({ children, chatbot }: { children: React.ReactNode; chatbot?: React.ReactNode }) {
  return <ShellNoSSR chatbot={chatbot}>{children}</ShellNoSSR>
}

