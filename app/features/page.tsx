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
import { PlatformDiagram } from "@/components/home/platform-diagram"
import { SectionHead } from "@/components/marketing/section-head"

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
    quote: "It picked up while I was on site and the job details were already there when I got back to the ute.",
    author: "Mark S.",
    role: "Plumbing Contractor",
  },
  {
    quote: "The follow-ups are the part I notice most. Jobs keep moving without me doing admin at night.",
    author: "Sarah J.",
    role: "Electrical Services",
  },
  {
    quote: "Customers get a quick answer instead of voicemail. It makes the business feel more organised straight away.",
    author: "Dave W.",
    role: "Landscaping & Design",
  },
]

const PRODUCT_AREAS = [
  {
    icon: Phone,
    label: "Voice front desk",
    detail: "Answers inbound calls, captures the job, and records the full context.",
  },
  {
    icon: Mail,
    label: "Inbox and messages",
    detail: "Keeps SMS, email, web enquiries, and Tracey actions in one timeline.",
  },
  {
    icon: Calendar,
    label: "Scheduling",
    detail: "Books, confirms, reminds, and reschedules around your availability.",
  },
  {
    icon: FileText,
    label: "Quotes and invoices",
    detail: "Drafts follow-ups, tracks quote status, and keeps payment chasing visible.",
  },
  {
    icon: MapPin,
    label: "Jobs and routing",
    detail: "Shows where work is happening so the day is planned geographically.",
  },
  {
    icon: ShieldCheck,
    label: "Rules and approvals",
    detail: "Controls what Tracey can do alone and what needs your sign-off.",
  },
]

const OPERATING_MODES = [
  {
    mode: "Capture",
    owner: "Tracey gathers details",
    outcome: "Lead, contact, job, and transcript are filed automatically.",
  },
  {
    mode: "Draft",
    owner: "Tracey prepares the next step",
    outcome: "You review the quote, message, or action before it goes out.",
  },
  {
    mode: "Act",
    owner: "Tracey executes within your rules",
    outcome: "Routine confirmations, reminders, and follow-ups happen without admin.",
  },
]

// ─── Feature mockup panels ────────────────────────────────────────────────────

/** Shared mini sidebar for all feature mockups */
function MockupSidebar({ active }: { active: "chat" | "dashboard" | "inbox" | "map" | "calendar" | "contacts" }) {
  const items = [
    { id: "chat", icon: Bot },
    { id: "dashboard", icon: MessageSquare },
    { id: "inbox", icon: Mail },
    { id: "map", icon: MapPin },
    { id: "calendar", icon: Calendar },
  ] as const
  return (
    <div className="w-10 shrink-0 flex flex-col items-center gap-1 py-3 bg-card border-r border-[#E5E7EB]">
      {items.map(({ id, icon: Icon }) => (
        <div key={id} className="w-7 h-7 flex items-center justify-center rounded"
          style={id === active ? { backgroundColor: "#E0FAF2" } : undefined}>
          <Icon className="w-3.5 h-3.5" style={{ color: id === active ? "#00D28B" : "#9ca3af" }} />
        </div>
      ))}
    </div>
  )
}

