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
                    className="relative flex flex-col gap-5 rounded-md bg-[linear-gradient(145deg,#0E2F28_0%,#16433A_55%,#1E5447_100%)] p-7 md:p-8 shadow-[0_18px_50px_-18px_rgba(14,31,26,0.45)]"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-white/10">
                            <Phone className="h-5 w-5 text-mint-500" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">Voice Agent</p>
                            <h3 className="text-xl font-bold text-paper">Your AI voice assistant</h3>
                        </div>
                    </div>
                    <ul className="space-y-2.5">
                        {VOICE_POINTS.map((point) => (
                            <li key={point} className="flex items-start gap-2.5">
                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-mint-500" />
                                <span className="text-sm leading-relaxed text-white/80">{point}</span>
                            </li>
                        ))}
                    </ul>
                    <div className="border-t border-white/10 pt-4 mt-1">
                        <p className="text-xs text-white/50 mb-2.5">Tracey supports every customer channel — calls, texts, your website, email, hipages and more.</p>
                        <div className="flex flex-wrap gap-2">
                            {CHANNELS.map(({ label, icon: Icon }) => (
                                <span key={label} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 border border-white/15 px-3 py-1 text-xs text-white/75">
                                    <Icon className="h-3 w-3 text-mint-500" />
                                    {label}
                                </span>
                            ))}
                        </div>
                    </div>
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
                    <div className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full border border-hair bg-card shadow-[0_10px_28px_-10px_rgba(14,31,26,0.25)]">
                        <ArrowRight className="h-7 w-7 md:h-9 md:w-9 text-forest rotate-90 md:rotate-0" strokeWidth={2} />
                    </div>
                    <div className="flex h-16 w-16 md:h-20 md:w-20 items-center justify-center rounded-full border border-hair bg-card shadow-[0_10px_28px_-10px_rgba(14,31,26,0.25)]">
                        <ArrowLeft className="h-7 w-7 md:h-9 md:w-9 text-forest rotate-90 md:rotate-0" strokeWidth={2} />
                    </div>
                </motion.div>

                {/* CRM */}
                <motion.div
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: "-60px" }}
                    transition={{ duration: 0.6, delay: 0.1, ease: EASE }}
                    className="relative flex flex-col gap-5 rounded-md border border-hair bg-card p-7 md:p-8 shadow-[0_18px_50px_-22px_rgba(14,31,26,0.25)]"
                >
                    <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary-subtle">
                            <Database className="h-5 w-5 text-forest" />
                        </div>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-[0.18em] text-ink2/70">CRM</p>
                            <h3 className="text-xl font-bold text-ink">A CRM that runs itself</h3>
                        </div>
                    </div>
                    <div className="flex items-start gap-2.5 rounded-md bg-primary-subtle/60 px-3.5 py-3 ring-1 ring-mint-100">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                        <span className="text-sm font-semibold leading-relaxed text-ink">Auto-logs every job and customer interaction</span>
                    </div>
                    <div className="flex flex-col gap-2.5">
                        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-ink2/70">Traditional CRM features</p>
                        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                            {CRM_FEATURES.map(({ icon: Icon, label }) => (
                                <div key={label} className="flex items-center gap-2">
                                    <Icon className="h-3.5 w-3.5 shrink-0 text-forest" />
                                    <span className="text-xs leading-snug text-ink2">{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
