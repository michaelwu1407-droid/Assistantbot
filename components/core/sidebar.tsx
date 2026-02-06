"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
    Home,
    Hammer,
    Briefcase,
    Settings,
    LogOut
} from "lucide-react"
import { cn } from "@/lib/utils"

const navItems = [
    { icon: Home, label: "Hub", href: "/dashboard" },
    { icon: Hammer, label: "Tradie", href: "/dashboard/tradie" },
    { icon: Briefcase, label: "Agent", href: "/dashboard/agent" },
]

export function Sidebar() {
    const pathname = usePathname()

    return (
        <div className="flex h-full w-16 flex-col items-center border-r border-slate-200 bg-slate-50 py-4 z-20">
            <div className="mb-8 font-bold text-slate-900 italic">Pj</div>

            <nav className="flex flex-1 flex-col gap-4">
                {navItems.map((item) => {
                    const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))

                    return (
                        <Link key={item.href} href={item.href}>
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
            </nav>

            <div className="mt-auto flex flex-col gap-4">
                <button className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-sm">
                    <Settings className="h-5 w-5" />
                </button>
                <button className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-white hover:text-slate-900 hover:shadow-sm">
                    <LogOut className="h-5 w-5" />
                </button>
            </div>
        </div>
    )
}
