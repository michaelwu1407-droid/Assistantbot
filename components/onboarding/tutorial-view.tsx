"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { ArrowRight, Check, Send, DollarSign, Calendar, AlertCircle, TrendingUp, Clock, AlertTriangle, Plus } from "lucide-react"
import Link from "next/link"
import { useIndustry } from "@/components/providers/industry-provider"

// ─── Mock Data by Industry ─────────────────────────────────────────

function getMockData(industry: string | null) {
    if (industry === "TRADES") {
        return {
            columns: [
                {
                    title: "New Lead", color: "bg-blue-500", deals: [
                        { title: "Bathroom Reno", company: "Smith Family", value: 12000, status: "healthy", days: 1, initials: "SF" },
                    ]
                },
                {
                    title: "Quoted", color: "bg-indigo-500", deals: [
                        { title: "Kitchen Reno", company: "Johnson Home", value: 28000, status: "healthy", days: 3, initials: "JH" },
                    ]
                },
                {
                    title: "In Progress", color: "bg-amber-500", deals: [
                        { title: "Deck Build", company: "Williams", value: 8500, status: "stale", days: 9, initials: "WI" },
                        { title: "Fence Repair", company: "Brown House", value: 3200, status: "healthy", days: 2, initials: "BH" },
                    ]
                },
                {
                    title: "Invoiced", color: "bg-purple-500", deals: [
                        { title: "Plumbing Fix", company: "Davis Estate", value: 4500, status: "rotting", days: 16, initials: "DE" },
                    ]
                },
                { title: "Paid", color: "bg-emerald-500", deals: [] },
            ],
            stats: { total: "$56,200", healthy: 3, stale: 1, rotting: 1 },
            steps: [
                {
                    highlight: "pipeline",
                    title: "Your Job Pipeline",
                    subtitle: "This is your pipeline in Advanced Mode. Every column is a stage of your workflow.",
                    chatMessages: [
                        { role: "user" as const, text: "Show me my jobs" },
                        { role: "assistant" as const, text: "You have 5 jobs worth $56,200 total.\n\n  New Lead: 1\n  Quoted: 1\n  In Progress: 2\n  Invoiced: 1" },
                    ],
                },
                {
                    highlight: "add",
                    title: "Adding a New Job",
                    subtitle: "In Advanced Mode you'd click '+ New Deal'. With the assistant, just type it.",
                    chatMessages: [
                        { role: "user" as const, text: "New job Roof Repair for Anderson worth 6500" },
                        { role: "assistant" as const, text: "Job \"Roof Repair\" created worth $6,500. Added to New Lead column." },
                    ],
                },
                {
                    highlight: "stale",
                    title: "Stale Job Alerts",
                    subtitle: "Amber = stale (>7 days). Red = rotting (>14 days). The assistant can find these instantly.",
                    chatMessages: [
                        { role: "user" as const, text: "Show stale jobs" },
                        { role: "assistant" as const, text: "2 job(s) need attention:\n\n  ! Deck Build ($8,500) — 9d without activity\n  !! Plumbing Fix ($4,500) — 16d without activity" },
                    ],
                },
                {
                    highlight: "quote",
                    title: "Quick Quoting",
                    subtitle: "Generate quotes and invoices with a single command. No forms needed.",
                    chatMessages: [
                        { role: "user" as const, text: "Invoice Deck Build for 8500" },
                        { role: "assistant" as const, text: "Invoice INV-001 generated for $8,500. Deal moved to Invoiced." },
                    ],
                },
            ]
        }
    }

    if (industry === "REAL_ESTATE") {
        return {
            columns: [
                {
                    title: "New Listing", color: "bg-blue-500", deals: [
                        { title: "42 Ocean Drive", company: "Vendor: Chen", value: 1200000, status: "healthy", days: 1, initials: "CH" },
                    ]
                },
                {
                    title: "Appraised", color: "bg-indigo-500", deals: [
                        { title: "15 Park Ave", company: "Vendor: Liu", value: 950000, status: "healthy", days: 4, initials: "LI" },
                    ]
                },
                {
                    title: "Under Offer", color: "bg-amber-500", deals: [
                        { title: "8 Maple Court", company: "Buyer: Thompson", value: 780000, status: "stale", days: 10, initials: "TH" },
                    ]
                },
                {
                    title: "Exchanged", color: "bg-purple-500", deals: [
                        { title: "3 River St", company: "Buyer: Patel", value: 1450000, status: "rotting", days: 15, initials: "PA" },
                    ]
                },
                { title: "Settled", color: "bg-emerald-500", deals: [] },
            ],
            stats: { total: "$4,380,000", healthy: 2, stale: 1, rotting: 1 },
            steps: [
                {
                    highlight: "pipeline",
                    title: "Your Listings Pipeline",
                    subtitle: "This is your pipeline in Advanced Mode. Every column is a stage of your sales process.",
                    chatMessages: [
                        { role: "user" as const, text: "Show me my listings" },
                        { role: "assistant" as const, text: "You have 4 listings worth $4,380,000 total.\n\n  New Listing: 1\n  Appraised: 1\n  Under Offer: 1\n  Exchanged: 1" },
                    ],
                },
                {
                    highlight: "add",
                    title: "Adding a New Listing",
                    subtitle: "In Advanced Mode you'd click '+ New Deal'. With the assistant, just type it.",
                    chatMessages: [
                        { role: "user" as const, text: "New deal 27 Harbour View for 2,100,000" },
                        { role: "assistant" as const, text: "Listing \"27 Harbour View\" created worth $2,100,000. Added to New Listing column." },
                    ],
                },
                {
                    highlight: "stale",
                    title: "Stale Listing Alerts",
                    subtitle: "Amber = stale (>7 days). Red = rotting (>14 days). Never miss a follow-up.",
                    chatMessages: [
                        { role: "user" as const, text: "Show stale listings" },
                        { role: "assistant" as const, text: "2 listing(s) need attention:\n\n  ! 8 Maple Court ($780,000) — 10d without activity\n  !! 3 River St ($1,450,000) — 15d without activity" },
                    ],
                },
                {
                    highlight: "contact",
                    title: "Find Buyers Fast",
                    subtitle: "Search your contacts with fuzzy matching. Even partial names work.",
                    chatMessages: [
                        { role: "user" as const, text: "Find Thompson" },
                        { role: "assistant" as const, text: "Found 1 contact(s):\n\n  Sarah Thompson — sarah@email.com\n  Budget: $800,000 | 3 bed" },
                    ],
                },
            ]
        }
    }

    // Default
    return {
        columns: [
            {
                title: "New Lead", color: "bg-blue-500", deals: [
                    { title: "Website Redesign", company: "Acme Corp", value: 15000, status: "healthy", days: 2, initials: "AC" },
                ]
            },
            {
                title: "Contacted", color: "bg-indigo-500", deals: [
                    { title: "Consulting Retainer", company: "Wayne Ent", value: 50000, status: "stale", days: 8, initials: "WE" },
                ]
            },
            {
                title: "Negotiation", color: "bg-amber-500", deals: [
                    { title: "Legacy Migration", company: "Cyberdyne", value: 120000, status: "rotting", days: 15, initials: "CY" },
                ]
            },
            { title: "Won", color: "bg-emerald-500", deals: [] },
            { title: "Lost", color: "bg-slate-400", deals: [] },
        ],
        stats: { total: "$185,000", healthy: 1, stale: 1, rotting: 1 },
        steps: [
            {
                highlight: "pipeline",
                title: "Your Deal Pipeline",
                subtitle: "This is your pipeline in Advanced Mode. Every column is a stage.",
                chatMessages: [
                    { role: "user" as const, text: "Show me my deals" },
                    { role: "assistant" as const, text: "You have 3 deals worth $185,000 total.\n\n  New Lead: 1\n  Contacted: 1\n  Negotiation: 1" },
                ],
            },
            {
                highlight: "add",
                title: "Adding a New Deal",
                subtitle: "Skip the forms. Just tell the assistant what to create.",
                chatMessages: [
                    { role: "user" as const, text: "New deal App Build for StartupCo worth 25000" },
                    { role: "assistant" as const, text: "Deal \"App Build\" created worth $25,000. Added to New Lead column." },
                ],
            },
            {
                highlight: "stale",
                title: "Stale Deal Alerts",
                subtitle: "Amber = stale (>7 days). Red = rotting (>14 days). The assistant spots these instantly.",
                chatMessages: [
                    { role: "user" as const, text: "Show stale deals" },
                    { role: "assistant" as const, text: "2 deal(s) need attention:\n\n  ! Consulting Retainer ($50,000) — 8d without activity\n  !! Legacy Migration ($120,000) — 15d without activity" },
                ],
            },
        ]
    }
}

