"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Phone, MessageSquare, Wrench, Camera, Navigation, Plus, Video, PenTool } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { DealView } from "@/actions/deal-actions"
import { JobStatusBar } from "./job-status-bar"
import { MaterialPicker } from "./material-picker"

interface JobBottomSheetProps {
    job: DealView
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    onAddVariation: (desc: string, price: number) => Promise<void>
    safetyCheckCompleted: boolean
}

export function JobBottomSheet({ job, isOpen, setIsOpen, onAddVariation, safetyCheckCompleted }: JobBottomSheetProps) {
    const [activeTab, setActiveTab] = useState<'DETAILS' | 'PHOTOS' | 'BILLING'>('DETAILS')
    const [variationDesc, setVariationDesc] = useState("")
    const [variationPrice, setVariationPrice] = useState("")
    const [isRecording, setIsRecording] = useState(false)
    const [hasSignature, setHasSignature] = useState(false)

    const handleAddVariation = async () => {
        if (!variationDesc || !variationPrice) return
        await onAddVariation(variationDesc, Number(variationPrice))
        setVariationDesc("")
        setVariationPrice("")
    }

    const toggleRecording = () => {
        if (isRecording) {
            setIsRecording(false)
            // Logic for saving would happen here
        } else {
            setIsRecording(true)
            setTimeout(() => setIsRecording(false), 3000)
        }
    }

    // Colors
    const neonGreen = "text-[#ccff00]"
    const neonBorder = "border-[#ccff00]"
    const neonBg = "bg-[#ccff00]"

    return (
        <>
            <motion.div
                className="absolute bottom-0 left-0 right-0 bg-slate-950 border-t border-slate-800 rounded-t-3xl shadow-[0_-10px_40px_rgba(0,0,0,0.5)] z-30 flex flex-col"
                initial={{ height: "15%" }}
                animate={{ height: isOpen ? "92%" : "14%" }}
                transition={{ type: "spring", damping: 20, stiffness: 100 }}
                onClick={() => !isOpen && setIsOpen(true)}
            >
                <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-4 shrink-0" />

                <div className="px-6 flex-1 flex flex-col overflow-hidden">
                    {/* Collapsed Header */}
                    <div className="flex justify-between items-center mb-6 shrink-0 cursor-pointer" onClick={() => setIsOpen(!isOpen)}>
                        <div>
                            <h3 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Current Job</h3>
                            <h2 className="text-xl font-black text-white leading-tight">{job.title}</h2>
                            <p className="text-slate-400 text-sm mt-1 flex items-center gap-2">
                                <span className={cn("w-2 h-2 rounded-full", job.health?.status === 'ROTTING' ? 'bg-red-500' : 'bg-[#ccff00]')}></span>
                                8:00 AM • {job.company}
                            </p>
                        </div>
                        <div className="w-12 h-12 rounded-full bg-[#ccff00]/10 flex items-center justify-center text-[#ccff00] font-black border border-[#ccff00]/20">
                            1
                        </div>
                    </div>

                    {/* Expanded Content */}
                    <AnimatePresence>
                        {isOpen && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="flex-1 flex flex-col overflow-hidden"
                            >
                                {/* Quick Actions Row */}
                                <div className="grid grid-cols-4 gap-3 mb-6 shrink-0">
                                    <Button variant="outline" className="h-20 flex flex-col gap-2 bg-slate-900 border-slate-800 hover:bg-slate-800 hover:text-[#ccff00] hover:border-[#ccff00]/50 transition-all text-slate-400"
                                        onClick={(e) => { e.stopPropagation(); window.open(`https://maps.google.com/?q=${job.address}`, '_blank'); }}
                                    >
                                        <Navigation className="w-6 h-6" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Nav</span>
                                    </Button>
                                    <Button variant="outline" className="h-20 flex flex-col gap-2 bg-slate-900 border-slate-800 hover:bg-slate-800 hover:text-blue-400 hover:border-blue-500/50 transition-all text-slate-400"
                                        onClick={(e) => { e.stopPropagation(); window.open(`tel:${job.contactPhone || ''}`); }}
                                    >
                                        <Phone className="w-6 h-6" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Call</span>
                                    </Button>
                                    <Button variant="outline" className="h-20 flex flex-col gap-2 bg-slate-900 border-slate-800 hover:bg-slate-800 hover:text-purple-400 hover:border-purple-500/50 transition-all text-slate-400"
                                        onClick={(e) => { e.stopPropagation(); window.open(`sms:${job.contactPhone || ''}`); }}
                                    >
                                        <MessageSquare className="w-6 h-6" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Text</span>
                                    </Button>
                                    <Button variant="outline" className="h-20 flex flex-col gap-2 bg-slate-900 border-slate-800 hover:bg-slate-800 hover:text-orange-400 hover:border-orange-500/50 transition-all text-slate-400">
                                        <Wrench className="w-6 h-6" />
                                        <span className="text-[10px] font-bold uppercase tracking-wider">Parts</span>
                                    </Button>
                                </div>

                                {/* Tabs */}
                                <div className="flex border-b border-slate-800 mb-4 shrink-0">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActiveTab('DETAILS'); }}
                                        className={cn("flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors", activeTab === 'DETAILS' ? "text-[#ccff00] border-b-2 border-[#ccff00]" : "text-slate-500")}
                                    >
                                        Details
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActiveTab('PHOTOS'); }}
                                        className={cn("flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors", activeTab === 'PHOTOS' ? "text-[#ccff00] border-b-2 border-[#ccff00]" : "text-slate-500")}
                                    >
                                        Photos
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActiveTab('BILLING'); }}
                                        className={cn("flex-1 pb-3 text-sm font-bold uppercase tracking-wider transition-colors", activeTab === 'BILLING' ? "text-[#ccff00] border-b-2 border-[#ccff00]" : "text-slate-500")}
                                    >
                                        Billing
                                    </button>
                                </div>

                                {/* Tab Content */}
                                <div className="flex-1 overflow-y-auto pb-32 no-scrollbar">
                                    {activeTab === 'DETAILS' && (
                                        <div className="space-y-6">
                                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                                <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">Job Description</h4>
                                                <p className="text-slate-300 text-sm leading-relaxed">
                                                    {job.description || "No description provided."}
                                                </p>
                                            </div>

                                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                                <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">Site Contact</h4>
                                                <div className="flex justify-between items-center">
                                                    <span className="text-white font-medium">{job.contactName}</span>
                                                    <span className="text-slate-400 text-sm">{job.contactPhone}</span>
                                                </div>
                                                <div className="mt-2 text-slate-400 text-sm border-t border-slate-800 pt-2">
                                                    {job.address}
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'PHOTOS' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="aspect-square bg-slate-900 rounded-xl border-2 border-dashed border-slate-800 flex flex-col items-center justify-center text-slate-500 hover:text-[#ccff00] hover:border-[#ccff00]/50 transition-colors cursor-pointer">
                                                <Camera className="w-8 h-8 mb-2" />
                                                <span className="text-xs font-bold uppercase">Add Photo</span>
                                            </div>
                                            {/* Photos would map here */}
                                        </div>
                                    )}

                                    {activeTab === 'BILLING' && (
                                        <div className="space-y-6">
                                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest">Current Total</h4>
                                                    <span className="text-xl font-bold text-[#ccff00]">${job.value.toLocaleString()}</span>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex gap-2">
                                                        <Input
                                                            placeholder="Item (e.g. 100mm PVC)"
                                                            className="bg-slate-950 border-slate-800 text-white focus:border-[#ccff00]/50"
                                                            value={variationDesc}
                                                            onChange={(e) => setVariationDesc(e.target.value)}
                                                        />
                                                        <Input
                                                            placeholder="$"
                                                            type="number"
                                                            className="w-24 bg-slate-950 border-slate-800 text-white focus:border-[#ccff00]/50"
                                                            value={variationPrice}
                                                            onChange={(e) => setVariationPrice(e.target.value)}
                                                        />
                                                    </div>
                                                    <Button className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700" onClick={handleAddVariation}>
                                                        <Plus className="w-4 h-4 mr-2" /> Add Variation
                                                    </Button>
                                                </div>
                                            </div>

                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full h-12 border-slate-700 text-slate-300 transition-all hover:bg-slate-800 hover:text-white",
                                                    isRecording && "bg-red-900/20 text-red-400 border-red-900 animate-pulse"
                                                )}
                                                onClick={toggleRecording}
                                            >
                                                <Video className="w-4 h-4 mr-2" />
                                                {isRecording ? "Recording... (Tap to stop)" : "Add Video Explanation"}
                                            </Button>

                                            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800">
                                                <h4 className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-3 flex items-center gap-2">
                                                    <PenTool className="w-3 h-3" />
                                                    Client Signature
                                                </h4>
                                                <div
                                                    className={cn(
                                                        "h-24 bg-slate-950 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors",
                                                        hasSignature ? "border-[#ccff00]/50" : "border-slate-800 hover:border-slate-600"
                                                    )}
                                                    onClick={() => setHasSignature(true)}
                                                >
                                                    {hasSignature ? (
                                                        <span className="font-serif italic text-2xl text-[#ccff00] -rotate-2">Signed</span>
                                                    ) : (
                                                        <span className="text-slate-600 text-sm font-medium">Tap to sign on glass</span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </motion.div>

            {/* StatusBar Integration - Only visible when expanded */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none"
                    >
                        <div className="pointer-events-auto">
                            <JobStatusBar
                                dealId={job.id}
                                currentStatus={job.jobStatus || (job.status === 'WON' ? 'SCHEDULED' : job.status) as any}
                                contactName={job.contactName || job.company || "Client"}
                                safetyCheckCompleted={safetyCheckCompleted}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
