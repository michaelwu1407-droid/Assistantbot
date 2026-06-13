"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
    ChevronDown, Menu, X, ArrowRight,
    Zap, Wrench, Trees, Sparkles, Bug, Key, Paintbrush, Thermometer,
} from "lucide-react"
import { TRADE_SERVICES } from "@/lib/trade-services"

const TRADE_ICONS: Record<string, typeof Zap> = {
    electricians: Zap,
    plumbers: Wrench,
    landscapers: Trees,
    cleaners: Sparkles,
    "pest-control": Bug,
    locksmiths: Key,
    painters: Paintbrush,
    hvac: Thermometer,
}

export function Navbar() {
    const [isOpen, setIsOpen] = useState(false)
    const [isSolutionsOpen, setIsSolutionsOpen] = useState(false)
    const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    const openSolutions = () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
        setIsSolutionsOpen(true)
    }

    const closeSolutionsSoon = () => {
        if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
        closeTimerRef.current = setTimeout(() => {
            setIsSolutionsOpen(false)
        }, 180)
    }

    useEffect(() => {
        return () => {
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current)
        }
    }, [])

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 border-b border-hair bg-paper/85 backdrop-blur-md">
          <div className="mx-auto flex h-16 max-w-[1320px] items-center justify-between px-5 sm:px-8">
            <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center">
                    <Image src="/latest-logo.png" alt="Earlymark Logo" width={30} height={30} className="rounded-md" unoptimized />
                </div>
                <span className="flex items-baseline gap-2.5">
                    <span className="font-display text-xl font-semibold tracking-[-0.01em] text-ink">Earlymark</span>
                    <span className="em-kicker hidden text-ink2/55 lg:inline">Est. for trades</span>
                </span>
            </Link>

            <div className="hidden items-center gap-9 md:flex">
                <Link href="/" className="text-[14px] font-medium text-ink2 transition-colors hover:text-ink">
                    Home
                </Link>
                <Link href="/features" className="text-[14px] font-medium text-ink2 transition-colors hover:text-ink">
                    Product
                </Link>

                <div
                    className="relative pb-5 -mb-5"
                    onMouseEnter={openSolutions}
                    onMouseLeave={closeSolutionsSoon}
                    onFocus={openSolutions}
                    onBlur={closeSolutionsSoon}
                >
                    <Link href="/solutions" className="inline-flex items-center gap-1 text-[14px] font-medium text-ink2 transition-colors hover:text-ink">
                        Solutions
                        <ChevronDown className={`h-4 w-4 transition-transform ${isSolutionsOpen ? "rotate-180" : ""}`} />
                    </Link>

                    <div
                        className={`absolute left-1/2 top-full z-50 pt-3 transition-all duration-200 ${isSolutionsOpen ? "pointer-events-auto visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1 opacity-0"}`}
                    >
                        <div className="w-[640px] -translate-x-1/2 overflow-hidden rounded-2xl border border-hair bg-card shadow-[0_24px_60px_-18px_rgba(14,31,26,0.35)]">
                            <div className="px-5 pt-5 pb-2">
                                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-forest">Trade services</p>
                                <p className="mt-1 text-sm text-muted-foreground">Earlymark workflows tuned for your trade.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-1 p-3">
                                {TRADE_SERVICES.map((service) => {
                                    const Icon = TRADE_ICONS[service.slug] ?? Sparkles
                                    return (
                                        <Link
                                            key={service.slug}
                                            href={`/solutions/${service.slug}`}
                                            className="group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-paper"
                                            onClick={() => setIsSolutionsOpen(false)}
                                        >
                                            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary-subtle text-forest group-hover:bg-mint-100">
                                                <Icon className="h-4 w-4" />
                                            </span>
                                            <span className="flex flex-col gap-0.5">
                                                <span className="text-[14px] font-semibold text-ink">{service.navLabel}</span>
                                                <span className="text-[12px] leading-snug text-muted-foreground line-clamp-2">{service.summaryTeaser}</span>
                                            </span>
                                        </Link>
                                    )
                                })}
                            </div>
                            <Link
                                href="/solutions"
                                onClick={() => setIsSolutionsOpen(false)}
                                className="flex items-center justify-between border-t border-hair bg-paper/60 px-5 py-3 text-[13px] font-semibold text-ink transition-colors hover:bg-paper"
                            >
                                <span>View all trade services</span>
                                <ArrowRight className="h-4 w-4 text-forest" />
                            </Link>
                        </div>
                    </div>
                </div>

                <Link href="/pricing" className="text-[14px] font-medium text-ink2 transition-colors hover:text-ink">
                    Pricing
                </Link>
            </div>

            <div className="flex items-center gap-5">
                <Link href="/contact" className="hidden text-[14px] font-medium text-ink2 transition-colors hover:text-ink sm:inline-flex">
                    Contact
                </Link>
                <Link href="/auth" className="group hidden items-center gap-2 text-[14px] font-semibold text-ink sm:inline-flex">
                    <span className="border-b-2 border-mint-500 pb-0.5 transition-colors group-hover:border-forest">Log in / Get started</span>
                    <ArrowRight className="h-3.5 w-3.5 text-forest transition-transform group-hover:translate-x-0.5" />
                </Link>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="-mr-2 p-2 text-ink md:hidden"
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>
          </div>

            {isOpen && (
                <div className="animate-in fade-in slide-in-from-top-2 absolute left-0 right-0 top-16 z-50 mx-4 flex flex-col gap-4 rounded-md border border-hair bg-card p-5 shadow-xl md:hidden">
                    <Link href="/" className="text-[15px] font-medium text-ink2" onClick={() => setIsOpen(false)}>Home</Link>
                    <Link href="/features" className="text-[15px] font-medium text-ink2" onClick={() => setIsOpen(false)}>Product</Link>
                    <div className="flex flex-col gap-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-forest">Solutions</p>
                        <div className="grid grid-cols-2 gap-2">
                            {TRADE_SERVICES.map((service) => {
                                const Icon = TRADE_ICONS[service.slug] ?? Sparkles
                                return (
                                    <Link
                                        key={service.slug}
                                        href={`/solutions/${service.slug}`}
                                        className="flex items-center gap-2 rounded-xl border border-hair bg-card px-3 py-2.5"
                                        onClick={() => setIsOpen(false)}
                                    >
                                        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-subtle text-forest">
                                            <Icon className="h-3.5 w-3.5" />
                                        </span>
                                        <span className="text-sm font-semibold text-ink">{service.navLabel}</span>
                                    </Link>
                                )
                            })}
                        </div>
                        <Link
                            href="/solutions"
                            className="mt-1 flex items-center justify-between rounded-xl border border-hair bg-paper px-3 py-2.5 text-sm font-semibold text-ink"
                            onClick={() => setIsOpen(false)}
                        >
                            <span>View all trade services</span>
                            <ArrowRight className="h-4 w-4 text-forest" />
                        </Link>
                    </div>
                    <Link href="/pricing" className="text-[15px] font-medium text-ink2" onClick={() => setIsOpen(false)}>Pricing</Link>
                    <hr className="border-hair" />
                    <Link href="/contact" className="text-[15px] font-medium text-ink2" onClick={() => setIsOpen(false)}>Contact us</Link>
                    <Link href="/auth" className="text-[15px] font-bold text-primary" onClick={() => setIsOpen(false)}>Log in / Get started</Link>
                </div>
            )}
        </nav>
    )
}
