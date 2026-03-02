"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Navbar() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center justify-between bg-white/80 px-6 lg:px-12 backdrop-blur-xl border-b border-border">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center">
                    <img src="/latest-logo.png" alt="Earlymark" className="h-9 w-9 object-contain" />
                </div>
                <span className="text-lg font-bold tracking-tight text-midnight">Earlymark</span>
            </Link>

            {/* Navigation Links - Centered */}
            <div className="hidden md:flex items-center gap-8">
                <Link href="/" className="text-sm font-medium text-slate-body hover:text-midnight transition-colors">
                    Home
                </Link>
                <Link href="/features" className="text-sm font-medium text-slate-body hover:text-midnight transition-colors">
                    Product
                </Link>
                <Link href="/tutorial" className="text-sm font-medium text-slate-body hover:text-midnight transition-colors">
                    Tutorial
                </Link>
                <Link href="#pricing" className="text-sm font-medium text-slate-body hover:text-midnight transition-colors">
                    Pricing
                </Link>
                <Link href="/contact" className="text-sm font-medium text-slate-body hover:text-midnight transition-colors">
                    Contact
                </Link>
            </div>

            {/* CTA */}
            <div className="flex items-center gap-3">
                <Link href="/contact" className="hidden sm:block">
                    <Button variant="ghost" size="sm" className="text-midnight font-medium">
                        Contact us
                    </Button>
                </Link>
                <Link href="/auth">
                    <Button size="sm" variant="mint">
                        Log in / Get started
                    </Button>
                </Link>
            </div>
        </nav>
    )
}

