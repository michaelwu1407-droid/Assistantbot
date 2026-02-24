"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Phone, Mail, MapPin, Calendar, CheckCircle2, Circle, Camera, Plus } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
import { updateJobStatus } from "@/actions/tradie-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { InvoiceGenerator } from "@/components/invoicing/invoice-generator"
import { JobMedia } from "./job-media"

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
    value: any
    description: string
    activities: any[]
    invoices: any[]
}

interface JobDetailViewProps {
    job: JobDetail
}

export default function JobDetailView({ job }: JobDetailViewProps) {
    const router = useRouter()
    const [status, setStatus] = useState(job.status)
    const [isUpdating, setIsUpdating] = useState(false)

    const handleStatusChange = async (newStatus: 'TRAVELING' | 'ON_SITE' | 'COMPLETED') => {
        setIsUpdating(true)
        try {
            const result = await updateJobStatus(job.id, newStatus)
            if (result.success) {
                setStatus(result.status ?? newStatus)
                toast.success(`Job updated to ${newStatus}`)
                router.refresh()
            }
        } catch (e) {
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
                <Badge variant={status === 'WON' ? 'default' : 'secondary'} className="text-sm">
                    {status}
                </Badge>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Status Actions */}
                <div className="grid grid-cols-1 gap-4">
                    {status !== 'COMPLETED' && status !== 'INVOICED' && (
                        <Button
                            size="lg"
                            className="w-full text-lg h-14 bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handleStatusChange('COMPLETED')}
                            disabled={isUpdating}
                        >
                            <CheckCircle2 className="mr-2 h-6 w-6" />
                            Mark Job Complete
                        </Button>
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
                                    <Button variant="outline" size="sm">Call</Button>
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
                                    <Button variant="outline" size="sm">Map</Button>
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
                                    <p className="text-sm text-muted-foreground">No invoices generated.</p>
                                ) : (
                                    job.invoices.map(inv => (
                                        <div key={inv.id} className="flex justify-between items-center p-2 border rounded bg-white">
                                            <div>
                                                <p className="font-medium flex items-center gap-2">
                                                    {inv.number}
                                                    <Badge variant={inv.status === 'PAID' ? 'default' : inv.status === 'ISSUED' ? 'secondary' : 'outline'} className="text-[10px] h-5">
                                                        {inv.status}
                                                    </Badge>
                                                </p>
                                                <p className="text-xs text-muted-foreground">${Number(inv.total).toFixed(2)} • {new Date(inv.createdAt).toLocaleDateString()}</p>
                                            </div>
                                            <InvoiceGenerator invoiceId={inv.id} invoiceNumber={inv.number} />
                                        </div>
                                    ))
                                )}
                                <Button className="w-full mt-4" variant="secondary">Generate Invoice</Button>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}
