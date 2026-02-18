"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
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
    MessageSquare,
    LayoutTemplate,
    FileText,
    PieChart,
    Inbox
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import { Separator } from "@/components/ui/separator"
import { logout } from "@/actions/auth-actions"
import { Switch } from "@/components/ui/switch"
import { useShellStore } from "@/lib/store"
import { useIndustry } from "@/components/providers/industry-provider"

const navItems = [
    { icon: Home, label: "Home", href: "/dashboard", id: "dashboard-link" },
    { icon: Inbox, label: "Inbox", href: "/dashboard/inbox", id: "inbox-link" },
    { icon: Calendar, label: "Schedule", href: "/dashboard/schedule", id: "schedule-link" },
    { icon: FileText, label: "Deals", href: "/dashboard/deals", id: "deals-link" },
    { icon: PieChart, label: "Reports", href: "/dashboard/analytics", id: "reports-link" },
    { icon: Users, label: "Team", href: "/dashboard/team", id: "team-link" },
    // Toggle Sections
    { icon: Hammer, label: "Tradie", href: "/dashboard/tradie", id: "tradie-menu-toggle", isToggle: true },
    { icon: Briefcase, label: "Agent", href: "/dashboard/agent", id: "agent-menu-toggle", isToggle: true },
]

const tradieSubItems = [
    { icon: Users, label: "Contacts", href: "/dashboard/contacts", id: "contacts-link" },
]

const agentSubItems = [
    { icon: Users, label: "Contacts", href: "/dashboard/contacts", id: "agent-contacts-link" },
    { icon: FileText, label: "Estimator", href: "/dashboard/estimator", id: "agent-estimator-link" },
    { icon: LayoutTemplate, label: "Open House", href: "/kiosk/open-house", id: "kiosk-link" },
]

interface SidebarProps {
    className?: string
}

export function Sidebar({ className }: SidebarProps) {
    const pathname = usePathname()
    const [mounted, setMounted] = useState(false)
    const { setViewMode, viewMode } = useShellStore()
    const { industry, setIndustry } = useIndustry()
    const router = useRouter()

    useEffect(() => {
        setMounted(true)
    }, [])

    const handleSignOut = async () => {
        await logout()
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
            <aside className={cn("flex h-full w-[60px] flex-col items-center border-r border-slate-200 bg-white py-6 z-20 shadow-sm transition-all duration-300", className)}>
                {/* Logo / Brand */}
                <div className="mb-8 flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#00D28B] text-white shadow-lg shadow-[#00D28B]/20 transition-all hover:scale-105 active:scale-95">
                    <span className="font-extrabold italic text-lg tracking-tighter">Pj</span>
                </div>

                {/* Mode Toggle (Advanced/Basic) */}
                {mounted && viewMode === "ADVANCED" && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                id="mode-toggle-btn"
                                onClick={() => setViewMode("BASIC")}
                                className="mb-4 flex h-8 w-8 items-center justify-center rounded-[12px] text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                            >
                                <MessageSquare className="h-4 w-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-[#18181B] text-white border-white/10">Switch to Basic Mode</TooltipContent>
                    </Tooltip>
                )}

                <nav className="flex flex-1 flex-col gap-2 w-full px-2">
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
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                            className={cn(
                                                "flex h-10 w-full items-center justify-center rounded-[14px] transition-all duration-300",
                                                isActive
                                                    ? "bg-[#0F172A] text-white shadow-lg shadow-slate-200"
                                                    : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
                                            )}
                                        >
                                            <item.icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                                        </motion.div>
                                    </LinkComponent>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-[#0F172A] text-white border-slate-800 font-semibold px-3 py-1.5 ml-2">
                                    {item.isToggle ? `Toggle ${item.label} Menu` : item.label}
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}

                    {/* Tradie Sub-items */}
                    {isTradie && (
                        <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-left-4 duration-300 w-full pt-1">
                            <div className="h-px bg-slate-100 w-6 mx-auto my-1" />
                            {tradieSubItems.map((item) => {
                                const isActive = pathname === item.href

                                return (
                                    <Tooltip key={item.href}>
                                        <TooltipTrigger asChild>
                                            <Link href={item.href} id={item.id}>
                                                <motion.div
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className={cn(
                                                        "flex h-9 w-full items-center justify-center rounded-[12px] transition-all duration-300",
                                                        isActive
                                                            ? "bg-[#00D28B]/10 text-[#00D28B] ring-1 ring-[#00D28B]/20"
                                                            : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
                                                    )}
                                                >
                                                    <item.icon className={cn("h-4 w-4", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                                                </motion.div>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-[#0F172A] text-white border-slate-800 font-semibold px-3 py-1.5 ml-2">{item.label}</TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </div>
                    )}

                    {/* Agent Sub-items */}
                    {isAgent && (
                        <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-left-4 duration-300 w-full pt-1">
                            <div className="h-px bg-slate-100 w-6 mx-auto my-1" />
                            {agentSubItems.map((item) => {
                                const isActive = pathname === item.href

                                return (
                                    <Tooltip key={item.href}>
                                        <TooltipTrigger asChild>
                                            <Link href={item.href} id={item.id}>
                                                <motion.div
                                                    whileHover={{ scale: 1.05 }}
                                                    whileTap={{ scale: 0.95 }}
                                                    className={cn(
                                                        "flex h-9 w-full items-center justify-center rounded-[12px] transition-all duration-300",
                                                        isActive
                                                            ? "bg-[#00D28B]/10 text-[#00D28B] ring-1 ring-[#00D28B]/20"
                                                            : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
                                                    )}
                                                >
                                                    <item.icon className={cn("h-4 w-4", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                                                </motion.div>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-[#0F172A] text-white border-slate-800 font-semibold px-3 py-1.5 ml-2">{item.label}</TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </div>
                    )}
                </nav>

                {/* Bottom Actions */}
                <div className="flex flex-col gap-2 px-2 w-full">
                    <div className="h-px bg-slate-100 w-full" />

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link href="/dashboard/settings">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={cn(
                                        "flex h-10 w-full items-center justify-center rounded-[14px] transition-all duration-300",
                                        pathname.startsWith("/dashboard/settings")
                                            ? "bg-slate-100 text-slate-900"
                                            : "text-slate-400 hover:bg-slate-50 hover:text-slate-900"
                                    )}
                                >
                                    <Settings className="h-5 w-5" />
                                </motion.div>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-[#0F172A] text-white border-slate-800 font-semibold px-3 py-1.5 ml-2">Settings</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                id="logout-btn"
                                onClick={handleSignOut}
                                className="flex h-10 w-full items-center justify-center rounded-[14px] text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all duration-300"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-[#0F172A] text-white border-slate-800 font-semibold px-3 py-1.5 ml-2">Sign Out</TooltipContent>
                    </Tooltip>
                </div>
            </aside>
        </TooltipProvider>
    )
}
