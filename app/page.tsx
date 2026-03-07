"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowRight, ChevronLeft, ChevronRight,
    Phone, MessageSquare, Calendar, MapPin, Users,
    BarChart3, Zap, Bot,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { requestDemoCall } from "@/actions/demo-call-action";

// ─── Animation helpers ────────────────────────────────────────────────────────

const fadeUp = (delay = 0) => ({
    initial: { opacity: 0, y: 28 },
    whileInView: { opacity: 1, y: 0 } as any,
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
        title: "Never miss a job again",
        desc: "With 24/7 availability, Tracey will contact the lead for you instantaneously. Oh.... and did we mention she's multilingual?",
        screenshotLabel: "Incoming call handling",
        screenshotBg: "from-emerald-500/20 to-emerald-600/10",
    },
    {
        title: "No more admin. Chat with your CRM.",
        desc: "No more fiddling with complex CRMs — just tell Tracey what you want and she'll run it for you.",
        screenshotLabel: "Chat-powered CRM",
        screenshotBg: "from-blue-500/20 to-blue-600/10",
    },
    {
        title: "AI that actually works",
        desc: "AI that handles convos like a human. Tracey learns your preferences and delivers a better and simpler experience.",
        screenshotLabel: "Smart conversations",
        screenshotBg: "from-violet-500/20 to-violet-600/10",
    },
    {
        title: "Total control",
        desc: "You decide how much autonomy Tracey has. Set approval rules, customize responses, and maintain full oversight of every customer interaction.",
        screenshotLabel: "Autonomy settings",
        screenshotBg: "from-slate-500/20 to-slate-600/10",
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
        setPhase("idle");
        const t1 = setTimeout(() => setPhase("user"), 400);
        const t2 = setTimeout(() => setPhase("typing"), 1300);
        const t3 = setTimeout(() => setPhase("agent"), 2700);
        const t4 = setTimeout(() => setStep((s) => (s + 1) % CHAT_DEMO.length), 5400);
        return () => [t1, t2, t3, t4].forEach(clearTimeout);
    }, [step]);

    const current = CHAT_DEMO[step];

    return (
        <div className="rounded-3xl overflow-hidden shadow-2xl bg-[#0F172A] border border-white/10 select-none">
            {/* Browser chrome */}
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-white/10 bg-white/5">
                <div className="flex gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-red-500/60 block" />
                    <span className="w-3 h-3 rounded-full bg-yellow-500/60 block" />
                    <span className="w-3 h-3 rounded-full bg-green-500/60 block" />
                </div>
                <div className="flex-1 flex justify-center">
                    <div className="bg-white/10 rounded-md px-4 py-1 text-[11px] text-white/40 font-medium tracking-wide">
                        earlymark.com/dashboard — Tracey Chat
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div className="px-6 py-8 min-h-[260px] flex flex-col justify-end gap-4">
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
                            <div className="bg-primary text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm max-w-[80%] shadow leading-relaxed">
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
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4 text-primary" />
                            </div>
                            <div className="bg-white/10 rounded-2xl rounded-bl-sm px-4 py-3 flex gap-1.5 items-center">
                                {[0, 0.18, 0.36].map((d, i) => (
                                    <motion.span
                                        key={i}
                                        className="w-2 h-2 rounded-full bg-white/40 block"
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
                            <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                                <Bot className="w-4 h-4 text-primary" />
                            </div>
                            <div className="bg-white/10 text-white/90 rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm max-w-[80%] leading-relaxed">
                                {current.agent}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Step dots */}
            <div className="flex justify-center gap-2 pb-5">
                {CHAT_DEMO.map((_, i) => (
                    <button
                        key={i}
                        onClick={() => setStep(i)}
                        className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? "w-5 bg-primary" : "w-1.5 bg-white/20"}`}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Feature Carousel ─────────────────────────────────────────────────────────

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

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {visible.map((feature, i) => {
                        const Icon = feature.icon;
                        const isCentre = i === 1;
                        return (
                            <motion.div
                                key={feature.title}
                                layout
                                animate={{ opacity: isCentre ? 1 : 0.5, scale: isCentre ? 1 : 0.97 }}
                                transition={{ duration: 0.4, ease: EASE_STANDARD }}
                                className={`rounded-3xl p-7 flex flex-col gap-4 ${isCentre
                                    ? "bg-midnight text-white shadow-xl"
                                    : "bg-white border border-border"
                                    } ${i !== 1 ? "hidden md:flex" : "flex"}`}
                            >
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isCentre ? "bg-primary/20" : "bg-mint-50"}`}>
                                    <Icon className="w-6 h-6 text-primary" />
                                </div>
                                <div>
                                    <h3 className={`font-bold text-lg leading-snug ${isCentre ? "text-white" : "text-midnight"}`}>
                                        {feature.title}
                                    </h3>
                                    <p className={`text-sm mt-2 leading-relaxed ${isCentre ? "text-white/65" : "text-slate-body"}`}>
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
    "w-full px-4 py-2.5 rounded-xl border border-border text-sm text-midnight placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white transition";

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
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium leading-snug ${isOld
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

                    {/* Value Pillars */}
                    <motion.div {...fadeUp(0.12)} className="w-full max-w-[1200px] mx-auto">
                        <div className="flex flex-col md:flex-row justify-center items-center gap-4 md:gap-8">
                            <div className="max-w-[250px] text-center text-slate-800 font-medium leading-[1.4] flex flex-col items-center gap-3 md:pr-8 md:border-r md:border-black/10">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 shadow-sm">
                                    <BarChart3 className="h-6 w-6" />
                                </div>
                                <p>Win more customers. Win more revenue</p>
                            </div>
                            <div className="max-w-[250px] text-center text-slate-800 font-medium leading-[1.4] flex flex-col items-center gap-3 md:pr-8 md:border-r md:border-black/10">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-700 shadow-sm">
                                    <Zap className="h-6 w-6" />
                                </div>
                                <p>Make life easier. Automate customer admin</p>
                            </div>
                            <div className="max-w-[250px] text-center text-slate-800 font-medium leading-[1.4] flex flex-col items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-violet-700 shadow-sm">
                                    <Users className="h-6 w-6" />
                                </div>
                                <p>Provide a better, more reliable customer experience</p>
                            </div>
                        </div>
                    </motion.div>

                    <motion.div {...fadeUp(0.18)} className="flex flex-col sm:flex-row gap-3">
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
                        className="max-w-6xl mx-auto rounded-3xl overflow-hidden border border-border shadow-sm bg-white grid md:grid-cols-2"
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
                                Tracey lives in your CRM. They will contact customers and run your CRM so you don&apos;t have to.
                            </motion.h2>
                        </div>

                        {/* RHS — Interview Form */}
                        <motion.div {...fadeUp(0.1)} className="bg-white/95 backdrop-blur-md rounded-3xl border border-white/40 p-7 shadow-xl">
                            <h3 className="font-bold text-midnight text-lg mb-1">Interview Tracey for free</h3>
                            <p className="text-slate-body text-sm mb-6 leading-relaxed">
                                Tracey will call you and answer questions, explain her capabilities, or roleplay as your very own AI receptionist.
                            </p>
                            <InterviewForm />
                        </motion.div>
                    </div>
                </div>
            </section >

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

                    <div className="max-w-2xl mx-auto w-full">
                        <motion.p {...fadeUp()} className="text-center text-xs text-slate-body mb-4 font-semibold uppercase tracking-widest">
                            Tracey in action
                        </motion.p>
                        <motion.div {...fadeUp(0.06)}>
                            <ChatDemo />
                        </motion.div>
                    </div>

                    <div className="flex flex-col gap-10 mt-4">
                        {HIRE_FEATURES.map((f, i) => {
                            const isEven = i % 2 === 0;
                            return (
                                <motion.div
                                    key={f.title}
                                    {...fadeUp(i * 0.08)}
                                    className={`grid md:grid-cols-2 gap-6 items-center ${!isEven ? "md:direction-rtl" : ""}`}
                                >
                                    <div className={`bg-white rounded-3xl border border-border p-7 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow ${!isEven ? "md:order-2" : "md:order-1"}`}>
                                        <h3 className="text-xl font-bold text-midnight leading-snug">{f.title}</h3>
                                        <p className="text-slate-body text-sm leading-relaxed">{f.desc}</p>
                                    </div>

                                    <div className={`rounded-3xl bg-gradient-to-br ${f.screenshotBg} border border-border/50 overflow-hidden aspect-[4/3] flex items-center justify-center ${!isEven ? "md:order-1" : "md:order-2"}`}>
                                        <div className="text-center px-6">
                                            <div className="w-16 h-16 rounded-2xl bg-white/60 backdrop-blur-sm flex items-center justify-center mx-auto mb-3 shadow-sm">
                                                <div className="w-8 h-8 rounded-lg bg-midnight/10" />
                                            </div>
                                            <p className="text-xs font-medium text-midnight/50 uppercase tracking-wider">{f.screenshotLabel}</p>
                                            <p className="text-[10px] text-midnight/30 mt-1">Screenshot coming soon</p>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
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
                            Everything you need,<br />nothing you don&apos;t
                        </h2>
                        <p className="text-slate-body mt-3 text-lg">
                            Six powerful features working together so you can focus on the work, not the paperwork.
                        </p>
                    </motion.div>

                    <motion.div {...fadeUp(0.06)} className="px-6">
                        <FeatureCarousel />
                    </motion.div>

                    <motion.h3 {...fadeUp(0.08)} className="text-center text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-midnight">
                            Give yourself an <span className="text-primary">early mark</span> today
                    </motion.h3>

                    <motion.div {...fadeUp(0.1)} className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/auth">
                            <Button size="lg" variant="mint">
                                Get started
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/contact#contact-form">
                            <Button size="lg" variant="outline">
                                Get a demo
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </section >

            {/* ── F. Footer ── */}
            < footer className="bg-midnight text-white/55 py-16 px-6" >
                <div className="container mx-auto max-w-6xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
                        {/* Col 1: Brand */}
                        <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
                            <div className="flex items-center gap-2.5">
                                <img src="/latest-logo.png" alt="Earlymark" className="h-8 w-8 object-contain" />
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
                                { label: "Tutorial", href: "/tutorial" },
                                { label: "Pricing", href: "#pricing" },
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
                        <p className="text-sm">© 2025 Earlymark. All rights reserved.</p>
                    </div>
                </div>
            </footer >
        </div >
    );
}
