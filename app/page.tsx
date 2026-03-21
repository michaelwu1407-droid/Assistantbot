"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowRight, ChevronLeft, ChevronRight, ChevronDown,
    Phone, MessageSquare, Calendar, MapPin, Users,
    BarChart3, Bot, ToggleRight, ToggleLeft, Mail, CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { requestDemoCall } from "@/actions/demo-call-action";
import { EARLYMARK_SALES_PILLARS } from "@/livekit-agent/earlymark-sales-brief";

const HeroDashboardReel = dynamic(
    () => import("@/components/home/hero-dashboard-reel").then((mod) => mod.HeroDashboardReel),
    {
        loading: () => (
            <div className="relative mx-auto w-full max-w-[1120px] overflow-hidden rounded border border-white/55 bg-white/55 shadow-[0_28px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl">
                <div className="aspect-[16/10] bg-[linear-gradient(180deg,#e2e8f0_0%,#cbd5e1_100%)] sm:aspect-[16/9]" />
            </div>
        ),
    },
);

// ─── Animation helpers ────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-60px" },
    transition: { duration: 0.6, delay, ease: EASE_STANDARD },
});

const EASE_STANDARD: [number, number, number, number] = [0.16, 1, 0.3, 1];

// ─── Static data ──────────────────────────────────────────────────────────────

const OLD_WAY = [
    { icon: "📞", label: "Customer calls" },
    { icon: "⏸️", label: "Pause what you're doing, play phone tag, miss out" },
    { icon: "📖", label: "Waste time explaining services & availability" },
    { icon: "📅", label: "Manually find time and book the job" },
    { icon: "🔧", label: "Get on the tools" },
    { icon: "💸", label: "Chase payment and risk a bad review" },
];

const TRACEY_WAY = [
    { icon: "📞", label: "Customer calls" },
    { icon: "🤖", label: "Tracey picks up 24/7, secures and logs the job" },
    { icon: "🔧", label: "Get on the tools" },
    { icon: "💰", label: "Get paid: collect instantly or Tracey follows up + asks for a kind review" },
];

const HIRE_FEATURES = [
    {
        title: EARLYMARK_SALES_PILLARS[0]?.title || "Never miss a job again",
        desc: EARLYMARK_SALES_PILLARS[0]?.description || "With 24/7 availability, Tracey will contact the lead for you instantaneously. Oh.... and did we mention she's multilingual?",
        eyebrow: "Lead capture",
        bullets: ["Answers every call, day or night", "Logs the job straight to your CRM", "Sends quotes automatically"],
    },
    {
        title: EARLYMARK_SALES_PILLARS[1]?.title || "No more admin. Chat with your CRM.",
        desc: EARLYMARK_SALES_PILLARS[1]?.description || "No more fiddling with complex CRMs — just tell Tracey what you want and she'll run it for you.",
        eyebrow: "Operations",
        bullets: ["Chat to update any job in seconds", "Query revenue, pipeline, or schedule", "No forms, no manual data entry"],
    },
    {
        title: EARLYMARK_SALES_PILLARS[2]?.title || "AI that actually works",
        desc: EARLYMARK_SALES_PILLARS[2]?.description || "AI that handles convos like a human. Tracey learns your preferences and delivers a better and simpler experience.",
        eyebrow: "Customer experience",
        bullets: ["Replies to texts and emails instantly", "Follows up on unpaid quotes", "Handles objections and rebooking"],
    },
    {
        title: EARLYMARK_SALES_PILLARS[3]?.title || "Total control",
        desc: EARLYMARK_SALES_PILLARS[3]?.description || "You decide how much autonomy Tracey has. Set approval rules, customize responses, and maintain full oversight of every customer interaction.",
        eyebrow: "Oversight",
        bullets: ["Set approval rules for quotes", "Review every conversation", "Adjust Tracey&apos;s behaviour anytime"],
    },
];

const FEATURE_CARDS = [
    {
        icon: Phone,
        title: "AI Customer Communication",
        desc: "Calls, texts, and emails — Tracey handles conversations across every channel, 24/7.",
    },
    {
        icon: MessageSquare,
        title: "Automated CRM Management",
        desc: "Tell Tracey what you need. She logs jobs, moves deals, and keeps your pipeline moving — no manual entry.",
    },
    {
        icon: Calendar,
        title: "Smart Scheduling",
        desc: "Tracey checks your calendar and books jobs into the right slots, avoiding double-ups and dead time.",
    },
    {
        icon: MapPin,
        title: "Job Map & Route Optimisation",
        desc: "See all your jobs on a live map and get smarter routes so you spend less time driving between sites.",
    },
    {
        icon: Users,
        title: "Team Management",
        desc: "Assign jobs, track your crew, and keep everyone aligned — all through simple chat commands.",
    },
    {
        icon: BarChart3,
        title: "Revenue Analytics",
        desc: "Track earnings, job counts, and close rates at a glance. Know exactly how your business is performing.",
    },
];

const CHAT_DEMO = [
    {
        user: "Move the Henderson job to complete",
        agent: "✅ Done — Henderson Plumbing is now Completed.",
    },
    {
        user: "Call Sarah Johnson and get the quote approved",
        agent: "📞 Calling Sarah Johnson... She confirmed the $1,850 quote. Booked for Thursday 9am! 🎉",
    },
    {
        user: "What's my revenue this month?",
        agent: "📊 February: $14,280 across 9 completed jobs — up 22% on January. Great month! 🚀",
    },
];

// ─── Chat Demo ────────────────────────────────────────────────────────────────

