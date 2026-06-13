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
                                    ? "z-10 -mb-px border-hair bg-card text-ink shadow-[0_-4px_12px_rgba(14,31,26,0.05)]"
                                    : "border-transparent bg-white/40 text-ink2/70 hover:bg-white/70 hover:text-ink"
                            }`}
                        >
                            <Icon className={`h-4 w-4 ${isActive ? "text-forest" : "text-ink2/60"}`} />
                            {mode.label}
                        </button>
                    );
                })}
            </div>

            {/* Tab panel */}
            <div role="tabpanel" className="rounded-b-2xl rounded-tr-2xl border border-hair bg-card p-7 md:p-8 shadow-[0_18px_50px_-22px_rgba(14,31,26,0.22)]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={current.id}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -4 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col gap-5"
                    >
                        <p className="text-lg font-semibold text-ink md:text-xl">{current.tagline}</p>
                        <ul className="grid gap-3 md:grid-cols-3">
                            {current.permissions.map((perm) => (
                                <li key={perm} className="flex items-start gap-2.5 rounded-md bg-paper px-4 py-3 ring-1 ring-hair">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                                    <span className="text-sm leading-relaxed text-ink">{perm}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
