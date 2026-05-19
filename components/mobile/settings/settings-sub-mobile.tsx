"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

const TITLES: Record<string, string> = {
  "/crm/settings": "Account",
  "/crm/settings/account": "Account",
  "/crm/settings/my-business": "My business",
  "/crm/settings/call-settings": "Calls & texting",
  "/crm/settings/phone-settings": "Phone",
  "/crm/settings/agent": "AI Assistant",
  "/crm/settings/ai-voice": "AI Voice",
  "/crm/settings/after-hours": "After hours",
  "/crm/settings/integrations": "Integrations",
  "/crm/settings/automations": "Automations",
  "/crm/settings/notifications": "Notifications",
  "/crm/settings/billing": "Billing",
  "/crm/settings/display": "Display",
  "/crm/settings/appearance": "Appearance",
  "/crm/settings/privacy": "Data & privacy",
  "/crm/settings/data-privacy": "Data & privacy",
  "/crm/settings/help": "Help",
  "/crm/settings/support": "Support",
  "/crm/settings/training": "Training",
  "/crm/settings/knowledge": "Knowledge",
  "/crm/settings/workspace": "Workspace",
  "/crm/settings/sms-templates": "SMS templates",
}

export function SettingsSubMobile({ children, className }: { children: React.ReactNode; className?: string }) {
  const pathname = usePathname()
  const title = TITLES[pathname] || "Settings"

  return (
    <div className="md:hidden">
      <header className="sticky top-0 z-30 bg-emerald-900 pt-safe text-white">
        <div className="flex items-center gap-2 px-2 pb-3 pt-2">
          <Link
            href="/crm/settings"
            aria-label="Back to settings"
            className="flex h-10 w-10 items-center justify-center rounded-full text-white"
          >
            <ChevronLeft className="h-5 w-5" />
          </Link>
          <h1 className="truncate text-lg font-bold">{title}</h1>
        </div>
      </header>
      <div className={cn("px-4 pt-4 pb-6", className)}>{children}</div>
    </div>
  )
}
