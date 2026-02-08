"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MapPin, Phone, Navigation, CheckCircle2, ArrowLeft, Loader2 } from "lucide-react"
import Link from "next/link"
import { updateJobStatus } from "@/actions/tradie-actions"
import { toast } from "sonner"
import { CameraFAB } from "./camera-fab"
import { useRouter } from "next/navigation"

// Define the type locally based on what getJobDetails returns
interface JobDetail {
    id: string
    title: string
    client: {
        name: string
        phone: string | null
        email: string | null
        address: string | null
    }
    status: string
    value: number
    description: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    activities: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    invoices: any[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    photos: any[]
}

interface JobDetailViewProps {
    job: JobDetail
}

export function JobDetailView({ job }: JobDetailViewProps) {
    const [status, setStatus] = useState(job.status)
    const [isLoading, setIsLoading] = useState(false)
    const router = useRouter()

    const handleStatusChange = async (newStatus: 'TRAVELING' | 'ON_SITE' | 'COMPLETED') => {
        setIsLoading(true)
        try {
            const result = await updateJobStatus(job.id, newStatus)
            if (result.success) {
                setStatus(newStatus)
                toast.success(`Status updated to ${newStatus.replace('_', ' ')}`)
                router.refresh()
            } else {
                toast.error("Failed to update status")
            }
        } catch (error) {
            console.error(error)
            toast.error("An error occurred")
        } finally {
            setIsLoading(false)
        }
    }

    const renderWorkflowButton = () => {
        switch (status) {
            case 'SCHEDULED':
            case 'NEW':
            case 'WON':
                return (
                    <Button 
                        className="w-full h-14 text-lg font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                        onClick={() => handleStatusChange('TRAVELING')}
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <Navigation className="mr-2 h-5 w-5" />}
                        START TRAVEL
                    </Button>
                )
            case 'TRAVELING':
                return (
                    <Button 
                        className="w-full h-14 text-lg font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                        onClick={() => handleStatusChange('ON_SITE')}
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <MapPin className="mr-2 h-5 w-5" />}
                        ARRIVED
                    </Button>
                )
            case 'ON_SITE':
                return (
                    <Button 
                        className="w-full h-14 text-lg font-bold bg-slate-900 hover:bg-slate-800 text-white shadow-lg"
                        onClick={() => handleStatusChange('COMPLETED')}
                        disabled={isLoading}
                    >
                        {isLoading ? <Loader2 className="animate-spin mr-2" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                        COMPLETE JOB
                    </Button>
                )
            case 'COMPLETED':
                return (
                    <div className="w-full h-14 flex items-center justify-center bg-slate-100 text-slate-500 font-bold rounded-lg border border-slate-200">
                        JOB COMPLETED
                    </div>
                )
            default:
                return null
        }
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 pb-20">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-2">
                    <Link href="/dashboard/tradie" className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <Badge variant={status === 'COMPLETED' ? 'secondary' : 'default'} className="uppercase">
                        {status.replace('_', ' ')}
                    </Badge>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 leading-tight">{job.title}</h1>
                <p className="text-slate-500 text-sm mt-1">{job.client.name}</p>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-6">
                    {/* Workflow Action */}
                    {renderWorkflowButton()}

                    {/* Client Card */}
                    <Card className="p-4 space-y-4 border-slate-200 shadow-sm">
                        <div className="flex items-start gap-3">
                            <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-slate-900">Location</p>
                                <p className="text-sm text-slate-500">{job.client.address || "No address"}</p>
                            </div>
                            <Button variant="outline" size="sm" className="ml-auto h-8" onClick={() => window.open(`https://maps.google.com/?q=${job.client.address}`, '_blank')}>
                                <Navigation className="w-3 h-3" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-sm font-medium text-slate-900">Contact</p>
                                <p className="text-sm text-slate-500">{job.client.phone || "No phone"}</p>
                            </div>
                            <Button variant="outline" size="sm" className="ml-auto h-8" onClick={() => window.open(`tel:${job.client.phone}`)}>
                                <Phone className="w-3 h-3" />
                            </Button>
                        </div>
                    </Card>

                    {/* Tabs */}
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="w-full grid grid-cols-3 bg-white border border-slate-200 p-1 h-12">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="diary">Diary</TabsTrigger>
                            <TabsTrigger value="billing">Billing</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="details" className="mt-4 space-y-4">
                            <Card className="p-4">
                                <h3 className="font-semibold mb-2 text-sm text-slate-900">Job Description</h3>
                                <p className="text-sm text-slate-600 leading-relaxed">
                                    {job.description}
                                </p>
                            </Card>
                        </TabsContent>

                        <TabsContent value="diary" className="mt-4 space-y-4">
                            {/* Photos Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                                {job.photos.map((photo: any) => (
                                    <div key={photo.id} className="aspect-square rounded-lg bg-slate-200 overflow-hidden relative">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={photo.url} alt="Job photo" className="w-full h-full object-cover" />
                                    </div>
                                ))}
                                {job.photos.length === 0 && (
                                    <div className="col-span-2 py-8 text-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                                        No photos yet. Tap the camera button to add one.
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        <TabsContent value="billing" className="mt-4">
                            <Card className="p-4 text-center text-slate-500 text-sm">
                                Billing features coming soon.
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Camera FAB - Always visible */}
            <CameraFAB dealId={job.id} onPhotoUploaded={() => router.refresh()} />
        </div>
    )
}
