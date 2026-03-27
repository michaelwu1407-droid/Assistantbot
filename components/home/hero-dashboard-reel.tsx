"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, CalendarDays, Inbox, LayoutDashboard, Map, Phone, Mail, FileText, CheckCircle2, Send } from "lucide-react";

const REEL_STEPS = [
    { label: "Chat", icon: Bot },
    { label: "Dashboard", icon: LayoutDashboard },
    { label: "Inbox", icon: Inbox },
    { label: "Map", icon: Map },
    { label: "Calendar", icon: CalendarDays },
];

// ── Status colours (match globals.css) ────────────────────────────────────────
const STATUS = {
    new: { dot: "#3B82F6", bg: "#EFF6FF", text: "#1D4ED8" },
    quote: { dot: "#F59E0B", bg: "#FFFBEB", text: "#B45309" },
    scheduled: { dot: "#00D28B", bg: "#E0FAF2", text: "#065F46" },
    awaiting: { dot: "#8B5CF6", bg: "#F5F3FF", text: "#5B21B6" },
    completed: { dot: "#6B7280", bg: "#F3F4F6", text: "#374151" },
};

// ── Shared sidebar ─────────────────────────────────────────────────────────────
function ReelSidebar({ active }: { active: string }) {
    return (
        <div className="w-11 shrink-0 flex flex-col items-center gap-1 py-3 bg-white border-r border-[#E5E7EB]">
            {REEL_STEPS.map(({ label, icon: Icon }) => {
                const isActive = label === active;
                return (
                    <div
                        key={label}
                        className="w-8 h-8 flex items-center justify-center rounded"
                        style={isActive ? { backgroundColor: "#E0FAF2" } : undefined}
                    >
                        <Icon
                            className="w-4 h-4"
                            style={{ color: isActive ? "#00D28B" : "#9ca3af" }}
                        />
                    </div>
                );
            })}
        </div>
    );
}