function ChatDemo() {
    const [step, setStep] = useState(0);
    const [phase, setPhase] = useState<"idle" | "user" | "typing" | "agent">("idle");

    useEffect(() => {
        const t1 = setTimeout(() => setPhase("user"), 400);
        const t2 = setTimeout(() => setPhase("typing"), 1300);
        const t3 = setTimeout(() => setPhase("agent"), 2700);
        const t4 = setTimeout(() => setStep((s) => (s + 1) % CHAT_DEMO.length), 5400);
        return () => [t1, t2, t3, t4].forEach(clearTimeout);
    }, [step]);

    const current = CHAT_DEMO[step];

    return (
        <div className="rounded overflow-hidden shadow-2xl bg-white border border-neutral-200 select-none">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-neutral-200 bg-neutral-50">
                <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-400/60 block" />
                    <span className="w-3 h-3 rounded-full bg-yellow-400/60 block" />
                    <span className="w-3 h-3 rounded-full bg-green-400/60 block" />
                </div>
                <div className="flex-1 flex justify-center">
                    <div className="bg-neutral-200/60 rounded px-4 py-1 text-[11px] text-neutral-500 font-medium tracking-wide">
                        earlymark.ai/dashboard — Tracey Chat
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="px-6 py-8 min-h-[260px] flex flex-col justify-end gap-4 bg-[#F8FAFC]">
                <AnimatePresence mode="wait">
                    {phase !== "idle" && (
                        <motion.div
                            key={`user-${step}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="flex justify-end"
                        >
                            <div className="bg-primary text-white rounded rounded-tr-sm px-4 py-2.5 text-sm max-w-[80%] shadow leading-relaxed">
                                {current.user}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {phase === "typing" && (
                        <motion.div
                            key={`typing-${step}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="flex items-end gap-2"
                        >
                            <div className="w-7 h-7 rounded-full bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-sm">
                                <Image src="/latest-logo.png" alt="" width={16} height={16} className="w-4 h-4 object-contain" unoptimized />
                            </div>
                            <div className="bg-white border border-neutral-200 rounded rounded-bl-sm px-4 py-3 flex gap-1.5 items-center shadow-sm">
                                {[0, 0.18, 0.36].map((d, i) => (
                                    <motion.span
                                        key={i}
                                        className="w-2 h-2 rounded-full bg-neutral-300 block"
                                        animate={{ y: [0, -6, 0] }}
                                        transition={{ repeat: Infinity, duration: 0.65, delay: d }}
                                    />
                                ))}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                    {phase === "agent" && (
                        <motion.div
                            key={`agent-${step}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.35 }}
                            className="flex items-end gap-2"
                        >
                            <div className="w-7 h-7 rounded-full bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-sm">
                                <Image src="/latest-logo.png" alt="" width={16} height={16} className="w-4 h-4 object-contain" unoptimized />
                            </div>
                            <div className="bg-white border border-neutral-200 text-neutral-800 rounded rounded-bl-sm px-4 py-2.5 text-sm max-w-[80%] leading-relaxed shadow-sm">
                                {current.agent}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Step dots */}
            <div className="flex justify-center gap-2 pb-5 pt-3 bg-white border-t border-neutral-100">
                {CHAT_DEMO.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setStep(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-5 bg-primary" : "w-1.5 bg-neutral-300"}`}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Feature Carousel ─────────────────────────────────────────────────────────

// ── Inline product mockups for Hire Tracey section ───────────────────────────

function HireMockup0() {
    // Lead capture — mini kanban "New request" column
    const cards = [
        { title: "Hot water replacement", client: "Mrs Henderson", value: "$1,400", time: "Just now" },
        { title: "Bathroom renovation", client: "T. Nguyen", value: "$8,200", time: "12m ago" },
        { title: "Fence repair quote", client: "B. Clarke", value: "$2,400", time: "1h ago" },
    ];
    return (
        <div className="h-full flex flex-col bg-[#F8FAFC] p-4 gap-3">
            <div className="flex items-center gap-2 mb-1">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                <span className="text-xs font-bold text-slate-800">New requests</span>
                <span className="ml-auto text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">{cards.length} new</span>
            </div>
            {cards.map((c, i) => (
                <div key={i} className="bg-white rounded border border-neutral-200 border-l-4 border-l-blue-500 px-4 py-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{c.title}</p>
                            <p className="text-xs text-slate-500 mt-0.5">{c.client}</p>
                        </div>
                        <div className="shrink-0 text-right">
                            <p className="text-sm font-bold text-blue-600">{c.value}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{c.time}</p>
                        </div>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5">
                        <Image src="/latest-logo.png" alt="" width={12} height={12} className="w-3 h-3 object-contain" unoptimized />
                        <span className="text-[10px] text-emerald-600 font-medium">Tracey answered · logged to CRM</span>
                    </div>
                </div>
            ))}
        </div>
    );
}

function HireMockup1() {
    // Operations — chat with CRM
    const messages = [
        { from: "user", text: "Schedule the Smith job for Friday" },
        { from: "tracey", text: "Done! Scheduled for Friday 9am. Confirmation SMS sent to Sarah Smith. ✅" },
        { from: "user", text: "What's my revenue this week?" },
        { from: "tracey", text: "$8,450 across 4 completed jobs. Up 12% vs last week 📈" },
    ];
    return (
        <div className="h-full flex flex-col bg-white">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-neutral-200">
                <div className="w-6 h-6 rounded-full bg-white border border-neutral-200 flex items-center justify-center shadow-sm">
                    <Image src="/latest-logo.png" alt="" width={14} height={14} className="w-3.5 h-3.5 object-contain" unoptimized />
                </div>
                <span className="text-xs font-semibold text-neutral-900">Tracey Chat</span>
                <span className="ml-auto text-[10px] text-emerald-500">● Online</span>
            </div>
            <div className="flex-1 flex flex-col justify-end gap-2.5 px-4 py-4 bg-[#F8FAFC]">
                {messages.map((m, i) => (
                    <div key={i} className={`flex gap-2 items-end ${m.from === "user" ? "flex-row-reverse" : ""}`}>
                        {m.from === "tracey" && (
                            <div className="w-5 h-5 rounded-full bg-white border border-neutral-200 flex items-center justify-center shrink-0 shadow-sm">
                                <Image src="/latest-logo.png" alt="" width={12} height={12} className="w-3 h-3 object-contain" unoptimized />
                            </div>
                        )}
                        <div className={`rounded px-3 py-2 text-xs leading-relaxed max-w-[80%] ${m.from === "user" ? "bg-primary text-white rounded-tr-sm" : "bg-white border border-neutral-200 text-neutral-800 rounded-bl-sm shadow-sm"}`}>
                            {m.text}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

function HireMockup2() {
    // Customer experience — inbox feed
    const items = [
        { icon: Phone, color: "#3B82F6", bg: "#EFF6FF", label: "Tracey answered call", detail: "Kitchen reno · Mrs Wilson · $4,200", badge: "Booked" },
        { icon: MessageSquare, color: "#00D28B", bg: "#E0FAF2", label: "SMS follow-up sent", detail: "Deck build · J. Morrison — awaiting reply", badge: "Sent" },
        { icon: Mail, color: "#8B5CF6", bg: "#F5F3FF", label: "Quote emailed", detail: "Hot water · Henderson · $1,400", badge: "Delivered" },
        { icon: CheckCircle2, color: "#6B7280", bg: "#F3F4F6", label: "Payment reminder sent", detail: "Fence repair · B. Clarke · $2,400", badge: "Chasing" },
    ];
    return (
        <div className="h-full flex flex-col bg-white">
            <div className="px-4 py-3 border-b border-neutral-200 flex items-center justify-between">
                <div>
                    <p className="text-xs font-bold text-neutral-900">Customer Inbox</p>
                    <p className="text-[10px] text-neutral-500">Tracey-handled interactions</p>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">Live</span>
            </div>
            <div className="flex-1 flex flex-col divide-y divide-neutral-100">
                {items.map((item, i) => {
                    const Icon = item.icon;
                    return (
                        <div key={i} className="flex items-start gap-3 px-4 py-3">
                            <div className="w-8 h-8 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: item.bg }}>
                                <Icon className="w-4 h-4" style={{ color: item.color }} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-neutral-800">{item.label}</p>
                                <p className="text-[10px] text-neutral-500 truncate mt-0.5">{item.detail}</p>
                            </div>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ color: item.color, backgroundColor: item.bg }}>
                                {item.badge}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function HireMockup3() {
    // Oversight — settings panel
    const settings = [
        { label: "Auto-respond to incoming calls", on: true },
        { label: "Require approval for quotes", on: true },
        { label: "Send payment follow-up reminders", on: true },
        { label: "Auto-close stale jobs after 30 days", on: false },
    ];
    return (
        <div className="h-full flex flex-col bg-[#F8FAFC] p-4 gap-3">
            <div className="mb-1">
                <p className="text-xs font-bold text-slate-800">Tracey permissions</p>
                <p className="text-[10px] text-slate-500 mt-0.5">Control exactly what Tracey can do</p>
            </div>
            {settings.map((s, i) => (
                <div key={i} className="flex items-center justify-between bg-white border border-neutral-200 rounded px-4 py-3 shadow-sm">
                    <span className="text-xs font-medium text-slate-700 pr-4">{s.label}</span>
                    <div className={`w-10 h-5 rounded-full flex items-center px-0.5 shrink-0 transition-colors ${s.on ? "bg-emerald-500 justify-end" : "bg-neutral-300 justify-start"}`}>
                        <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                    </div>
                </div>
            ))}
            <div className="mt-1 flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded px-4 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span className="text-[11px] text-emerald-700 font-medium">All changes synced to Tracey instantly</span>
            </div>
        </div>
    );
}

const HIRE_MOCKUPS = [HireMockup0, HireMockup1, HireMockup2, HireMockup3];

function HireFeatureGrid() {
    return (
        <div className="mt-4 flex flex-col gap-20">
            {HIRE_FEATURES.map((feature, i) => {
                const isEven = i % 2 === 0;
                const Mockup = HIRE_MOCKUPS[i];

                return (
                    <motion.div
                        key={feature.title}
                        {...fadeUp(i * 0.08)}
                        className="grid items-center gap-8 md:grid-cols-2"
                    >
                        <div className={`flex flex-col gap-4 ${!isEven ? "md:order-2" : "md:order-1"}`}>
                            <h3 className="text-2xl md:text-3xl font-bold leading-snug text-midnight">{feature.title}</h3>
                            <p className="text-base leading-relaxed text-slate-body">{feature.desc}</p>
                            <ul className="flex flex-col gap-2 mt-1">
                                {feature.bullets.map((b) => (
                                    <li key={b} className="flex items-center gap-2.5 text-sm text-slate-body">
                                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                        <span dangerouslySetInnerHTML={{ __html: b }} />
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className={`relative min-h-[380px] overflow-hidden rounded border border-slate-200 shadow-[0_8px_40px_rgba(15,23,42,0.10)] ${!isEven ? "md:order-1" : "md:order-2"}`}>
                            {Mockup && <Mockup />}
                        </div>
                    </motion.div>
                );
            })}
        </div>
    );
}

function FeatureCarousel() {
    const [idx, setIdx] = useState(0);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const resetTimer = useCallback(() => {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
            setIdx((i) => (i + 1) % FEATURE_CARDS.length);
        }, 4000);
    }, []);

    useEffect(() => {
        resetTimer();
        return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }, [resetTimer]);

    const go = (dir: 1 | -1) => {
        setIdx((i) => (i + dir + FEATURE_CARDS.length) % FEATURE_CARDS.length);
        resetTimer();
    };

    const visible = [
        FEATURE_CARDS[(idx + FEATURE_CARDS.length - 1) % FEATURE_CARDS.length],
        FEATURE_CARDS[idx],
        FEATURE_CARDS[(idx + 1) % FEATURE_CARDS.length],
    ];

    return (
        <div className="flex flex-col items-center gap-8">
            <div className="relative w-full">
                <button
                    onClick={() => go(-1)}
                    className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-5 z-10 w-10 h-10 rounded-full bg-white border border-border shadow-md flex items-center justify-center hover:bg-secondary transition-colors"
                >
                    <ChevronLeft className="w-5 h-5 text-midnight" />
                </button>

                <div className="flex md:grid md:grid-cols-3 gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-4 md:pb-0">
                    {visible.map((feature, i) => {
                        const Icon = feature.icon;
                        const isCentre = i === 1;
                        return (
                            <motion.div
                                key={feature.title}
                                layout
                                animate={{ opacity: isCentre ? 1 : 0.5, scale: isCentre ? 1 : 0.97 }}
                                transition={{ duration: 0.4, ease: EASE_STANDARD }}
                                className={`rounded p-7 flex flex-col gap-4 shrink-0 w-[85vw] md:w-auto snap-center bg-white border ${isCentre ? "border-primary/25 shadow-lg" : "border-border"}`}
                            >
                                <div className="w-12 h-12 rounded flex items-center justify-center bg-mint-50">
                                    <Icon className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg leading-snug text-midnight">
                                        {feature.title}
                                    </h3>
                                    <p className="text-sm mt-2 leading-relaxed text-slate-body">
                                        {feature.desc}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                <button
                    onClick={() => go(1)}
                    className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-5 z-10 w-10 h-10 rounded-full bg-white border border-border shadow-md flex items-center justify-center hover:bg-secondary transition-colors"
                >
                    <ChevronRight className="w-5 h-5 text-midnight" />
                </button>
            </div>

            <div className="flex gap-2">
                {FEATURE_CARDS.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => { setIdx(i); resetTimer(); }}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === idx ? "w-6 bg-primary" : "w-1.5 bg-border"}`}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Interview Form ───────────────────────────────────────────────────────────

const INPUT_CLASS =
    "w-full px-4 py-2.5 rounded border border-border text-sm text-midnight placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white transition";

function InterviewForm() {
    const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", businessName: "" });
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus("loading");
        const result = await requestDemoCall(form);
        if (result.success) {
            setStatus("success");
            setMessage(result.message);
        } else {
            setStatus("error");
            setMessage(result.error);
        }
    };

    if (status === "success") {
        return (
            <div className="flex flex-col items-center justify-center text-center gap-4 py-10">
                <div className="w-16 h-16 rounded-full bg-primary/15 flex items-center justify-center">
                    <Phone className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-midnight">Tracey is calling you now!</h3>
                <p className="text-slate-body text-sm max-w-xs leading-relaxed">
                    {message} She&apos;ll introduce herself and show you exactly what she can do for your business.
                </p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
                <input
                    required type="text" placeholder="First name"
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    className={INPUT_CLASS}
                />
                <input
                    required type="text" placeholder="Last name"
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    className={INPUT_CLASS}
                />
            </div>
            <input
                required type="tel" placeholder="Phone number"
                value={form.phone}
                onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={INPUT_CLASS}
            />
            <input
                required type="email" placeholder="Email address"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={INPUT_CLASS}
            />
            <input
                required type="text" placeholder="Business name"
                value={form.businessName}
                onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                className={INPUT_CLASS}
            />
            {status === "error" && (
                <p className="text-red-500 text-xs">{message}</p>
            )}
            <Button
                type="submit"
                variant="mint"
                className="w-full mt-1"
                disabled={status === "loading"}
            >
                {status === "loading" ? "Calling you now..." : "Interview Tracey for free"}
                {status !== "loading" && <Phone className="ml-2 h-4 w-4" />}
            </Button>
            <p className="text-xs text-slate-body text-center">
                Tracey will call you within seconds. No credit card required.
            </p>
        </form>
    );
}

// ─── Process Flow ─────────────────────────────────────────────────────────────

function ProcessFlow({ steps, variant }: { steps: typeof OLD_WAY; variant: "old" | "tracey" }) {
    const isOld = variant === "old";
    return (
        <div className="flex flex-wrap gap-2 items-center">
            {steps.map((step, i) => (
                <div key={i} className="flex items-center gap-2">
                    <div className={`flex items-center gap-2 px-3 py-2 rounded text-xs font-medium leading-snug ${isOld
                        ? "bg-red-50 text-red-700 border border-red-100"
                        : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                        }`}>
                        <span className="text-sm">{step.icon}</span>
                        <span>{step.label}</span>
                    </div>
                    {i < steps.length - 1 && (
                        <ArrowRight className={`w-3.5 h-3.5 shrink-0 ${isOld ? "text-red-300" : "text-primary"}`} />
                    )}
                </div>
            ))}
        </div>
    );
}

// ─── Testimonials Section ─────────────────────────────────────────────────────

const TESTIMONIALS = [
    {
        quote: "Tracey booked three jobs for me while I was driving between sites yesterday. It pays for itself immediately.",
        author: "Mark S.",
        role: "Plumbing Contractor",
    },
    {
        quote: "I used to spend 2 hours every evening just following up on quotes and responding to emails. Now I just go home.",
        author: "Sarah J.",
        role: "Electrical Services",
    },
    {
        quote: "Clients constantly tell me how professional my 'new receptionist' is. They have no idea it's AI.",
        author: "Dave W.",
        role: "Landscaping & Design",
    },
    {
        quote: "Best investment I've made in the business. It stopped me from losing jobs to the guys who answer their phones faster.",
        author: "Tom H.",
        role: "HVAC Specialist",
    }
];

function TestimonialsCarousel() {
    return (
        <div className="w-full flex overflow-x-auto snap-x snap-mandatory gap-6 pb-8 hide-scrollbar">
            {TESTIMONIALS.map((t, i) => (
                <div key={i} className="shrink-0 w-[85vw] md:w-[350px] snap-center bg-white rounded p-8 shadow-sm border border-border flex flex-col justify-between">
                    <div>
                        <div className="flex gap-1 mb-4">
                            {[1, 2, 3, 4, 5].map(star => (
                                <svg key={star} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                </svg>
                            ))}
                        </div>
                        <p className="text-midnight/80 italic text-[15px] leading-relaxed mb-6">&quot;{t.quote}&quot;</p>
                    </div>
                    <div>
                        <p className="font-bold text-midnight text-sm">{t.author}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{t.role}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ─── FAQ Section ──────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
    { q: "What is Tracey?", a: "Tracey is your AI-powered receptionist, CRM manager, and follow-up specialist built for trade and service businesses. She answers every inbound call 24/7, logs jobs, sends quotes, chases payments, and keeps your pipeline moving — all without you lifting a finger. Think of her as a full-time admin assistant who never sleeps and never misses a message." },
    { q: "How does Tracey answer my calls?", a: "Your business number simply forwards to Tracey when you're unavailable — or always, if you prefer. She answers professionally in your business name, gathers job details, answers common questions about your services and pricing, and logs everything straight into your CRM. She can also provide quotes and book appointments on the spot, based on the rules and availability you've set." },
    { q: "How long does it take to get set up?", a: "Most businesses are live within a day. When you sign up, Tracey interviews you about your business — your services, pricing, availability, and preferences — in a natural conversation. No forms to fill in, no spreadsheets. Once that's done, she's ready to start answering calls and managing your pipeline." },
    { q: "What types of businesses does Earlymark support?", a: "Earlymark is built for any trade or service business — plumbers, electricians, builders, landscapers, cleaners, HVAC technicians, pest controllers, locksmiths, painters, and more. If you're running jobs and need someone to handle the phones and admin, Tracey can help." },
    { q: "Can I control what Tracey does and says?", a: "Absolutely. You're in full control. Set approval rules so Tracey asks before confirming a quote above a certain value. Customise how she introduces herself, what she says about your services, and when she escalates to you. You can review every conversation in your inbox and override anything at any time. Tracey works within the guardrails you set." },
    { q: "Do I need to be tech-savvy to use Earlymark?", a: "Not at all. Earlymark is designed for busy tradies and business owners, not software engineers. You talk to Tracey in plain English — just like texting — and she handles the rest. There's no complex setup, no spreadsheets to fill in, and no training required. If you can send a text message, you can run Earlymark." },
    { q: "How much does Earlymark cost?", a: "Earlymark Pro is $149/month, or $124/month if billed annually. This covers everything — AI calls, SMS, CRM, scheduling, and your dedicated AU mobile number. Visit our pricing page for a full breakdown." },
];

function FaqSection() {
    const [openIndices, setOpenIndices] = useState<number[]>([]);

    const toggle = (idx: number) => {
        setOpenIndices((prev) =>
            prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
        );
    };

    return (
        <section className="py-20 px-4 bg-white">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold text-center text-midnight mb-10">
                    Frequently Asked Questions
                </h2>
                <div className="space-y-3">
                    {FAQ_ITEMS.map((item, idx) => {
                        const isOpen = openIndices.includes(idx);
                        return (
                            <div key={idx} className="border border-border rounded overflow-hidden">
                                <button
                                    onClick={() => toggle(idx)}
                                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
                                >
                                    <span className="font-semibold text-midnight text-sm pr-4">{item.q}</span>
                                    <ChevronDown
                                        className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                                    />
                                </button>
                                <div
                                    className={`transition-all duration-200 overflow-hidden ${isOpen ? "max-h-60" : "max-h-0"}`}
                                >
                                    <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">
                                        {item.a}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Home() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* ── B. Hero ── */}
            <section className="pt-32 pb-24 px-6 relative overflow-hidden isolate bg-[linear-gradient(180deg,#F5F7F8_0%,#F4F7F5_55%,#F7F6F3_100%)]">
                {/* Reference-style ambient field in green palette */}
                <div
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{
                        background: `
                          radial-gradient(110% 70% at 50% 10%, rgba(16,185,129,0.20) 0%, rgba(16,185,129,0.10) 42%, rgba(16,185,129,0.00) 74%),
                          radial-gradient(90% 50% at 50% 86%, rgba(34,197,94,0.30) 0%, rgba(34,197,94,0.14) 32%, rgba(34,197,94,0.00) 72%),
                          radial-gradient(70% 34% at 50% 86%, rgba(163,230,53,0.22) 0%, rgba(163,230,53,0.00) 75%)
                        `,
                    }}
                />
                <div
                    className="absolute inset-y-[2%] left-0 w-[32%] z-0 pointer-events-none opacity-60"
                    style={{
                        background: "linear-gradient(180deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.05) 48%, rgba(16,185,129,0.00) 100%)",
                        clipPath: "polygon(0 0, 100% 6%, 76% 100%, 0 100%)",
                    }}
                />
                <div
                    className="absolute inset-y-[2%] right-0 w-[32%] z-0 pointer-events-none opacity-60"
                    style={{
                        background: "linear-gradient(180deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.05) 48%, rgba(16,185,129,0.00) 100%)",
                        clipPath: "polygon(24% 0, 100% 0, 100% 100%, 0 100%)",
                    }}
                />

                <div className="container mx-auto max-w-4xl text-center flex flex-col items-center gap-8 relative z-10">

                    <motion.h1
                        {...fadeUp(0.06)}
                        className="text-5xl md:text-7xl font-extrabold tracking-[-0.04em] leading-[1.08] text-midnight text-balance"
                    >
                        Your AI assistant & CRM — here to give you an{" "}
                        <span className="text-primary">early mark</span>
                    </motion.h1>

                    {/* CTA buttons — moved above screenshot */}
                    <motion.div {...fadeUp(0.10)} className="flex flex-col sm:flex-row gap-3">
                        <Link href="/auth">
                            <Button size="lg" variant="mint">
                                Get started
                            </Button>
                        </Link>
                        <Link href="#interview-assistant">
                            <Button size="lg" variant="outline">
                                Interview your assistant
                            </Button>
                        </Link>
                    </motion.div>

                    {/* Dashboard hero reel */}
                    <motion.div {...fadeUp(0.14)} className="w-full max-w-5xl mx-auto">
                        <HeroDashboardReel />
                        {false ? <div className="rounded overflow-hidden shadow-2xl border border-white/20">
                            {/* Browser chrome */}
                            <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-200 border-b border-slate-300">
                                <div className="flex gap-1.5">
                                    <span className="w-3 h-3 rounded-full bg-red-400 block" />
                                    <span className="w-3 h-3 rounded-full bg-yellow-400 block" />
                                    <span className="w-3 h-3 rounded-full bg-green-400 block" />
                                </div>
                                <div className="flex-1 flex justify-center">
                                    <div className="bg-white rounded px-4 py-1 text-[11px] text-slate-400 font-medium">
                                        earlymark.ai/dashboard
                                    </div>
                                </div>
                            </div>
                            {/* Fake kanban */}
                            <div className="bg-white p-4 flex gap-3 overflow-hidden">
                                {[{ title: "New request", color: "bg-blue-400", cards: ["Kitchen reno — $4,200", "Bathroom leak — $850"] }, { title: "Scheduled", color: "bg-emerald-400", cards: ["Deck build — $6,100", "Hot water install — $1,900"] }, { title: "Completed", color: "bg-violet-400", cards: ["Fence repair — $2,400"] }].map((col) => (
                                    <div key={col.title} className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`w-2.5 h-2.5 rounded-full ${col.color}`} />
                                            <span className="text-xs font-semibold text-slate-700 truncate">{col.title}</span>
                                            <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded-full">{col.cards.length}</span>
                                        </div>
                                        <div className="space-y-2">
                                            {col.cards.map((card) => (
                                                <div key={card} className="bg-slate-50 border border-slate-200 rounded px-3 py-2 text-xs text-slate-600 truncate">{card}</div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div> : null}
                    </motion.div>

                    {/* Value Props — gradient glass cards (no icons) */}
                    <motion.div {...fadeUp(0.18)} className="w-full max-w-[1200px] mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="rounded-[18px] bg-[#E0FAF2] border border-primary/20 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <h3 className="text-lg font-semibold text-slate-900">Win more customers</h3>
                                <p className="text-sm text-slate-600 mt-2">Tracey answers every call, follows up every lead, and books jobs — so you never miss an opportunity.</p>
                            </div>
                            <div className="rounded-[18px] bg-[#E0FAF2] border border-primary/20 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <h3 className="text-lg font-semibold text-slate-900">Automate customer admin</h3>
                                <p className="text-sm text-slate-600 mt-2">No more fiddling with complex CRMs — just tell Tracey what you want and she runs it for you.</p>
                            </div>
                            <div className="rounded-[18px] bg-[#E0FAF2] border border-primary/20 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                                <h3 className="text-lg font-semibold text-slate-900">Provide a more reliable customer experience</h3>
                                <p className="text-sm text-slate-600 mt-2">Provide a professional, consistent experience across every channel — calls, texts, and emails.</p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section >

            {/* ── C. Meet Tracey ── */}
            < section id="meet-tracey" className="py-24 px-6 bg-[#F8FAFC]" >
                <div className="container mx-auto max-w-7xl">
                    <motion.div {...fadeUp()} className="text-center mb-14">
                        <h2 className="text-4xl md:text-5xl font-extrabold text-midnight tracking-[-0.03em]">
                            Meet Tracey
                        </h2>
                        <p className="text-slate-body mt-3 text-lg max-w-xl mx-auto">
                            Your AI receptionist, CRM manager, and follow-up specialist — all in one.
                        </p>
                    </motion.div>

                    <motion.div
                        {...fadeUp(0.06)}
                        className="max-w-6xl mx-auto rounded overflow-hidden border border-border shadow-sm bg-white grid md:grid-cols-2"
                    >
                        <div className="p-8 md:p-10 border-b md:border-b-0 md:border-r border-border bg-[#FAF7F8]">
                            <h3 className="text-2xl font-bold text-rose-600 mb-6">The old way</h3>

                            <div className="space-y-6 text-left">
                                <div>
                                    <h4 className="font-bold text-midnight mb-2">Customer calls</h4>
                                    <ul className="space-y-2 text-slate-body">
                                        <li className="flex gap-2"><span className="text-rose-500 font-semibold">×</span><span>Pause what you&apos;re doing, play phone tag, miss out</span></li>
                                        <li className="flex gap-2"><span className="text-rose-500 font-semibold">×</span><span>Waste time explaining services and prices</span></li>
                                        <li className="flex gap-2"><span className="text-rose-500 font-semibold">×</span><span>Manually find time and book the job</span></li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-midnight mb-2">Get on the tools</h4>
                                    <ul className="space-y-2 text-slate-body">
                                        <li className="flex gap-2"><span className="text-rose-500 font-semibold">×</span><span>Constantly interrupted by new leads</span></li>
                                        <li className="flex gap-2"><span className="text-rose-500 font-semibold">×</span><span>Miss out on revenue for missed calls</span></li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-midnight mb-2">After the job</h4>
                                    <ul className="space-y-2 text-slate-body">
                                        <li className="flex gap-2"><span className="text-rose-500 font-semibold">×</span><span>Chase payment or forget</span></li>
                                        <li className="flex gap-2"><span className="text-rose-500 font-semibold">×</span><span>Risk a bad review while you&apos;re at it</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 md:p-10 bg-[#EEF3FF]">
                            <h3 className="text-2xl font-bold text-primary mb-6">Tracey does it for you</h3>

                            <div className="space-y-6 text-left">
                                <div>
                                    <h4 className="font-bold text-midnight mb-2">Customer calls</h4>
                                    <ul className="space-y-2 text-slate-body">
                                        <li className="flex gap-2"><span className="text-primary font-semibold">✓</span><span>Tracey picks up 24/7</span></li>
                                        <li className="flex gap-2"><span className="text-primary font-semibold">✓</span><span>Tracey shares the info you&apos;ve taught it</span></li>
                                        <li className="flex gap-2"><span className="text-primary font-semibold">✓</span><span>Tracey books the job for you</span></li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-midnight mb-2">Get on the tools</h4>
                                    <ul className="space-y-2 text-slate-body">
                                        <li className="flex gap-2"><span className="text-primary font-semibold">✓</span><span>Tracey smart schedules nearby jobs together</span></li>
                                        <li className="flex gap-2"><span className="text-primary font-semibold">✓</span><span>Tracey navigates you to the job</span></li>
                                    </ul>
                                </div>

                                <div>
                                    <h4 className="font-bold text-midnight mb-2">After the job</h4>
                                    <ul className="space-y-2 text-slate-body">
                                        <li className="flex gap-2"><span className="text-primary font-semibold">✓</span><span>Collect payment instantly or Tracey will auto follow up</span></li>
                                        <li className="flex gap-2"><span className="text-primary font-semibold">✓</span><span>Tracey politely asks for a good review</span></li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section >

            {/* ── C.5: Tracey lives in your CRM ── */}
            < section id="interview-assistant" className="py-24 px-6 relative overflow-hidden bg-[#1E232B]" >
                <div className="container mx-auto max-w-7xl">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                        {/* LHS — Text */}
                        <div className="flex flex-col gap-8">
                            <motion.h2 {...fadeUp()} className="text-3xl md:text-5xl font-extrabold text-white tracking-[-0.03em] leading-tight">
                                Tracey lives in your CRM. She will contact customers and run your CRM so you don&apos;t have to.
                            </motion.h2>
                        </div>

                        {/* RHS — Interview Form */}
                        <motion.div {...fadeUp(0.1)} className="bg-white/95 backdrop-blur-md rounded border border-white/40 p-7 shadow-xl">
                            <h3 className="font-bold text-midnight text-lg mb-1">Interview Tracey for free</h3>
                            <p className="text-slate-body text-sm mb-6 leading-relaxed">
                                Tracey will call you and answer questions, explain her capabilities, or roleplay as your very own AI receptionist.
                            </p>
                            <InterviewForm />
                        </motion.div>
                    </div>
                </div>
            </section >

            {/* ── C.6 Testimonials ── */}
            <section className="py-24 bg-slate-50 px-6 overflow-hidden">
                <div className="container mx-auto max-w-7xl">
                    <motion.div {...fadeUp()} className="text-center mb-12">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-midnight tracking-[-0.03em]">
                            Loved by tradies and service businesses
                        </h2>
                    </motion.div>
                    <motion.div {...fadeUp(0.1)} className="-mx-6 px-6">
                        <TestimonialsCarousel />
                    </motion.div>
                </div>
            </section>

            {/* ── D. Hire Tracey Today ── */}
            < section id="product" className="py-24 px-6" >
                <div className="container mx-auto max-w-7xl flex flex-col gap-16">
                    <motion.div {...fadeUp()} className="text-center max-w-2xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-extrabold text-midnight tracking-[-0.03em]">
                            Hire Tracey today
                        </h2>
                        <p className="text-slate-body mt-3 text-lg">
                            Stop chasing jobs. Stop drowning in admin. Let Tracey handle it.
                        </p>
                    </motion.div>

                    {false && (<div className="max-w-2xl mx-auto w-full">
                        <motion.p {...fadeUp()} className="text-center text-xs text-slate-body mb-4 font-semibold uppercase tracking-widest">
                            Tracey in action
                        </motion.p>
                        <motion.div {...fadeUp(0.06)}>
                            <ChatDemo />
                        </motion.div>
                    </div>)}

                    <HireFeatureGrid />

                    {false && (<div className="flex flex-col gap-10 mt-4">
                        {HIRE_FEATURES.map((f, i) => {
                            const isEven = i % 2 === 0;
                            // Inline JSX mockups per feature
                            const mockups: Record<number, React.ReactNode> = {
                                0: (
                                    /* Never miss a job — incoming call UI */
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded px-4 py-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0"><Phone className="w-4 h-4 text-blue-600" /></div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-semibold text-slate-700">Incoming call</p>
                                                <p className="text-[11px] text-slate-500">+61 412 345 678</p>
                                            </div>
                                            <div className="w-7 h-7 rounded-full bg-emerald-500 flex items-center justify-center"><Phone className="w-3.5 h-3.5 text-white" /></div>
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 border border-emerald-200 rounded">
                                            <Bot className="w-4 h-4 text-emerald-600" />
                                            <span className="text-xs text-emerald-700 font-medium">Tracey answered ✓</span>
                                        </div>
                                        <div className="bg-white border border-slate-200 rounded px-4 py-3">
                                            <p className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider mb-1">New lead</p>
                                            <p className="text-xs font-medium text-slate-700">Kitchen renovation — $4,200</p>
                                        </div>
                                    </div>
                                ),
                                1: (
                                    /* Chat with CRM — chat interface mockup */
                                    <div className="space-y-3">
                                        <div className="flex justify-end"><div className="bg-emerald-500 text-white rounded rounded-tr-sm px-3 py-2 text-xs max-w-[80%]">Schedule the Smith job for Friday</div></div>
                                        <div className="flex gap-2 items-end">
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"><Bot className="w-3 h-3 text-emerald-600" /></div>
                                            <div className="bg-slate-100 rounded rounded-bl-sm px-3 py-2 text-xs text-slate-700 max-w-[80%]">Done! Scheduled for Friday 9am. I&apos;ve also sent a confirmation SMS to Sarah Smith. ✅</div>
                                        </div>
                                        <div className="flex justify-end"><div className="bg-emerald-500 text-white rounded rounded-tr-sm px-3 py-2 text-xs max-w-[80%]">What&apos;s my revenue this week?</div></div>
                                        <div className="flex gap-2 items-end">
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"><Bot className="w-3 h-3 text-emerald-600" /></div>
                                            <div className="bg-slate-100 rounded rounded-bl-sm px-3 py-2 text-xs text-slate-700 max-w-[80%]">$8,450 across 4 completed jobs. You&apos;re up 12% vs last week 📈</div>
                                        </div>
                                    </div>
                                ),
                                2: (
                                    /* AI that actually works — SMS conversation */
                                    <div className="space-y-3">
                                        <div className="flex gap-2 items-end">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-[10px] font-bold text-slate-500">CJ</div>
                                            <div className="bg-slate-100 rounded rounded-bl-sm px-3 py-2 text-xs text-slate-700">Hi, I got a quote from you for $2,400. Can you do the work next week?</div>
                                        </div>
                                        <div className="flex gap-2 items-end flex-row-reverse">
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"><Bot className="w-3 h-3 text-emerald-600" /></div>
                                            <div className="bg-emerald-50 border border-emerald-200 rounded rounded-br-sm px-3 py-2 text-xs text-emerald-800">Hi! Yes, we have availability Tuesday or Wednesday. Which works better for you?</div>
                                        </div>
                                        <div className="flex gap-2 items-end">
                                            <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center shrink-0 text-[10px] font-bold text-slate-500">CJ</div>
                                            <div className="bg-slate-100 rounded rounded-bl-sm px-3 py-2 text-xs text-slate-700">Tuesday works. See you then!</div>
                                        </div>
                                        <div className="flex gap-2 items-end flex-row-reverse">
                                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center shrink-0"><Bot className="w-3 h-3 text-emerald-600" /></div>
                                            <div className="bg-emerald-50 border border-emerald-200 rounded rounded-br-sm px-3 py-2 text-xs text-emerald-800">Locked in for Tuesday 8am! I&apos;ve confirmed it in the schedule. 📅</div>
                                        </div>
                                    </div>
                                ),
                                3: (
                                    /* Total control — mini settings panel */
                                    <div className="space-y-3">
                                        {[{ label: "Auto-respond to calls", on: true }, { label: "Require approval for quotes", on: true }, { label: "Send follow-up reminders", on: true }, { label: "Auto-close stale jobs", on: false }].map((s) => (
                                            <div key={s.label} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded px-4 py-2.5">
                                                <span className="text-xs font-medium text-slate-700">{s.label}</span>
                                                {s.on ? <ToggleRight className="w-6 h-6 text-emerald-500" /> : <ToggleLeft className="w-6 h-6 text-slate-300" />}
                                            </div>
                                        ))}
                                    </div>
                                ),
                            };
                            return (
                                <motion.div
                                    key={f.title}
                                    {...fadeUp(i * 0.08)}
                                    className={`grid md:grid-cols-2 gap-6 items-center ${!isEven ? "md:direction-rtl" : ""}`}
                                >
                                    <div className={`bg-white rounded border border-border p-7 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow ${!isEven ? "md:order-2" : "md:order-1"}`}>
                                        <h3 className="text-xl font-bold text-midnight leading-snug">{f.title}</h3>
                                        <p className="text-slate-body text-sm leading-relaxed">{f.desc}</p>
                                    </div>

                                    <div className={`rounded bg-[#F8FAFC] border border-border/50 overflow-hidden p-6 ${!isEven ? "md:order-1" : "md:order-2"}`}>
                                        <div className="rounded border bg-white shadow-sm p-4">
                                            {mockups[i]}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>)}
                </div>
            </section >

            {/* ── E. Tracey Features Carousel ── */}
            < section className="py-24 px-6 bg-[#F8FAFC] relative overflow-hidden isolate" >
                <div
                    className="absolute inset-0 z-0 pointer-events-none"
                    style={{
                        background: `
                          radial-gradient(90% 56% at 50% 90%, rgba(34,197,94,0.26) 0%, rgba(34,197,94,0.10) 36%, rgba(34,197,94,0.00) 72%),
                          radial-gradient(70% 40% at 50% 18%, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.00) 76%)
                        `,
                        filter: "blur(16px)",
                    }}
                />
                <div className="container mx-auto max-w-6xl flex flex-col gap-14 relative z-10">
                    <motion.div {...fadeUp()} className="text-center max-w-2xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-extrabold text-midnight tracking-[-0.03em]">
                            Simple but comprehensive features
                        </h2>
                        <p className="text-slate-body mt-3 text-lg">
                            All the features you need to get the job done. Focus on the work, not the paperwork.
                        </p>
                    </motion.div>

                    <motion.div {...fadeUp(0.06)} className="px-6">
                        <FeatureCarousel />
                    </motion.div>
                </div>
            </section >

            {/* ── E.5: FAQ Section ── */}
            <FaqSection />

            {/* ── E.6: Early Mark CTA ── */}
            <section className="py-24 px-6 bg-[linear-gradient(135deg,#0f172a_0%,#065f46_100%)]">
                <div className="mx-auto max-w-3xl text-center flex flex-col items-center gap-6">
                    <motion.h2 {...fadeUp()} className="text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-white leading-tight text-balance">
                        Give yourself an early mark today
                    </motion.h2>
                    <motion.p {...fadeUp(0.04)} className="text-lg text-white/65 leading-7 max-w-xl">
                        No contracts. No complexity. Try Tracey free.
                    </motion.p>
                    <motion.div {...fadeUp(0.12)} className="flex flex-col sm:flex-row gap-3">
                        <Link href="/auth">
                            <Button size="lg" variant="mint">
                                Get started <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/contact#contact-form">
                            <Button size="lg" variant="ghost" className="text-white border-white/30 hover:bg-white/10">
                                Get a demo
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* ── F. Footer ── */}
            < footer className="bg-midnight text-white/55 py-16 px-6" >
                <div className="container mx-auto max-w-6xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
                        {/* Col 1: Brand */}
                        <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
                            <div className="flex items-center gap-2.5">
                                <Image src="/latest-logo.png" alt="Earlymark" width={32} height={32} className="h-8 w-8 object-contain" unoptimized />
                                <span className="text-white font-bold text-lg tracking-tight">Earlymark</span>
                            </div>
                            <p className="text-sm leading-relaxed max-w-xs">
                                AI-powered assistant and CRM for the modern business.
                            </p>
                        </div>

                        {/* Col 2: Company */}
                        <div className="flex flex-col gap-3">
                            <h4 className="text-white font-semibold text-xs uppercase tracking-widest">Company</h4>
                            {[
                                { label: "Home", href: "/" },
                                { label: "Product", href: "/features" },
                                { label: "Solutions", href: "/solutions" },
                                { label: "Tutorial", href: "/tutorial" },
                                { label: "Pricing", href: "/pricing" },
                                { label: "Contact", href: "/contact" },
                            ].map((l) => (
                                <Link key={l.label} href={l.href} className="text-sm hover:text-white transition-colors">
                                    {l.label}
                                </Link>
                            ))}
                        </div>

                        {/* Col 3: Legal */}
                        <div className="flex flex-col gap-3">
                            <h4 className="text-white font-semibold text-xs uppercase tracking-widest">Legal</h4>
                            {[
                                { label: "Terms of Service", href: "/terms" },
                                { label: "Privacy Policy", href: "/privacy" },
                                { label: "Cookie Policy", href: "/cookies" },
                            ].map((l) => (
                                <Link key={l.label} href={l.href} className="text-sm hover:text-white transition-colors">
                                    {l.label}
                                </Link>
                            ))}
                        </div>

                        {/* Col 4: Socials */}
                        <div className="flex flex-col gap-3">
                            <h4 className="text-white font-semibold text-xs uppercase tracking-widest">Socials</h4>
                            {[
                                { label: "LinkedIn", href: "https://linkedin.com" },
                                { label: "Instagram", href: "https://instagram.com" },
                                { label: "Facebook", href: "https://facebook.com" },
                                { label: "Twitter / X", href: "https://x.com" },
                            ].map((l) => (
                                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer"
                                    className="text-sm hover:text-white transition-colors">
                                    {l.label}
                                </a>
                            ))}
                        </div>
                    </div>

                    <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm">© {new Date().getFullYear()} Earlymark. All rights reserved.</p>
                    </div>
                </div>
            </footer >
        </div >
    );
}
