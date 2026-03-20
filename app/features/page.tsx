"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import {
  ArrowRight, Bot, Calendar, Check, CheckCircle2,
  FileText, Mail, MapPin, MessageSquare, Phone,
  ShieldCheck, X,
} from "lucide-react"
import { Footer } from "@/components/layout/footer"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { HeroDashboardReel } from "@/components/home/hero-dashboard-reel"

// ─── Animation ────────────────────────────────────────────────────────────────

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, delay, ease: EASE },
})

// ─── Static data ──────────────────────────────────────────────────────────────

const CORE_JOBS = [
  {
    num: "01",
    icon: Phone,
    title: "Answer every call",
    desc: "Tracey picks up 24/7, captures job details, and logs everything — so no lead ever hits voicemail.",
  },
  {
    num: "02",
    icon: MessageSquare,
    title: "Run your CRM",
    desc: "Schedule jobs, send quotes, and update records by just telling Tracey what you need done.",
  },
  {
    num: "03",
    icon: CheckCircle2,
    title: "Chase every job",
    desc: "Tracey follows up on quotes, chases payment, and asks for reviews — automatically.",
  },
]

const FEATURES = [
  {
    eyebrow: "Customer communication",
    title: "Pick up every lead without stopping work",
    body: "When you're on the tools, driving, or in a meeting — Tracey answers. She handles voice, SMS, and email like a trained receptionist: professional, fast, and consistent every time.",
    bullets: [
      "Answers calls in your business name, 24/7",
      "Captures job details and logs them straight to your CRM",
      "After-hours enquiries handled while you sleep",
    ],
  },
  {
    eyebrow: "CRM operations",
    title: "Run the back office by just talking to Tracey",
    body: "No more hunting through CRM menus. Tell Tracey what needs doing in plain English and she executes — scheduling, updating records, sending quotes, checking revenue.",
    bullets: [
      "Schedule, reschedule, and update jobs via chat",
      "Ask any question about your pipeline in plain English",
      "No manual data entry — Tracey keeps records current",
    ],
  },
  {
    eyebrow: "Smart scheduling",
    title: "Keep the calendar clean without the back-and-forth",
    body: "Tracey checks your availability before booking, clusters nearby jobs together, and sends confirmations automatically. Your day stays tight and your customers stay informed.",
    bullets: [
      "Books into the right slots based on real availability",
      "Sends booking confirmations and reminders",
      "Rescheduling handled without manual coordination",
    ],
  },
  {
    eyebrow: "Inbox & follow-up",
    title: "Nothing falls through the cracks",
    body: "Every call, message, and Tracey action flows into a single inbox connected to your CRM. Quote not accepted? Tracey follows up. Payment overdue? Tracey chases it.",
    bullets: [
      "Unified inbox: calls, SMS, email, and Tracey actions",
      "Automatic follow-up on quotes and unpaid jobs",
      "Full conversation history attached to each customer record",
    ],
  },
  {
    eyebrow: "Job map & routing",
    title: "See your day geographically, not just as a list",
    body: "View all scheduled jobs on a live map and plan smarter routes. Less dead time driving, more jobs completed per day.",
    bullets: [
      "Live map of all scheduled jobs by date",
      "Smarter routing to reduce drive time between sites",
      "Quick-view job detail from the map pin",
    ],
  },
  {
    eyebrow: "Control & approvals",
    title: "Automation you trust, because you set the rules",
    body: "You decide what Tracey can do alone and what needs your sign-off. Set approval thresholds for quotes, restrict what she can confirm, and see everything she's done.",
    bullets: [
      "Require approval for quotes above any threshold you set",
      "Choose between execute, draft, or info-only modes",
      "Full dashboard visibility — nothing happens in the dark",
    ],
  },
]

const HOW_IT_WORKS = [
  {
    num: "1",
    icon: Bot,
    title: "Tell Tracey about your business",
    desc: "She interviews you in plain conversation — services, pricing, availability, preferences. No forms, no spreadsheets. Done in under an hour.",
  },
  {
    num: "2",
    icon: Phone,
    title: "Tracey handles calls and admin",
    desc: "She answers every call, logs every job, follows up every lead, and chases payment — automatically, from day one.",
  },
  {
    num: "3",
    icon: ShieldCheck,
    title: "You stay in control",
    desc: "Review every conversation, approve quotes, adjust rules. Complete visibility with none of the admin drag.",
  },
]

