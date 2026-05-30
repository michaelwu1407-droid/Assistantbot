"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
    LayoutDashboard,
    Inbox,
    CalendarDays,
    Users,
    BarChart2,
    UsersRound,
    Settings2,
    LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { useShellStore } from "@/lib/store"
import { createClient } from "@/lib/supabase/client"

const SIDEBAR_WIDTH = 45

const allNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/crm/dashboard", id: "dashboard-link", managerOnly: false },
    { icon: Inbox, label: "Inbox", href: "/crm/inbox", id: "inbox-link", managerOnly: true },
    { icon: CalendarDays, label: "Schedule", href: "/crm/schedule", id: "schedule-link", managerOnly: false },
    // BETA_REMOVED: Map nav item. To reinstate: import Map from lucide-react, add { icon: Map, label: "Map", href: "/crm/map", id: "map-link", managerOnly: false } here
    { icon: Users, label: "Contacts", href: "/crm/contacts", id: "contacts-link", managerOnly: true },
    { icon: BarChart2, label: "Analytics", href: "/crm/analytics", id: "reports-link", managerOnly: true },
    { icon: UsersRound, label: "Team", href: "/crm/team", id: "team-link", managerOnly: false },
]

interface SidebarProps {
    className?: string
    expanded?: boolean
}

export function Sidebar({ className, expanded }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const { setViewMode, setLastAdvancedPath, userRole } = useShellStore()

    const isManager = userRole === "OWNER" || userRole === "MANAGER"
    const navItems = allNavItems.filter((item) => !item.managerOnly || isManager)

    const handleSignOut = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        router.push("/login")
    }

    const goToBasic = () => {
        if (pathname.startsWith("/crm")) {
            setLastAdvancedPath(pathname)
        }
        setViewMode("BASIC")
        if (pathname !== "/crm/dashboard") {
            router.push("/crm/dashboard")
        }
    }

    return (
        <TooltipProvider delayDuration={0}>
            <aside
                id="sidebar-nav"
                className={cn(
                    "flex h-full flex-col items-center z-20 transition-all duration-300 shrink-0",
                    "border-r-0 shadow-[2px_0_20px_-8px_rgba(14,31,26,0.25)]",
                    className
                )}
                style={expanded ? undefined : { width: SIDEBAR_WIDTH, background: "var(--color-forest)" }}
            >
                {/* Logo — same height as brand top bar; dark green fill to match header */}
                <div className="flex h-12 w-full shrink-0 items-center justify-center border-b border-white/10" style={{ background: "var(--color-forest-dk)" }}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                type="button"
                                onClick={goToBasic}
                                className="flex h-9 w-9 items-center justify-center rounded-lg transition-colors duration-150 hover:bg-card/10"
                                aria-label="Open chat mode"
                                title="Open chat mode"
                            >
                                <Image
                                    src="/latest-logo.png"
                                    alt="Earlymark Logo"
                                    width={28}
                                    height={28}
                                    className="rounded-lg drop-shadow-sm"
                                    unoptimized
                                />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" sideOffset={8} className="z-[200] text-xs">
                            Ask Tracey
                        </TooltipContent>
                    </Tooltip>
                </div>

                <nav className="flex flex-1 flex-col gap-1.5 w-full px-1.5 pt-3">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/crm/dashboard" && pathname.startsWith(item.href))
                        return (
                            <Tooltip key={item.label}>
                                <TooltipTrigger asChild>
                                    <Link href={item.href} id={item.id} className="cursor-pointer">
                                        <motion.div
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={cn(
                                                "flex h-10 w-full items-center justify-center rounded-lg transition-colors duration-150",
                                                isActive
                                                    ? "bg-white/15 text-white"
                                                    : "text-white/55 hover:text-white hover:bg-white/10"
                                            )}
                                        >
                                            <item.icon size={20} strokeWidth={1.75} />
                                        </motion.div>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="text-xs">
                                    {item.label}
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                </nav>

                {/* Bottom Actions */}
                <div className="mt-auto flex flex-col gap-1.5 px-1.5 w-full pb-3">
                    <div className="border-t border-white/10 my-2" />

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link href="/crm/settings" id="settings-link">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={cn(
                                        "flex h-10 w-full items-center justify-center rounded-lg transition-colors duration-150",
                                        pathname.startsWith("/crm/settings")
                                            ? "bg-white/15 text-white"
                                            : "text-white/55 hover:text-white hover:bg-white/10"
                                    )}
                                >
                                    <Settings2 size={20} strokeWidth={1.75} />
                                </motion.div>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">Settings</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                id="logout-btn"
                                onClick={handleSignOut}
                                className="flex h-10 w-full items-center justify-center rounded-lg text-white/55 hover:bg-destructive/20 hover:text-red-300 transition-colors duration-150"
                            >
                                <LogOut size={20} strokeWidth={1.75} />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">Sign Out</TooltipContent>
                    </Tooltip>
                </div>
            </aside>
        </TooltipProvider>
    )
}
