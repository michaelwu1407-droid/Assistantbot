"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Phone, MessageSquare, Wrench, Camera, Navigation, Plus, Video, PenTool } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
// Ensure this type is available; if Aider removed it, I might need to redefine it or import differently
import { DealView } from "@/actions/deal-actions"

interface JobBottomSheetProps {
    job: DealView
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    onAction: () => void
    status: 'SCHEDULED' | 'TRAVELING' | 'ON_SITE' | 'COMPLETED' | 'CANCELLED'
    onAddVariation: (desc: string, price: number) => Promise<void>
}

export function JobBottomSheet({ job, isOpen, setIsOpen, onAction, status, onAddVariation }: JobBottomSheetProps) {
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

    return (
        <>
            <motion.div
                className="absolute bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 rounded-t-3xl shadow-2xl z-30 flex flex-col"
                initial={{ height: "15%" }}
                animate={{ height: isOpen ? "85%" : "15%" }}
                transition={{ type: "spring", damping: 20 }}
                onClick={() => !isOpen && setIsOpen(true)}
            >
                <div className="w-12 h-1.5 bg-slate-700 rounded-full mx-auto mt-3 mb-4 shrink-0" />

                <div className="px-6 flex-1 flex flex-col overflow-hidden">
                    {/* Collapsed Header */}
                    <div className="flex justify-between items-center mb-6 shrink-0" onClick={() => setIsOpen(!isOpen)}>
                        <div>
                            <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">Current Job</h3>
                            <h2 className="text-xl font-bold text-white mt-1">{job.title}</h2>
                            <p className="text-slate-400 text-sm">8:00 AM • {job.company}</p>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold">
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
                                {/* Tabs */}
                                <div className="flex border-b border-slate-800 mb-4 shrink-0">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActiveTab('DETAILS'); }}
                                        className={cn("flex-1 pb-3 text-sm font-medium transition-colors", activeTab === 'DETAILS' ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-500")}
                                    >
                                        Details
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActiveTab('PHOTOS'); }}
                                        className={cn("flex-1 pb-3 text-sm font-medium transition-colors", activeTab === 'PHOTOS' ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-500")}
                                    >
                                        Photos
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActiveTab('BILLING'); }}
                                        className={cn("flex-1 pb-3 text-sm font-medium transition-colors", activeTab === 'BILLING' ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-500")}
                                    >
                                        Billing
                                    </button>
                                </div>

                                {/* Tab Content */}
                                <div className="flex-1 overflow-y-auto pb-24">
                                    {activeTab === 'DETAILS' && (
                                        <div className="space-y-6">
                                            <div className="grid grid-cols-4 gap-4">
                                                <Button variant="outline" className="h-20 flex flex-col gap-2 bg-slate-800 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-emerald-500/50 transition-all">
                                                    <Navigation className="w-6 h-6 text-emerald-400" />
                                                    <span className="text-xs">Navigate</span>
                                                </Button>
                                                <Button variant="outline" className="h-20 flex flex-col gap-2 bg-slate-800 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-blue-500/50 transition-all">
                                                    <Phone className="w-6 h-6 text-blue-400" />
                                                    <span className="text-xs">Call</span>
                                                </Button>
                                                <Button variant="outline" className="h-20 flex flex-col gap-2 bg-slate-800 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-purple-500/50 transition-all">
                                                    <MessageSquare className="w-6 h-6 text-purple-400" />
                                                    <span className="text-xs">Text</span>
                                                </Button>
                                                <Button variant="outline" className="h-20 flex flex-col gap-2 bg-slate-800 border-slate-700 hover:bg-slate-700 hover:text-white hover:border-orange-500/50 transition-all">
                                                    <Wrench className="w-6 h-6 text-orange-400" />
                                                    <span className="text-xs">Parts</span>
                                                </Button>
                                            </div>
                                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-800">
                                                <h4 className="text-slate-400 text-xs uppercase tracking-wider mb-2">Job Description</h4>
                                                <p className="text-slate-200 text-sm leading-relaxed">
                                                    Client reports blocked drain in main bathroom. Potential tree root intrusion. Access via side gate.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'PHOTOS' && (
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="aspect-square bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center">
                                                <Camera className="w-8 h-8 text-slate-600" />
                                            </div>
                                            <div className="aspect-square bg-slate-800 rounded-xl border border-slate-700 flex items-center justify-center">
                                                <span className="text-xs text-slate-500">No photos yet</span>
                                            </div>
                                        </div>
                                    )}

                                    {activeTab === 'BILLING' && (
                                        <div className="space-y-6">
                                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-800">
                                                <div className="flex justify-between items-center mb-4">
                                                    <h4 className="text-slate-400 text-xs uppercase tracking-wider">Current Total</h4>
                                                    <span className="text-xl font-bold text-emerald-400">${job.value.toLocaleString()}</span>
                                                </div>
                                                <div className="space-y-3">
                                                    <div className="flex gap-2">
                                                        <Input
                                                            placeholder="Item (e.g. 100mm PVC)"
                                                            className="bg-slate-900 border-slate-700 text-white"
                                                            value={variationDesc}
                                                            onChange={(e) => setVariationDesc(e.target.value)}
                                                        />
                                                        <Input
                                                            placeholder="$"
                                                            type="number"
                                                            className="w-24 bg-slate-900 border-slate-700 text-white"
                                                            value={variationPrice}
                                                            onChange={(e) => setVariationPrice(e.target.value)}
                                                        />
                                                    </div>
                                                    <Button className="w-full bg-slate-700 hover:bg-slate-600" onClick={handleAddVariation}>
                                                        <Plus className="w-4 h-4 mr-2" /> Add Variation
                                                    </Button>
                                                </div>
                                            </div>

                                            <Button
                                                variant="outline"
                                                className={cn(
                                                    "w-full border-slate-700 text-slate-300 transition-all",
                                                    isRecording && "bg-red-900/20 text-red-400 border-red-900 animate-pulse"
                                                )}
                                                onClick={toggleRecording}
                                            >
                                                <Video className="w-4 h-4 mr-2" />
                                                {isRecording ? "Recording... (Tap to stop)" : "Add Video Explanation"}
                                            </Button>

                                            <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-800">
                                                <h4 className="text-slate-400 text-xs uppercase tracking-wider mb-2 flex items-center gap-2">
                                                    <PenTool className="w-3 h-3" />
                                                    Client Signature
                                                </h4>
                                                <div
                                                    className={cn(
                                                        "h-24 bg-slate-900 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-colors",
                                                        hasSignature ? "border-emerald-500/50" : "border-slate-700 hover:border-slate-500"
                                                    )}
                                                    onClick={() => setHasSignature(true)}
                                                >
                                                    {hasSignature ? (
                                                        <span className="font-serif italic text-2xl text-emerald-400 -rotate-2">Mrs. Jones</span>
                                                    ) : (
                                                        <span className="text-slate-500 text-sm">Tap to sign on glass</span>
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

            {/* Sticky Footer Button (Only visible when expanded) */}
            <AnimatePresence>
                {isOpen && status !== 'COMPLETED' && (
                    <motion.div
                        initial={{ y: 100 }}
                        animate={{ y: 0 }}
                        exit={{ y: 100 }}
                        className="absolute bottom-0 left-0 right-0 p-4 bg-slate-900 z-40 border-t border-slate-800"
                    >
                        <Button
                            className={cn(
                                "w-full h-14 text-lg font-bold uppercase tracking-widest transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]",
                                status === 'SCHEDULED' ? "bg-emerald-500 hover:bg-emerald-600 text-black" :
                                    status === 'ON_SITE' ? "bg-emerald-500 hover:bg-emerald-600 text-black" :
                                        "bg-blue-600 hover:bg-blue-700 text-white"
                            )}
                            onClick={(e) => {
                                e.stopPropagation();
                                onAction();
                            }}
                        >
                            {status === 'SCHEDULED' ? 'Start Travel' :
                                status === 'TRAVELING' ? 'Arrived' :
                                    status === 'ON_SITE' ? 'Start Work' :
                                        'Complete Job & Pay'}
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* FAB */}
            <AnimatePresence>
                {isOpen && (
                    <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        className="absolute bottom-24 right-6 w-14 h-14 bg-slate-800 rounded-full shadow-lg border border-slate-700 flex items-center justify-center z-40 text-white hover:bg-slate-700 hover:border-emerald-500 transition-colors"
                    >
                        <Camera className="w-6 h-6" />
                    </motion.button>
                )}
            </AnimatePresence>
        </>
    )
}
