"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileEdit, ShieldCheck, Sparkles, CheckCircle2 } from "lucide-react";

const MODES = [
    {
        id: "draft",
        label: "Draft mode",
        icon: FileEdit,
        tagline: "Tracey prepares everything, you press send.",
        permissions: [
            "Drafts replies, quotes, and follow-ups for your review",
            "Suggests next actions on every job and lead",
            "Never sends a message or moves a job without your tap",
        ],
    },
    {
        id: "approval",
        label: "Approval mode",
        icon: ShieldCheck,
        tagline: "Auto on the routine. Approve the rest.",
        permissions: [
            "Books, reschedules and replies inside your approved playbook",
            "Pings you on WhatsApp for anything outside the rules",
            "Full audit log so you can see every decision Tracey made",
        ],
    },
    {
        id: "auto",
        label: "Full auto",
        icon: Sparkles,
        tagline: "Tracey runs the whole pipeline end-to-end.",
        permissions: [
            "Answers calls, qualifies, books, quotes and follows up — autonomously",
            "Files invoices to Xero and chases payments without prompting",
            "You stay informed with a daily digest and instant alerts on exceptions",
        ],
    },
];

export function AutonomyModeTabs() {
    const [active, setActive] = useState(MODES[1].id);
    const current = MODES.find((m) => m.id === active) ?? MODES[0];

    return (
        <div className="mx-auto w-full max-w-4xl">
            {/* Tab strip */}
            <div role="tablist" aria-label="Autonomy modes" className="flex items-end gap-1.5 px-2">
                {MODES.map((mode) => {
                    const isActive = mode.id === active;
                    const Icon = mode.icon;
                    return (
                        <button
                            key={mode.id}
                            role="tab"
                            aria-selected={isActive}
                            onClick={() => setActive(mode.id)}
                            className={`relative flex items-center gap-2 rounded-t-xl border border-b-0 px-4 py-3 text-sm font-semibold transition-all ${
                                isActive
                                    ? "z-10 -mb-px border-emerald-200 bg-white text-midnight shadow-[0_-4px_12px_rgba(15,23,42,0.05)]"
                                    : "border-transparent bg-emerald-50/60 text-slate-500 hover:bg-emerald-50 hover:text-midnight"
                            }`}
                        >
                            <Icon className={`h-4 w-4 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                            {mode.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab panel */}
            <div role="tabpanel" className="rounded-b-2xl rounded-tr-2xl border border-emerald-200 bg-white p-7 md:p-8 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={current.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col gap-5"
                    >
                        <p className="text-lg font-semibold text-midnight md:text-xl">{current.tagline}</p>
                        <ul className="grid gap-3 md:grid-cols-3">
                            {current.permissions.map((perm) => (
                                <li key={perm} className="flex items-start gap-2.5 rounded-xl bg-emerald-50/40 px-4 py-3 ring-1 ring-emerald-100">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                                    <span className="text-sm leading-relaxed text-slate-700">{perm}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
