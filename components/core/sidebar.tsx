"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { motion } from "framer-motion"
import {
    Home,
    Hammer,
    Briefcase,
    Settings,
    LogOut,
    Map,
    Calendar,
    Users,
    FileText,
    MessageSquare,
    LayoutTemplate
} from "lucide-react"
import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { useShellStore } from "@/lib/store"
import { useIndustry } from "@/components/providers/industry-provider"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"

const navItems = [
    { icon: Home, label: "Hub", href: "/dashboard", id: "hub-link" },
    { icon: Hammer, label: "Tradie", href: "#", id: "tradie-link", isToggle: true },
    { icon: Briefcase, label: "Agent", href: "#", id: "agent-link", isToggle: true },
]

const tradieSubItems = [
    { icon: Map, label: "Job Map", href: "/tradie/map", id: "map-link" },
    { icon: Calendar, label: "Schedule", href: "/tradie/schedule", id: "schedule-link" },
    { icon: FileText, label: "Estimator", href: "/tradie/estimator", id: "estimator-link" },
    { icon: Users, label: "Contacts", href: "/contacts", id: "contacts-link" },
]

const agentSubItems = [
    { icon: Users, label: "Contacts", href: "/contacts", id: "agent-contacts-link" },
    { icon: FileText, label: "Estimator", href: "/estimator", id: "agent-estimator-link" },
    { icon: LayoutTemplate, label: "Open House", href: "/kiosk/open-house", id: "kiosk-link" },
]

interface SidebarProps {
    className?: string
}

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname()
    const supabase = createClient()
    const { setViewMode, viewMode } = useShellStore()
    const { industry, setIndustry } = useIndustry()
    const router = useRouter()

    const handleSignOut = async () => {
        await supabase.auth.signOut()
        router.push("/login")
    }

    const isTradie = industry === "TRADES" || (industry === null && pathname.includes("/tradie"))
    const isAgent = industry === "REAL_ESTATE" || (industry === null && pathname.includes("/agent"))

    const handleNavClick = (label: string) => {
        if (label === "Tradie") {
             setIndustry(industry === "TRADES" ? null : "TRADES")
        }
        else if (label === "Agent") {
             setIndustry(industry === "REAL_ESTATE" ? null : "REAL_ESTATE")
        }
        else if (label === "Hub") setIndustry(null)
    }

    return (
        <TooltipProvider delayDuration={0}>
            <div id="sidebar-nav" className={cn("flex h-full w-16 flex-col items-center border-r border-slate-200 bg-slate-50 py-4 z-20", className)}>
                <div className="mb-8 font-bold text-slate-900 italic">Pj</div>

                {/* Mode Toggle */}
                {viewMode === "ADVANCED" && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                id="mode-toggle-btn"
                                onClick={() => setViewMode("BASIC")}
                                className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all"
                            >
                                <MessageSquare className="h-5 w-5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Switch to Basic Mode</TooltipContent>
                    </Tooltip>
                )}

                <nav className="flex flex-1 flex-col gap-4">
                    {navItems.map((item) => {
                        // Special handling for toggle items vs navigation items
                        const isActive = item.isToggle
                            ? (item.label === "Tradie" && isTradie) || (item.label === "Agent" && isAgent)
                            : pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))

                        const LinkComponent = item.isToggle ? 'div' : Link

                        return (
                            <Tooltip key={item.label}>
                                <TooltipTrigger asChild>
                                    <LinkComponent
                                        href={item.href}
                                        id={item.id}
                                        onClick={() => handleNavClick(item.label)}
                                        className="cursor-pointer"
                                    >
                                        <motion.div
                                            whileHover={{ scale: 1.1 }}
                                            whileTap={{ scale: 0.9 }}
                                            className={cn(
                                                "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                                                isActive
                                                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                                    : "text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                                            )}
                                        >
                                            <item.icon className="h-5 w-5" />
                                        </motion.div>
                                    </LinkComponent>
                                </TooltipTrigger>
                                <TooltipContent side="right">
                                    {item.isToggle ? `Toggle ${item.label} Menu` : item.label}
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}

                    {/* Tradie Sub-items */}
                    {isTradie && (
                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="h-px bg-slate-200 w-8 mx-auto my-2" />
                            {tradieSubItems.map((item) => {
                                const isActive = pathname === item.href

                                return (
                                    <Tooltip key={item.href}>
                                        <TooltipTrigger asChild>
                                            <Link href={item.href} id={item.id}>
                                                <motion.div
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    className={cn(
                                                        "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                                                        isActive
                                                            ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                                            : "text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                                                    )}
                                                >
                                                    <item.icon className="h-5 w-5" />
                                                </motion.div>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right">{item.label}</TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </div>
                    )}

                    {/* Agent Sub-items */}
                    {isAgent && (
                        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-left-4 duration-300">
                            <div className="h-px bg-slate-200 w-8 mx-auto my-2" />
                            {agentSubItems.map((item) => {
                                const isActive = pathname === item.href

                                return (
                                    <Tooltip key={item.href}>
                                        <TooltipTrigger asChild>
                                            <Link href={item.href} id={item.id}>
                                                <motion.div
                                                    whileHover={{ scale: 1.1 }}
                                                    whileTap={{ scale: 0.9 }}
                                                    className={cn(
                                                        "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                                                        isActive
                                                            ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                                            : "text-slate-500 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                                                    )}
                                                >
                                                    <item.icon className="h-5 w-5" />
                                                </motion.div>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right">{item.label}</TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </div>
                    )}
                </nav>

                <div className="mt-auto flex flex-col gap-4">
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link href="/dashboard/settings" id="settings-link">
                                <div className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
                                    pathname.startsWith("/dashboard/settings")
                                        ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                                        : "text-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                                )}>
                                    <Settings className="h-5 w-5" />
                                </div>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right">Settings</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                onClick={handleSignOut}
                                className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-sm"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right">Log Out</TooltipContent>
                    </Tooltip>
                </div>
            </div>
        </TooltipProvider>
    )
}
