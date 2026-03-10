"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ChevronDown, Menu, X } from "lucide-react"
import { TRADE_SERVICES, TRADE_SERVICES_SUMMARY } from "@/lib/trade-services"

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
                <div className="group relative">
                    <Link href="/solutions" className="inline-flex items-center gap-1 text-[15px] font-medium text-slate-body hover:text-midnight transition-colors">
                        Solutions
                        <ChevronDown className="h-4 w-4 transition-transform group-hover:rotate-180" />
                    </Link>
                    <div className="pointer-events-none invisible absolute left-1/2 top-full z-50 mt-4 w-[360px] -translate-x-1/2 rounded-3xl border border-slate-200 bg-white/95 p-4 opacity-0 shadow-2xl backdrop-blur-xl transition-all duration-200 group-hover:pointer-events-auto group-hover:visible group-hover:opacity-100">
                        <Link
                            href="/solutions"
                            className="block rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 transition-colors hover:bg-emerald-50"
                        >
                            <div className="text-[15px] font-bold text-midnight underline decoration-2 underline-offset-4">
                                Trade services
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-600">
                                {TRADE_SERVICES_SUMMARY.navSummary}
                            </p>
                        </Link>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                            {TRADE_SERVICES.map((service) => (
                                <Link
                                    key={service.slug}
                                    href={`/solutions/${service.slug}`}
                                    className="rounded-2xl px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-midnight"
                                >
                                    {service.navLabel}
                                </Link>
                            ))}
                        </div>
                    </div>
                </div>
                <Link href="/tutorial" className="text-[15px] font-medium text-slate-body hover:text-midnight transition-colors">
                    Tutorial
                </Link>
                <Link href="/contact" className="text-[15px] font-medium text-slate-body hover:text-midnight transition-colors">
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
                    <div className="flex flex-col gap-2">
                        <span className="text-[15px] font-medium text-slate-body">Solutions</span>
                        <Link
                            href="/solutions"
                            className="rounded-xl border border-emerald-100 bg-emerald-50/70 px-3 py-3"
                            onClick={() => setIsOpen(false)}
                        >
                            <div className="text-[15px] font-bold text-midnight underline decoration-2 underline-offset-4">
                                Trade services
                            </div>
                            <p className="mt-1 text-xs leading-5 text-slate-600">
                                {TRADE_SERVICES_SUMMARY.navSummary}
                            </p>
                        </Link>
                        <div className="grid grid-cols-2 gap-2">
                            {TRADE_SERVICES.map((service) => (
                                <Link
                                    key={service.slug}
                                    href={`/solutions/${service.slug}`}
                                    className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-medium text-slate-body"
                                    onClick={() => setIsOpen(false)}
                                >
                                    {service.navLabel}
                                </Link>
                            ))}
                        </div>
                    </div>
                    <Link href="/tutorial" className="text-[15px] font-medium text-slate-body" onClick={() => setIsOpen(false)}>Tutorial</Link>
                    <Link href="/contact" className="text-[15px] font-medium text-slate-body" onClick={() => setIsOpen(false)}>Pricing</Link>
                    <hr className="border-slate-100" />
                    <Link href="/contact" className="text-[15px] font-medium text-slate-body" onClick={() => setIsOpen(false)}>Contact us</Link>
                    <Link href="/auth" className="text-[15px] font-bold text-primary" onClick={() => setIsOpen(false)}>Log in / Get started</Link>
                </div>
            )}
        </nav>
    )
}

