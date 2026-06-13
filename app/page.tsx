"use client";

import Image from "next/image";
import dynamic from "next/dynamic";
import { useState } from "react";
import { motion } from "framer-motion";
import {
    ArrowRight,
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
import { SectionHead } from "@/components/marketing/section-head";

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
        <div className="flex h-full flex-col justify-between border-t-2 border-ink bg-card/40 px-7 pt-7 pb-6">
            <p className="em-display text-2xl leading-[1.25] text-ink">&ldquo;{t.quote}&rdquo;</p>
            <div className="mt-8 flex items-center gap-3">
                <span className="h-8 w-8 rounded-full bg-forest text-paper em-kicker flex items-center justify-center">
                    {t.author.charAt(0)}
                </span>
                <span className="flex flex-col">
                    <span className="text-sm font-semibold text-ink">{t.author}</span>
                    <span className="em-kicker mt-1 text-ink2/55">{t.role}</span>
                </span>
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
        <section className="bg-cream px-5 sm:px-8 py-16 md:py-24">
            <div className="mx-auto grid max-w-[1320px] gap-x-12 gap-y-10 md:grid-cols-12">
                <div className="md:col-span-4">
                    <div className="border-t border-hair pt-3.5 md:sticky md:top-24">
                        <span className="em-kicker text-forest">§ Good to know</span>
                        <h2 className="em-display mt-6 text-[2rem] leading-[1.0] text-ink sm:text-5xl">
                            Frequently<br className="hidden md:block" /> asked.
                        </h2>
                        <p className="mt-5 max-w-xs text-[15px] leading-relaxed text-ink2">
                            Still wondering something? Interview Tracey yourself — she&apos;ll answer live.
                        </p>
                    </div>
                </div>
                <div className="border-t border-ink md:col-span-8">
                    {FAQ_ITEMS.map((item, idx) => {
                        const isOpen = openIndices.includes(idx);
                        return (
                            <div key={idx} className="border-b border-hair">
                                <button onClick={() => toggle(idx)}
                                    className="group flex w-full items-baseline gap-4 py-5 text-left">
                                    <span className="em-kicker w-6 shrink-0 text-ink2/45">{String(idx + 1).padStart(2, "0")}</span>
                                    <span className="flex-1 pr-4 text-[15px] font-semibold text-ink transition-colors group-hover:text-forest">{item.q}</span>
                                    <span className={`em-display shrink-0 text-2xl leading-none text-forest transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}>+</span>
                                </button>
                                <div className={`overflow-hidden transition-all duration-200 ${isOpen ? "max-h-60" : "max-h-0"}`}>
                                    <p className="pb-5 pl-10 pr-10 text-sm leading-relaxed text-ink2">{item.a}</p>
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

            {/* Hero — editorial masthead */}
            <section className="em-grain relative overflow-hidden bg-cream px-5 sm:px-8 pt-24 sm:pt-28 pb-20 sm:pb-28">
                <div className="relative z-10 mx-auto max-w-[1320px]">
                    {/* masthead rule */}
                    <motion.div {...fadeUp(0.02)} className="flex items-center justify-between gap-4 border-t border-hair pt-3.5">
                        <span className="em-kicker text-forest">§00 — Index</span>
                        <span className="em-kicker hidden text-ink2/55 sm:inline">AI receptionist &amp; CRM</span>
                        <span className="em-kicker text-ink2/55">Australia</span>
                    </motion.div>

                    {/* headline + spec column */}
                    <div className="mt-12 grid gap-x-8 gap-y-10 sm:mt-16 md:grid-cols-12 md:items-end">
                        <motion.h1 {...fadeUp(0.06)} className="em-display col-span-12 text-[clamp(2.75rem,8vw,6.75rem)] text-ink md:col-span-8">
                            Your AI assistant <span className="text-ink2/50">&amp;</span> CRM.<br />
                            Here to give you an <span className="italic text-forest">early mark</span>.
                        </motion.h1>
                        <motion.div {...fadeUp(0.12)} className="col-span-12 flex flex-col gap-6 md:col-span-4 md:pb-2">
                            <p className="max-w-sm text-[15px] leading-relaxed text-ink2">
                                Tracey answers every call, books the job and runs your CRM — while you stay on the tools.
                            </p>
                            <div className="flex flex-col gap-3 sm:flex-row">
                                <Link href="/auth"><Button size="lg" variant="mint">Get started</Button></Link>
                                <a href="#interview-assistant"><Button size="lg" variant="outline">Interview Tracey</Button></a>
                            </div>
                        </motion.div>
                    </div>

                    {/* Plate 01 — the reel framed as a figure */}
                    <motion.figure {...fadeUp(0.16)} className="relative mt-14 sm:mt-20">
                        <figcaption className="flex items-center justify-between gap-4 border-t border-hair pt-3 pb-5">
                            <span className="em-kicker text-forest">Plate 01</span>
                            <span className="em-figcaption text-right">Tracey at work — chat, inbox, map &amp; calendar</span>
                        </figcaption>
                        <div className="relative">
                            <HeroDashboardReel />
                            <div className="absolute bottom-[-3.25rem] right-[-0.75rem] z-20 hidden md:block lg:right-[-1.5rem]">
                                <PulsingLogo />
                            </div>
                        </div>
                    </motion.figure>
                </div>
            </section>

            <TrustStrip />

            {/* Testimonials */}
            <section className="overflow-hidden bg-cream px-5 sm:px-8 py-16 md:py-24">
                <div className="mx-auto max-w-[1320px]">
                    <SectionHead
                        index="§ Field notes"
                        kicker="From the tools"
                        title={<>Built for businesses<br className="hidden sm:block" /> with non-stop calls.</>}
                        lead="Real operators, real days on site — the admin handled in the background."
                    />
                    <motion.div {...fadeUp(0.08)} className="-mx-5 px-5 sm:-mx-8 sm:px-8"><TestimonialsCarousel /></motion.div>
                </div>
            </section>

            {/* Interview form — invitation to try Tracey */}
            <section id="interview-assistant" className="scroll-mt-20 bg-forest-dk px-5 sm:px-8 py-16 md:py-24">
                <div className="relative mx-auto max-w-[1320px]">
                    <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(70% 90% at 90% 0%, rgba(0,210,139,0.12) 0%, transparent 60%)" }} />
                    <div className="relative">
                        <div className="flex items-center gap-4 border-t border-white/15 pt-3.5">
                            <span className="em-kicker text-mint-500">§ Hear her first</span>
                            <span className="em-kicker flex-1 text-paper/40">No card required</span>
                        </div>
                        <div className="mt-10 grid items-end gap-x-8 gap-y-10 lg:grid-cols-12">
                            <motion.div {...fadeUp()} className="flex flex-col gap-6 lg:col-span-7">
                                <h2 className="em-display text-[2rem] leading-[1.0] text-paper sm:text-5xl md:text-[3.5rem]">
                                    Interview your assistant<br className="hidden sm:block" /> before she starts.
                                </h2>
                                <p className="max-w-md text-base leading-relaxed text-paper/60">
                                    She will contact customers and run your CRM so you don&apos;t have to. Put her on the phone before you put her on the payroll.
                                </p>
                            </motion.div>
                            <motion.div {...fadeUp(0.1)} className="bg-card rounded-md p-7 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.5)] lg:col-span-5">
                                <h3 className="mb-1 text-lg font-bold text-ink">Interview Tracey for free</h3>
                                <p className="mb-6 text-sm leading-relaxed text-ink2">Tracey will call you and answer questions, explain her capabilities, or roleplay as your very own AI receptionist.</p>
                                <InterviewForm />
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Platform diagram — voice agent + CRM */}
            <section id="platform" className="bg-paper px-5 sm:px-8 py-16 md:py-24">
                <div className="mx-auto max-w-[1320px]">
                    <SectionHead
                        index="§01 — Platform"
                        kicker="Two halves, one system"
                        title="One comprehensive platform."
                        lead="An AI assistant and a CRM that runs itself, so you don't have to."
                    />
                    <motion.div {...fadeUp(0.08)}>
                        <PlatformDiagram />
                    </motion.div>
                </div>
            </section>

            {/* Section 1 — Meet Tracey (the voice agent) */}
            <section id="meet-tracey" className="bg-cream px-5 sm:px-8 py-16 md:py-24">
                <div className="mx-auto max-w-[1320px]">
                    <SectionHead
                        index="§02 — The assistant"
                        kicker="Your AI offsider"
                        title="Meet Tracey."
                        lead="Your AI receptionist, CRM manager, and follow-up specialist — all in one."
                    />

                    <motion.div {...fadeUp(0.06)} className="grid gap-x-8 gap-y-10 sm:grid-cols-3">
                        {TRACEY_WORKFLOW.map(({ label, points }, i) => (
                            <div key={label} className="flex flex-col border-t-2 border-ink pt-5">
                                <div className="flex items-baseline justify-between">
                                    <span className="em-display text-5xl text-forest">0{i + 1}</span>
                                    <span className="em-kicker text-ink2/45">Step</span>
                                </div>
                                <h4 className="mt-4 mb-4 text-lg font-semibold text-ink">{label}</h4>
                                <ul className="space-y-3">
                                    {points.map((point) => (
                                        <li key={point} className="flex items-start gap-2.5 border-t border-hair pt-3">
                                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-mint-500" />
                                            <span className="text-sm leading-relaxed text-ink2">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </motion.div>

                    <motion.div {...fadeUp(0.10)} className="mt-12 flex flex-col items-center gap-5">
                        <AutonomyModeTabs />
                    </motion.div>
                </div>
            </section>
            {/* Section 2 — A CRM that fills itself in */}
            <section id="product" className="bg-paper px-5 sm:px-8 py-16 md:py-24">
                <div className="mx-auto flex max-w-[1320px] flex-col gap-16">
                    <SectionHead
                        index="§03 — The CRM"
                        kicker="Runs on plain English"
                        title={<>A CRM that<br className="hidden sm:block" /> fills itself in.</>}
                        lead="Run it from the dashboard, the in-app chat, or just message Tracey on WhatsApp."
                    />

                    <motion.div {...fadeUp(0.06)} className="grid items-stretch gap-8 md:grid-cols-2">
                        <div className="flex flex-col justify-center gap-5">
                            {[
                                "One message moves a job, sends a quote, or closes a lead",
                                "Chat drives the CRM — Tracey handles the form-filling",
                                "Your whole pipeline, accessible by message",
                            ].map((b, i) => (
                                <div key={b} className="flex items-start gap-4 border-t border-hair pt-4">
                                    <span className="em-kicker text-forest">0{i + 1}</span>
                                    <span className="text-[15px] leading-relaxed text-ink">{b}</span>
                                </div>
                            ))}
                        </div>
                        <div className="relative min-h-[380px] overflow-hidden rounded-md border border-hair shadow-[0_24px_60px_-30px_rgba(14,31,26,0.4)]">
                            <HireMockup1 />
                        </div>
                    </motion.div>

                    {/* Feature ledger — bill of materials, not icon cards */}
                    <motion.div {...fadeUp(0.10)} className="flex flex-col gap-8">
                        <div className="flex items-center gap-4 border-t border-hair pt-3.5">
                            <span className="em-kicker text-forest">§ Index of features</span>
                            <span className="em-kicker flex-1 text-ink2/55">Twelve, included from day one</span>
                        </div>
                        <div className="grid gap-x-12 md:grid-cols-2">
                            {FEATURE_CARDS.map(({ icon: Icon, title, desc }, i) => (
                                <div key={title} className="group flex items-baseline gap-4 border-b border-hair py-4 transition-colors hover:bg-cream/50">
                                    <span className="em-kicker w-6 shrink-0 text-ink2/45">{String(i + 1).padStart(2, "0")}</span>
                                    <Icon className="h-4 w-4 shrink-0 translate-y-0.5 text-forest" />
                                    <span className="w-40 shrink-0 text-[15px] font-semibold text-ink">{title}</span>
                                    <span className="hidden flex-1 text-sm leading-relaxed text-ink2/80 sm:block">{desc}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </section>

            <FaqSection />

            {/* Final CTA — forest bookend, flows into the footer */}
            <section className="em-grain relative overflow-hidden bg-forest px-5 sm:px-8 py-20 md:py-32">
                <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(80% 70% at 50% 120%, rgba(0,210,139,0.18) 0%, rgba(0,210,139,0.05) 45%, transparent 75%)" }} />
                <div className="relative z-10 mx-auto max-w-[1320px]">
                    <motion.div {...fadeUp()} className="flex items-center gap-4 border-t border-white/15 pt-3.5">
                        <span className="em-kicker text-mint-500">§ Knock off early</span>
                        <span className="em-kicker flex-1 text-paper/40">Live in under a day</span>
                    </motion.div>
                    <motion.h2 {...fadeUp(0.04)} className="em-display mt-10 text-[clamp(3rem,10vw,8rem)] text-paper">
                        Focus on the job.<br /><span className="italic text-mint-500">Not the admin.</span>
                    </motion.h2>
                    <motion.div {...fadeUp(0.12)} className="mt-12 flex flex-col items-start gap-6 sm:flex-row sm:items-center">
                        <Link href="/auth"><Button size="lg" variant="mint">Get started <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                        <Link href="/contact#contact-form"><Button size="lg" variant="ghost" className="border border-white/25 text-paper hover:bg-white/10 hover:text-white">Get a demo</Button></Link>
                        <span className="text-sm text-paper/55 sm:ml-2">Start free. No card required.</span>
                    </motion.div>
                </div>
            </section>

            <Footer />
            <MobileStickyCTA />
        </div>
    );
}
