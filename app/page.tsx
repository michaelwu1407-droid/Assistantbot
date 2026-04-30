"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "framer-motion";
import {
    ArrowRight, ChevronDown,
    Phone, Calendar, MapPin, Users, UsersRound,
    BarChart3, CheckCircle2, MessageSquare, Layers, FileText,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { requestDemoCall } from "@/actions/demo-call-action";

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

const PulsingLogo = dynamic(
    () => import("@/components/home/PulsingLogo").then((mod) => mod.PulsingLogo),
    {
        loading: () => (
            <div className="w-[220px] sm:w-[280px] lg:w-[320px] aspect-[3/4] rounded-[2.5rem] bg-slate-200/50 animate-pulse" />
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

const FEATURE_CARDS = [
    { icon: MessageSquare, title: "Inbox" },
    { icon: Users,         title: "Contacts" },
    { icon: Layers,        title: "Jobs Pipeline" },
    { icon: FileText,      title: "Quotes & Invoices" },
    { icon: Calendar,      title: "Smart Scheduling" },
    { icon: MapPin,        title: "Job Map" },
    { icon: UsersRound,    title: "Team Management" },
    { icon: BarChart3,     title: "Revenue Analytics" },
];

const TRACEY_WORKFLOW = [
    {
        label: "Customer calls",
        icon: Phone,
        points: [
            "Answers every call 24/7 — no voicemail, no missed jobs",
            "Qualifies the lead and explains your services automatically",
            "Books into your calendar and logs every detail to your CRM",
        ],
    },
    {
        label: "While you work",
        icon: Calendar,
        points: [
            "Clusters nearby jobs to cut drive time",
            "Handles calls, SMS, and emails while you're on the tools",
            "Moves jobs through your pipeline as work progresses",
        ],
    },
    {
        label: "After the job",
        icon: CheckCircle2,
        points: [
            "Sends the invoice and follows up on payment automatically",
            "Chases unconfirmed quotes before they go cold",
            "Asks for a review — and logs the response",
        ],
    },
];

// ─── CRM Chat Mockup ──────────────────────────────────────────────────────────

function HireMockup1() {
    const messages = [
        { from: "user",   text: "Schedule the Smith job for Friday" },
        { from: "tracey", text: "Done! Scheduled for Friday 9am. Confirmation SMS sent to Sarah Smith. ✅" },
        { from: "user",   text: "What's my revenue this week?" },
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
                        <div className={`rounded px-3 py-2 text-xs leading-relaxed max-w-[80%] ${
                            m.from === "user"
                                ? "bg-primary text-white rounded-tr-sm"
                                : "bg-white border border-neutral-200 text-neutral-800 rounded-bl-sm shadow-sm"
                        }`}>
                            {m.text}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ─── Interview Form ───────────────────────────────────────────────────────────

const INPUT_CLASS =
    "w-full px-4 py-2.5 rounded border border-border text-sm text-midnight placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white transition";

const DEMO_CALL_TIMEOUT_MS = 30_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            reject(new Error("timeout"));
        }, ms);
        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            },
        );
    });
}