const COMPARISON_ROWS = [
  {
    task: "After-hours calls",
    earlymark: "Tracey picks up 24/7 and logs the job",
    traditional: "Voicemail — or the customer calls a competitor",
  },
  {
    task: "Logging job details",
    earlymark: "Auto-logged to CRM from the call",
    traditional: "Written on paper, typed later (or forgotten)",
  },
  {
    task: "Sending quotes",
    earlymark: "Tracey drafts and sends within minutes",
    traditional: "Manual, delayed, often chased by the customer",
  },
  {
    task: "Booking appointments",
    earlymark: "Confirmed and calendar-synced on the call",
    traditional: "Multiple back-and-forth messages over days",
  },
  {
    task: "Chasing payment",
    earlymark: "Tracey follows up automatically",
    traditional: "Awkward manual calls, often left too long",
  },
  {
    task: "Reviewing activity",
    earlymark: "Full inbox + dashboard history",
    traditional: "Search through texts, notes, and memory",
  },
]

const TESTIMONIALS = [
  {
    quote: "Tracey booked three jobs for me while I was driving between sites yesterday. It pays for itself immediately.",
    author: "Mark S.",
    role: "Plumbing Contractor",
  },
  {
    quote: "I used to spend two hours every evening following up on quotes. Now I just go home.",
    author: "Sarah J.",
    role: "Electrical Services",
  },
]

// ─── Feature mockup panels ────────────────────────────────────────────────────