/** 1 · Customer communication — frosted glass chat */
function MockupComms() {
  return (
    <div className="h-full flex flex-row overflow-hidden">
      <MockupSidebar active="chat" />
      <div className="flex-1 flex flex-col bg-[#F7F8FA] p-2">
        <div className="flex-1 flex flex-col rounded overflow-hidden bg-card/70 backdrop-blur border border-white/50 shadow">
          <div className="flex items-center gap-2 px-3 py-2.5 border-b border-border/60 bg-card/70">
            <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: "#E0FAF2" }}>
              <Bot className="w-3.5 h-3.5" style={{ color: "#00D28B" }} />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-foreground leading-none">Ask Tracey</p>
              <p className="text-[9px] mt-0.5 flex items-center gap-1" style={{ color: "#00D28B" }}>
                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: "#00D28B" }} />
                Online
              </p>
            </div>
          </div>
          <div className="flex-1 flex flex-col justify-end gap-2 px-3 py-3 overflow-hidden">
            {[
              { from: "system", text: "📞 Incoming call — +61 412 345 678" },
              { from: "tracey", text: "Hi, thanks for calling! I'm Tracey. How can I help?" },
              { from: "customer", text: "My hot water stopped working this morning." },
              { from: "tracey", text: "Logged: Hot water fault · 42 Elm St. Booking confirmation on its way. ✅" },
            ].map((m, i) => (
              <div key={i} className={`flex gap-1.5 items-end ${m.from === "customer" ? "flex-row-reverse" : ""}`}>
                {m.from === "tracey" && (
                  <div className="w-4 h-4 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: "#E0FAF2" }}>
                    <Bot className="w-2.5 h-2.5" style={{ color: "#00D28B" }} />
                  </div>
                )}
                <div className={`px-2.5 py-1.5 text-[10px] leading-relaxed max-w-[82%] rounded-full ${
                  m.from === "customer" ? "text-white rounded-br-sm"
                  : m.from === "system" ? "bg-blue-50 text-blue-600 text-center w-full rounded"
                  : "text-foreground border border-border/50 bg-card/90 rounded-bl-sm"
                }`}
                  style={m.from === "customer" ? { backgroundColor: "#00D28B" } : undefined}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>
          <div className="px-3 pb-2.5">
            <div className="flex items-center gap-1.5 bg-card border border-border/60 rounded-full px-3 py-1.5">
              <span className="text-[10px] text-muted-foreground flex-1">Message Tracey…</span>
              <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: "#00D28B" }}>
                <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** 2 · CRM operations — kanban board */
function MockupCRM() {
  const cols = [
    { label: "New", dot: "#3B82F6", cards: [{ title: "Hot water replacement", client: "Mrs Henderson", value: "$1,400" }, { title: "Bathroom reno", client: "T. Nguyen", value: "$8,200" }] },
    { label: "Scheduled", dot: "#00D28B", cards: [{ title: "Deck build", client: "J. Morrison", value: "$6,100" }, { title: "Fence repair", client: "B. Clarke", value: "$2,400" }] },
    { label: "Complete", dot: "#6B7280", cards: [{ title: "Kitchen reno", client: "S. Wilson", value: "$4,200" }] },
  ]
  return (
    <div className="h-full flex flex-row overflow-hidden">
      <MockupSidebar active="dashboard" />
      <div className="flex-1 flex flex-col bg-[#F7F8FA] overflow-hidden relative">
        <div className="absolute top-0 left-0 right-0 h-32 pointer-events-none z-0"
          style={{ background: "radial-gradient(80% 60% at 50% 0%, rgba(0,210,139,0.10) 0%, rgba(0,210,139,0) 100%)" }} />
        <div className="relative z-10 flex flex-col h-full p-2 gap-2">
          <div className="grid grid-cols-3 gap-1.5">
            {[{ label: "March Revenue", value: "$14,280" }, { label: "Won with Tracey", value: "$8,400" }, { label: "Upcoming", value: "6 jobs" }].map(k => (
              <div key={k.label} className="bg-card rounded border border-[#E5E7EB] px-2 py-1.5">
                <span className="text-[8px] text-neutral-500 uppercase tracking-wide block">{k.label}</span>
                <span className="text-sm font-bold text-neutral-900">{k.value}</span>
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-3 gap-1.5 min-h-0">
            {cols.map(col => (
              <div key={col.label} className="bg-card rounded border border-[#E5E7EB] p-2 flex flex-col gap-1.5 overflow-hidden">
                <div className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: col.dot }} />
                  <span className="text-[10px] font-semibold text-neutral-700 truncate">{col.label}</span>
                  <span className="ml-auto text-[9px] text-neutral-400 bg-neutral-100 px-1 py-0.5 rounded-full">{col.cards.length}</span>
                </div>
                {col.cards.map(card => (
                  <div key={card.title} className="bg-neutral-50 border border-neutral-200 rounded px-2 py-1.5 border-l-2" style={{ borderLeftColor: col.dot }}>
                    <p className="text-[10px] font-semibold text-neutral-800 truncate">{card.title}</p>
                    <p className="text-[9px] text-neutral-500 truncate">{card.client}</p>
                    <p className="text-[10px] font-bold mt-0.5" style={{ color: col.dot }}>{card.value}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
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
    <div className="h-full flex flex-row overflow-hidden">
      <MockupSidebar active="calendar" />
      <div className="flex-1 flex flex-col bg-card overflow-hidden">
        <div className="flex border-b border-[#E5E7EB]">
          <div className="w-10 shrink-0" />
          {days.map(d => (
            <div key={d} className="flex-1 text-center py-2.5 text-[10px] font-semibold text-muted-foreground border-l border-neutral-100">{d}</div>
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
                  <div key={ji} className="absolute inset-x-0.5 rounded px-1.5 py-1 overflow-hidden"
                    style={{ top: j.start * H, height: j.dur * H - 2, backgroundColor: j.bg, borderLeft: `2.5px solid ${j.color}` }}>
                    <p className="text-[8px] font-bold leading-tight truncate" style={{ color: j.color }}>{j.label}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
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
    <div className="h-full flex flex-row overflow-hidden">
      <MockupSidebar active="inbox" />
      <div className="flex-1 flex flex-col bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between bg-card">
          <div>
            <p className="text-xs font-bold text-foreground">Activity Inbox</p>
            <p className="text-[10px] text-muted-foreground">All Tracey actions · today</p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E0FAF2", color: "#065F46" }}>● Live</span>
        </div>
        <div className="flex-1 flex flex-col divide-y divide-neutral-100 overflow-hidden">
          {items.map((item, i) => {
            const Icon = item.icon
            return (
              <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-neutral-50">
                <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: item.bg }}>
                  <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-semibold text-foreground">{item.label}</p>
                  <p className="text-[9px] text-muted-foreground truncate mt-0.5">{item.detail}</p>
                </div>
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full shrink-0"
                  style={{ color: item.color, backgroundColor: item.bg }}>{item.badge}</span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

/** 5 · Job map & routing */
function MockupMap() {
  const pins = [
    { x: "28%", y: "38%", label: "Hot water", color: "#3B82F6", num: 1 },
    { x: "58%", y: "55%", label: "Deck build", color: "#00D28B", num: 2 },
    { x: "76%", y: "30%", label: "Kitchen reno", color: "#6B7280", num: 3 },
  ]
  return (
    <div className="h-full flex flex-row overflow-hidden">
      <MockupSidebar active="map" />
      <div className="flex-1 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#e8ede4 0%,#dce6d8 40%,#e0e8dc 100%)" }}>
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: "linear-gradient(#94a3b8 1px,transparent 1px),linear-gradient(90deg,#94a3b8 1px,transparent 1px)", backgroundSize: "44px 44px" }} />
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ opacity: 0.35 }}>
          <path d="M 28 38 Q 43 47 58 55" stroke="#94a3b8" strokeWidth="3" fill="none" />
          <path d="M 58 55 Q 68 42 76 30" stroke="#94a3b8" strokeWidth="3" fill="none" />
          <path d="M 28 38 Q 43 47 58 55 Q 68 42 76 30" stroke="#3B82F6" strokeWidth="2.5" fill="none" strokeDasharray="6 3" />
        </svg>
        {pins.map(p => (
          <div key={p.num} className="absolute" style={{ left: p.x, top: p.y, transform: "translate(-50%,-50%)" }}>
            <div className="flex flex-col items-center">
              <div className="w-7 h-7 rounded-full border-2 border-white shadow flex items-center justify-center text-white text-[9px] font-bold" style={{ backgroundColor: p.color }}>{p.num}</div>
              <div className="mt-0.5 bg-card text-[8px] font-semibold text-foreground px-1.5 py-0.5 rounded-full shadow-sm border border-neutral-200 whitespace-nowrap">{p.label}</div>
            </div>
          </div>
        ))}
        <div className="absolute top-2 left-2 bg-card/95 rounded border border-neutral-200 shadow-sm px-2.5 py-1.5">
          <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">Today</p>
          <p className="text-sm font-bold text-foreground leading-none mt-0.5">3 jobs</p>
        </div>
        <div className="absolute bottom-2 right-2 bg-card/95 rounded border border-neutral-200 shadow-sm px-2.5 py-1.5 flex flex-col gap-1">
          {[{ color: "#3B82F6", label: "New" }, { color: "#00D28B", label: "Scheduled" }, { color: "#6B7280", label: "Done" }].map(l => (
            <div key={l.label} className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: l.color }} />
              <span className="text-[8px] text-muted-foreground">{l.label}</span>
            </div>
          ))}
        </div>
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
    <div className="h-full flex flex-row overflow-hidden">
      <MockupSidebar active="contacts" />
      <div className="flex-1 flex flex-col bg-[#F7F8FA] p-4 gap-3 overflow-hidden">
        <div className="mb-1">
          <p className="text-xs font-bold text-foreground">Tracey permissions</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">Control exactly what Tracey can do</p>
        </div>
        {settings.map((s, i) => (
          <div key={i} className="flex items-center justify-between bg-card border border-[#E5E7EB] rounded px-3 py-2.5 shadow-sm">
            <span className="text-[11px] font-medium text-foreground pr-3 leading-snug">{s.label}</span>
            <div className={`w-9 h-5 rounded-full flex items-center px-0.5 shrink-0 ${s.on ? "bg-emerald-500 justify-end" : "bg-neutral-300 justify-start"}`}>
              <div className="w-4 h-4 rounded-full bg-card shadow-sm" />
            </div>
          </div>
        ))}
        <div className="mt-auto flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded px-3 py-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="text-[11px] text-emerald-700 font-medium">Changes sync to Tracey instantly</span>
        </div>
      </div>
    </div>
  )
}

const FEATURE_MOCKUPS = [MockupComms, MockupCRM, MockupCalendar, MockupInbox, MockupMap, MockupControl]

// ─── Placeholder export — sections added in subsequent tasks ──────────────────

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <Navbar />
      <main>

        {/* ── 1. Hero ── */}
        <section className="em-grain relative overflow-hidden bg-cream px-5 sm:px-8 pt-24 sm:pt-28 pb-20 sm:pb-28">
          <div className="relative z-10 mx-auto max-w-[1320px]">
            <motion.div {...fadeUp()} className="flex items-center justify-between gap-4 border-t border-hair pt-3.5">
              <span className="em-kicker text-forest">§ The platform</span>
              <span className="em-kicker hidden text-ink2/55 sm:inline">Assistant + CRM</span>
              <span className="em-kicker text-ink2/55">Australia</span>
            </motion.div>
            <div className="mt-12 grid gap-x-8 gap-y-10 sm:mt-16 md:grid-cols-12 md:items-end">
              <motion.h1 {...fadeUp(0.06)} className="em-display col-span-12 text-[clamp(2.5rem,7vw,6rem)] text-ink md:col-span-8">
                An AI assistant.<br />A CRM that <span className="italic text-forest">runs itself</span>.
              </motion.h1>
              <motion.div {...fadeUp(0.12)} className="col-span-12 flex flex-col gap-6 md:col-span-4 md:pb-2">
                <p className="max-w-sm text-[15px] leading-relaxed text-ink2">
                  One platform with two halves: an AI voice assistant that picks up every call and text, and a full CRM that fills itself in as she works.
                </p>
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Link href="/auth"><Button size="lg" variant="mint">Get started <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
                  <Link href="/contact#contact-form"><Button size="lg" variant="outline">Get a demo</Button></Link>
                </div>
              </motion.div>
            </div>

            {/* Plate 01 — the reel framed as a figure */}
            <motion.figure {...fadeUp(0.16)} className="relative mt-14 sm:mt-20">
              <figcaption className="flex items-center justify-between gap-4 border-t border-hair pt-3 pb-5">
                <span className="em-kicker text-forest">Plate 01</span>
                <span className="em-figcaption text-right">The operating surface — chat, inbox, map &amp; calendar</span>
              </figcaption>
              <HeroDashboardReel />
            </motion.figure>
          </div>
        </section>

        {/* ── 1.5 Platform diagram ── */}
        <section className="py-16 md:py-24 px-5 sm:px-8 bg-cream">
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

        {/* ── 2. Core jobs ── */}
        <section className="py-16 md:py-24 px-5 sm:px-8 bg-paper">
          <div className="mx-auto max-w-[1320px]">
            <SectionHead
              index="§02 — The system"
              kicker="The whole job lifecycle"
              title={<>More than a call bot.</>}
              lead="The operating surface: what Tracey touches, where the CRM fills in, and how you keep control."
            />

            <div className="grid gap-4 md:grid-cols-3">
              {PRODUCT_AREAS.map(({ icon: Icon, label, detail }, i) => (
                <motion.div
                  key={label}
                  {...fadeUp(i * 0.04)}
                  className="rounded border border-hair bg-card p-5 shadow-sm"
                >
                  <div className="mb-4 flex h-10 w-10 items-center justify-center rounded bg-primary-subtle">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="text-base font-bold" style={{ color: "var(--color-ink)" }}>{label}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p>
                </motion.div>
              ))}
            </div>

            <motion.div {...fadeUp(0.1)} className="mt-10 overflow-hidden rounded border border-hair bg-card shadow-sm">
              <div className="grid md:grid-cols-3">
                {OPERATING_MODES.map((mode) => (
                  <div key={mode.mode} className="border-b border-border p-6 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0">
                    <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-primary">{mode.mode}</p>
                    <h3 className="mt-3 text-lg font-display font-semibold" style={{ color: "var(--color-ink)" }}>{mode.owner}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{mode.outcome}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Comparison table */}
        <section className="py-20 px-6 bg-cream">
          <div className="mx-auto max-w-4xl">
            <motion.div {...fadeUp()} className="text-center mb-12">
              <h2 className="mt-3 text-4xl font-display font-semibold tracking-[-0.01em]" style={{ color: "var(--color-ink)" }}>Earlymark vs. the traditional setup</h2>
              <p className="mt-3 text-base text-muted-foreground">Phone + paper + spreadsheet + late-night follow-ups, vs. one AI that handles it all.</p>
            </motion.div>

            <motion.div {...fadeUp(0.06)} className="grid gap-4 md:hidden">
              {COMPARISON_ROWS.map((row) => (
                <div key={row.task} className="rounded border border-hair bg-card p-5 shadow-sm">
                  <h3 className="text-base font-bold" style={{ color: "var(--color-ink)" }}>{row.task}</h3>
                  <div className="mt-4 grid gap-3">
                    <div className="rounded border border-hair bg-primary-subtle/50 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-primary">Earlymark</p>
                      <div className="mt-2 flex items-start gap-2">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                        <span className="text-sm leading-6 text-foreground">{row.earlymark}</span>
                      </div>
                    </div>
                    <div className="rounded border border-hair bg-muted/30 p-3">
                      <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Traditional</p>
                      <div className="mt-2 flex items-start gap-2">
                        <X className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                        <span className="text-sm leading-6 text-muted-foreground">{row.traditional}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </motion.div>

            <motion.div {...fadeUp(0.06)} className="hidden overflow-x-auto rounded border border-hair shadow-sm md:block">
              <div className="min-w-[760px]">
                <div className="grid grid-cols-3 bg-midnight text-white">
                  <div className="px-5 py-4 text-sm font-semibold text-white/60">Task</div>
                  <div className="px-5 py-4 text-sm font-semibold text-mint-500 border-l border-white/10">Earlymark</div>
                  <div className="px-5 py-4 text-sm font-semibold text-white/60 border-l border-white/10">Traditional</div>
                </div>
                {COMPARISON_ROWS.map((row, i) => (
                  <div key={row.task} className={`grid grid-cols-3 ${i % 2 === 0 ? "bg-card" : "bg-muted/30"} border-t border-hair`}>
                    <div className="px-5 py-4 text-sm font-semibold" style={{ color: "var(--color-ink)" }}>{row.task}</div>
                    <div className="px-5 py-4 border-l border-hair flex items-start gap-2">
                      <Check className="w-4 h-4 text-forest mt-0.5 shrink-0" />
                      <span className="text-sm text-foreground">{row.earlymark}</span>
                    </div>
                    <div className="px-5 py-4 border-l border-hair flex items-start gap-2">
                      <X className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
                      <span className="text-sm text-muted-foreground">{row.traditional}</span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        <section className="py-10 md:py-20 px-6 bg-paper">
          <div className="mx-auto max-w-5xl">
            <div className="grid md:grid-cols-3 gap-6">
              {CORE_JOBS.map((job, i) => {
                const Icon = job.icon
                return (
                  <motion.div key={job.num} {...fadeUp(i * 0.07)}
                    className="rounded border border-hair bg-card p-6 flex flex-col gap-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300">
                    <div className="flex items-center gap-3">
                      <span className="text-[11px] font-bold text-primary/60 tracking-wider">{job.num}</span>
                      <div className="w-10 h-10 rounded bg-primary-subtle flex items-center justify-center">
                        <Icon className="w-5 h-5 text-primary" />
                      </div>
                    </div>
                    <div>
                      <h3 className="text-base font-bold" style={{ color: "var(--color-ink)" }}>{job.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{job.desc}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── 3. Feature deep dives — split by AI vs CRM ── */}
        {([
          {
            key: "ai",
            heading: "The AI Voice Assistant",
            blurb: "Tracey answers every call and text 24/7, qualifies the lead against your rules, and writes everything she does into the CRM.",
            indices: [0, 3, 5],
          },
          {
            key: "crm",
            heading: "The CRM that runs itself",
            blurb: "A full-featured CRM that auto-fills as Tracey works — pipeline, scheduling, invoicing and analytics, all driven by chat or WhatsApp.",
            indices: [1, 2, 4],
          },
        ] as const).map((group, groupIdx) => (
          <div key={group.key}>
            <section className={`px-6 pt-20 pb-6 ${groupIdx === 0 ? "bg-paper" : "bg-cream"}`}>
              <div className="mx-auto max-w-6xl text-center">
                <motion.h2 {...fadeUp(0.04)} className="text-3xl md:text-5xl font-display font-semibold tracking-[-0.01em]" style={{ color: "var(--color-ink)" }}>
                  {group.heading}
                </motion.h2>
                <motion.p {...fadeUp(0.08)} className="mx-auto mt-3 max-w-2xl text-base leading-7 text-muted-foreground">
                  {group.blurb}
                </motion.p>
              </div>
            </section>
            {group.indices.map((i, localIdx) => {
              const feat = FEATURES[i]
              const Mockup = FEATURE_MOCKUPS[i]
              const isEven = localIdx % 2 === 0
              const bg = groupIdx === 0
                ? (isEven ? "bg-paper" : "bg-cream")
                : (isEven ? "bg-cream" : "bg-paper")
              return (
                <section key={feat.eyebrow} className={`py-16 px-6 ${bg}`}>
                  <div className="mx-auto max-w-6xl grid md:grid-cols-2 gap-10 lg:gap-16 items-center">
                    <motion.div {...fadeUp()} className={!isEven ? "md:order-2" : ""}>
                      <h3 className="mt-3 text-3xl md:text-4xl font-display font-semibold tracking-[-0.01em] leading-tight" style={{ color: "var(--color-ink)" }}>{feat.title}</h3>
                      <p className="mt-4 text-base leading-7 text-muted-foreground">{feat.body}</p>
                      <ul className="mt-6 space-y-3">
                        {feat.bullets.map(b => (
                          <li key={b} className="flex items-start gap-3 text-sm leading-6 text-foreground">
                            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                      {i === 3 && (
                        <div className="mt-6 flex items-start gap-3 rounded-xl border border-hair bg-primary-subtle/60 px-4 py-3.5">
                          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-forest" />
                          <p className="text-sm leading-6 text-foreground">
                            <span className="font-semibold">Works with services marketplaces too.</span>{" "}
                            Tracey monitors your inbox for lead notifications from hipages, ServiceSeeking, Oneflare and more — so no enquiry slips through, even when it arrives as an email.
                          </p>
                        </div>
                      )}
                    </motion.div>
                    <motion.div {...fadeUp(0.08)} className={`h-[260px] sm:h-[320px] md:h-[360px] rounded overflow-hidden shadow-[0_8px_48px_rgba(15,23,42,0.12)] ${!isEven ? "md:order-1" : ""}`}>
                      {Mockup && <Mockup />}
                    </motion.div>
                  </div>
                </section>
              )
            })}
          </div>
        ))}

        {/* ── 4. How it works ── */}
        <section className="py-20 px-6 bg-paper">
          <div className="mx-auto max-w-5xl">
            <motion.div {...fadeUp()} className="text-center mb-14">
              <h2 className="mt-3 text-4xl font-display font-semibold tracking-[-0.01em]" style={{ color: "var(--color-ink)" }}>Up and running in under a day</h2>
            </motion.div>
            <div className="grid md:grid-cols-3 gap-6 relative">
              {/* connecting line — desktop only */}
              <div className="hidden md:block absolute top-10 left-[calc(16.7%+20px)] right-[calc(16.7%+20px)] h-px bg-gradient-to-r from-hair via-mint-500/40 to-hair" />
              {HOW_IT_WORKS.map((step, i) => {
                const Icon = step.icon
                return (
                  <motion.div key={step.num} {...fadeUp(i * 0.1)}
                    className="relative flex flex-col items-center text-center p-7 rounded bg-card border border-hair">
                    <div className="w-14 h-14 rounded bg-card border border-hair shadow-sm flex items-center justify-center mb-5 relative z-10">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <span className="text-[11px] font-bold text-primary/60 tracking-widest mb-2">{step.num}</span>
                    <h3 className="text-base font-bold" style={{ color: "var(--color-ink)" }}>{step.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.desc}</p>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── 6. Testimonials ── */}
        <section className="py-20 px-6 bg-cream">
          <div className="mx-auto max-w-4xl">
            <motion.div {...fadeUp()} className="text-center mb-12">
              <h2 className="mt-3 text-4xl font-display font-semibold tracking-[-0.01em]" style={{ color: "var(--color-ink)" }}>Loved by tradies across Australia</h2>
            </motion.div>
            <div className="grid md:grid-cols-2 gap-6">
              {TESTIMONIALS.map((t, i) => (
                <motion.div key={i} {...fadeUp(i * 0.08)}
                  className="rounded border border-hair bg-card p-8 flex flex-col gap-6">
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(s => (
                      <svg key={s} className="w-4 h-4 text-amber-400 fill-current" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-[15px] leading-7 text-foreground italic flex-1">&ldquo;{t.quote}&rdquo;</p>
                  <div>
                    <p className="text-sm font-bold" style={{ color: "var(--color-ink)" }}>{t.author}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.role}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. Final CTA ── */}
        <section className="relative overflow-hidden py-16 md:py-28 px-6 bg-forest">
          <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(70% 60% at 50% 120%, rgba(0,210,139,0.18) 0%, transparent 70%)" }} />
          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="relative mx-auto max-w-3xl text-center flex flex-col items-center gap-6">
            <motion.h2 {...fadeUp(0.04)} className="font-display text-4xl md:text-5xl font-semibold tracking-[-0.01em] text-paper leading-[1.05] text-balance">
              Give yourself an <span className="italic text-mint-500">early mark</span> today
            </motion.h2>
            <motion.p {...fadeUp(0.08)} className="text-lg text-paper/65 leading-7 max-w-xl">
              Start with your own workflow, your own rules, and a setup that actually reflects how your business runs.
            </motion.p>
            <motion.div {...fadeUp(0.12)} className="flex flex-col sm:flex-row gap-3">
              <Link href="/auth">
                <Button size="lg" variant="mint">
                  Get started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/contact#contact-form">
                <Button size="lg" variant="ghost" className="text-paper border border-white/25 hover:bg-white/10 hover:text-white">
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
