"use client";

import { motion } from "framer-motion";
import { Phone, Database, ArrowLeftRight, CheckCircle2, MessageCircle, Mail, MessageSquare } from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const VOICE_POINTS = [
    "Answers every call 24/7",
    "Qualifies leads & books jobs",
    "Sends quotes and follow-ups",
];

const CRM_POINTS = [
    "Auto-logs every call, SMS & email",
    "Live pipeline, jobs & payments",
    "Chat with Tracey in-app or via WhatsApp",
];

const CHANNELS = [
    { label: "Phone calls", icon: Phone },
    { label: "WhatsApp", icon: MessageCircle },
    { label: "SMS", icon: MessageSquare },
    { label: "Email", icon: Mail },
];

export function PlatformDiagram() {
    return (
        <div className="relative mx-auto w-full max-w-5xl">
            <div className="grid items-stretch gap-6 md:grid-cols-[1fr_auto_1fr]">
                {/* Voice Agent */}
                <motion.div
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className="relative flex flex-col gap-4 rounded-2xl border border-emerald-900/10 bg-[linear-gradient(145deg,#103126_0%,#1B4637_52%,#2B5F4D_100%)] p-7 shadow-[0_18px_60px_rgba(15,23,42,0.14)]"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
                            <Phone className="h-5 w-5 text-emerald-300" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Voice Agent</p>
                            <h3 className="text-xl font-bold text-white">Tracey on the phone</h3>
                        </div>
                    </div>
                    <ul className="space-y-2.5">
                        {VOICE_POINTS.map((point) => (
                            <li key={point} className="flex items-start gap-2.5">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                                <span className="text-sm leading-relaxed text-white/80">{point}</span>
                            </li>
                        ))}
                    </ul>
                </motion.div>

                {/* Connector */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
                    className="flex md:flex-col items-center justify-center gap-2"
                    aria-hidden="true"
                >
                    <div className="hidden md:block h-12 w-px bg-gradient-to-b from-transparent via-emerald-300/60 to-emerald-300/60" />
                    <div className="md:hidden h-px flex-1 bg-gradient-to-r from-transparent via-emerald-400/60 to-emerald-400/60" />
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/50 bg-white shadow-[0_8px_24px_rgba(16,185,129,0.25)]">
                        <ArrowLeftRight className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="hidden md:block h-12 w-px bg-gradient-to-b from-emerald-300/60 via-emerald-300/60 to-transparent" />
                    <div className="md:hidden h-px flex-1 bg-gradient-to-r from-emerald-400/60 via-emerald-400/60 to-transparent" />
                </motion.div>

                {/* CRM */}
                <motion.div
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
                    className="relative flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-7 shadow-[0_18px_60px_rgba(15,23,42,0.10)]"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50">
                            <Database className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">CRM</p>
                            <h3 className="text-xl font-bold text-midnight">Your live workspace</h3>
                        </div>
                    </div>
                    <ul className="space-y-2.5">
                        {CRM_POINTS.map((point) => (
                            <li key={point} className="flex items-start gap-2.5">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                <span className="text-sm leading-relaxed text-slate-600">{point}</span>
                            </li>
                        ))}
                    </ul>
                </motion.div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-60px" }}
                transition={{ duration: 0.5, delay: 0.3, ease: EASE }}
                className="mt-10 flex flex-col items-center gap-4"
            >
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Reach Tracey &amp; the CRM on any channel</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                    {CHANNELS.map(({ label, icon: Icon }) => (
                        <span key={label} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-sm font-medium text-slate-700 shadow-sm">
                            <Icon className="h-4 w-4 text-emerald-600" />
                            {label}
                        </span>
                    ))}
                </div>
                <p className="max-w-2xl text-center text-sm text-slate-500">
                    Every conversation flows into your CRM — and back out as the next action. Message Tracey on WhatsApp to update jobs, chase quotes, or pull a customer&apos;s history without opening the app.
                </p>
            </motion.div>
        </div>
    );
}
