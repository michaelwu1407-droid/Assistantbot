"use client"

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { useShellStore } from "@/lib/store"
import { Sidebar } from "@/components/core/sidebar"
import { usePathname } from "next/navigation"
import { useEffect } from "react"

export function MobileSidebar() {
    const { mobileMenuOpen, setMobileMenuOpen } = useShellStore()
    const pathname = usePathname()

    // Close on navigation
    useEffect(() => {
        setMobileMenuOpen(false)
    }, [pathname, setMobileMenuOpen])

    return (
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetContent side="left" className="p-0 w-[200px] border-r border-slate-200/90 bg-white shadow-[2px_0_20px_-8px_rgba(15,23,42,0.1)] dark:border-slate-800 dark:bg-slate-950">
                <SheetHeader className="sr-only">
                    <SheetTitle>Navigation Menu</SheetTitle>
                </SheetHeader>
                <div className="h-full py-2">
                    <Sidebar className="border-none w-full" expanded />
                </div>
            </SheetContent>
        </Sheet>
    )
}
