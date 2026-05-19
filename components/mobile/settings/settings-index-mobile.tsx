"use client"

import Link from "next/link"
import { ChevronRight, User, Building2, Phone, Bot, Plug, Bell, CreditCard, Palette, ShieldCheck, LifeBuoy } from "lucide-react"
import { useShellStore } from "@/lib/store"
import { MobileHeader } from "@/components/mobile/_primitives/mobile-header"

type SettingsItem = {
  title: string
  href: string
  icon: typeof User
  subtitle?: string
  managerOnly?: boolean
}

const ITEMS: SettingsItem[] = [
  { title: "Account", href: "/crm/settings", icon: User, subtitle: "Profile and security" },
  { title: "My business", href: "/crm/settings/my-business", icon: Building2, subtitle: "Trading name, hours, location" },
  { title: "Calls & texting", href: "/crm/settings/call-settings", icon: Phone, subtitle: "Number, routing, hours" },
  { title: "AI Assistant", href: "/crm/settings/agent", icon: Bot, subtitle: "Tracey behaviour and rules" },
  { title: "Integrations", href: "/crm/settings/integrations", icon: Plug, subtitle: "Connect external tools", managerOnly: true },
  { title: "Notifications", href: "/crm/settings/notifications", icon: Bell },
  { title: "Billing", href: "/crm/settings/billing", icon: CreditCard, subtitle: "Plan and invoices", managerOnly: true },
  { title: "Display", href: "/crm/settings/display", icon: Palette },
  { title: "Data & privacy", href: "/crm/settings/privacy", icon: ShieldCheck },
  { title: "Help", href: "/crm/settings/help", icon: LifeBuoy },
]

export function SettingsIndexMobile() {
  const userRole = useShellStore((s) => s.userRole)
  const isManager = userRole === "OWNER" || userRole === "MANAGER"
  const items = ITEMS.filter((i) => !i.managerOnly || isManager)

  return (
    <>
      <MobileHeader pageTitle="Settings" />
      <ul className="flex flex-col divide-y divide-border/40 border-y border-border/40">
        {items.map((item) => {
          const Icon = item.icon
          return (
            <li key={item.href}>
              <Link href={item.href} className="flex items-center gap-3 px-4 py-4 active:bg-muted/40">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[15px] font-semibold text-foreground">{item.title}</p>
                  {item.subtitle && (
                    <p className="truncate text-[12px] text-muted-foreground">{item.subtitle}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          )
        })}
      </ul>
    </>
  )
}
