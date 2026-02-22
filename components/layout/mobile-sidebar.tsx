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
            <SheetContent side="left" className="p-0 w-[200px] border-r border-border bg-white">
                <SheetHeader className="sr-only">
                    <SheetTitle>Navigation Menu</SheetTitle>
                </SheetHeader>
                <div className="h-full py-4">
                    <Sidebar className="border-none bg-transparent w-full" />
                </div>
            </SheetContent>
        </Sheet>
    )
}
