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
        <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between bg-white/80 px-6 backdrop-blur-md border-b border-slate-200">
            {/* Brand */}
            <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-slate-900 border-2 border-slate-900 px-2 py-0.5 rounded-lg">Pj Buddy</span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center gap-8">
                <Link href="#product" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                    Product
                </Link>
                <DropdownMenu>
                    <DropdownMenuTrigger className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors bg-transparent border-none p-0 flex items-center gap-1 focus:outline-none">
                        Industries <ChevronDown className="h-4 w-4 opacity-50" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="start">
                        <DropdownMenuItem asChild>
                            <Link href="/industries/trades" className="cursor-pointer">Trades</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                            <Link href="/industries/real-estate" className="cursor-pointer">Real Estate</Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Link href="#contact" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors">
                    Contact
                </Link>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-4">
                <Link href="/login">
                    <Button>Get Started</Button>
                </Link>
            </div>
        </nav>
    )
}