/** 1 · Customer communication — incoming call + CRM log */
function MockupComms() {
  return (
    <div className="h-full flex flex-col bg-[#0f172a] rounded-[24px] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-emerald-400" />
        </div>
        <span className="text-xs font-semibold text-white">Tracey · AI Receptionist</span>
        <span className="ml-auto text-[10px] text-emerald-400 font-medium">● Live</span>
      </div>
      <div className="flex-1 flex flex-col justify-end gap-3 px-4 py-4">
        {[
          { from: "system", text: "📞  Incoming call — +61 412 345 678" },
          { from: "tracey", text: "Hi, thanks for calling Green Valley Plumbing! I'm Tracey. How can I help you today?" },
          { from: "customer", text: "Hi — my hot water system stopped working this morning." },
          { from: "tracey", text: "Sorry to hear that! I've logged a new job: Hot water fault · 42 Elm St. I'll check availability and send you a booking confirmation shortly. ✅" },
        ].map((m, i) => (
          <div key={i} className={`flex gap-2 items-end ${m.from === "customer" ? "flex-row-reverse" : ""}`}>
            {m.from === "tracey" && (
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Bot className="w-3 h-3 text-emerald-400" />
              </div>
            )}
            <div className={`rounded-2xl px-3 py-2 text-[11px] leading-relaxed max-w-[82%] ${
              m.from === "customer" ? "bg-slate-600 text-white rounded-tr-sm"
              : m.from === "system" ? "bg-blue-500/20 text-blue-300 rounded-lg text-center w-full text-center"
              : "bg-white/10 text-white/90 rounded-bl-sm"
            }`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 2 · CRM operations — chat commands */
function MockupCRM() {
  return (
    <div className="h-full flex flex-col bg-[#0f172a] rounded-[24px] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10">
        <div className="w-7 h-7 rounded-full bg-emerald-500/20 flex items-center justify-center">
          <Bot className="w-4 h-4 text-emerald-400" />
        </div>
        <span className="text-xs font-semibold text-white">Tracey Chat</span>
      </div>
      <div className="flex-1 flex flex-col justify-end gap-2.5 px-4 py-4">
        {[
          { from: "user", text: "Schedule the Smith job for Friday morning" },
          { from: "tracey", text: "Done — Smith Plumbing booked Friday 8am. Confirmation SMS sent to Sarah. ✅" },
          { from: "user", text: "What's my revenue this week?" },
          { from: "tracey", text: "$8,450 across 4 completed jobs. Up 12% on last week. 📈" },
          { from: "user", text: "Send the Henderson quote at $1,400" },
          { from: "tracey", text: "Quote sent to Mrs Henderson for $1,400. I'll follow up in 24 hrs if no response. 📋" },
        ].map((m, i) => (
          <div key={i} className={`flex gap-2 items-end ${m.from === "user" ? "flex-row-reverse" : ""}`}>
            {m.from === "tracey" && (
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                <Bot className="w-3 h-3 text-emerald-400" />
              </div>
            )}
            <div className={`rounded-2xl px-3 py-2 text-[11px] leading-relaxed max-w-[80%] ${m.from === "user" ? "bg-emerald-500 text-white rounded-tr-sm" : "bg-white/10 text-white/90 rounded-bl-sm"}`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 3 · Smart scheduling — calendar grid */
function MockupCalendar() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"]
  const hours = ["7am", "8am", "9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm"]
  const H = 26
  const jobs = [
    { day: 0, start: 1, dur: 2, label: "Kitchen reno", color: "#6B7280", bg: "#F3F4F6" },
    { day: 1, start: 0, dur: 2, label: "Hot water", color: "#3B82F6", bg: "#EFF6FF" },
    { day: 2, start: 2, dur: 3, label: "Deck build", color: "#00D28B", bg: "#E0FAF2" },
    { day: 3, start: 1, dur: 2, label: "Fence repair", color: "#F59E0B", bg: "#FFFBEB" },
    { day: 4, start: 0, dur: 3, label: "Bathroom reno", color: "#8B5CF6", bg: "#F5F3FF" },
  ]
  return (
    <div className="h-full flex flex-col bg-white rounded-[24px] overflow-hidden">
      <div className="flex border-b border-neutral-200 bg-slate-50">
        <div className="w-10 shrink-0" />
        {days.map(d => (
          <div key={d} className="flex-1 text-center py-2.5 text-[10px] font-semibold text-slate-500 border-l border-neutral-100">{d}</div>
        ))}
      </div>
      <div className="flex flex-1 overflow-hidden">
        <div className="w-10 shrink-0 flex flex-col">
          {hours.map(h => (
            <div key={h} className="flex-1 flex items-start justify-end pr-1.5 pt-0.5" style={{ height: H }}>
              <span className="text-[8px] text-neutral-400">{h}</span>
            </div>
          ))}
        </div>
        <div className="flex flex-1">
          {days.map((d, di) => (
            <div key={d} className="flex-1 border-l border-neutral-100 relative">
              {hours.map((_, hi) => (
                <div key={hi} className="border-b border-neutral-50" style={{ height: H }} />
              ))}
              {jobs.filter(j => j.day === di).map((j, ji) => (
                <div key={ji} className="absolute inset-x-0.5 rounded-md px-1.5 py-1 overflow-hidden"
                  style={{ top: j.start * H, height: j.dur * H - 2, backgroundColor: j.bg, borderLeft: `2.5px solid ${j.color}` }}>
                  <p className="text-[8px] font-bold leading-tight truncate" style={{ color: j.color }}>{j.label}</p>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** 4 · Inbox & follow-up */
function MockupInbox() {
  const items = [
    { icon: Phone, color: "#3B82F6", bg: "#EFF6FF", label: "Tracey answered call", detail: "Hot water fault · Mrs Chen · logged to CRM", badge: "New job" },
    { icon: Mail, color: "#00D28B", bg: "#E0FAF2", label: "Quote sent", detail: "Kitchen reno · T. Nguyen · $8,200", badge: "Sent" },
    { icon: MessageSquare, color: "#8B5CF6", bg: "#F5F3FF", label: "Follow-up sent", detail: "Deck build · J. Morrison · awaiting reply", badge: "Chasing" },
    { icon: FileText, color: "#F59E0B", bg: "#FFFBEB", label: "Payment reminder", detail: "Fence repair · B. Clarke · $2,400 overdue", badge: "Overdue" },
    { icon: CheckCircle2, color: "#6B7280", bg: "#F3F4F6", label: "Job completed", detail: "Bathroom reno · S. Wilson · $4,200 collected", badge: "Done" },
  ]
  return (
    <div className="h-full flex flex-col bg-white rounded-[24px] overflow-hidden">
      <div className="px-4 py-3 border-b border-neutral-200 bg-slate-50 flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-slate-800">Activity Inbox</p>
          <p className="text-[10px] text-slate-500">All Tracey actions · today</p>
        </div>
        <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">● Live</span>
      </div>
      <div className="flex-1 flex flex-col divide-y divide-neutral-100 overflow-hidden">
        {items.map((item, i) => {
          const Icon = item.icon
          return (
            <div key={i} className="flex items-start gap-3 px-4 py-2.5">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: item.bg }}>
                <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-slate-800">{item.label}</p>
                <p className="text-[9px] text-slate-500 truncate mt-0.5">{item.detail}</p>
              </div>
              <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                style={{ color: item.color, backgroundColor: item.bg }}>{item.badge}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/** 5 · Job map & routing */
function MockupMap() {
  const pins = [
    { x: "22%", y: "38%", label: "Hot water", color: "#3B82F6", num: 1 },
    { x: "55%", y: "55%", label: "Deck build", color: "#00D28B", num: 2 },
    { x: "74%", y: "30%", label: "Kitchen reno", color: "#6B7280", num: 3 },
  ]
  return (
    <div className="h-full relative overflow-hidden rounded-[24px]"
      style={{ background: "linear-gradient(135deg,#e8ede4 0%,#dce6d8 40%,#e0e8dc 100%)" }}>
      <div className="absolute inset-0 opacity-20"
        style={{ backgroundImage: "linear-gradient(#94a3b8 1px,transparent 1px),linear-gradient(90deg,#94a3b8 1px,transparent 1px)", backgroundSize: "44px 44px" }} />
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.35 }}>
        <path d="M 22% 38% Q 38% 47% 55% 55%" stroke="#94a3b8" strokeWidth="3" fill="none" />
        <path d="M 55% 55% Q 66% 42% 74% 30%" stroke="#94a3b8" strokeWidth="3" fill="none" />
        <path d="M 22% 38% Q 38% 47% 55% 55% Q 66% 42% 74% 30%" stroke="#3B82F6" strokeWidth="2.5" fill="none" strokeDasharray="6 3" />
      </svg>
      {pins.map(p => (
        <div key={p.num} className="absolute" style={{ left: p.x, top: p.y, transform: "translate(-50%,-50%)" }}>
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: p.color }}>{p.num}</div>
            <div className="mt-1 bg-white text-[9px] font-semibold text-slate-700 px-2 py-0.5 rounded-full shadow-sm border border-neutral-200 whitespace-nowrap">{p.label}</div>
          </div>
        </div>
      ))}
      <div className="absolute top-3 left-3 bg-white/95 rounded-xl border border-neutral-200 shadow-sm px-3 py-2">
        <p className="text-[9px] font-semibold text-slate-500 uppercase tracking-wide">Today</p>
        <p className="text-sm font-bold text-slate-900 leading-none mt-0.5">3 jobs</p>
      </div>
      <div className="absolute bottom-3 right-3 bg-white/95 rounded-xl border border-neutral-200 shadow-sm px-3 py-2 flex flex-col gap-1.5">
        {[{ color: "#3B82F6", label: "New" }, { color: "#00D28B", label: "Scheduled" }, { color: "#6B7280", label: "Done" }].map(l => (
          <div key={l.label} className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
            <span className="text-[9px] text-slate-600">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 6 · Control & approvals */
function MockupControl() {
  const settings = [
    { label: "Auto-respond to incoming calls", on: true },
    { label: "Require approval for quotes over $2,000", on: true },
    { label: "Send payment follow-up reminders", on: true },
    { label: "Auto-close stale jobs after 30 days", on: false },
  ]
  return (
    <div className="h-full flex flex-col bg-[#F8FAFC] rounded-[24px] overflow-hidden p-5 gap-3">
      <div className="mb-1">
        <p className="text-xs font-bold text-slate-800">Tracey permissions</p>
        <p className="text-[10px] text-slate-500 mt-0.5">Control exactly what Tracey can do</p>
      </div>
      {settings.map((s, i) => (
        <div key={i} className="flex items-center justify-between bg-white border border-neutral-200 rounded-xl px-4 py-3 shadow-sm">
          <span className="text-[11px] font-medium text-slate-700 pr-4 leading-snug">{s.label}</span>
          <div className={`w-10 h-5 rounded-full flex items-center px-0.5 shrink-0 ${s.on ? "bg-emerald-500 justify-end" : "bg-neutral-300 justify-start"}`}>
            <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
          </div>
        </div>
      ))}
      <div className="mt-auto flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5">
        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
        <span className="text-[11px] text-emerald-700 font-medium">Changes sync to Tracey instantly</span>
      </div>
    </div>
  )
}

const FEATURE_MOCKUPS = [MockupComms, MockupCRM, MockupCalendar, MockupInbox, MockupMap, MockupControl]

// ─── Placeholder export — sections added in subsequent tasks ──────────────────

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <Navbar />
      <main>

        {/* ── 1. Hero ── */}
        <section className="pt-32 pb-20 px-6 bg-[linear-gradient(180deg,#F5F7F8_0%,#F4F7F5_60%,#F7F6F3_100%)] relative overflow-hidden isolate">
          <div className="absolute inset-0 z-0 pointer-events-none" style={{
            background: "radial-gradient(110% 60% at 50% 0%,rgba(16,185,129,0.18) 0%,rgba(16,185,129,0.00) 72%)",
          }} />
          <div className="relative z-10 mx-auto max-w-3xl text-center flex flex-col items-center gap-6">
            <motion.p {...fadeUp(0)} className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              Product
            </motion.p>
            <motion.h1 {...fadeUp(0.04)} className="text-5xl md:text-7xl font-extrabold tracking-[-0.04em] leading-[1.07] text-midnight text-balance">
              Tracey does the admin.<br />You do the work.
            </motion.h1>
            <motion.p {...fadeUp(0.08)} className="text-lg leading-8 text-slate-600 max-w-xl text-balance">
              One AI assistant that handles every call, runs your CRM, schedules your jobs, and chases follow-ups — so you don't have to.
            </motion.p>
            <motion.div {...fadeUp(0.12)} className="flex flex-col sm:flex-row gap-3">
              <Link href="/auth">
                <Button size="lg" variant="mint">
                  Get started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact#contact-form">
                <Button size="lg" variant="outline">Get a demo</Button>
              </Link>
            </motion.div>
          </div>

          {/* Full-width dashboard reel */}
          <motion.div {...fadeUp(0.16)} className="relative z-10 mx-auto mt-14 max-w-6xl px-4">
            <div className="absolute inset-x-[8%] top-8 -z-10 h-32 rounded-full bg-emerald-300/20 blur-3xl" />
            <HeroDashboardReel />
          </motion.div>
        </section>

        {/* ── 2. Core jobs ── */}
        <section className="py-20 px-6 bg-white border-y border-slate-200/70">
          <div className="mx-auto max-w-5xl">
            <motion.p {...fadeUp()} className="text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-primary mb-10">
              What Tracey does for you
            </motion.p>
            <div className="grid md:grid-cols-3 gap-6">
              {CORE_JOBS.map((job, i) => {
                const Icon = job.icon
                return (
                  <motion.div key={job.num} {...fadeUp(i * 0.07)}
                    className="rounded-[24px] border border-slate-200 bg-slate-50/60 p-6 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-primary/60 tracking-wider">{job.num}</span>
                      <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-midnight">{job.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-600">{job.desc}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── 3. Feature deep dives ── */}
        {FEATURES.map((feat, i) => {
          const isEven = i % 2 === 0
          const Mockup = FEATURE_MOCKUPS[i]
          const bg = isEven ? "bg-white" : "bg-[#F8FAFC]"
          return (
            <section key={feat.eyebrow} className={`py-20 px-6 ${bg} border-b border-slate-200/60`}>
              <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-10 lg:gap-16 items-center">

                {/* Text col */}
                <motion.div {...fadeUp()} className={!isEven ? "md:order-2" : ""}>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
                    {feat.eyebrow}
                  </span>
                  <h2 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-[-0.03em] text-midnight leading-tight">
                    {feat.title}
                  </h2>
                  <p className="mt-4 text-base leading-7 text-slate-600">{feat.body}</p>
                  <ul className="mt-6 space-y-3">
                    {feat.bullets.map(b => (
                      <li key={b} className="flex items-start gap-3 text-sm leading-6 text-slate-700">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span>{b}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>

                {/* Mockup col */}
                <motion.div {...fadeUp(0.08)} className={`h-[360px] rounded-[28px] overflow-hidden shadow-[0_8px_48px_rgba(15,23,42,0.12)] ${!isEven ? "md:order-1" : ""}`}>
                  {Mockup && <Mockup />}
                </motion.div>

              </div>
            </section>
          )
        })}

        {/* ── 4. How it works ── */}
        <section className="py-20 px-6 bg-white border-b border-slate-200/60">
          <div className="mx-auto max-w-5xl">
            <motion.div {...fadeUp()} className="text-center mb-14">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">How it works</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.03em] text-midnight">Up and running in under a day</h2>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-6 relative">
              {/* connecting line — desktop only */}
              <div className="hidden md:block absolute top-10 left-[calc(16.7%+20px)] right-[calc(16.7%+20px)] h-px bg-gradient-to-r from-emerald-200 via-emerald-300 to-emerald-200" />
              {HOW_IT_WORKS.map((step, i) => {
                const Icon = step.icon
                return (
                  <motion.div key={step.num} {...fadeUp(i * 0.1)}
                    className="relative flex flex-col items-center text-center p-7 rounded-[24px] bg-slate-50/60 border border-slate-200">
                    <div className="w-14 h-14 rounded-2xl bg-white border border-emerald-200 shadow-sm flex items-center justify-center mb-5 relative z-10">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-[11px] font-bold text-primary/60 tracking-widest mb-2">{step.num}</span>
                    <h3 className="text-base font-bold text-midnight">{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{step.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── 5. Comparison table ── */}
        <section className="py-20 px-6 bg-[#F8FAFC] border-b border-slate-200/60">
          <div className="mx-auto max-w-4xl">
            <motion.div {...fadeUp()} className="text-center mb-12">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">Why switch</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.03em] text-midnight">Earlymark vs. the traditional setup</h2>
              <p className="mt-3 text-base text-slate-600">Phone + paper + spreadsheet + late-night follow-ups, vs. one AI that handles it all.</p>
            </motion.div>

            <motion.div {...fadeUp(0.06)} className="rounded-[28px] overflow-hidden border border-slate-200 shadow-sm">
              {/* Header row */}
              <div className="grid grid-cols-3 bg-midnight text-white">
                <div className="px-5 py-4 text-sm font-semibold text-white/60">Task</div>
                <div className="px-5 py-4 text-sm font-semibold text-emerald-400 border-l border-white/10">Earlymark</div>
                <div className="px-5 py-4 text-sm font-semibold text-white/60 border-l border-white/10">Traditional</div>
              </div>
              {/* Data rows */}
              {COMPARISON_ROWS.map((row, i) => (
                <div key={row.task} className={`grid grid-cols-3 ${i % 2 === 0 ? "bg-white" : "bg-slate-50/60"} border-t border-slate-200`}>
                  <div className="px-5 py-4 text-sm font-semibold text-midnight">{row.task}</div>
                  <div className="px-5 py-4 border-l border-slate-200 flex items-start gap-2">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-700">{row.earlymark}</span>
                  </div>
                  <div className="px-5 py-4 border-l border-slate-200 flex items-start gap-2">
                    <X className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                    <span className="text-sm text-slate-500">{row.traditional}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ── 6. Testimonials ── */}
        <section className="py-20 px-6 bg-white border-b border-slate-200/60">
          <div className="mx-auto max-w-4xl">
            <motion.div {...fadeUp()} className="text-center mb-12">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">What customers say</p>
              <h2 className="mt-3 text-4xl font-extrabold tracking-[-0.03em] text-midnight">Loved by tradies across Australia</h2>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <motion.div key={i} {...fadeUp(i * 0.08)}
                  className="rounded-[28px] border border-slate-200 bg-slate-50/60 p-8 flex flex-col gap-6">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(s => (
                      <svg key={s} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-[15px] leading-7 text-slate-700 italic flex-1">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <p className="text-sm font-bold text-midnight">{t.author}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{t.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. Final CTA ── */}
        <section className="py-24 px-6 bg-[linear-gradient(135deg,#0f172a_0%,#065f46_100%)]">
          <div className="mx-auto max-w-3xl text-center flex flex-col items-center gap-6">
            <motion.p {...fadeUp()} className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-400">
              Ready to start
            </motion.p>
            <motion.h2 {...fadeUp(0.04)} className="text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-white leading-tight text-balance">
              Give yourself an early mark today
            </motion.h2>
            <motion.p {...fadeUp(0.08)} className="text-lg text-white/65 leading-7 max-w-xl">
              Start with your own workflow, your own rules, and a setup that actually reflects how your business runs.
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

      </main>
      <Footer />
    </div>
  )
}
