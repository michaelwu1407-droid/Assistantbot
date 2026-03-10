"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Bot, CalendarDays, Inbox, LayoutDashboard, Map } from "lucide-react";

const REEL_STEPS = [
    { label: "Chat", icon: Bot },
    { label: "Dashboard", icon: LayoutDashboard },
    { label: "Inbox", icon: Inbox },
    { label: "Map", icon: Map },
    { label: "Calendar", icon: CalendarDays },
];

export function HeroDashboardReel({ className = "" }: { className?: string }) {
    const shouldReduceMotion = useReducedMotion();
    const [videoReady, setVideoReady] = useState(false);
    const [videoUnavailable, setVideoUnavailable] = useState(false);

    const mediaSources = useMemo(
        () => ({
            desktopMp4: "/hero-dashboard-reel-desktop.mp4",
            desktopWebm: "/hero-dashboard-reel-desktop.webm",
            mobileMp4: "/hero-dashboard-reel-mobile.mp4",
            poster: "/hero-dashboard-reel-poster.svg",
        }),
        [],
    );

    return (
        <div className={`relative mx-auto w-full max-w-[1120px] ${className}`}>
            <div className="absolute inset-x-[10%] top-6 -z-10 h-28 rounded-full bg-emerald-400/18 blur-3xl" />
            <div className="absolute inset-x-[18%] bottom-0 -z-10 h-24 rounded-full bg-cyan-300/16 blur-3xl" />

            <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden rounded-[32px] border border-white/55 bg-white/55 shadow-[0_28px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl"
            >
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.52)_0%,rgba(255,255,255,0.18)_18%,rgba(255,255,255,0)_36%)] pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-px bg-white/80 pointer-events-none" />

                <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(241,245,249,0.88)_100%)] px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-rose-400/90" />
                        <span className="h-3 w-3 rounded-full bg-amber-400/90" />
                        <span className="h-3 w-3 rounded-full bg-emerald-400/90" />
                    </div>
                    <div className="min-w-0 flex-1 px-2">
                        <div className="mx-auto w-fit max-w-full rounded-full border border-slate-200/80 bg-white/88 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-sm">
                            earlymark.ai/dashboard
                        </div>
                    </div>
                    <div className="hidden items-center gap-2 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 sm:flex">
                        Actual Product Reel
                    </div>
                </div>

                <div className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(247,250,252,0.94)_0%,rgba(240,249,244,0.74)_100%)] px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                        {REEL_STEPS.map(({ label, icon: Icon }, idx) => (
                            <div
                                key={label}
                                className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/78 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-600 shadow-sm"
                            >
                                <Icon className="h-3.5 w-3.5 text-emerald-600" />
                                <span>{label}</span>
                                {idx < REEL_STEPS.length - 1 ? <span className="text-slate-300">/</span> : null}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="relative aspect-[16/10] overflow-hidden bg-[#0f172a] sm:aspect-[16/9]">
                    <Image
                        src={mediaSources.poster}
                        alt="Earlymark dashboard reel poster showing chat, dashboard, inbox, map, and calendar views."
                        fill
                        priority
                        sizes="(max-width: 640px) 100vw, 1120px"
                        className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-500 ${videoReady && !shouldReduceMotion && !videoUnavailable ? "opacity-0" : "opacity-100"}`}
                    />

                    {!shouldReduceMotion ? (
                        <>
                            <video
                                className={`hidden h-full w-full object-cover transition-opacity duration-500 sm:block ${videoReady && !videoUnavailable ? "opacity-100" : "opacity-0"}`}
                                autoPlay
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                poster={mediaSources.poster}
                                aria-label="Looping Earlymark dashboard reel"
                                onCanPlay={() => setVideoReady(true)}
                                onError={() => setVideoUnavailable(true)}
                            >
                                <source src={mediaSources.desktopWebm} type="video/webm" />
                                <source src={mediaSources.desktopMp4} type="video/mp4" />
                            </video>

                            <video
                                className={`h-full w-full object-cover transition-opacity duration-500 sm:hidden ${videoReady && !videoUnavailable ? "opacity-100" : "opacity-0"}`}
                                autoPlay
                                muted
                                loop
                                playsInline
                                preload="metadata"
                                poster={mediaSources.poster}
                                aria-label="Looping Earlymark dashboard reel"
                                onCanPlay={() => setVideoReady(true)}
                                onError={() => setVideoUnavailable(true)}
                            >
                                <source src={mediaSources.mobileMp4} type="video/mp4" />
                            </video>
                        </>
                    ) : null}

                    <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0)_62%,rgba(15,23,42,0.42)_100%)]" />

                    <div className="absolute inset-x-4 bottom-4 flex flex-wrap items-center justify-between gap-3 sm:inset-x-6 sm:bottom-6">
                        <div className="rounded-2xl border border-white/12 bg-slate-950/44 px-4 py-3 text-left text-white shadow-2xl backdrop-blur-xl">
                            <div className="text-[10px] font-semibold uppercase tracking-[0.3em] text-emerald-200/80">
                                Hero reel
                            </div>
                            <div className="mt-1 text-sm font-semibold sm:text-base">
                                Chat to ops flow in one seamless loop
                            </div>
                            <div className="mt-1 text-xs text-white/70 sm:text-sm">
                                Starts in chat, then glides through dashboard, inbox, map, and daily calendar.
                            </div>
                        </div>

                        {(shouldReduceMotion || videoUnavailable) ? (
                            <div className="rounded-full border border-white/14 bg-slate-950/44 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/78 backdrop-blur-xl">
                                Poster fallback active
                            </div>
                        ) : null}
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
