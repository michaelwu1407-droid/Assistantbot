"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, MapPin, Navigation, Phone, FileText, Send, MessageSquare, Mail, PhoneCall, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { JobStatusBar } from "./job-status-bar"
import { CameraFAB } from "./camera-fab"
import { VoiceNoteInput } from "./voice-note-input"
import { formatJobHeaderStatus } from "@/lib/job-portal-status-labels"

type JobStatus = "SCHEDULED" | "TRAVELING" | "ON_SITE" | "COMPLETED" | "CANCELLED"

interface JobActivity {
    id: string
    type: string
    title: string
    content: string | null
    createdAt: string | Date
}

interface JobInvoice {
    id: string
    total?: number | null
    createdAt?: string | Date
}

interface JobPhoto {
    id: string
    url: string
}

// Define the type locally based on what getJobDetails returns
interface JobDetail {
    id: string
    contactId?: string | null
    title: string
    client: {
        name: string
        phone: string | null
        email: string | null
        address: string | null
    }
    status: JobStatus
    value: number
    description: string
    safetyCheckCompleted: boolean
    activities: JobActivity[]
    invoices: JobInvoice[]
    photos: JobPhoto[]
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
                    <Link href="/tradie" className="p-2 -ml-2 hover:bg-slate-100 rounded-full text-slate-500">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <Badge variant={job.status === 'COMPLETED' ? 'secondary' : 'default'} className="uppercase">
                        {formatJobHeaderStatus(job.status)}
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
                            {job.client.address ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="ml-auto h-8"
                                    onClick={() => {
                                        window.open(`https://maps.google.com/?q=${job.client.address}`, "_blank")
                                    }}
                                >
                                    <Navigation className="w-3 h-3 mr-1" />
                                    Navigate
                                </Button>
                            ) : (
                                <Button asChild variant="outline" size="sm" className="ml-auto h-8">
                                    <Link href={`/crm/deals/${job.id}`}>Add address in CRM</Link>
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-3">
                            <Phone className="w-5 h-5 text-slate-400" />
                            <div>
                                <p className="text-sm font-medium text-slate-900">Contact</p>
                                <p className="text-sm text-slate-500">{job.client.phone || "No phone"}</p>
                            </div>
                            {job.client.phone ? (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="ml-auto h-8"
                                    onClick={() => {
                                        window.open(`tel:${job.client.phone}`)
                                    }}
                                >
                                    <Phone className="w-3 h-3 mr-1" />
                                    Call
                                </Button>
                            ) : (
                                <Button asChild variant="outline" size="sm" className="ml-auto h-8">
                                    <Link href={`/crm/deals/${job.id}`}>Add phone in CRM</Link>
                                </Button>
                            )}
                        </div>
                    </Card>

                    {/* Tabs */}
                    <Tabs defaultValue="details" className="w-full">
                        <TabsList className="w-full grid grid-cols-5 bg-white border border-slate-200 p-1 h-12">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="chat">Chat</TabsTrigger>
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

                        {/* Conversation history — full chat thread for this job */}
                        <TabsContent value="chat" className="mt-4 space-y-3">
                            {(() => {
                                const chatActivities = [...job.activities]
                                    .filter((a) => ["CALL", "EMAIL", "NOTE"].includes(a.type))
                                    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())

                                if (chatActivities.length === 0) {
                                    return (
                                        <Card className="p-6 text-center text-slate-400 text-sm space-y-3">
                                            <div>
                                                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                                <p>No conversation history yet for this job.</p>
                                                <p className="mt-2 text-xs text-slate-500">
                                                    Open the full customer timeline to see calls, emails, texts, and system history together.
                                                </p>
                                            </div>
                                            {job.contactId ? (
                                                <Button asChild variant="secondary" className="w-full">
                                                    <Link href={`/crm/inbox?contact=${job.contactId}`}>
                                                        <ExternalLink className="w-4 h-4 mr-2" />
                                                        Open Customer Timeline
                                                    </Link>
                                                </Button>
                                            ) : null}
                                        </Card>
                                    )
                                }

                                return (
                                    <>
                                        {chatActivities.map((activity) => {
                                            const Icon = activity.type === "CALL" ? PhoneCall
                                                : activity.type === "EMAIL" ? Mail
                                                : MessageSquare
                                            const colorClass = activity.type === "CALL" ? "text-blue-500 bg-blue-50"
                                                : activity.type === "EMAIL" ? "text-purple-500 bg-purple-50"
                                                : "text-emerald-500 bg-emerald-50"
                                            const time = new Date(activity.createdAt)
                                            const timeStr = time.toLocaleDateString("en-AU", { day: "numeric", month: "short" }) + " " + time.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit" })

                                            return (
                                                <Card key={activity.id} className="p-3 border-slate-200 shadow-sm">
                                                    <div className="flex gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colorClass}`}>
                                                            <Icon className="w-4 h-4" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <p className="text-sm font-medium text-slate-900 truncate">{activity.title}</p>
                                                                <span className="text-[11px] text-slate-400 whitespace-nowrap">{timeStr}</span>
                                                            </div>
                                                            {activity.content && (
                                                                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{activity.content}</p>
                                                            )}
                                                        </div>
                                                    </div>
                                                </Card>
                                            )
                                        })}
                                        {job.contactId ? (
                                            <Button asChild variant="secondary" className="w-full">
                                                <Link href={`/crm/inbox?contact=${job.contactId}`}>
                                                    <ExternalLink className="w-4 h-4 mr-2" />
                                                    Open Customer Timeline
                                                </Link>
                                            </Button>
                                        ) : null}
                                    </>
                                )
                            })()}
                        </TabsContent>