// ─── Mock Deal Card ──────────────────────────────────────────────────

function MockDealCard({ deal, highlighted }: {
    deal: { title: string; company: string; value: number; status: string; days: number; initials: string };
    highlighted?: boolean;
}) {
    const borderClass = deal.status === "rotting"
        ? "border-red-500 shadow-[0_0_8px_rgba(239,68,68,0.15)]"
        : deal.status === "stale"
            ? "border-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.15)]"
            : "border-slate-200"

    return (
        <div className={`relative rounded-lg border bg-white p-2.5 mb-2 transition-all ${borderClass} ${highlighted ? "ring-2 ring-blue-500 ring-offset-1" : ""}`}>
            {deal.status === "rotting" && (
                <div className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] px-1.5 py-0.5 rounded-full flex items-center z-10">
                    <AlertCircle className="w-2 h-2 mr-0.5" />Rotting
                </div>
            )}
            {deal.status === "stale" && (
                <div className="absolute -top-1.5 -right-1.5 bg-amber-400 text-slate-900 text-[8px] px-1.5 py-0.5 rounded-full flex items-center font-bold z-10">
                    <AlertCircle className="w-2 h-2 mr-0.5" />Stale
                </div>
            )}
            <div className="flex justify-between items-start mb-1">
                <div>
                    <p className="font-semibold text-slate-900 text-[10px] leading-tight">{deal.title}</p>
                    <p className="text-[8px] text-slate-500">{deal.company}</p>
                </div>
            </div>
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center text-slate-900 font-bold text-[10px]">
                    <DollarSign className="w-2.5 h-2.5 text-slate-400 mr-0.5" />
                    {deal.value.toLocaleString()}
                </div>
                <div className="h-4 w-4 rounded-full bg-slate-100 flex items-center justify-center text-[7px] font-medium text-slate-600 border border-slate-200">
                    {deal.initials}
                </div>
            </div>
            <div className={`flex items-center text-[8px] pt-1 border-t border-slate-100 ${deal.status !== "healthy" ? "text-amber-600" : "text-slate-400"}`}>
                <Calendar className="w-2 h-2 mr-1" />
                {deal.days === 0 ? "Today" : `${deal.days}d ago`}
            </div>
        </div>
    )
}

