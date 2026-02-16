"use client"

import { usePathname } from "next/navigation"
import Link from "next/link"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

export function Breadcrumbs({ className }: { className?: string }) {
    const pathname = usePathname()
    const segments = pathname.split("/").filter(Boolean)

    // Hide breadcrumbs on main dashboard page (only "dashboard" in path)
    if (segments.length === 0 || (segments.length === 1 && segments[0] === "dashboard")) return null

    return (
        <nav aria-label="Breadcrumb" className={cn("hidden md:flex items-center text-sm text-slate-500", className)}>
            <Link
                href="/dashboard"
                className="flex items-center hover:text-slate-900 transition-colors"
            >
                <Home className="h-4 w-4" />
            </Link>

            {segments.map((segment, index) => {
                // Skip "dashboard" since we have the Home icon
                if (segment === "dashboard" && index === 0) return null

                const href = `/${segments.slice(0, index + 1).join("/")}`
                const isLast = index === segments.length - 1
                const title = segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ")

                return (
                    <div key={href} className="flex items-center">
                        <ChevronRight className="h-4 w-4 mx-1 text-slate-400" />
                        {isLast ? (
                            <span className="font-medium text-slate-900 pointer-events-none">
                                {title}
                            </span>
                        ) : (
                            <Link
                                href={href}
                                className="hover:text-slate-900 transition-colors"
                            >
                                {title}
                            </Link>
                        )}
                    </div>
                )
            })}
        </nav>
    )
}
