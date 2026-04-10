"use client"

import Link from "next/link"
import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { ExternalLink, MessageSquare, Navigation, Phone, Plus, Search, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { JobStatusBar } from "./job-status-bar"
import { MaterialPicker } from "./material-picker"

interface TradieJob {
    id: string
    title: string
    clientName: string
    address: string
    status: string
    value: number
    scheduledAt: Date
    description: string
    company?: string
    health?: { status: string }
    contactPhone?: string
}

interface JobBottomSheetProps {
    job: TradieJob
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    onAddVariation: (desc: string, price: number) => Promise<void>
    safetyCheckCompleted: boolean
}

export function JobBottomSheet({ job, isOpen, setIsOpen, onAddVariation, safetyCheckCompleted }: JobBottomSheetProps) {
    const [activeTab, setActiveTab] = useState<"DETAILS" | "PHOTOS" | "BILLING">("DETAILS")
    const [variationDesc, setVariationDesc] = useState("")
    const [variationPrice, setVariationPrice] = useState("")

    const handleAddVariation = async () => {
        if (!variationDesc || !variationPrice) return
        await onAddVariation(variationDesc, Number(variationPrice))
        setVariationDesc("")
        setVariationPrice("")
    }

    const scheduledTimeLabel = job.scheduledAt
        ? new Date(job.scheduledAt).toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", hour12: true })
        : "No time set"
    const secondaryHeaderLabel = job.company ? `${scheduledTimeLabel} • ${job.company}` : scheduledTimeLabel

    return (
        <>
            <motion.div
                className="absolute bottom-0 left-0 right-0 z-30 flex flex-col rounded-t-[32px] border-t border-slate-800 bg-slate-950 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]"
                style={{ touchAction: "none" }}
                initial={{ height: "15%" }}
                animate={{ height: isOpen ? "92%" : "15%" }}
                transition={{ type: "spring", damping: 30, stiffness: 260 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.15}
                onDragEnd={(_, info) => {
                    if (info.offset.y > 60 || info.velocity.y > 300) {
                        setIsOpen(false)
                    } else if (info.offset.y < -60 || info.velocity.y < -300) {
                        setIsOpen(true)
                    }
                }}
                onClick={() => !isOpen && setIsOpen(true)}
            >
                <div className="mx-auto mb-4 mt-3 h-1.5 w-12 shrink-0 rounded-full bg-slate-700" />

                <div className="flex flex-1 flex-col overflow-hidden px-6">
                    <div className="mb-6 flex shrink-0 cursor-pointer items-center justify-between" onClick={() => setIsOpen(!isOpen)}>
                        <div>
                            <h3 className="mb-1 text-xs font-bold uppercase tracking-widest text-slate-400">Current Job</h3>
                            <h2 className="text-xl font-black leading-tight text-white">{job.title}</h2>
                            <p className="mt-1 flex items-center gap-2 text-sm text-slate-400">
                                <span className={cn("h-2 w-2 rounded-full", job.health?.status === "ROTTING" ? "bg-red-500" : "bg-[#ccff00]")} />
                                {secondaryHeaderLabel}
                            </p>
                        </div>
                        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#ccff00]/20 bg-[#ccff00]/10 font-black text-[#ccff00]">
                            1
                        </div>
                    </div>

                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex flex-1 flex-col overflow-hidden"
                            >
                                <div className="mb-6 grid shrink-0 grid-cols-4 gap-3">
                                    <Button
                                        variant="outline"
                                        className="h-20 flex flex-col gap-2 border-slate-800 bg-slate-900 text-slate-400 transition-all hover:border-[#ccff00]/50 hover:bg-slate-800 hover:text-[#ccff00]"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            window.open(`https://maps.google.com/?q=${job.address}`, "_blank")
                                        }}
                                    >
                                        <Navigation className="h-6 w-6" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Nav</span>
                                    </Button>
                                    {job.contactPhone ? (
                                        <Button
                                            variant="outline"
                                            className="h-20 flex flex-col gap-2 border-slate-800 bg-slate-900 text-slate-400 transition-all hover:border-blue-500/50 hover:bg-slate-800 hover:text-blue-400"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                window.open(`tel:${job.contactPhone}`)
                                            }}
                                        >
                                            <Phone className="h-6 w-6" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Call</span>
                                        </Button>
                                    ) : (
                                        <Button asChild variant="outline" className="h-20 flex flex-col gap-2 border-slate-800 bg-slate-900 text-slate-400 transition-all hover:border-blue-500/50 hover:bg-slate-800 hover:text-blue-400">
                                            <Link href={`/crm/deals/${job.id}`} onClick={(e) => e.stopPropagation()}>
                                                <Phone className="h-6 w-6" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Add Phone</span>
                                            </Link>
                                        </Button>
                                    )}
                                    {job.contactPhone ? (
                                        <Button
                                            variant="outline"
                                            className="h-20 flex flex-col gap-2 border-slate-800 bg-slate-900 text-slate-400 transition-all hover:border-purple-500/50 hover:bg-slate-800 hover:text-purple-400"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                window.open(`sms:${job.contactPhone}`)
                                            }}
                                        >
                                            <MessageSquare className="h-6 w-6" />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Text</span>
                                        </Button>
                                    ) : (
                                        <Button asChild variant="outline" className="h-20 flex flex-col gap-2 border-slate-800 bg-slate-900 text-slate-400 transition-all hover:border-purple-500/50 hover:bg-slate-800 hover:text-purple-400">
                                            <Link href={`/crm/deals/${job.id}`} onClick={(e) => e.stopPropagation()}>
                                                <MessageSquare className="h-6 w-6" />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Open CRM</span>
                                            </Link>
                                        </Button>
                                    )}
                                    <Button
                                        variant="outline"
                                        className="h-20 flex flex-col gap-2 border-slate-800 bg-slate-900 text-slate-400 transition-all hover:border-orange-500/50 hover:bg-slate-800 hover:text-orange-400"
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setIsOpen(true)
                                            setActiveTab("BILLING")
                                        }}
                                    >
                                        <Wrench className="h-6 w-6" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Parts</span>
                                    </Button>
                                </div>

                                <div className="mb-4 flex shrink-0 border-b border-slate-800">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setActiveTab("DETAILS")
                                        }}
                                        className={cn(
                                            "flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors",
                                            activeTab === "DETAILS" ? "border-b-2 border-[#ccff00] text-[#ccff00]" : "text-slate-500",
                                        )}
                                    >
                                        Details
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setActiveTab("PHOTOS")
                                        }}
                                        className={cn(
                                            "flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors",
                                            activeTab === "PHOTOS" ? "border-b-2 border-[#ccff00] text-[#ccff00]" : "text-slate-500",
                                        )}
                                    >
                                        Photos
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            setActiveTab("BILLING")
                                        }}
                                        className={cn(
                                            "flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors",
                                            activeTab === "BILLING" ? "border-b-2 border-[#ccff00] text-[#ccff00]" : "text-slate-500",
                                        )}
                                    >
                                        Billing
                                    </button>
                                </div>

                                <div className="no-scrollbar flex-1 overflow-y-auto pb-32">
                                    {activeTab === "DETAILS" && (
                                        <div className="space-y-6">
                                            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                                                <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Job Description</h4>
                                                <p className="text-sm leading-relaxed text-slate-300">
                                                    {job.description || "No description provided."}
                                                </p>
                                            </div>

                                            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                                                <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-500">Site Contact</h4>
                                                <div className="flex items-center justify-between">
                                                    <span className="font-medium text-white">{job.clientName}</span>
                                                    <span className="text-sm text-slate-400">{job.contactPhone || ""}</span>
                                                </div>
                                                <div className="mt-2 border-t border-slate-800 pt-2 text-sm text-slate-400">
                                                    {job.address}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "PHOTOS" && (
                                        <div className="space-y-4">
                                            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                                                <div>
                                                    <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Site Photos</h4>
                                                    <p className="text-sm leading-relaxed text-slate-300">
                                                        Capture photos from the full job mode so they save against the right job and stay available for billing, handover, and office review.
                                                    </p>
                                                </div>
                                                <Link
                                                    href={`/tradie/jobs/${job.id}`}
                                                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-800 hover:text-white"
                                                >
                                                    Open Full Job Mode
                                                    <ExternalLink className="h-4 w-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === "BILLING" && (
                                        <div className="space-y-6">
                                            <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                                                <div className="mb-4 flex items-center justify-between">
                                                    <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500">Current Total</h4>
                                                    <span className="text-xl font-bold text-[#ccff00]">${job.value.toLocaleString()}</span>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex gap-2">
                                                        <Input
                                                            placeholder="Item (e.g. 100mm PVC)"
                                                            className="border-slate-800 bg-slate-950 text-white focus:border-[#ccff00]/50"
                                                            value={variationDesc}
                                                            onChange={(e) => setVariationDesc(e.target.value)}
                                                        />
                                                        <Input
                                                            placeholder="$"
                                                            type="number"
                                                            className="w-24 border-slate-800 bg-slate-950 text-white focus:border-[#ccff00]/50"
                                                            value={variationPrice}
                                                            onChange={(e) => setVariationPrice(e.target.value)}
                                                        />
                                                    </div>

                                                    <MaterialPicker
                                                        onSelect={(material) => {
                                                            setVariationDesc(material.description)
                                                            setVariationPrice(String(material.price))
                                                        }}
                                                        trigger={
                                                            <Button variant="outline" size="sm" className="mb-2 w-full gap-2 border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-[#ccff00]">
                                                                <Search className="h-4 w-4" /> Search Material Database
                                                            </Button>
                                                        }
                                                    />

                                                    <Button className="w-full border border-slate-700 bg-slate-800 text-white hover:bg-slate-700" onClick={handleAddVariation}>
                                                        <Plus className="mr-2 h-4 w-4" /> Add Variation
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/50 p-4">
                                                <div>
                                                    <h4 className="mb-2 text-xs font-bold uppercase tracking-widest text-slate-500">Completion Capture</h4>
                                                    <p className="text-sm leading-relaxed text-slate-300">
                                                        Video explanations and customer signatures are captured from the full completion flow so they save against the job properly.
                                                    </p>
                                                </div>
                                                <Link
                                                    href={`/crm/deals/${job.id}`}
                                                    className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-slate-700 bg-slate-900 px-4 py-3 text-sm font-semibold text-slate-100 transition-colors hover:bg-slate-800 hover:text-white"
                                                >
                                                    Open Full CRM Job
                                                    <ExternalLink className="h-4 w-4" />
                                                </Link>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ y: 100 }} animate={{ y: 0 }} exit={{ y: 100 }} className="pointer-events-none fixed bottom-0 left-0 right-0 z-50">
                        <div className="pointer-events-auto">
                            <JobStatusBar
                                dealId={job.id}
                                currentStatus={
                                    job.status === "SCHEDULED" ||
                                    job.status === "TRAVELING" ||
                                    job.status === "ON_SITE" ||
                                    job.status === "COMPLETED" ||
                                    job.status === "CANCELLED"
                                        ? job.status
                                        : "SCHEDULED"
                                }
                                contactName={job.clientName || "Client"}
                                safetyCheckCompleted={safetyCheckCompleted}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
