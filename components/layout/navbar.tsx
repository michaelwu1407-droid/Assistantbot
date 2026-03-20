"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ChevronDown, Menu, X } from "lucide-react"
import { TRADE_SERVICES } from "@/lib/trade-services"

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
        <nav className="fixed top-5 left-1/2 z-50 flex h-16 w-[95%] max-w-[1200px] -translate-x-1/2 items-center justify-between rounded-full border border-white/20 bg-white/70 px-6 shadow-lg backdrop-blur-md transition-all lg:px-8">
            <Link href="/" className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center">
                    <Image src="/latest-logo.png" alt="Earlymark Logo" width={32} height={32} className="rounded-lg" unoptimized />
                </div>
                <span className="text-lg font-bold tracking-tight text-midnight">Earlymark</span>
            </Link>

            <div className="hidden items-center gap-8 md:flex">
                <Link href="/" className="text-[15px] font-medium text-slate-body transition-colors hover:text-midnight">
                    Home
                </Link>
                <Link href="/features" className="text-[15px] font-medium text-slate-body transition-colors hover:text-midnight">
                    Product
                </Link>

                <div
                    className="relative pb-5 -mb-5"
                    onMouseEnter={openSolutions}
                    onMouseLeave={closeSolutionsSoon}
                    onFocus={openSolutions}
                    onBlur={closeSolutionsSoon}
                >
                    <Link href="/solutions" className="inline-flex items-center gap-1 text-[15px] font-medium text-slate-body transition-colors hover:text-midnight">
                        Solutions
                        <ChevronDown className={`h-4 w-4 transition-transform ${isSolutionsOpen ? "rotate-180" : ""}`} />
                    </Link>

                    <div
                        className={`absolute left-1/2 top-full z-50 pt-3 transition-all duration-200 ${isSolutionsOpen ? "pointer-events-auto visible translate-y-0 opacity-100" : "pointer-events-none invisible -translate-y-1 opacity-0"}`}
                    >
                        <div className="w-[540px] -translate-x-1/2 rounded-[28px] border border-slate-200 bg-white/96 p-5 shadow-2xl backdrop-blur-xl">
                            <div className="grid grid-cols-[180px_1fr] gap-5">
                                <Link
                                    href="/solutions"
                                    className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-4 text-[15px] font-bold text-midnight underline decoration-2 underline-offset-4 transition-colors hover:bg-emerald-50"
                                    onClick={() => setIsSolutionsOpen(false)}
                                >
                                    Trade services
                                </Link>

                                <div className="grid grid-cols-2 gap-2">
                                    {TRADE_SERVICES.map((service) => (
                                        <Link
                                            key={service.slug}
                                            href={`/solutions/${service.slug}`}
                                            className="rounded-2xl px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-midnight"
                                            onClick={() => setIsSolutionsOpen(false)}
                                        >
                                            {service.navLabel}
                                        </Link>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <Link href="/tutorial" className="text-[15px] font-medium text-slate-body transition-colors hover:text-midnight">
                    Tutorial
                </Link>
                <Link href="/pricing" className="text-[15px] font-medium text-slate-body transition-colors hover:text-midnight">
                    Pricing
                </Link>
            </div>

            <div className="flex items-center gap-3">
                <Button asChild variant="ghost" size="sm" className="hidden text-[15px] font-medium text-midnight sm:inline-flex">
                    <Link href="/contact">
                        Contact us
                    </Link>
                </Button>
                <Button asChild size="sm" variant="mint" className="hidden text-[15px] font-medium sm:inline-flex">
                    <Link href="/auth">
                        Log in / Get started
                    </Link>
                </Button>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="-mr-2 p-2 text-midnight md:hidden"
                >
                    {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </div>

            {isOpen && (
                <div className="animate-in fade-in slide-in-from-top-2 absolute left-0 right-0 top-16 z-50 mx-4 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xl md:hidden">
                    <Link href="/" className="text-[15px] font-medium text-slate-body" onClick={() => setIsOpen(false)}>Home</Link>
                    <Link href="/features" className="text-[15px] font-medium text-slate-body" onClick={() => setIsOpen(false)}>Product</Link>
                    <div className="flex flex-col gap-2">
                        <span className="text-[15px] font-medium text-slate-body">Solutions</span>
                        <Link
                            href="/solutions"
                            className="rounded-xl border border-emerald-100 bg-emerald-50/80 px-3 py-3 text-[15px] font-bold text-midnight underline decoration-2 underline-offset-4"
                            onClick={() => setIsOpen(false)}
                        >
                            Trade services
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
                    <Link href="/pricing" className="text-[15px] font-medium text-slate-body" onClick={() => setIsOpen(false)}>Pricing</Link>
                    <hr className="border-slate-100" />
                    <Link href="/contact" className="text-[15px] font-medium text-slate-body" onClick={() => setIsOpen(false)}>Contact us</Link>
                    <Link href="/auth" className="text-[15px] font-bold text-primary" onClick={() => setIsOpen(false)}>Log in / Get started</Link>
                </div>
            )}
        </nav>
    )
}
