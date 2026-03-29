"use client"

import { useEffect, useState } from "react"
import { Shell } from "@/components/layout/Shell"

export function ShellHost({ children, chatbot }: { children: React.ReactNode; chatbot?: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="h-dvh min-h-0 w-full bg-background relative flex flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    )
  }

  return <Shell chatbot={chatbot}>{children}</Shell>
}

