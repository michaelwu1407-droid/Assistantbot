"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
    LayoutDashboard,
    Inbox,
    CalendarDays,
    Map,
    Users,
    BarChart2,
    UsersRound,
    Settings2,
    LogOut,
    MessageSquare,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { logout } from "@/actions/auth-actions"
import { useShellStore } from "@/lib/store"

const SIDEBAR_WIDTH = 45

const allNavItems = [
    { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard", id: "dashboard-link", managerOnly: false },
    { icon: Inbox, label: "Inbox", href: "/dashboard/inbox", id: "inbox-link", managerOnly: true },
    { icon: CalendarDays, label: "Schedule", href: "/dashboard/schedule", id: "schedule-link", managerOnly: false },
    { icon: Map, label: "Map", href: "/dashboard/map", id: "map-link", managerOnly: false },
    { icon: Users, label: "Contacts", href: "/dashboard/contacts", id: "contacts-link", managerOnly: true },
    { icon: BarChart2, label: "Analytics", href: "/dashboard/analytics", id: "reports-link", managerOnly: true },
    { icon: UsersRound, label: "Team", href: "/dashboard/team", id: "team-link", managerOnly: false },
]

interface SidebarProps {
    className?: string
    expanded?: boolean
}

export function Sidebar({ className, expanded }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const { setViewMode, viewMode, lastAdvancedPath, setLastAdvancedPath, userRole } = useShellStore()

    const isManager = userRole === "OWNER" || userRole === "MANAGER"
    const navItems = allNavItems.filter((item) => !item.managerOnly || isManager)

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleSignOut = async () => {
        await logout()
    }

    const goToAdvanced = () => {
        const target = lastAdvancedPath && lastAdvancedPath.startsWith("/dashboard")
            ? lastAdvancedPath
            : "/dashboard"
        setViewMode("ADVANCED")
        if (pathname !== target) {
            router.push(target)
        }
    }

    const goToBasic = () => {
        if (pathname.startsWith("/dashboard")) {
            setLastAdvancedPath(pathname)
        }
        setViewMode("BASIC")
        if (pathname !== "/dashboard") {
            router.push("/dashboard")
        }
    }

    return (
        <TooltipProvider delayDuration={0}>
            <aside id="sidebar-nav" className={cn("flex h-full flex-col items-center border-r border-neutral-200 bg-white py-5 z-20 transition-all duration-300 shrink-0", className)} style={expanded ? undefined : { width: SIDEBAR_WIDTH }}>
                {/* Logo */}
                <div className="mb-6 flex h-9 w-9 items-center justify-center">
                    <Image src="/latest-logo.png" alt="Earlymark Logo" width={28} height={28} className="rounded-lg" unoptimized />
                </div>

                {/* Mode Toggle */}
                {mounted && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                id="mode-toggle-btn"
                                onClick={() => (viewMode === "ADVANCED" ? goToBasic() : goToAdvanced())}
                                className="mb-3 flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition-all"
                            >
                                <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                            {viewMode === "ADVANCED" ? "Switch to Chat Mode" : "Switch to Advanced Mode"}
                        </TooltipContent>
                    </Tooltip>
                )}

                <nav className="flex flex-1 flex-col gap-1.5 w-full px-1.5">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))
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
                                                    ? "bg-primary-subtle text-primary"
                                                    : "text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
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
                <div className="mt-auto flex flex-col gap-1.5 px-1.5 w-full">
                    <div className="border-t border-neutral-200 my-2" />

                    {/* Ask Tracey — always visually distinct */}
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={() => goToBasic()}
                                className="flex h-10 w-full items-center justify-center rounded-lg bg-primary-subtle text-primary transition-colors duration-150 hover:bg-primary-muted"
                            >
                                <MessageSquare size={20} strokeWidth={1.75} />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="text-xs">
                            Ask Tracey
                        </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link href="/dashboard/settings" id="settings-link">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={cn(
                                        "flex h-10 w-full items-center justify-center rounded-lg transition-colors duration-150",
                                        pathname.startsWith("/dashboard/settings")
                                            ? "bg-primary-subtle text-primary"
                                            : "text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100"
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
                                className="flex h-10 w-full items-center justify-center rounded-lg text-neutral-400 hover:bg-red-50 hover:text-red-500 transition-colors duration-150"
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
