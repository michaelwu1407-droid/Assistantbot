"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChevronDown } from "lucide-react"

export function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between bg-white/80 px-6 lg:px-12 backdrop-blur-xl border-b border-border">
            {/* Brand */}
            <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center">
                    <img src="/Latest logo.png" alt="Earlymark" className="h-9 w-9 object-contain" />
                </div>
                <span className="text-lg font-bold tracking-tight text-midnight">Earlymark</span>
            </div>

            {/* Navigation Links - Centered */}
            <div className="hidden md:flex items-center gap-8">
                <Link href="#product" className="text-sm font-medium text-slate-body hover:text-midnight transition-colors">
                    Product
                </Link>
                <DropdownMenu>
                    <DropdownMenuTrigger className="text-sm font-medium text-slate-body hover:text-midnight transition-colors bg-transparent border-none p-0 flex items-center gap-1 focus:outline-none cursor-pointer">
                        Industries <ChevronDown className="h-4 w-4 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="rounded-2xl border-border shadow-ott-elevated">
                        <DropdownMenuItem asChild>
                            <Link href="/industries/trades" className="cursor-pointer rounded-xl">Trades</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/industries/real-estate" className="cursor-pointer rounded-xl">Real Estate</Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Link href="#pricing" className="text-sm font-medium text-slate-body hover:text-midnight transition-colors">
                    Pricing
                </Link>
                <Link href="#contact" className="text-sm font-medium text-slate-body hover:text-midnight transition-colors">
                    Contact
                </Link>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
                <Link href="/login">
                    <Button variant="ghost" size="sm" className="text-midnight font-medium">
                        Log in
                    </Button>
                </Link>
                <Link href="/login">
                    <Button size="sm">
                        Get Started
                    </Button>
                </Link>
            </div>
        </nav>
    )
}
