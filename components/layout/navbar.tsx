"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Menu, X } from "lucide-react"

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false)

    return (
        <nav className="fixed top-5 left-1/2 -translate-x-1/2 z-50 flex h-16 w-[95%] max-w-[1200px] items-center justify-between rounded-full bg-white/70 px-6 lg:px-8 backdrop-blur-md shadow-lg border border-white/20 transition-all">
            {/* Brand */}
            <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center">
                    <Image src="/latest-logo.png" alt="Earlymark Logo" width={32} height={32} className="rounded-lg" unoptimized />
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
                <Link href="/auth" className="hidden sm:block">
                    <Button size="sm" variant="mint" className="text-[15px] font-medium">
                        Log in / Get started
                    </Button>
                </Link>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="md:hidden p-2 text-midnight -mr-2"
                >
                    {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="absolute top-16 left-0 right-0 mx-4 p-5 rounded-2xl bg-white shadow-xl border border-slate-200 md:hidden flex flex-col gap-4 z-50 animate-in fade-in slide-in-from-top-2">
                    <Link href="/" className="text-[15px] font-medium text-slate-body" onClick={() => setIsOpen(false)}>Home</Link>
                    <Link href="/features" className="text-[15px] font-medium text-slate-body" onClick={() => setIsOpen(false)}>Product</Link>
                    <Link href="/tutorial" className="text-[15px] font-medium text-slate-body" onClick={() => setIsOpen(false)}>Tutorial</Link>
                    <Link href="#pricing" className="text-[15px] font-medium text-slate-body" onClick={() => setIsOpen(false)}>Pricing</Link>
                    <hr className="border-slate-100" />
                    <Link href="/contact" className="text-[15px] font-medium text-slate-body" onClick={() => setIsOpen(false)}>Contact us</Link>
                    <Link href="/auth" className="text-[15px] font-bold text-primary" onClick={() => setIsOpen(false)}>Log in / Get started</Link>
                </div>
            )}
        </nav>
    )
}

