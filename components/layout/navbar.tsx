"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Navbar() {
    return (
        <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex h-16 w-[95%] max-w-[1200px] items-center justify-between rounded-full bg-white/70 px-6 lg:px-8 backdrop-blur-md shadow-lg border border-white/20 transition-all">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center">
                    <img src="/latest-logo.png?v=20250305" alt="Earlymark" className="h-9 w-9 object-contain" />
                </div>
                <span className="text-lg font-bold tracking-tight text-midnight">Earlymark</span>
            </Link>

            {/* Navigation Links - Centered */}
            <div className="hidden md:flex items-center gap-8">
                <Link href="/" className="text-[15px] font-medium text-slate-body hover:text-midnight transition-colors">
                    Home
                </Link>
                <Link href="/features" className="text-[15px] font-medium text-slate-body hover:text-midnight transition-colors">
                    Product
                </Link>
                <Link href="/tutorial" className="text-[15px] font-medium text-slate-body hover:text-midnight transition-colors">
                    Tutorial
                </Link>
                <Link href="#pricing" className="text-[15px] font-medium text-slate-body hover:text-midnight transition-colors">
                    Pricing
                </Link>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
                <Link href="/contact" className="hidden sm:block">
                    <Button variant="ghost" size="sm" className="text-[15px] text-midnight font-medium">
                        Contact us
                    </Button>
                </Link>
                <Link href="/auth">
                    <Button size="sm" variant="mint" className="text-[15px] font-medium">
                        Log in / Get started
                    </Button>
                </Link>
            </div>
        </nav>
    )
}

