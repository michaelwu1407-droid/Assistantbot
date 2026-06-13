"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "framer-motion";
import {
    ArrowRight, ChevronDown,
    Phone, Calendar, MapPin, Users, UsersRound,
    BarChart3, CheckCircle2, MessageSquare, Layers,
    Inbox, ShieldCheck, Globe, Sparkles, Receipt,
} from "lucide-react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { requestDemoCall } from "@/actions/demo-call-action";
import { TrustStrip } from "@/components/home/trust-strip";
import { MobileStickyCTA } from "@/components/home/mobile-sticky-cta";

const HeroDashboardReel = dynamic(
    () => import("@/components/home/hero-dashboard-reel").then((mod) => mod.HeroDashboardReel),
    {
        loading: () => (
            <div className="relative mx-auto w-full max-w-[1120px] overflow-hidden rounded-md border border-white/15 bg-card/10 shadow-[0_28px_90px_rgba(0,0,0,0.35)] backdrop-blur-xl">
                <div className="aspect-[16/10] bg-[linear-gradient(180deg,#F6F4EE_0%,#F1ECDD_100%)] sm:aspect-[16/9]" />
            </div>
        ),
    },
);

const PulsingLogo = dynamic(
    () => import("@/components/home/PulsingLogo").then((mod) => mod.PulsingLogo),
    {
        loading: () => (
            <div className="w-[220px] sm:w-[280px] lg:w-[320px] aspect-[3/4] rounded-md bg-muted/50 animate-pulse" />
        ),
    },
);

const AutonomyModeTabs = dynamic(
    () => import("@/components/home/autonomy-mode-tabs").then((mod) => mod.AutonomyModeTabs),
    {
        loading: () => (
            <div className="mx-auto w-full max-w-4xl h-56 rounded-2xl bg-muted animate-pulse" />
        ),
    },
);

