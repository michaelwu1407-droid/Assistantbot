"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import {
  Users,
  UsersRound,
  Map as MapIcon,
  BarChart2,
  Settings2,
  LifeBuoy,
  LogOut,
} from "lucide-react"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { useShellStore } from "@/lib/store"
import { createClient } from "@/lib/supabase/client"

interface MoreSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type MoreItem = {
  href?: string
  label: string
  icon: typeof Users
  managerOnly?: boolean
  onClick?: () => void
  destructive?: boolean
}

export function MoreSheet({ open, onOpenChange }: MoreSheetProps) {
  const { userRole } = useShellStore()
  const router = useRouter()
  const isManager = userRole === "OWNER" || userRole === "MANAGER"

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    onOpenChange(false)
    router.push("/login")
  }

  const items: MoreItem[] = [
    { href: "/crm/contacts", label: "Contacts", icon: Users, managerOnly: true },
    { href: "/crm/team", label: "Team", icon: UsersRound },
    { href: "/crm/map", label: "Map", icon: MapIcon },
    { href: "/crm/analytics", label: "Analytics", icon: BarChart2, managerOnly: true },
    { href: "/crm/settings/account", label: "Settings", icon: Settings2 },
    { href: "/crm/settings/help", label: "Help & support", icon: LifeBuoy },
    { label: "Sign out", icon: LogOut, onClick: handleSignOut, destructive: true },
  ].filter((i) => !i.managerOnly || isManager)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="p-0 rounded-t-3xl pb-safe">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/40">
          <SheetTitle className="text-base font-semibold">More</SheetTitle>
        </SheetHeader>
        <ul className="flex flex-col py-2">
          {items.map((item) => {
            const Icon = item.icon
            const content = (
              <span
                className={
                  "flex items-center gap-3 px-5 py-3.5 text-[15px] " +
                  (item.destructive ? "text-destructive" : "text-foreground")
                }
              >
                <Icon className="h-5 w-5 opacity-80" />
                <span className="flex-1">{item.label}</span>
              </span>
            )
            return (
              <li key={item.label} className="border-b border-border/30 last:border-b-0">
                {item.href ? (
                  <Link href={item.href} onClick={() => onOpenChange(false)}>
                    {content}
                  </Link>
                ) : (
                  <button type="button" onClick={item.onClick} className="w-full text-left">
                    {content}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </SheetContent>
    </Sheet>
  )
}
