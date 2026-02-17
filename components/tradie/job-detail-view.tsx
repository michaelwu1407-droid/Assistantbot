"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin, Navigation, Phone, FileText, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { JobStatusBar } from "./job-status-bar"
import { CameraFAB } from "./camera-fab"
import { VoiceNoteInput } from "./voice-note-input"

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
    safetyCheckCompleted: boolean
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
    const router = useRouter()

    return (
        <div className="flex flex-col h-full bg-slate-50 pb-28">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-4 sticky top-0 z-10">
                <div className="flex items-center gap-3 mb-2">
                    <Link href="/dashboard/tradie" className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <Badge variant={job.status === 'COMPLETED' ? 'secondary' : 'default'} className="uppercase">
                        {job.status.replace('_', ' ')}
                    </Badge>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 leading-tight">{job.title}</h1>
                <p className="text-slate-500 text-sm mt-1">{job.client.name}</p>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-y-auto">
                <div className="p-4 space-y-6">

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
                        <TabsList className="w-full grid grid-cols-4 bg-white border border-slate-200 p-1 h-12">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="diary">Diary</TabsTrigger>
                            <TabsTrigger value="billing">Billing</TabsTrigger>
                            <TabsTrigger value="handover">Handover</TabsTrigger>
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
                            <VoiceNoteInput dealId={job.id} />
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

                        <TabsContent value="handover" className="mt-4 space-y-4">
                            <Card className="p-4">
                                <h3 className="font-semibold mb-3 text-sm text-slate-900 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Handover Resources
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                                        <FileText className="w-5 h-5 text-blue-500" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-900">Maintenance Guide</p>
                                            <p className="text-xs text-slate-500">General care instructions</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                                        <FileText className="w-5 h-5 text-emerald-500" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-900">Warranty Card</p>
                                            <p className="text-xs text-slate-500">12 month parts warranty</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                                        <FileText className="w-5 h-5 text-amber-500" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-slate-900">Before / After Photos</p>
                                            <p className="text-xs text-slate-500">{job.photos.length} photos attached</p>
                                        </div>
                                    </div>
                                </div>
                            </Card>
                            <Button className="w-full gap-2 bg-slate-900 hover:bg-slate-800">
                                <Send className="w-4 h-4" />
                                Send Handover Pack to Client
                            </Button>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Job Status Bar - Fixed Footer */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <JobStatusBar
                dealId={job.id}
                currentStatus={job.status as any}
                contactName={job.client.name}
                safetyCheckCompleted={job.safetyCheckCompleted}
            />

            {/* Camera FAB - Always visible */}
            <CameraFAB dealId={job.id} onPhotoUploaded={() => router.refresh()} />
        </div>
    )
}