const PlatformDiagram = dynamic(
    () => import("@/components/home/platform-diagram").then((mod) => mod.PlatformDiagram),
    {
        loading: () => (
            <div className="mx-auto h-72 w-full max-w-5xl animate-pulse rounded-2xl bg-muted" />
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
    { icon: Inbox,         title: "Unified inbox",         desc: "Calls, SMS, email & WhatsApp in one timeline" },
    { icon: Users,         title: "Contacts",              desc: "Every customer record auto-enriched as Tracey works" },
    { icon: Layers,        title: "Jobs pipeline",         desc: "Drag-and-drop Kanban with team-member filtering" },
    { icon: Receipt,       title: "Quotes & Xero invoices",desc: "On-site signatures, draft invoices filed to Xero" },
    { icon: Calendar,      title: "Smart scheduling",      desc: "Calendar sync, travel-aware booking, reminders" },
    { icon: MapPin,        title: "Job map",               desc: "See today's jobs by location and route" },
    { icon: ShieldCheck,   title: "Lead qualification",    desc: "Tracey triages leads against your no-go rules" },
    { icon: Sparkles,      title: "Actionable alerts",     desc: "Approve, confirm or reply right from the notification" },
    { icon: Globe,         title: "Customer portal",       desc: "Token-secured page where customers track their job" },
    { icon: UsersRound,    title: "Team management",       desc: "Invites, roles and per-member workload" },
    { icon: BarChart3,     title: "Revenue analytics",     desc: "Pipeline trends and revenue breakdowns by range" },
    { icon: MessageSquare, title: "In-app AI chat",        desc: "Ask Tracey anything — or run the CRM by chat" },
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
        <div className="h-full flex flex-col bg-card">
            <div className="flex items-center gap-2 px-4 py-3 border-b border-hair">
                <div className="w-6 h-6 rounded-full bg-card border border-hair flex items-center justify-center shadow-sm">
                    <Image src="/latest-logo.png" alt="" width={14} height={14} className="w-3.5 h-3.5 object-contain" unoptimized />
                </div>
                <span className="text-xs font-semibold text-ink">Tracey Chat</span>
                <span className="ml-auto text-[10px] text-mint-500">● Online</span>
            </div>
            <div className="flex-1 flex flex-col justify-end gap-2.5 px-4 py-4 bg-paper">
                {messages.map((m, i) => (
                    <div key={i} className={`flex gap-2 items-end ${m.from === "user" ? "flex-row-reverse" : ""}`}>
                        {m.from === "tracey" && (
                            <div className="w-5 h-5 rounded-full bg-card border border-hair flex items-center justify-center shrink-0 shadow-sm">
                                <Image src="/latest-logo.png" alt="" width={12} height={12} className="w-3 h-3 object-contain" unoptimized />
                            </div>
                        )}
                        <div className={`rounded-md px-3 py-2 text-xs leading-relaxed max-w-[80%] ${
                            m.from === "user"
                                ? "bg-forest text-paper rounded-tr-sm"
                                : "bg-card border border-hair text-ink rounded-bl-sm shadow-sm"
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
    "w-full px-4 py-2.5 rounded-md border border-hair text-sm text-ink placeholder:text-ink2/55 bg-paper/60 transition";

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
                <div className="w-16 h-16 rounded-full bg-primary-subtle flex items-center justify-center">
                    <Phone className="w-8 h-8 text-forest" />
                </div>
                <h3 className="text-xl font-bold text-ink">
                    {message || "Tracey is calling you now!"}
                </h3>
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
            {status === "error" && <p className="text-destructive text-xs">{message}</p>}
            <Button type="submit" variant="mint" className="w-full mt-1" disabled={status === "loading"}>
                {status === "loading" ? "Calling you now..." : "Interview Tracey for free"}
                {status !== "loading" && <Phone className="ml-2 h-4 w-4" />}
            </Button>
            <p className="text-xs text-ink2/75 text-center">
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
        <div className="bg-card rounded-md p-8 border border-hair flex flex-col justify-between shadow-[0_2px_10px_-6px_rgba(14,31,26,0.08)]">
            <div>
                <span aria-hidden className="block text-5xl font-extrabold leading-none text-mint-500 select-none">&ldquo;</span>
                <p className="text-[15px] leading-relaxed mt-2 mb-7 text-ink/85">{t.quote}</p>
            </div>
            <div className="border-t border-hair pt-4">
                <p className="font-bold text-sm text-ink">{t.author}</p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] mt-1 text-forest/70">{t.role}</p>
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
                <div className="pointer-events-none absolute inset-y-0 left-0 w-24 bg-[linear-gradient(90deg,#F1ECDD_0%,rgba(241,236,221,0)_100%)]" />
                <div className="pointer-events-none absolute inset-y-0 right-0 w-24 bg-[linear-gradient(270deg,#F1ECDD_0%,rgba(241,236,221,0)_100%)]" />
            </div>
        </div>
    );
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

const FAQ_ITEMS = [
    { q: "What is Earlymark?", a: "Earlymark is one platform with two halves: an AI voice assistant called Tracey and a CRM that fills itself in. Tracey answers every call and text 24/7, qualifies leads, books jobs and sends quotes — and every conversation she has is logged straight into the CRM as a contact, job, quote or invoice. The CRM gives you the traditional pipeline, scheduling, inbox, invoicing and analytics you'd expect, but you can also run the whole thing by chat or by messaging Tracey on WhatsApp. Built for trade and service businesses who want the admin handled without hiring more staff." },
    { q: "Who is Tracey?", a: "Tracey is the AI assistant that lives inside Earlymark. She picks up your calls, replies to your texts and WhatsApp messages, qualifies leads against your rules, books jobs into your calendar, sends quotes and invoices, and chases payments. You stay in control: pick draft mode, approval mode, or full auto, and Tracey works within whatever guardrails you set." },
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
        <section className="py-12 md:py-20 px-6 bg-cream">
            <div className="max-w-3xl mx-auto">
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-forest text-center mb-4">Good to know</p>
                <h2 className="text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-center mb-10 text-ink">Frequently asked.</h2>
                <div className="border-t border-hair">
                    {FAQ_ITEMS.map((item, idx) => {
                        const isOpen = openIndices.includes(idx);
                        return (
                            <div key={idx} className="border-b border-hair">
                                <button onClick={() => toggle(idx)}
                                    className="w-full flex items-center justify-between gap-4 py-5 text-left transition-colors group">
                                    <span className="font-semibold text-[15px] pr-4 text-ink group-hover:text-forest transition-colors">{item.q}</span>
                                    <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hair bg-card transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                                        <ChevronDown className="w-4 h-4 text-forest" />
                                    </span>
                                </button>
                                <div className={`transition-all duration-200 overflow-hidden ${isOpen ? "max-h-60" : "max-h-0"}`}>
                                    <p className="pb-5 pr-10 text-sm text-ink2 leading-relaxed">{item.a}</p>
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
        <div className="min-h-screen bg-paper">
            <Navbar />

            {/* Hero — forest bookend */}
            <section className="relative isolate overflow-hidden bg-forest px-6 pt-32 sm:pt-40 pb-16 sm:pb-20">
                <div aria-hidden className="absolute inset-0 z-0 pointer-events-none" style={{ background: "radial-gradient(90% 60% at 50% -10%, rgba(0,210,139,0.16) 0%, rgba(0,210,139,0.05) 45%, transparent 75%), radial-gradient(70% 50% at 12% 105%, rgba(14,47,40,0.9) 0%, transparent 70%), radial-gradient(70% 50% at 88% 105%, rgba(14,47,40,0.9) 0%, transparent 70%)" }} />
                <div aria-hidden className="absolute inset-x-0 top-0 z-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
                {/* paper seam — lower half of the reel sits on the next section's surface */}
                <div aria-hidden className="absolute inset-x-0 bottom-0 z-0 h-[150px] sm:h-[220px] bg-paper" />
                <div className="container mx-auto max-w-6xl relative z-10 flex flex-col items-center gap-8">
                    <motion.p {...fadeUp(0.02)} className="text-[11px] sm:text-xs font-bold uppercase tracking-[0.28em] text-mint-500">
                        AI receptionist &amp; CRM for trades
                    </motion.p>
                    <motion.h1 {...fadeUp(0.06)} className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-[-0.04em] leading-[1.06] text-balance text-center text-paper">
                        Your AI assistant &amp; CRM.
                        <span className="block">Here to give you an <span className="text-mint-500">early mark</span></span>
                    </motion.h1>
                    <motion.p {...fadeUp(0.08)} className="max-w-xl text-center text-base sm:text-lg leading-relaxed text-paper/65">
                        Tracey answers every call, books the job and runs your CRM — while you stay on the tools.
                    </motion.p>
                    <motion.div {...fadeUp(0.10)} className="flex flex-col sm:flex-row gap-3">
                        <Link href="/auth"><Button size="lg" variant="mint">Get started</Button></Link>
                        <a href="#interview-assistant"><Button size="lg" variant="outline" className="border-white/25 bg-transparent text-paper hover:bg-white/10 hover:border-white/40 hover:text-white">Interview your assistant</Button></a>
                    </motion.div>
                    <motion.div {...fadeUp(0.14)} className="relative w-full max-w-5xl mx-auto mt-8 sm:mt-12">
                        <HeroDashboardReel />
                        <motion.div {...fadeUp(0.18)} className="hidden md:block absolute right-[-0.75rem] lg:right-[-1.5rem] bottom-[-3.25rem] z-20">
                            <PulsingLogo />
                        </motion.div>
                    </motion.div>
                </div>
            </section>

            <TrustStrip />

            {/* Testimonials */}
            <section className="bg-cream px-6 py-12 md:py-20 overflow-hidden">
                <div className="container mx-auto max-w-7xl">
                    <motion.div {...fadeUp()} className="text-center mb-8 md:mb-12">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-forest mb-4">From the tools</p>
                        <h2 className="text-2xl sm:text-3xl md:text-5xl font-extrabold tracking-[-0.03em] text-ink">Built for businesses with non-stop calls.</h2>
                    </motion.div>
                    <motion.div {...fadeUp(0.08)} className="-mx-6 px-6"><TestimonialsCarousel /></motion.div>
                </div>
            </section>

            {/* Interview form — invitation to try Tracey */}
            <section id="interview-assistant" className="scroll-mt-28 py-12 md:py-20 px-6 bg-paper">
                <div className="container mx-auto max-w-7xl">
                    <motion.div {...fadeUp()} className="relative overflow-hidden rounded-md p-7 sm:p-10 md:p-14" style={{ background: "var(--color-forest-dk)" }}>
                        <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(80% 90% at 85% 0%, rgba(0,210,139,0.14) 0%, transparent 60%)" }} />
                        <div className="relative grid lg:grid-cols-2 gap-10 lg:gap-16 items-center">
                            <div className="flex flex-col gap-5">
                                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-mint-500">Hear her first</p>
                                <h2 className="text-3xl md:text-5xl font-extrabold text-paper tracking-[-0.03em] leading-tight">
                                    Interview your assistant now.
                                </h2>
                                <p className="text-base md:text-lg leading-relaxed text-paper/65 max-w-md">
                                    She will contact customers and run your CRM so you don&apos;t have to. Put her on the phone before you put her on the payroll.
                                </p>
                            </div>
                            <motion.div {...fadeUp(0.1)} className="bg-card rounded-md p-7 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)]">
                                <h3 className="font-bold text-lg mb-1 text-ink">Interview Tracey for free</h3>
                                <p className="text-sm mb-6 leading-relaxed text-ink2">Tracey will call you and answer questions, explain her capabilities, or roleplay as your very own AI receptionist.</p>
                                <InterviewForm />
                            </motion.div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Platform diagram — voice agent + CRM */}
            <section id="platform" className="bg-paper px-6 py-12 md:py-20">
                <div className="container mx-auto max-w-7xl">
                    <motion.div {...fadeUp()} className="mx-auto mb-12 max-w-3xl text-center">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-forest mb-4">The platform</p>
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-ink">One comprehensive platform.</h2>
                        <p className="mt-4 text-lg text-ink2">
                            An AI assistant and a CRM that runs itself, so you don&apos;t have to.
                        </p>
                    </motion.div>
                    <motion.div {...fadeUp(0.08)}>
                        <PlatformDiagram />
                    </motion.div>
                </div>
            </section>

            {/* Section 1 — Meet Tracey (the voice agent) */}
            <section id="meet-tracey" className="bg-cream px-6 py-12 md:py-20">
                <div className="container mx-auto max-w-7xl">
                    <motion.div {...fadeUp()} className="mx-auto mb-12 max-w-3xl text-center">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-forest mb-4">Your AI offsider</p>
                        <h2 className="text-4xl font-extrabold tracking-[-0.03em] md:text-5xl text-ink">Meet Tracey.</h2>
                        <p className="mt-3 text-lg max-w-xl mx-auto text-ink2">
                            Your AI receptionist, CRM manager, and follow-up specialist — all in one.
                        </p>
                    </motion.div>

                    <motion.div {...fadeUp(0.06)} className="grid sm:grid-cols-3 gap-4 relative">
                        {/* dashed vertical guide on mobile */}
                        <div className="absolute left-[22px] top-6 bottom-6 w-0.5 sm:hidden" style={{ background: "repeating-linear-gradient(to bottom, var(--color-hair) 0 4px, transparent 4px 8px)" }} aria-hidden />
                        {TRACEY_WORKFLOW.map(({ label, points }, i) => (
                            <div key={label} className="bg-card border border-hair rounded-md p-6 flex gap-4 sm:flex-col sm:gap-5 shadow-[0_2px_10px_-6px_rgba(14,31,26,0.08)]">
                                <div className="flex-shrink-0 relative z-10">
                                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-paper bg-forest ring-4 ring-cream">
                                        0{i + 1}
                                    </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-base font-bold mb-3 text-ink">{label}</h4>
                                    <ul className="space-y-2.5">
                                        {points.map((point) => (
                                            <li key={point} className="flex items-start gap-2.5">
                                                <span className="mt-1.5 w-1.5 h-1.5 rounded-full flex-shrink-0 bg-mint-500" />
                                                <span className="text-sm leading-relaxed text-ink2">{point}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        ))}
                    </motion.div>

                    <motion.div {...fadeUp(0.10)} className="mt-12 flex flex-col items-center gap-5">
                        <AutonomyModeTabs />
                    </motion.div>
                </div>
            </section>
            {/* Section 2 — A CRM that fills itself in */}
            <section id="product" className="py-12 md:py-20 px-6 bg-paper">
                <div className="container mx-auto max-w-7xl flex flex-col gap-16">
                    <motion.div {...fadeUp()} className="text-center max-w-2xl mx-auto">
                        <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-forest mb-4">The CRM</p>
                        <h2 className="text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-ink">A CRM that fills itself in.</h2>
                        <p className="mt-3 text-lg leading-relaxed text-ink2">
                            Run it from the dashboard, the in-app chat, or just message Tracey on WhatsApp.
                        </p>
                    </motion.div>

                    <motion.div {...fadeUp(0.06)} className="grid items-center gap-8 md:grid-cols-2">
                        <div className="flex flex-col gap-6">
                            <ul className="flex flex-col gap-3">
                                {[
                                    "One message moves a job, sends a quote, or closes a lead",
                                    "Chat drives the CRM — Tracey handles the form-filling",
                                    "Your whole pipeline, accessible by message",
                                ].map((b) => (
                                    <li key={b} className="flex items-start gap-2.5 text-sm text-ink2">
                                        <CheckCircle2 className="mt-0.5 w-4 h-4 text-mint-500 shrink-0" />
                                        <span>{b}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <div className="relative min-h-[380px] overflow-hidden rounded-md border border-hair shadow-[0_18px_50px_-22px_rgba(14,31,26,0.25)]">
                            <HireMockup1 />
                        </div>
                    </motion.div>

                    <motion.div {...fadeUp(0.10)} className="flex flex-col gap-6">
                        <div className="text-center">
                            <h3 className="text-2xl font-extrabold tracking-[-0.02em] md:text-3xl text-ink">A full-featured CRM, built for the way trades actually work.</h3>
                        </div>
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {FEATURE_CARDS.map(({ icon: Icon, title, desc }) => (
                                <div key={title} className="group flex items-start gap-3 rounded-md border border-hair bg-card p-4 transition-all hover:-translate-y-0.5 hover:border-mint-500/40 hover:shadow-[0_10px_24px_-12px_rgba(14,31,26,0.22)]">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-subtle">
                                        <Icon className="h-4 w-4 text-forest" />
                                    </div>
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <span className="text-sm font-semibold text-ink">{title}</span>
                                        <span className="text-xs leading-relaxed text-ink2/85">{desc}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            <FaqSection />

            {/* Final CTA — forest bookend, flows into the footer */}
            <section className="py-16 md:py-28 px-6 relative overflow-hidden bg-forest">
                <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(80% 70% at 50% 120%, rgba(0,210,139,0.18) 0%, rgba(0,210,139,0.05) 45%, transparent 75%)" }} />
                <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                <div className="mx-auto max-w-3xl text-center flex flex-col items-center gap-6 relative z-10">
                    <motion.p {...fadeUp()} className="text-[11px] font-bold uppercase tracking-[0.28em] text-mint-500">Knock off early</motion.p>
                    <motion.h2 {...fadeUp(0.02)} className="text-4xl md:text-6xl font-extrabold tracking-[-0.04em] text-paper leading-[1.05] text-balance">Focus on the job.<br/><span className="text-mint-500">Not the admin.</span></motion.h2>
                    <motion.p {...fadeUp(0.04)} className="text-lg text-paper/65 leading-7 max-w-xl">Start free. No card required. Live in under a day.</motion.p>
                    <motion.div {...fadeUp(0.12)} className="flex flex-col sm:flex-row gap-3">
                        <Link href="/auth"><Button size="lg" variant="mint">Get started <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                        <Link href="/contact#contact-form"><Button size="lg" variant="ghost" className="text-paper border border-white/25 hover:bg-white/10 hover:text-white">Get a demo</Button></Link>
                    </motion.div>
                </div>
            </section>

            <Footer />
            <MobileStickyCTA />
        </div>
    );
}
