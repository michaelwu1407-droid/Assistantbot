"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, MapPin, CheckCircle2, ExternalLink } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { updateJobStatus } from "@/actions/tradie-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { InvoiceGenerator } from "@/components/invoicing/invoice-generator"
import { JobMedia } from "./job-media"
import { formatInvoiceStatusLabel, formatJobHeaderStatus } from "@/lib/job-portal-status-labels"
import Link from "next/link"
import { JobCompletionModal } from "@/components/tradie/job-completion-modal"

// Define types locally or import (ideally import shared types)
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
    value: unknown
    description: string
    activities: unknown[]
    invoices: Array<{
        id: string
        number: string
        status: string
        total: number
        createdAt: string | Date
    }>
}

interface JobDetailViewProps {
    job: JobDetail
}

export default function JobDetailView({ job }: JobDetailViewProps) {
    const router = useRouter()
    const [status, setStatus] = useState(job.status)
    const [isUpdating, setIsUpdating] = useState(false)
    const [completionModalOpen, setCompletionModalOpen] = useState(false)
    const canCompleteFromHere = status === "ON_SITE"
    const needsFieldWorkflow = status === "SCHEDULED" || status === "TRAVELING"

    const handleStatusChange = async (newStatus: 'TRAVELING' | 'ON_SITE' | 'COMPLETED') => {
        setIsUpdating(true)
        try {
            const result = await updateJobStatus(job.id, newStatus)
            if (result.success) {
                setStatus(result.status ?? newStatus)
                toast.success(`Job updated — ${formatJobHeaderStatus(newStatus)}`)
                router.refresh()
            }
        } catch {
            toast.error("Failed to update status")
        } finally {
            setIsUpdating(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
            {/* Header */}
            <header className="p-4 bg-white dark:bg-slate-900 border-b flex justify-between items-start sticky top-0 z-10">
                <div>
                    <h1 className="text-2xl font-bold">{job.client.name}</h1>
                    <p className="text-muted-foreground text-sm">{job.title}</p>
                </div>
                <Badge variant={status === 'COMPLETED' ? 'default' : 'secondary'} className="text-sm">
                    {formatJobHeaderStatus(status)}
                </Badge>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Status Actions */}
                <div className="grid grid-cols-1 gap-4">
                    {canCompleteFromHere && (
                        <Button
                            size="lg"
                            className="w-full text-lg h-14 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setCompletionModalOpen(true)}
                            disabled={isUpdating}
                        >
                            <CheckCircle2 className="mr-2 h-6 w-6" />
                            Mark Job Complete
                        </Button>
                    )}
                    {needsFieldWorkflow && (
                        <Card className="border-amber-200 bg-amber-50/70">
                            <CardContent className="flex flex-col gap-3 p-4">
                                <div>
                                    <p className="text-sm font-semibold text-amber-900">Finish this job from the field workflow</p>
                                    <p className="mt-1 text-sm text-amber-800">
                                        Move through travel, arrival, safety, and completion in the tradie flow so notes, sign-off, invoicing, and review requests stay in sync.
                                    </p>
                                </div>
                                <Button asChild variant="secondary" className="w-full">
                                    <Link href={`/tradie/jobs/${job.id}`}>
                                        <ExternalLink className="mr-2 h-4 w-4" />
                                        Open Field Workflow
                                    </Link>
                                </Button>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="diary">Diary</TabsTrigger>
                        <TabsTrigger value="billing">Billing</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="space-y-4 mt-4">
                        {/* Client Details */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Client Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                        <Phone className="h-5 w-5 text-slate-600" />
                                    </div>
                                <div className="flex-1">
                                    <p className="font-medium">Call Mobile</p>
                                    <p className="text-sm text-muted-foreground">{job.client.phone || "No phone"}</p>
                                </div>
                                {job.client.phone ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            window.open(`tel:${job.client.phone}`)
                                        }}
                                    >
                                        Call
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/crm/deals/${job.id}`}>Add phone in CRM</Link>
                                    </Button>
                                )}
                                </div>
                                <Separator />
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                        <MapPin className="h-5 w-5 text-slate-600" />
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">Address</p>
                                        <p className="text-sm text-muted-foreground max-w-[200px] truncate">{job.client.address || "No address"}</p>
                                    </div>
                                {job.client.address ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(job.client.address!)}&travelmode=driving`, "_blank")
                                        }}
                                    >
                                        Map
                                    </Button>
                                ) : (
                                    <Button variant="outline" size="sm" asChild>
                                        <Link href={`/crm/deals/${job.id}`}>Add address in CRM</Link>
                                    </Button>
                                )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Description */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Job Description</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm leading-relaxed">{job.description}</p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="diary" className="space-y-4 mt-4">
                        <JobMedia 
                            dealId={job.id} 
                            isPastJob={job.status === 'COMPLETED' || job.status === 'WON'}
                        />
                    </TabsContent>

                    <TabsContent value="billing" className="space-y-4 mt-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Invoices</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {job.invoices.length === 0 ? (
                                    <div className="space-y-3">
                                        <p className="text-sm text-muted-foreground">No invoices generated yet.</p>
                                        <p className="text-xs text-muted-foreground">
                                            Create and issue invoices from the full CRM billing panel so totals, status, and customer sends stay in sync.
                                        </p>
                                        <Button asChild className="w-full mt-2" variant="secondary">
                                            <Link href={`/crm/deals/${job.id}`}>
                                                <ExternalLink className="mr-2 h-4 w-4" />
                                                Open Full Billing
                                            </Link>
                                        </Button>
                                    </div>
                                ) : (
                                    job.invoices.map(inv => (
                                        <div key={inv.id} className="flex justify-between items-center p-2 border rounded bg-white">
                                            <div>
                                                <p className="font-medium flex items-center gap-2">
                                                    {inv.number}
                                                    <Badge variant={inv.status === 'PAID' ? 'default' : inv.status === 'ISSUED' ? 'secondary' : 'outline'} className="text-[10px] h-5">
                                                        {formatInvoiceStatusLabel(inv.status)}
                                                    </Badge>
                                                </p>
                                                <p className="text-xs text-muted-foreground">${Number(inv.total).toFixed(2)} • {new Date(inv.createdAt).toLocaleDateString("en-AU")}</p>
                                            </div>
                                            <InvoiceGenerator invoiceId={inv.id} invoiceNumber={inv.number} />
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            <JobCompletionModal
                open={completionModalOpen}
                onOpenChange={setCompletionModalOpen}
                dealId={job.id}
                onSuccess={() => {
                    setStatus("COMPLETED")
                    router.refresh()
                    toast.success("Job completion saved")
                }}
            />
        </div>
    )
}
