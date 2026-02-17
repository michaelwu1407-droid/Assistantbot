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
    // Toggle Sections
    { icon: Hammer, label: "Tradie", href: "/dashboard/tradie", id: "tradie-menu-toggle", isToggle: true },
    { icon: Briefcase, label: "Agent", href: "/dashboard/agent", id: "agent-menu-toggle", isToggle: true },
]

const tradieSubItems = [
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
    const { setViewMode, viewMode } = useShellStore()
    const { industry, setIndustry } = useIndustry()
    const router = useRouter()

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
            <aside className={cn("flex h-full w-[80px] flex-col items-center border-r border-[#1E293B] bg-[#020617] py-6 z-20 shadow-xl", className)}>
                {/* Logo / Brand */}
                <div className="mb-8 flex h-12 w-12 items-center justify-center rounded-[16px] bg-[#00D28B]/10 border border-[#00D28B]/20 text-[#00D28B] shadow-[0_0_15px_-3px_rgba(0,210,139,0.3)]">
                    <span className="font-extrabold italic text-xl">Pj</span>
                </div>

                {/* Mode Toggle (Advanced/Basic) */}
                {viewMode === "ADVANCED" && (
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                id="mode-toggle-btn"
                                onClick={() => setViewMode("BASIC")}
                                className="mb-6 flex h-10 w-10 items-center justify-center rounded-[16px] text-slate-400 hover:bg-white/10 hover:text-white transition-all"
                            >
                                <MessageSquare className="h-5 w-5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-[#18181B] text-white border-white/10">Switch to Basic Mode</TooltipContent>
                    </Tooltip>
                )}

                <nav className="flex flex-1 flex-col gap-3 w-full px-3">
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
                                                "flex h-11 w-full items-center justify-center rounded-[16px] transition-all duration-300",
                                                isActive
                                                    ? "bg-[#00D28B] text-[#020617] shadow-[0_0_15px_-3px_rgba(0,210,139,0.4)]"
                                                    : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
                                            )}
                                        >
                                            <item.icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                                        </motion.div>
                                    </LinkComponent>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-[#18181B] text-white border-white/10">
                                    {item.isToggle ? `Toggle ${item.label} Menu` : item.label}
                                </TooltipContent>
                            </Tooltip>
                        )
                    })}

                    {/* Tradie Sub-items */}
                    {isTradie && (
                        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-left-4 duration-300 w-full">
                            <div className="h-px bg-white/10 w-8 mx-auto my-1" />
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
                                                        "flex h-11 w-full items-center justify-center rounded-[16px] transition-all duration-300",
                                                        isActive
                                                            ? "bg-[#00D28B]/20 text-[#00D28B] border border-[#00D28B]/30"
                                                            : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
                                                    )}
                                                >
                                                    <item.icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                                                </motion.div>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-[#18181B] text-white border-white/10">{item.label}</TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </div>
                    )}

                    {/* Agent Sub-items */}
                    {isAgent && (
                        <div className="flex flex-col gap-3 animate-in fade-in slide-in-from-left-4 duration-300 w-full">
                            <div className="h-px bg-white/10 w-8 mx-auto my-1" />
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
                                                        "flex h-11 w-full items-center justify-center rounded-[16px] transition-all duration-300",
                                                        isActive
                                                            ? "bg-[#00D28B]/20 text-[#00D28B] border border-[#00D28B]/30"
                                                            : "text-[#94A3B8] hover:bg-white/5 hover:text-white"
                                                    )}
                                                >
                                                    <item.icon className={cn("h-5 w-5", isActive ? "stroke-[2.5px]" : "stroke-2")} />
                                                </motion.div>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-[#18181B] text-white border-white/10">{item.label}</TooltipContent>
                                    </Tooltip>
                                )
                            })}
                        </div>
                    )}
                </nav>

                {/* Bottom Actions */}
                <div className="flex flex-col gap-3 px-3 w-full">
                    <div className="h-px bg-white/10 w-full" />

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Link href="/dashboard/settings">
                                <motion.div
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className={cn(
                                        "flex h-11 w-full items-center justify-center rounded-[16px] transition-all duration-300",
                                        pathname.startsWith("/dashboard/settings")
                                            ? "bg-[#00D28B]/20 text-[#00D28B]"
                                            : "text-[#64748B] hover:bg-white/5 hover:text-white"
                                    )}
                                >
                                    <Settings className="h-5 w-5" />
                                </motion.div>
                            </Link>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-[#18181B] text-white border-white/10">Settings</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button
                                id="logout-btn"
                                onClick={handleSignOut}
                                className="flex h-11 w-full items-center justify-center rounded-[16px] text-[#64748B] hover:bg-red-500/10 hover:text-red-400 transition-all duration-300"
                            >
                                <LogOut className="h-5 w-5" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-[#18181B] text-white border-white/10">Sign Out</TooltipContent>
                    </Tooltip>
                </div>
            </aside>
        </TooltipProvider>
    )
}
