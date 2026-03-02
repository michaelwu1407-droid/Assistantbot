"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    ArrowRight, Check, ChevronLeft, ChevronRight,
    Phone, MessageSquare, Calendar, MapPin, Users,
    BarChart3, Zap, Bot, Clock,
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
        desc: "With 24/7 availability, Tracey will contact the lead for you instantaneously.",
        icon: Clock,
        bg: "bg-mint-50",
        color: "text-primary",
    },
    {
        title: "No more admin. Chat with your CRM.",
        desc: "No more fiddling with complex CRMs — just tell Tracey what you want and she'll run it for you.",
        icon: MessageSquare,
        bg: "bg-blue-50",
        color: "text-blue-500",
    },
    {
        title: "AI that speaks your language",
        desc: "Tracey learns your preferences and delivers a better, simpler and more human experience.",
        icon: Zap,
        bg: "bg-violet-50",
        color: "text-violet-500",
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
                                className={`rounded-3xl p-7 flex flex-col gap-4 ${
                                    isCentre
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
                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium leading-snug ${
                        isOld
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
            <section className="pt-32 pb-24 px-6 relative overflow-hidden">
                <div className="absolute inset-0 -z-10 ott-glow" />
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[600px] -z-10 rounded-full bg-primary/5 blur-3xl" />

                <div className="container mx-auto max-w-4xl text-center flex flex-col items-center gap-8">
                    <motion.div {...fadeUp(0)} className="ott-badge-mint">
                        Australia&apos;s AI Business Assistant
                    </motion.div>

                    <motion.h1
                        {...fadeUp(0.06)}
                        className="text-5xl md:text-7xl font-extrabold tracking-[-0.04em] leading-[1.08] text-midnight text-balance"
                    >
                        Your AI assistant — here to give you an{" "}
                        <span className="text-primary">early mark</span>
                    </motion.h1>

                    <motion.div {...fadeUp(0.12)} className="text-lg text-slate-body leading-relaxed max-w-xl">
                        <p className="font-semibold text-midnight mb-3">Earlymark helps businesses:</p>
                        <div className="flex flex-col gap-2 text-left">
                            {[
                                "Win more customers and revenue",
                                "Make life easier by automating customer interaction and admin",
                                "Provide a reliable and better customer experience",
                            ].map((point, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                    <Check className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                                    <span>{point}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div {...fadeUp(0.18)} className="flex flex-col sm:flex-row gap-3">
                        <Link href="#meet-tracey">
                            <Button size="lg" variant="outline">
                                Meet Tracey
                            </Button>
                        </Link>
                        <Link href="/auth">
                            <Button size="lg" variant="mint">
                                Get started free
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* ── C. Meet Tracey ── */}
            <section id="meet-tracey" className="py-24 px-6 bg-[#F8FAFC]">
                <div className="container mx-auto max-w-7xl">
                    <motion.div {...fadeUp()} className="text-center mb-14">
                        <h2 className="text-4xl md:text-5xl font-extrabold text-midnight tracking-[-0.03em]">
                            Meet Tracey
                        </h2>
                        <p className="text-slate-body mt-3 text-lg max-w-xl mx-auto">
                            Your AI receptionist, CRM manager, and follow-up specialist — all in one.
                        </p>
                    </motion.div>

                    <div className="grid lg:grid-cols-3 gap-8 items-start">
                        {/* LHS 2/3 — comparison rows */}
                        <div className="lg:col-span-2 flex flex-col gap-6">
                            <motion.div {...fadeUp(0.06)} className="bg-white rounded-3xl border border-red-100 p-7 shadow-sm">
                                <div className="flex items-center gap-2 mb-5">
                                    <span className="text-xl">😩</span>
                                    <span className="font-bold text-red-500 text-xs uppercase tracking-widest">The old way</span>
                                </div>
                                <ProcessFlow steps={OLD_WAY} variant="old" />
                            </motion.div>

                            <motion.div {...fadeUp(0.1)} className="bg-white rounded-3xl border border-emerald-100 p-7 shadow-sm">
                                <div className="flex items-center gap-2 mb-5">
                                    <span className="text-xl">🤖</span>
                                    <span className="font-bold text-emerald-600 text-xs uppercase tracking-widest">The Tracey way</span>
                                </div>
                                <ProcessFlow steps={TRACEY_WAY} variant="tracey" />
                            </motion.div>
                        </div>

                        {/* RHS 1/3 — interview form */}
                        <motion.div {...fadeUp(0.14)} className="bg-white rounded-3xl border border-border p-7 shadow-md lg:sticky lg:top-20">
                            <div className="flex items-center gap-2 mb-1">
                                <Bot className="w-5 h-5 text-primary" />
                                <h3 className="font-bold text-midnight text-lg">Interview Tracey for free</h3>
                            </div>
                            <p className="text-slate-body text-sm mb-6 leading-relaxed">
                                Tracey will call you and answer questions, explain her capabilities, or roleplay as your very own AI receptionist.
                            </p>
                            <InterviewForm />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── D. Hire Tracey Today ── */}
            <section id="product" className="py-24 px-6">
                <div className="container mx-auto max-w-7xl flex flex-col gap-16">
                    <motion.div {...fadeUp()} className="text-center max-w-2xl mx-auto">
                        <div className="ott-badge-mint mb-4">Built for tradies</div>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-midnight tracking-[-0.03em]">
                            Hire Tracey today
                        </h2>
                        <p className="text-slate-body mt-3 text-lg">
                            Stop chasing jobs. Stop drowning in admin. Let Tracey handle it.
                        </p>
                    </motion.div>

                    {/* Feature cards */}
                    <div className="grid md:grid-cols-3 gap-6">
                        {HIRE_FEATURES.map((f, i) => {
                            const Icon = f.icon;
                            return (
                                <motion.div
                                    key={f.title}
                                    {...fadeUp(i * 0.08)}
                                    className="bg-white rounded-3xl border border-border p-7 flex flex-col gap-4 shadow-sm hover:shadow-md transition-shadow"
                                >
                                    <div className={`w-12 h-12 rounded-2xl ${f.bg} flex items-center justify-center`}>
                                        <Icon className={`w-6 h-6 ${f.color}`} />
                                    </div>
                                    <h3 className="text-xl font-bold text-midnight leading-snug">{f.title}</h3>
                                    <p className="text-slate-body text-sm leading-relaxed">{f.desc}</p>
                                </motion.div>
                            );
                        })}
                    </div>

                    {/* Live chat demo */}
                    <div className="max-w-2xl mx-auto w-full">
                        <motion.p {...fadeUp()} className="text-center text-xs text-slate-body mb-4 font-semibold uppercase tracking-widest">
                            Tracey in action
                        </motion.p>
                        <motion.div {...fadeUp(0.06)}>
                            <ChatDemo />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* ── E. Tracey Features Carousel ── */}
            <section className="py-24 px-6 bg-[#F8FAFC]">
                <div className="container mx-auto max-w-6xl flex flex-col gap-14">
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

                    <motion.div {...fadeUp(0.1)} className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Link href="/auth">
                            <Button size="lg" variant="mint">
                                Get started free
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </Link>
                        <Link href="/contact">
                            <Button size="lg" variant="outline">
                                Contact us
                            </Button>
                        </Link>
                    </motion.div>
                </div>
            </section>

            {/* ── F. Footer ── */}
            <footer className="bg-midnight text-white/55 py-16 px-6">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
                        {/* Col 1: Brand */}
                        <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
                            <div className="flex items-center gap-2.5">
                                <img src="/latest-logo.png" alt="Earlymark" className="h-8 w-8 object-contain" />
                                <span className="text-white font-bold text-lg tracking-tight">Earlymark</span>
                            </div>
                            <p className="text-sm leading-relaxed max-w-xs">
                                AI-powered CRM and customer communication for modern trade businesses.
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
                        <p className="text-sm">Made for tradies, by tradies. 🇦🇺</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
