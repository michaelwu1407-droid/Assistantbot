"use client"

import { useState, useEffect } from "react"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter, DrawerTrigger } from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { MapPin, Phone, Navigation, Clock, ChevronUp, Loader2 } from "lucide-react"
import { getNextJob, updateJobStatus } from "@/actions/tradie-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface JobBottomSheetProps {
    workspaceId: string
}

export function JobBottomSheet({ workspaceId }: JobBottomSheetProps) {
    const [nextJob, setNextJob] = useState<{
        id: string;
        title: string;
        client: string;
        time: Date | null;
        address: string | null;
    } | null>(null)
    const [isOpen, setIsOpen] = useState(false)
    const [isStarting, setIsStarting] = useState(false)
    const router = useRouter()

    useEffect(() => {
        getNextJob(workspaceId).then(setNextJob)
    }, [workspaceId])

    if (!nextJob) return null

    const handleNavigate = () => {
        if (nextJob.address) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(nextJob.address)}`, '_blank')
        } else {
            toast.error("No address available for this job")
        }
    }

    const handleStartTravel = async () => {
        setIsStarting(true)
        try {
            // 1. Update status to TRAVELING (triggers SMS on backend)
            const result = await updateJobStatus(nextJob.id, 'TRAVELING')
            
            if (result.success) {
                toast.success("Travel started! Client notified via SMS.")
                setIsOpen(false)
                // 2. Navigate to job details
                router.push(`/dashboard/jobs/${nextJob.id}`)
            } else {
                toast.error("Failed to start travel: " + result.error)
            }
        } catch (error) {
            console.error(error)
            toast.error("An unexpected error occurred")
        } finally {
            setIsStarting(false)
        }
    }

    return (
        <Drawer open={isOpen} onOpenChange={setIsOpen}>
            <DrawerTrigger asChild>
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg cursor-pointer hover:bg-slate-50 transition-colors z-40 md:hidden">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
                            <Clock className="w-4 h-4" />
                            Up Next
                        </div>
                        <ChevronUp className="w-4 h-4 text-slate-400" />
                    </div>
                    <h3 className="font-bold text-slate-900">{nextJob.title}</h3>
                    <p className="text-sm text-slate-500">{nextJob.client}</p>
                </div>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{nextJob.title}</DrawerTitle>
                    <DrawerDescription>
                        Scheduled for {nextJob.time ? new Date(nextJob.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Today'}
                    </DrawerDescription>
                </DrawerHeader>
                <div className="p-4 space-y-4">
                    <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                        <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div>
                            <p className="font-medium text-slate-900 text-sm">Location</p>
                            <p className="text-sm text-slate-500">{nextJob.address || "No address provided"}</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                        <Button onClick={handleNavigate} className="w-full" variant="outline">
                            <Navigation className="w-4 h-4 mr-2" />
                            Navigate
                        </Button>
                        <Button 
                            onClick={handleStartTravel} 
                            disabled={isStarting}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                            {isStarting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Start Travel"}
                        </Button>
                    </div>
                </div>
                <DrawerFooter>
                    <Button variant="ghost" onClick={() => setIsOpen(false)}>Close</Button>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}
