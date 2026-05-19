"use client"

import { useSyncExternalStore } from "react"
import { usePathname } from "next/navigation"
import { Shell } from "@/components/layout/Shell"
import { MobileShell } from "@/components/mobile/_primitives/mobile-shell"
import { useIsMobile } from "@/hooks/use-is-mobile"

export function ShellHost({ children, chatbot }: { children: React.ReactNode; chatbot?: React.ReactNode }) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  )
  const isMobile = useIsMobile()
  const pathname = usePathname()

  if (!mounted) {
    return (
      <div className="h-dvh min-h-0 w-full bg-background relative flex flex-col overflow-hidden">
        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {children}
        </div>
      </div>
    )
  }

  const isAppRoute =
    pathname.startsWith("/crm") ||
    pathname.startsWith("/tradie") ||
    pathname.startsWith("/agent") ||
    pathname.startsWith("/contacts") ||
    pathname.startsWith("/jobs")

  if (isMobile && isAppRoute) {
    return <MobileShell chatbot={chatbot}>{children}</MobileShell>
  }

  return <Shell chatbot={chatbot}>{children}</Shell>
}