// ─── Mock Pipeline Preview ──────────────────────────────────────────

function MockPipelinePreview({ data, highlightType }: {
    data: ReturnType<typeof getMockData>;
    highlightType: string;
}) {
    const highlightStale = highlightType === "stale"
    const highlightAdd = highlightType === "add"

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            {/* Mock Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h2 className="text-sm font-bold text-slate-900">Pipeline</h2>
                    <p className="text-[10px] text-slate-500">Manage your deals and activity</p>
                </div>
                <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-medium border transition-all ${highlightAdd ? "bg-blue-50 border-blue-500 text-blue-700 ring-2 ring-blue-300" : "bg-slate-900 border-slate-900 text-white"}`}>
                    <Plus className="w-3 h-3" />
                    New Deal
                </div>
            </div>

            {/* Mock Stats Row */}
            <div className="px-4 py-2 grid grid-cols-4 gap-2 border-b border-slate-100">
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-[9px] text-slate-500 mb-0.5">
                        <TrendingUp className="w-2.5 h-2.5" />Pipeline
                    </div>
                    <p className="text-xs font-bold text-slate-900">{data.stats.total}</p>
                </div>
                <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-[9px] text-slate-500 mb-0.5">
                        <Clock className="w-2.5 h-2.5 text-emerald-500" />Healthy
                    </div>
                    <p className="text-xs font-bold text-emerald-600">{data.stats.healthy}</p>
                </div>
                {data.stats.stale > 0 && (
                    <div className={`text-center rounded px-1 ${highlightStale ? "bg-amber-50 ring-1 ring-amber-400" : ""}`}>
                        <div className="flex items-center justify-center gap-1 text-[9px] text-amber-800 mb-0.5">
                            <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />Stale
                        </div>
                        <p className="text-xs font-bold text-amber-900">{data.stats.stale}</p>
                    </div>
                )}
                {data.stats.rotting > 0 && (
                    <div className={`text-center rounded px-1 ${highlightStale ? "bg-red-50 ring-1 ring-red-400" : ""}`}>
                        <div className="flex items-center justify-center gap-1 text-[9px] text-red-800 mb-0.5">
                            <AlertCircle className="w-2.5 h-2.5 text-red-600" />Rotting
                        </div>
                        <p className="text-xs font-bold text-red-900">{data.stats.rotting}</p>
                    </div>
                )}
            </div>

            {/* Mock Kanban Columns */}
            <div className="flex gap-2 p-3 overflow-hidden flex-1 min-h-0">
                {data.columns.map((col) => (
                    <div key={col.title} className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-center gap-1 mb-1.5 px-0.5">
                            <div className={`w-1.5 h-1.5 rounded-full ${col.color}`} />
                            <span className="font-semibold text-slate-700 text-[9px] truncate">{col.title}</span>
                            <span className="text-[8px] text-slate-400 bg-slate-100 px-1 rounded-full">{col.deals.length}</span>
                        </div>
                        <div className="flex-1 bg-slate-50/50 rounded-lg border border-slate-200/60 p-1 overflow-hidden">
                            {col.deals.length > 0 ? (
                                col.deals.map((deal) => (
                                    <MockDealCard
                                        key={deal.title}
                                        deal={deal}
                                        highlighted={highlightStale && (deal.status === "stale" || deal.status === "rotting")}
                                    />
                                ))
                            ) : (
                                <div className="h-12 border border-dashed border-slate-200 rounded flex items-center justify-center text-slate-300 text-[8px]">
                                    Empty
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ─── Mock Chat Pane ──────────────────────────────────────────────────

function MockChatPane({ messages }: {
    messages: { role: "user" | "assistant"; text: string }[];
}) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm h-full flex flex-col">
            {/* Chat Header */}
            <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-[10px] font-bold text-slate-900">Pj Buddy Assistant</p>
                <p className="text-[8px] text-emerald-600">Online</p>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 p-3 space-y-2 overflow-y-auto">
                <AnimatePresence>
                    {messages.map((msg, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.3, duration: 0.3 }}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div className={`max-w-[90%] rounded-xl px-3 py-2 ${msg.role === "user"
                                ? "bg-slate-900 text-white"
                                : "bg-slate-50 border border-slate-200 text-slate-800"
                                }`}>
                                <p className="text-[10px] leading-relaxed whitespace-pre-line">{msg.text}</p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Chat Input */}
            <div className="p-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5 bg-slate-50 rounded-lg px-2.5 py-1.5 border border-slate-200">
                    <p className="text-[9px] text-slate-400 flex-1">Type a command...</p>
                    <Send className="w-3 h-3 text-slate-400" />
                </div>
            </div>
        </div>
    )
}

// ─── Main Tutorial View ──────────────────────────────────────────────

export function TutorialView() {
    const { industry } = useIndustry()
    const [step, setStep] = useState(0)
    const data = getMockData(industry)
    const currentStep = data.steps[step]
    const isLastStep = step === data.steps.length - 1

    return (
        <div className="flex flex-col h-screen w-full bg-slate-100">
            {/* Top Bar */}
            <div className="flex items-center justify-between px-6 py-3 bg-white border-b border-slate-200 shrink-0">
                <div>
                    <motion.h2
                        key={step}
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-lg font-bold text-slate-900"
                    >
                        {currentStep.title}
                    </motion.h2>
                    <motion.p
                        key={`sub-${step}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-sm text-slate-500"
                    >
                        {currentStep.subtitle}
                    </motion.p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Step indicator */}
                    <div className="flex gap-1.5">
                        {data.steps.map((_, i) => (
                            <div
                                key={i}
                                className={`h-2 rounded-full transition-all duration-300 ${i === step ? "w-6 bg-slate-900" : i < step ? "w-2 bg-slate-400" : "w-2 bg-slate-200"}`}
                            />
                        ))}
                    </div>
                    <span className="text-xs text-slate-400">{step + 1}/{data.steps.length}</span>
                </div>
            </div>

            {/* Main Content: 3/4 Platform + 1/4 Chat */}
            <div className="flex-1 flex gap-4 p-4 min-h-0">
                {/* LHS: Platform Preview (3/4) */}
                <motion.div
                    key={`preview-${step}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3 }}
                    className="w-3/4 min-h-0"
                >
                    <div className="relative h-full">
                        <MockPipelinePreview data={data} highlightType={currentStep.highlight} />
                        {/* "Advanced Mode" label */}
                        <div className="absolute top-2 right-2 bg-slate-900/80 text-white text-[9px] px-2 py-0.5 rounded-full backdrop-blur-sm">
                            Advanced Mode
                        </div>
                    </div>
                </motion.div>

                {/* RHS: Chat Pane (1/4) */}
                <motion.div
                    key={`chat-${step}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                    className="w-1/4 min-h-0 flex flex-col gap-3"
                >
                    <div className="flex-1 min-h-0">
                        <MockChatPane messages={currentStep.chatMessages} />
                    </div>

                    {/* Navigation */}
                    <div className="flex gap-2 shrink-0">
                        {!isLastStep ? (
                            <Button onClick={() => setStep(s => s + 1)} size="lg" className="w-full">
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        ) : (
                            <Link href="/dashboard" className="w-full">
                                <Button size="lg" className="w-full bg-slate-900 hover:bg-slate-800">
                                    Go to Dashboard <Check className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                    </div>
                    <Link href="/dashboard" className="text-center">
                        <span className="text-xs text-slate-400 hover:text-slate-600 transition-colors cursor-pointer">Skip tutorial</span>
                    </Link>
                </motion.div>
            </div>
        </div>
    )
}