function InterviewForm() {
    const [form, setForm] = useState({ firstName: "", lastName: "", phone: "", email: "", businessName: "" });
    const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
    const [message, setMessage] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (status === "loading") return;
        setStatus("loading");
        setMessage("");
        try {
            const result = await withTimeout(requestDemoCall(form), DEMO_CALL_TIMEOUT_MS);
            if (result.success) {
                setStatus("success");
                setMessage(result.message);
            } else {
                setStatus("error");
                setMessage(result.error);
            }
        } catch (err) {
            setStatus("error");
            const isTimeout = err instanceof Error && err.message === "timeout";
            setMessage(
                isTimeout
                    ? "We couldn't reach the voice service in time. Please try again — we still have your details."
                    : "Something went wrong on our side. Please try again in a moment.",
            );
            console.error("[InterviewForm] Demo call request failed", err);
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input required type="text" placeholder="First name"
                    value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    className={INPUT_CLASS} />
                <input required type="text" placeholder="Last name"
                    value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    className={INPUT_CLASS} />
            </div>
            <input required type="tel" placeholder="Phone number"
                value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                className={INPUT_CLASS} />
            <input required type="email" placeholder="Email address"
                value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className={INPUT_CLASS} />
            <input required type="text" placeholder="Business name"
                value={form.businessName} onChange={(e) => setForm((f) => ({ ...f, businessName: e.target.value }))}
                className={INPUT_CLASS} />
            {status === "error" && <p className="text-red-500 text-xs">{message}</p>}
            <Button type="submit" variant="mint" className="w-full mt-1" disabled={status === "loading"}>
                {status === "loading" ? "Calling you now..." : "Interview Tracey for free"}
                {status !== "loading" && <Phone className="ml-2 h-4 w-4" />}
            </Button>
            <p className="text-xs text-slate-body text-center">
                Tracey will call you within seconds. No credit card required.
            </p>
        </form>
    );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

const TESTIMONIALS = [
    { quote: "It picked up while I was on site and the job details were already there when I got back to the ute.", author: "Mark S.", role: "Plumbing Contractor" },
    { quote: "The follow-ups are the part I notice most. Jobs keep moving without me doing admin at night.", author: "Sarah J.", role: "Electrical Services" },
    { quote: "Customers get a quick answer instead of voicemail. It makes the business feel more organised straight away.", author: "Dave W.", role: "Landscaping & Design" },
];

function TestimonialsCarousel() {
    const slides = [...TESTIMONIALS, ...TESTIMONIALS];
    const Card = ({ t }: { t: typeof TESTIMONIALS[0] }) => (
        <div className="bg-white rounded p-8 shadow-sm border border-border flex flex-col justify-between">
            <div>
                <div className="flex gap-1 mb-4">
                    {[1,2,3,4,5].map(s => (
                        <svg key={s} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
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
    );
    return (
        <div className="relative">
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide md:hidden">
                {TESTIMONIALS.map((t, i) => <div key={i} className="shrink-0 w-[84vw] snap-center"><Card t={t} /></div>)}
            </div>
            <div className="relative hidden overflow-hidden md:block">
                <motion.div className="flex w-max gap-4"
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{ duration: 26, ease: "linear", repeat: Infinity }}>
                    {slides.map((t, i) => <div key={`${t.author}-${i}`} className="w-[350px]"><Card t={t} /></div>)}
                </motion.div>
                <div className="pointer-events-none absolute inset-y-0 left-0 w-20 bg-[linear-gradient(90deg,#f8fafc_0%,rgba(248,250,252,0)_100%)]" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-20 bg-[linear-gradient(270deg,#f8fafc_0%,rgba(248,250,252,0)_100%)]" />
            </div>
        </div>
    );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
    { q: "What is Tracey?", a: "Tracey is your AI-powered receptionist, CRM manager, and follow-up specialist built for trade and service businesses. She answers every inbound call 24/7, logs jobs, sends quotes, chases payments, and keeps your pipeline moving — all without you lifting a finger. Think of her as a full-time admin assistant who never sleeps and never misses a message." },
    { q: "How does Tracey answer my calls?", a: "Your business number simply forwards to Tracey when you're unavailable — or always, if you prefer. She answers professionally in your business name, gathers job details, answers common questions about your services and pricing, and logs everything straight into your CRM. She can also provide quotes and book appointments on the spot, based on the rules and availability you've set." },
    { q: "How long does it take to get set up?", a: "Most businesses are live within a day. When you sign up, Tracey interviews you about your business — your services, pricing, availability, and preferences — in a natural conversation. No forms to fill in, no spreadsheets. Once that's done, she's ready to start answering calls and managing your pipeline." },
    { q: "What types of businesses does Earlymark support?", a: "Earlymark is built for any trade or service business — plumbers, electricians, builders, landscapers, cleaners, HVAC technicians, pest controllers, locksmiths, painters, and more. If you're running jobs and need someone to handle the phones and admin, Tracey can help." },
    { q: "Can I control what Tracey does and says?", a: "Absolutely. You're in full control. Set approval rules so Tracey asks before confirming a quote above a certain value. Customise how she introduces herself, what she says about your services, and when she escalates to you. You can review every conversation in your inbox and override anything at any time. Tracey works within the guardrails you set." },
    { q: "Do I need to be tech-savvy to use Earlymark?", a: "Not at all. Earlymark is designed for busy tradies and business owners, not software engineers. You talk to Tracey in plain English — just like texting — and she handles the rest. There's no complex setup, no spreadsheets to fill in, and no training required. If you can send a text message, you can run Earlymark." },
    { q: "How much does Earlymark cost?", a: "Earlymark is A$30/month (or A$24/month billed annually, saving 20%) plus 10¢ per call minute or text — so you only pay for what you use. That covers the full platform: AI calls, SMS, CRM, scheduling, and your dedicated AU mobile number. Visit our pricing page for full details." },
];

function FaqSection() {
    const [openIndices, setOpenIndices] = useState<number[]>([]);
    const toggle = (idx: number) =>
        setOpenIndices((prev) => prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]);
    return (
        <section className="py-20 px-4 bg-white">
            <div className="max-w-3xl mx-auto">
                <h2 className="text-3xl font-bold text-center text-midnight mb-10">Frequently Asked Questions</h2>
                <div className="space-y-3">
                    {FAQ_ITEMS.map((item, idx) => {
                        const isOpen = openIndices.includes(idx);
                        return (
                            <div key={idx} className="border border-border rounded overflow-hidden">
                                <button onClick={() => toggle(idx)}
                                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors">
                                    <span className="font-semibold text-midnight text-sm pr-4">{item.q}</span>
                                    <ChevronDown className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
                                </button>
                                <div className={`transition-all duration-200 overflow-hidden ${isOpen ? "max-h-60" : "max-h-0"}`}>
                                    <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{item.a}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Home() {
    return (
        <div className="min-h-screen bg-white">
            <Navbar />

            {/* Hero */}
            <section className="pt-24 sm:pt-32 pb-16 sm:pb-24 px-6 relative overflow-hidden isolate bg-[linear-gradient(180deg,#F5F7F8_0%,#F4F7F5_55%,#F7F6F3_100%)]">
                <div className="absolute inset-0 z-0 pointer-events-none" style={{ background: `radial-gradient(110% 70% at 50% 10%, rgba(16,185,129,0.20) 0%, rgba(16,185,129,0.10) 42%, rgba(16,185,129,0.00) 74%),radial-gradient(90% 50% at 50% 86%, rgba(34,197,94,0.30) 0%, rgba(34,197,94,0.14) 32%, rgba(34,197,94,0.00) 72%),radial-gradient(70% 34% at 50% 86%, rgba(163,230,53,0.22) 0%, rgba(163,230,53,0.00) 75%)` }} />
                <div className="absolute inset-y-[2%] left-0 w-[32%] z-0 pointer-events-none opacity-60" style={{ background: "linear-gradient(180deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.05) 48%, rgba(16,185,129,0.00) 100%)", clipPath: "polygon(0 0, 100% 6%, 76% 100%, 0 100%)" }} />
                <div className="absolute inset-y-[2%] right-0 w-[32%] z-0 pointer-events-none opacity-60" style={{ background: "linear-gradient(180deg, rgba(16,185,129,0.12) 0%, rgba(16,185,129,0.05) 48%, rgba(16,185,129,0.00) 100%)", clipPath: "polygon(24% 0, 100% 0, 100% 100%, 0 100%)" }} />
                <div className="container mx-auto max-w-6xl relative z-10 flex flex-col items-center gap-8">
                    <motion.h1 {...fadeUp(0.06)} className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-[-0.04em] leading-[1.08] text-midnight text-balance text-center">
                        Your AI assistant &amp; CRM.
                        <span className="block">Here to give you an <span className="text-primary">early mark</span></span>
                    </motion.h1>
                    <motion.div {...fadeUp(0.10)} className="flex flex-col sm:flex-row gap-3">
                        <Link href="/auth"><Button size="lg" variant="mint">Get started</Button></Link>
                        <Link href="#interview-assistant"><Button size="lg" variant="outline">Interview your assistant</Button></Link>
                    </motion.div>
                    <motion.div {...fadeUp(0.14)} className="relative w-full max-w-5xl mx-auto mt-8">
                        <HeroDashboardReel />
                        <motion.div {...fadeUp(0.18)} className="hidden md:block absolute right-[-0.75rem] lg:right-[-1.5rem] bottom-[-3.25rem] z-20">
                            <PulsingLogo />
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            {/* Testimonials */}
            <section className="bg-slate-50 px-6 py-24 overflow-hidden">
                <div className="container mx-auto max-w-7xl">
                    <motion.div {...fadeUp()} className="text-center mb-12">
                        <h2 className="text-3xl md:text-5xl font-extrabold text-midnight tracking-[-0.03em]">Loved by service businesses with non-stop calls</h2>
                    </motion.div>
                    <motion.div {...fadeUp(0.08)} className="-mx-6 px-6"><TestimonialsCarousel /></motion.div>
                </div>
            </section>

            {/* Section 1 — Meet Tracey */}
            <section id="meet-tracey" className="bg-[#F8FAFC] px-6 py-24">
                <div className="container mx-auto max-w-7xl">
                    <motion.div {...fadeUp()} className="mx-auto mb-14 max-w-3xl text-center">
                        <h2 className="text-4xl font-extrabold tracking-[-0.03em] text-midnight md:text-5xl">Meet Tracey</h2>
                        <p className="mt-3 text-lg text-slate-body max-w-xl mx-auto">
                            Your AI receptionist, CRM manager, and follow-up specialist — all in one.
                        </p>
                    </motion.div>

                    <motion.div {...fadeUp(0.06)} className="rounded-[2rem] border border-emerald-900/10 bg-[linear-gradient(145deg,#103126_0%,#1B4637_52%,#2B5F4D_100%)] shadow-[0_24px_80px_rgba(15,23,42,0.14)]">
                        <div className="grid divide-y sm:divide-y-0 sm:divide-x divide-white/10 sm:grid-cols-3 p-8 md:p-12">
                            {TRACEY_WORKFLOW.map(({ label, icon: Icon, points }, i) => (
                                <div key={label} className="flex flex-col gap-5 sm:px-8 first:pl-0 last:pr-0 py-8 sm:py-0 first:pt-0 last:pb-0">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-bold tabular-nums text-white/30 tracking-widest">0{i + 1}</span>
                                        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10">
                                            <Icon className="h-4 w-4 text-white" />
                                        </div>
                                        <h4 className="text-base font-bold text-white">{label}</h4>
                                    </div>
                                    <ul className="space-y-3">
                                        {points.map((point) => (
                                            <li key={point} className="flex items-start gap-2.5">
                                                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                                                <span className="text-sm leading-relaxed text-white/75">{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div {...fadeUp(0.10)} className="rounded-b-[2rem] bg-[#E0FAF2] border border-t-0 border-emerald-200 px-8 py-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                        <span className="text-sm font-bold text-midnight">You stay in control.</span>
                        {["Approval rules", "Action or draft mode", "Full conversation history"].map((pill) => (
                            <span key={pill} className="inline-flex items-center rounded-full border border-emerald-300 bg-white px-4 py-1.5 text-sm font-medium text-emerald-800 shadow-sm">
                                {pill}
                            </span>
                        ))}
                    </motion.div>
                </div>
            </section>

            {/* Interview form — narrative bridge */}
            <section id="interview-assistant" className="py-24 px-6 relative overflow-hidden bg-[#1E232B]">
                <div className="container mx-auto max-w-7xl">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                        <div className="flex flex-col gap-8">
                            <motion.h2 {...fadeUp()} className="text-3xl md:text-5xl font-extrabold text-white tracking-[-0.03em] leading-tight">
                                Tracey lives in your CRM. She will contact customers and run your CRM so you don&apos;t have to.
                            </motion.h2>
                        </div>
                        <motion.div {...fadeUp(0.1)} className="bg-white/95 backdrop-blur-md rounded border border-white/40 p-7 shadow-xl">
                            <h3 className="font-bold text-midnight text-lg mb-1">Interview Tracey for free</h3>
                            <p className="text-slate-body text-sm mb-6 leading-relaxed">Tracey will call you and answer questions, explain her capabilities, or roleplay as your very own AI receptionist.</p>
                            <InterviewForm />
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* Section 2 — A CRM that fills itself in */}
            <section id="product" className="py-24 px-6 bg-white">
                <div className="container mx-auto max-w-7xl flex flex-col gap-16">
                    <motion.div {...fadeUp()} className="text-center max-w-2xl mx-auto">
                        <h2 className="text-4xl md:text-5xl font-extrabold text-midnight tracking-[-0.03em]">A CRM that fills itself in.</h2>
                        <p className="text-slate-body mt-3 text-lg leading-relaxed">
                            Tracey writes every call, SMS, email, job, and payment to your CRM as it happens.<br />
                            Run it by chat, or open the dashboard to see everything live.
                        </p>
                    </motion.div>

                    <motion.div {...fadeUp(0.06)} className="grid items-center gap-8 md:grid-cols-2">
                        <div className="flex flex-col gap-6">
                            <ul className="flex flex-col gap-3">
                                {[
                                    "Move a job, reschedule a customer, or chase a quote — just say it",
                                    "Ask for revenue, pipeline, or any customer record in plain English",
                                    "No forms, no manual data entry — ever",
                                ].map((b) => (
                                    <li key={b} className="flex items-center gap-2.5 text-sm text-slate-body">
                                        <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                                        <span>{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="relative min-h-[380px] overflow-hidden rounded border border-slate-200 shadow-[0_8px_40px_rgba(15,23,42,0.10)]">
                            <HireMockup1 />
                        </div>
                    </motion.div>

                    <motion.div {...fadeUp(0.10)}>
                        <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-slate-400 mb-6">A full CRM. Not a stripped-down one.</p>
                        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                            {FEATURE_CARDS.map(({ icon: Icon, title }) => (
                                <div key={title} className="flex flex-col items-center gap-3 rounded border border-slate-200 bg-[#F8FAFC] px-4 py-6 text-center">
                                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#E0FAF2]">
                                        <Icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <span className="text-sm font-semibold text-midnight">{title}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            <FaqSection />

            {/* Final CTA */}
            <section className="py-24 px-6 bg-[linear-gradient(135deg,#0f172a_0%,#065f46_100%)]">
                <div className="mx-auto max-w-3xl text-center flex flex-col items-center gap-6">
                    <motion.h2 {...fadeUp()} className="text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-white leading-tight text-balance">Give yourself an early mark today</motion.h2>
                    <motion.p {...fadeUp(0.04)} className="text-lg text-white/65 leading-7 max-w-xl">Focus on the job, not the admin.</motion.p>
                    <motion.div {...fadeUp(0.12)} className="flex flex-col sm:flex-row gap-3">
                        <Link href="/auth"><Button size="lg" variant="mint">Get started <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                        <Link href="/contact#contact-form"><Button size="lg" variant="ghost" className="text-white border-white/30 hover:bg-white/10">Get a demo</Button></Link>
                    </motion.div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-midnight text-white/55 py-16 px-6">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-10 pb-12 border-b border-white/10">
                        <div className="col-span-2 md:col-span-1 flex flex-col gap-4">
                            <div className="flex items-center gap-2.5">
                                <Image src="/latest-logo.png" alt="Earlymark" width={32} height={32} className="h-8 w-8 object-contain" unoptimized />
                                <span className="text-white font-bold text-lg tracking-tight">Earlymark</span>
                            </div>
                            <p className="text-sm leading-relaxed max-w-xs">AI-powered assistant and CRM for the modern business.</p>
                        </div>
                        <div className="flex flex-col gap-3">
                            <h4 className="text-white font-semibold text-xs uppercase tracking-widest">Company</h4>
                            {[{label:"Home",href:"/"},{label:"Product",href:"/features"},{label:"Solutions",href:"/solutions"},{label:"Pricing",href:"/pricing"},{label:"Contact",href:"/contact"}].map((l) => (
                                <Link key={l.label} href={l.href} className="text-sm hover:text-white transition-colors">{l.label}</Link>
                            ))}
                        </div>
                        <div className="flex flex-col gap-3">
                            <h4 className="text-white font-semibold text-xs uppercase tracking-widest">Legal</h4>
                            {[{label:"Terms of Service",href:"/terms"},{label:"Privacy Policy",href:"/privacy"},{label:"Cookie Policy",href:"/cookies"}].map((l) => (
                                <Link key={l.label} href={l.href} className="text-sm hover:text-white transition-colors">{l.label}</Link>
                            ))}
                        </div>
                        <div className="flex flex-col gap-3">
                            <h4 className="text-white font-semibold text-xs uppercase tracking-widest">Socials</h4>
                            {[{label:"LinkedIn",href:"https://linkedin.com"},{label:"Instagram",href:"https://instagram.com"},{label:"Facebook",href:"https://facebook.com"},{label:"Twitter / X",href:"https://x.com"}].map((l) => (
                                <a key={l.label} href={l.href} target="_blank" rel="noopener noreferrer" className="text-sm hover:text-white transition-colors">{l.label}</a>
                            ))}
                        </div>
                    </div>
                    <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
                        <p className="text-sm">© {new Date().getFullYear()} Earlymark. All rights reserved.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
