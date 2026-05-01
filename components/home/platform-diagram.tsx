"use client";

import { motion } from "framer-motion";
import {
    Phone, Database, ArrowRight, ArrowLeft, CheckCircle2,
    MessageCircle, Mail, MessageSquare,
    Users, Layers, Receipt, Calendar, Inbox, BarChart3, MapPin, ShieldCheck,
} from "lucide-react";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

const VOICE_POINTS = [
    "Answers every call and text 24/7",
    "Qualifies leads & books jobs",
    "Sends quotes and follow-ups",
];

const CRM_FEATURES = [
    { icon: Inbox,       label: "Unified inbox" },
    { icon: Users,       label: "Contacts & companies" },
    { icon: Layers,      label: "Jobs pipeline" },
    { icon: Receipt,     label: "Quotes & Xero invoices" },
    { icon: Calendar,    label: "Scheduling" },
    { icon: MapPin,      label: "Job map" },
    { icon: ShieldCheck, label: "Lead qualification" },
    { icon: BarChart3,   label: "Revenue analytics" },
];

const CHANNELS = [
    { label: "Phone calls", icon: Phone },
    { label: "WhatsApp", icon: MessageCircle },
    { label: "SMS", icon: MessageSquare },
    { label: "Email", icon: Mail },
];

export function PlatformDiagram() {
    return (
        <div className="relative mx-auto w-full max-w-6xl">
            <div className="grid items-stretch gap-6 md:grid-cols-[1fr_auto_1fr]">
                {/* Voice Agent */}
                <motion.div
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, ease: EASE }}
                    className="relative flex flex-col gap-5 rounded-2xl border border-emerald-900/10 bg-[linear-gradient(145deg,#103126_0%,#1B4637_52%,#2B5F4D_100%)] p-7 md:p-8 shadow-[0_18px_60px_rgba(15,23,42,0.14)]"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10">
                            <Phone className="h-5 w-5 text-emerald-300" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Voice Agent</p>
                            <h3 className="text-xl font-bold text-white">Your AI voice assistant</h3>
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

                {/* Connector — large bidirectional arrows */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.85 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.5, delay: 0.2, ease: EASE }}
                    className="flex flex-row md:flex-col items-center justify-center gap-4 py-4 md:py-0"
                    aria-hidden="true"
                >
                    <div className="flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full border-2 border-emerald-200 bg-white shadow-[0_10px_28px_rgba(16,185,129,0.30)]">
                        <ArrowRight className="h-9 w-9 md:h-11 md:w-11 text-emerald-600 rotate-90 md:rotate-0" strokeWidth={2.5} />
                    </div>
                    <div className="flex h-20 w-20 md:h-24 md:w-24 items-center justify-center rounded-full border-2 border-emerald-200 bg-white shadow-[0_10px_28px_rgba(16,185,129,0.30)]">
                        <ArrowLeft className="h-9 w-9 md:h-11 md:w-11 text-emerald-600 rotate-90 md:rotate-0" strokeWidth={2.5} />
                    </div>
                </motion.div>

                {/* CRM */}
                <motion.div
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
                    className="relative flex flex-col gap-5 rounded-2xl border border-slate-200 bg-white p-7 md:p-8 shadow-[0_18px_60px_rgba(15,23,42,0.10)]"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50">
                            <Database className="h-5 w-5 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">CRM</p>
                            <h3 className="text-xl font-bold text-midnight">A CRM that runs itself</h3>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50/60 px-3.5 py-3 ring-1 ring-emerald-100">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <span className="text-sm font-semibold leading-relaxed text-midnight">Auto-logs every job and customer interaction</span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Traditional CRM features</p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                            {CRM_FEATURES.map(({ icon: Icon, label }) => (
                                <div key={label} className="flex items-center gap-2">
                                    <Icon className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                    <span className="text-xs leading-snug text-slate-600">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
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
            </motion.div>
        </div>
    );
}
