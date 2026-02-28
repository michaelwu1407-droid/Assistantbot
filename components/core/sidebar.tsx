"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
    Home,
    Settings,
    LogOut,
    Map,
    Calendar,
    Users,
    UserCircle,
    MessageSquare,
    PieChart,
    Inbox,
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

const navItems = [
    { icon: Home, label: "Home", href: "/dashboard", id: "dashboard-link" },
    { icon: Inbox, label: "Inbox", href: "/dashboard/inbox", id: "inbox-link" },
    { icon: Calendar, label: "Schedule", href: "/dashboard/schedule", id: "schedule-link" },
    { icon: Map, label: "Map", href: "/dashboard/map", id: "map-link" },
    { icon: Users, label: "Contacts", href: "/dashboard/contacts", id: "contacts-link" },
    { icon: PieChart, label: "Reports", href: "/dashboard/analytics", id: "reports-link" },
    { icon: UserCircle, label: "Team", href: "/dashboard/team", id: "team-link" },
]

interface SidebarProps {
    className?: string
}

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname()
    const router = useRouter()
    const [mounted, setMounted] = useState(false)
    const { setViewMode, viewMode, lastAdvancedPath, setLastAdvancedPath } = useShellStore()

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
            <aside id="sidebar-nav" className={cn("flex h-full flex-col items-center border-r border-border bg-white py-5 z-20 transition-all duration-300 shrink-0", className)} style={{ width: SIDEBAR_WIDTH }}>
                {/* Logo / Brand */}
                <div className="mb-6 flex h-9 w-9 items-center justify-center">
                    <img src="/latest-logo.png" alt="Earlymark" className="h-9 w-9 object-contain transition-all hover:scale-105 active:scale-95" />
                </div>

                {/* Mode Toggle (Advanced/Chat) */}
                {mounted && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                id="mode-toggle-btn"
                                onClick={() => (viewMode === "ADVANCED" ? goToBasic() : goToAdvanced())}
                                className="mb-3 flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-midnight transition-all"
                            >
                                <MessageSquare className="h-3.5 w-3.5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-midnight text-white border-border font-semibold px-3 py-1.5 ml-2">
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
                                                "flex h-9 w-full items-center justify-center rounded-xl transition-all duration-300",
                                                isActive
                                                    ? "bg-primary text-white shadow-sm"
                                                    : "text-muted-foreground hover:bg-secondary hover:text-midnight"
                                            )}
                                        >
                                            <item.icon className={cn("h-4 w-4", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                                        </motion.div>
                                    </Link>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-[#0F172A] text-white border-slate-800 font-semibold px-3 py-1.5 ml-2">
                                    {item.label}
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}
                </nav>

                {/* Bottom Actions */}
                <div className="flex flex-col gap-1.5 px-1.5 w-full">
                    <div className="h-px bg-border w-full" />

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link href="/dashboard/settings" id="settings-link">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={cn(
                                        "flex h-9 w-full items-center justify-center rounded-xl transition-all duration-300",
                                        pathname.startsWith("/dashboard/settings")
                                            ? "bg-primary text-white"
                                            : "text-muted-foreground hover:bg-secondary hover:text-midnight"
                                    )}
                                >
                                    <Settings className="h-4 w-4" />
                                </motion.div>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-midnight text-white border-border font-semibold px-3 py-1.5 ml-2">Settings</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                id="logout-btn"
                                onClick={handleSignOut}
                                className="flex h-9 w-full items-center justify-center rounded-xl text-muted-foreground hover:bg-red-50 hover:text-red-500 transition-all duration-300"
                            >
                                <LogOut className="h-4 w-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-midnight text-white border-border font-semibold px-3 py-1.5 ml-2">Sign Out</TooltipContent>
                    </Tooltip>
                </div>
            </aside>
        </TooltipProvider>
    )
}