// ── Screen: Chat ──────────────────────────────────────────────────────────────
function ChatScreen() {
    const messages = [
        { from: "user", text: "Has Mrs Henderson called about the hot water job?" },
        { from: "tracey", text: "Yes — she called at 2:14 PM. I answered, collected the details, and logged it as a new request: Hot water replacement, 42 Elm St. Estimated $1,200–$1,600. Want me to send a quote?" },
        { from: "user", text: "Yes, send the quote at $1,400." },
        { from: "tracey", text: "Quote sent to Mrs Henderson for $1,400. I'll follow up in 24 hours if she hasn't responded. 📋" },
    ];
    return (
        <div className="h-full flex flex-row">
            <ReelSidebar active="Chat" />
            <div className="flex-1 flex flex-col bg-[#F7F8FA] p-3">
                {/* Frosted glass chat panel */}
                <div className="flex-1 flex flex-col rounded overflow-hidden bg-white/60 backdrop-blur-xl border border-white/50 shadow-lg">
                    {/* Header */}
                    <div className="flex items-center gap-2.5 px-4 py-3 border-b border-slate-200/60 bg-white/70">
                        <div className="w-7 h-7 rounded flex items-center justify-center" style={{ backgroundColor: "#E0FAF2" }}>
                            <Bot className="w-4 h-4" style={{ color: "#00D28B" }} />
                        </div>
                        <div>
                            <p className="text-xs font-semibold text-slate-900 leading-none">Ask Tracey</p>
                            <p className="text-[10px] mt-0.5 flex items-center gap-1" style={{ color: "#00D28B" }}>
                                <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ backgroundColor: "#00D28B" }} />
                                Online
                            </p>
                        </div>
                    </div>
                    {/* Messages */}
                    <div className="flex-1 flex flex-col justify-end gap-2.5 px-4 py-4 overflow-hidden">
                        {messages.map((m, i) => (
                            <div key={i} className={`flex gap-2 items-end ${m.from === "user" ? "flex-row-reverse" : ""}`}>
                                {m.from === "tracey" && (
                                    <div className="w-5 h-5 rounded flex items-center justify-center shrink-0" style={{ backgroundColor: "#E0FAF2" }}>
                                        <Bot className="w-3 h-3" style={{ color: "#00D28B" }} />
                                    </div>
                                )}
                                <div
                                    className={`px-3 py-2 text-xs leading-relaxed max-w-[78%] rounded-full ${
                                        m.from === "user"
                                            ? "text-white rounded-br-sm"
                                            : "text-slate-900 border border-slate-200/50 bg-white/80 rounded-bl-sm"
                                    }`}
                                    style={m.from === "user" ? { backgroundColor: "#00D28B" } : undefined}
                                >
                                    {m.text}
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Input */}
                    <div className="px-4 pb-3">
                        <div className="flex items-center gap-2 bg-white border border-slate-200/60 rounded-full px-3 py-2 shadow-sm">
                            <span className="text-xs text-slate-400 flex-1">Message Tracey…</span>
                            <div className="w-6 h-6 rounded-full flex items-center justify-center" style={{ backgroundColor: "#00D28B" }}>
                                <Send className="w-3 h-3 text-white" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Screen: Dashboard ─────────────────────────────────────────────────────────
const KANBAN_COLS = [
    {
        id: "new_request", label: "New request", color: STATUS.new,
        cards: [
            { title: "Hot water replacement", client: "Mrs Henderson", value: "$1,400" },
            { title: "Bathroom renovation", client: "T. Nguyen", value: "$8,200" },
        ],
    },
    {
        id: "scheduled", label: "Scheduled", color: STATUS.scheduled,
        cards: [
            { title: "Deck build", client: "J. Morrison", value: "$6,100" },
            { title: "Fence repair", client: "B. Clarke", value: "$2,400" },
        ],
    },
    {
        id: "completed", label: "Completed", color: STATUS.completed,
        cards: [
            { title: "Kitchen reno", client: "S. Wilson", value: "$4,200" },
        ],
    },
];

function DashboardScreen() {
    return (
        <div className="h-full flex flex-row">
            <ReelSidebar active="Dashboard" />
            <div className="flex-1 flex flex-col bg-[#F7F8FA] overflow-hidden relative">
                {/* Mint atmospheric glow */}
                <div className="absolute top-0 left-0 right-0 h-40 pointer-events-none z-0" style={{
                    background: "radial-gradient(80% 60% at 50% 0%, rgba(0,210,139,0.12) 0%, rgba(0,210,139,0) 100%)",
                }} />
                <div className="relative z-10 flex flex-col h-full p-2 gap-2">
                    {/* KPI strip */}
                    <div className="grid grid-cols-4 gap-1.5">
                        {[
                            { label: "March Revenue", value: "$14,280" },
                            { label: "Won with Tracey", value: "$8,400" },
                            { label: "Upcoming jobs", value: "6" },
                            { label: "Follow-up", value: "3", amber: true },
                        ].map((k) => (
                            <div key={k.label} className="bg-white rounded border border-[#E5E7EB] shadow-sm px-2.5 py-2 flex flex-col gap-0.5">
                                <span className="text-[8px] font-medium text-neutral-500 uppercase tracking-wide leading-none">{k.label}</span>
                                <span className={`text-base font-bold tracking-tight leading-none mt-0.5 ${k.amber ? "text-amber-600" : "text-neutral-900"}`}>{k.value}</span>
                            </div>
                        ))}
                    </div>
                    {/* Kanban */}
                    <div className="flex-1 grid grid-cols-3 gap-1.5 min-h-0">
                        {KANBAN_COLS.map((col) => (
                            <div key={col.id} className="bg-white rounded border border-[#E5E7EB] p-2 flex flex-col gap-1.5 overflow-hidden">
                                <div className="flex items-center gap-1.5">
                                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.color.dot }} />
                                    <span className="text-[10px] font-semibold text-neutral-700 truncate">{col.label}</span>
                                    <span className="ml-auto text-[9px] text-neutral-400 bg-neutral-100 px-1.5 py-0.5 rounded-full shrink-0">{col.cards.length}</span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    {col.cards.map((card) => (
                                        <div key={card.title} className="bg-neutral-50 border border-neutral-200 rounded px-2.5 py-2 border-l-2" style={{ borderLeftColor: col.color.dot }}>
                                            <p className="text-[10px] font-semibold text-neutral-800 truncate">{card.title}</p>
                                            <p className="text-[9px] text-neutral-500 truncate mt-0.5">{card.client}</p>
                                            <p className="text-[10px] font-bold mt-1" style={{ color: col.color.dot }}>{card.value}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Screen: Inbox ─────────────────────────────────────────────────────────────
const INBOX_ITEMS = [
    { icon: Phone, color: "#3B82F6", bg: "#EFF6FF", label: "Tracey answered", detail: "Hot water replacement · Mrs Henderson · $1,400", time: "2m ago" },
    { icon: Mail, color: "#00D28B", bg: "#E0FAF2", label: "Quote sent", detail: "Bathroom reno · T. Nguyen · $8,200", time: "18m ago" },
    { icon: Bot, color: "#8B5CF6", bg: "#F5F3FF", label: "Follow-up sent", detail: "Deck build · J. Morrison", time: "1h ago" },
    { icon: CheckCircle2, color: "#6B7280", bg: "#F3F4F6", label: "Job completed", detail: "Kitchen reno · S. Wilson · $4,200", time: "3h ago" },
    { icon: FileText, color: "#F59E0B", bg: "#FFFBEB", label: "Quote approved", detail: "Fence repair · B. Clarke · $2,400", time: "Yesterday" },
];

function InboxScreen() {
    return (
        <div className="h-full flex flex-row">
            <ReelSidebar active="Inbox" />
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between bg-white">
                    <div>
                        <p className="text-xs font-bold text-neutral-900">Activity Inbox</p>
                        <p className="text-[10px] text-neutral-500">All Tracey interactions</p>
                    </div>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: "#E0FAF2", color: "#065F46" }}>Live</span>
                </div>
                {/* Items */}
                <div className="flex-1 flex flex-col divide-y divide-neutral-100 overflow-hidden">
                    {INBOX_ITEMS.map((item, i) => {
                        const Icon = item.icon;
                        return (
                            <div key={i} className="flex items-start gap-3 px-4 py-2.5 hover:bg-neutral-50">
                                <div className="w-7 h-7 rounded flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: item.bg }}>
                                    <Icon className="w-3.5 h-3.5" style={{ color: item.color }} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-semibold text-neutral-800">{item.label}</p>
                                    <p className="text-[9px] text-neutral-500 truncate mt-0.5">{item.detail}</p>
                                </div>
                                <span className="text-[9px] text-neutral-400 shrink-0 mt-0.5">{item.time}</span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

// ── Screen: Map ───────────────────────────────────────────────────────────────
const MAP_PINS = [
    { x: "22%", y: "35%", label: "Hot water", color: "#3B82F6", num: 1 },
    { x: "54%", y: "52%", label: "Deck build", color: "#00D28B", num: 2 },
    { x: "72%", y: "28%", label: "Kitchen reno", color: "#6B7280", num: 3 },
];

function MapScreen() {
    return (
        <div className="h-full flex flex-row">
            <ReelSidebar active="Map" />
            <div className="flex-1 relative overflow-hidden" style={{
                background: "linear-gradient(135deg, #e8ede4 0%, #dce6d8 25%, #e4e8e0 50%, #d8e0d4 75%, #e0e8dc 100%)",
            }}>
                {/* Map tile grid overlay */}
                <div className="absolute inset-0 opacity-20" style={{
                    backgroundImage: "linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)",
                    backgroundSize: "48px 48px",
                }} />
                {/* Roads */}
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ opacity: 0.35 }}>
                    <path d="M 0 55 Q 40 50 55 52" stroke="#94a3b8" strokeWidth="3" fill="none" />
                    <path d="M 55 52 Q 65 40 72 28" stroke="#94a3b8" strokeWidth="3" fill="none" />
                    <path d="M 22 35 Q 38 43 55 52" stroke="#94a3b8" strokeWidth="3" fill="none" />
                    <path d="M 30 0 Q 28 30 22 35" stroke="#cbd5e1" strokeWidth="2" fill="none" />
                    <path d="M 60 0 Q 65 15 72 28" stroke="#cbd5e1" strokeWidth="2" fill="none" />
                    {/* Route line */}
                    <path d="M 22 35 Q 38 43 55 52 Q 65 40 72 28" stroke="#3B82F6" strokeWidth="2.5" fill="none" strokeDasharray="6 3" />
                </svg>
                {/* Pins */}
                {MAP_PINS.map((pin) => (
                    <div key={pin.num} className="absolute" style={{ left: pin.x, top: pin.y, transform: "translate(-50%, -50%)" }}>
                        <div className="relative flex flex-col items-center">
                            <div className="w-8 h-8 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: pin.color }}>
                                {pin.num}
                            </div>
                            <div className="mt-1 bg-white text-[9px] font-semibold text-neutral-700 px-2 py-0.5 rounded-full shadow-sm border border-neutral-200 whitespace-nowrap">
                                {pin.label}
                            </div>
                        </div>
                    </div>
                ))}
                {/* Badge */}
                <div className="absolute top-3 left-3 bg-white/95 backdrop-blur rounded border border-neutral-200 shadow-sm px-3 py-2">
                    <p className="text-[10px] font-semibold text-neutral-500 uppercase tracking-wide">Today</p>
                    <p className="text-base font-bold text-neutral-900 leading-none mt-0.5">3 jobs</p>
                </div>
                {/* Legend */}
                <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur rounded border border-neutral-200 shadow-sm px-3 py-2 flex flex-col gap-1.5">
                    {[{ color: "#3B82F6", label: "New" }, { color: "#00D28B", label: "Scheduled" }, { color: "#6B7280", label: "Done" }].map((l) => (
                        <div key={l.label} className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: l.color }} />
                            <span className="text-[9px] text-neutral-600">{l.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ── Screen: Calendar ──────────────────────────────────────────────────────────
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const HOURS = ["7am", "8am", "9am", "10am", "11am", "12pm", "1pm", "2pm", "3pm", "4pm", "5pm"];

const CAL_JOBS = [
    { day: 1, startHour: 1, duration: 2, label: "Hot water repl.", client: "Henderson", color: "#3B82F6", bg: "#EFF6FF" },
    { day: 0, startHour: 2, duration: 3, label: "Kitchen reno", client: "S. Wilson", color: "#6B7280", bg: "#F3F4F6" },
    { day: 2, startHour: 2, duration: 2, label: "Deck build", client: "J. Morrison", color: "#00D28B", bg: "#E0FAF2" },
    { day: 3, startHour: 4, duration: 2, label: "Fence repair", client: "B. Clarke", color: "#F59E0B", bg: "#FFFBEB" },
    { day: 4, startHour: 1, duration: 3, label: "Bathroom reno", client: "T. Nguyen", color: "#8B5CF6", bg: "#F5F3FF" },
];

function CalendarScreen() {
    const CELL_H = 22;
    return (
        <div className="h-full flex flex-row">
            <ReelSidebar active="Calendar" />
            <div className="flex-1 flex flex-col bg-white overflow-hidden">
                {/* Day headers */}
                <div className="flex border-b border-[#E5E7EB]">
                    <div className="w-10 shrink-0" />
                    {DAYS.map((d) => (
                        <div key={d} className="flex-1 text-center py-2 text-[10px] font-semibold text-neutral-500 border-l border-neutral-100">
                            {d}
                        </div>
                    ))}
                </div>
                {/* Grid */}
                <div className="flex-1 flex overflow-hidden relative">
                    {/* Time labels */}
                    <div className="w-10 shrink-0 flex flex-col">
                        {HOURS.map((h) => (
                            <div key={h} className="flex-1 flex items-start justify-end pr-1.5 pt-0.5">
                                <span className="text-[8px] text-neutral-400">{h}</span>
                            </div>
                        ))}
                    </div>
                    {/* Day columns */}
                    <div className="flex-1 flex relative">
                        {DAYS.map((d, di) => (
                            <div key={d} className="flex-1 border-l border-neutral-100 relative">
                                {HOURS.map((_, hi) => (
                                    <div key={hi} className="border-b border-neutral-50" style={{ height: CELL_H }} />
                                ))}
                                {/* Job blocks */}
                                {CAL_JOBS.filter((j) => j.day === di).map((j, ji) => (
                                    <div
                                        key={ji}
                                        className="absolute inset-x-0.5 rounded px-1.5 py-1 overflow-hidden"
                                        style={{
                                            top: j.startHour * CELL_H,
                                            height: j.duration * CELL_H - 2,
                                            backgroundColor: j.bg,
                                            borderLeft: `2px solid ${j.color}`,
                                        }}
                                    >
                                        <p className="text-[8px] font-bold truncate leading-tight" style={{ color: j.color }}>{j.label}</p>
                                        <p className="text-[7px] text-neutral-500 truncate">{j.client}</p>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Reel ──────────────────────────────────────────────────────────────────────
const SCREENS = [ChatScreen, DashboardScreen, InboxScreen, MapScreen, CalendarScreen];
const INTERVAL_MS = 3500;

export function HeroDashboardReel({ className = "" }: { className?: string }) {
    const [active, setActive] = useState(0);

    const advance = useCallback(() => setActive((i) => (i + 1) % SCREENS.length), []);

    useEffect(() => {
        const t = setInterval(advance, INTERVAL_MS);
        return () => clearInterval(t);
    }, [advance]);

    const jump = (i: number) => setActive(i);

    const ActiveScreen = SCREENS[active];

    return (
        <div className={`relative mx-auto w-full max-w-[1120px] ${className}`}>
            {/* Ambient glows */}
            <div className="absolute inset-x-[10%] top-6 -z-10 h-28 rounded-full bg-emerald-400/18 blur-3xl" />
            <div className="absolute inset-x-[18%] bottom-0 -z-10 h-24 rounded-full bg-cyan-300/16 blur-3xl" />

            <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="relative overflow-hidden rounded border border-white/55 bg-white/55 shadow-[0_28px_90px_rgba(15,23,42,0.16)] backdrop-blur-xl"
            >
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.52)_0%,rgba(255,255,255,0.18)_18%,rgba(255,255,255,0)_36%)] pointer-events-none" />
                <div className="absolute inset-x-0 top-0 h-px bg-white/80 pointer-events-none" />

                {/* Browser chrome */}
                <div className="flex items-center justify-between gap-4 border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94)_0%,rgba(241,245,249,0.88)_100%)] px-4 py-3 sm:px-5">
                    <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full bg-rose-400/90" />
                        <span className="h-3 w-3 rounded-full bg-amber-400/90" />
                        <span className="h-3 w-3 rounded-full bg-emerald-400/90" />
                    </div>
                    <div className="min-w-0 flex-1 px-2">
                        <div className="mx-auto w-fit max-w-full rounded-full border border-slate-200/80 bg-white/88 px-4 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500 shadow-sm">
                            earlymark.ai/crm
                        </div>
                    </div>
                    <div className="hidden items-center gap-1.5 rounded-full border border-emerald-200/80 bg-emerald-50/90 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-700 sm:flex">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live demo
                    </div>
                </div>

                {/* Step pills */}
                <div className="border-b border-slate-200/70 bg-[linear-gradient(180deg,rgba(247,250,252,0.94)_0%,rgba(240,249,244,0.74)_100%)] px-4 py-3 sm:px-5">
                    <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                        {REEL_STEPS.map(({ label, icon: Icon }, idx) => {
                            const isActive = idx === active;
                            return (
                                <button
                                    key={label}
                                    onClick={() => jump(idx)}
                                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] transition-all duration-200 ${
                                        isActive
                                            ? "border-emerald-400/60 bg-emerald-50 text-emerald-700 shadow-sm"
                                            : "border-white/80 bg-white/78 text-slate-600 shadow-sm hover:bg-white"
                                    }`}
                                >
                                    <Icon className={`h-3.5 w-3.5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                                    <span>{label}</span>
                                    {idx < REEL_STEPS.length - 1 ? <span className="text-slate-300">/</span> : null}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Screen area */}
                <div className="relative overflow-hidden" style={{ height: 380 }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={active}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                            className="absolute inset-0"
                        >
                            <ActiveScreen />
                        </motion.div>
                    </AnimatePresence>
                </div>
            </motion.div>
        </div>
    );
}