                        <TabsContent value="diary" className="mt-4 space-y-4">
                            <VoiceNoteInput dealId={job.id} />
                            {/* Photos Grid */}
                            <div className="grid grid-cols-2 gap-3">
                                {job.photos.map((photo) => (
                                    <div key={photo.id} className="aspect-square rounded-lg bg-slate-200 overflow-hidden relative">
                                        <Image src={photo.url} alt="Job photo" fill unoptimized className="object-cover" />
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
                            <Card className="p-4 text-center text-slate-500 text-sm space-y-3">
                                <p>
                                    Billing for this job lives in the full CRM panel so invoice totals, status, and customer sends stay in sync.
                                </p>
                                <Button asChild variant="secondary" className="w-full">
                                    <Link href={`/crm/deals/${job.id}`}>
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Open Full Billing
                                    </Link>
                                </Button>
                            </Card>
                        </TabsContent>

                        <TabsContent value="handover" className="mt-4 space-y-4">
                            <Card className="p-4">
                                <h3 className="font-semibold mb-3 text-sm text-slate-900 flex items-center gap-2">
                                    <FileText className="w-4 h-4" />
                                    Handover Status
                                </h3>
                                <div className="space-y-3">
                                    <p className="text-sm text-slate-600 leading-relaxed">
                                        Handover documents and customer-ready attachments are managed from the full CRM job view so files, notes, and message history stay together.
                                    </p>
                                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Current job assets</p>
                                        <p className="mt-1 text-sm text-slate-900">
                                            {job.photos.length > 0 ? `${job.photos.length} job photo${job.photos.length === 1 ? "" : "s"} ready to review in CRM.` : "No handover files attached yet."}
                                        </p>
                                    </div>
                                </div>
                            </Card>
                            <Card className="p-4 border-slate-200 shadow-sm">
                                <p className="text-sm text-slate-600">
                                    To send handover notes or attachments today, use the full CRM job view so messaging, attachments, and customer history stay together.
                                </p>
                                <Button asChild className="mt-4 w-full gap-2 bg-slate-900 hover:bg-slate-800">
                                    <Link href={`/crm/deals/${job.id}`}>
                                        <ExternalLink className="w-4 h-4" />
                                        Open Full Job in CRM
                                    </Link>
                                </Button>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </div>
            </div>

            {/* Job Status Bar - Fixed Footer */}
            <JobStatusBar
                dealId={job.id}
                currentStatus={job.status}
                contactName={job.client.name}
                safetyCheckCompleted={job.safetyCheckCompleted}
            />

            {/* Camera FAB - Always visible */}
            <CameraFAB dealId={job.id} onPhotoUploaded={() => router.refresh()} />
        </div>
    )
}
