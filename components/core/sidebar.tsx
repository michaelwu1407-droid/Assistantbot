"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
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
    MessageSquare
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useShellStore } from "@/lib/store"

const navItems = [
    { icon: Home, label: "Hub", href: "/dashboard", id: "hub-link" },
    { icon: Hammer, label: "Tradie", href: "/dashboard/tradie", id: "tradie-link" },
    { icon: Briefcase, label: "Agent", href: "/dashboard/agent", id: "agent-link" },
]

const tradieSubItems = [
    { icon: Map, label: "Map", href: "/dashboard/tradie/map", id: "map-link" },
    { icon: Calendar, label: "Schedule", href: "/dashboard/tradie/schedule", id: "schedule-link" },
    { icon: FileText, label: "Estimator", href: "/dashboard/estimator", id: "estimator-link" },
    { icon: Users, label: "Contacts", href: "/dashboard/contacts", id: "contacts-link" },
]

export function Sidebar() {
    const pathname = usePathname()
    const { setViewMode, viewMode } = useShellStore()
    const isTradie = pathname.includes("/tradie")

    return (
        <div id="sidebar-nav" className="flex h-full w-16 flex-col items-center border-r border-slate-200 bg-slate-50 py-4 z-20">
            <div className="mb-8 font-bold text-slate-900 italic">Pj</div>

            {/* Mode Toggle */}
            {viewMode === "ADVANCED" && (
                <button
                    id="mode-toggle-btn"
                    onClick={() => setViewMode("BASIC")}
                    className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-sm transition-all"
                    title="Switch to Basic Mode"
                >
                    <MessageSquare className="h-5 w-5" />
                </button>
            )}

            <nav className="flex flex-1 flex-col gap-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))

                    return (
                        <Link key={item.href} href={item.href} id={item.id}>
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
                    )
                })}

                {/* Tradie Sub-items */}
                {isTradie && (
                    <>
                        <div className="h-px bg-slate-200 w-8 mx-auto my-2" />
                        {tradieSubItems.map((item) => {
                            const isActive = pathname === item.href

                            return (
                                <Link key={item.href} href={item.href} id={item.id}>
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
                            )
                        })}
                    </>
                )}
            </nav>

            <div className="mt-auto flex flex-col gap-4">
                <Link href="/dashboard/settings" id="settings-link">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-sm">
                        <Settings className="h-5 w-5" />
                    </div>
                </Link>
                <button className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-sm">
                    <LogOut className="h-5 w-5" />
                </button>
            </div>
        </div>
    )
}
