import { db } from "@/lib/db";
import { notFound } from "next/navigation";
import { format } from "date-fns";

export const dynamic = "force-dynamic";
import { JobStatusBar } from "@/components/tradie/job-status-bar";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Phone, MapPin, Mail, Calendar } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
// JobStatus enum not in schema yet - using string literal
import { ActivityFeed } from "@/components/crm/activity-feed";
import { JobPhotosTab } from "@/components/tradie/job-photos-tab";
import { JobBillingTab } from "@/components/tradie/job-billing-tab";

// Mock data for types not fully fleshed out in prisma client yet
// In a real scenario, these come from db.deal include
interface JobDetailProps {
    params: Promise<{ id: string }>;
}

export default async function JobDetailPage({ params }: JobDetailProps) {
    const { id } = await params;

    const deal = await db.deal.findUnique({
        where: { id },
        include: {
            contact: true,
            activities: {
                orderBy: { createdAt: "desc" },
                take: 10
            },
            // In a real app we would include invoices, photos here
        }
    });

    if (!deal) {
        notFound();
    }

    // Fallback for contact
    const contact = deal.contact || { name: "Unknown", phone: "", email: "", address: "" };

    // Parse Job Status from fields
    const jobStatus = (deal.jobStatus || "SCHEDULED") as "SCHEDULED" | "TRAVELING" | "ON_SITE" | "COMPLETED";

    // Format Date from fields
    const scheduledDate = deal.scheduledAt
        ? format(deal.scheduledAt, "EEE, d MMM h:mm a")
        : "Unscheduled";

    return (
        <div className="min-h-screen bg-slate-50 pb-32">
            {/* Header */}
            <header className="bg-white border-b px-4 py-3 flex items-center gap-3 sticky top-0 z-10">
                <Link href="/dashboard/tradie">
                    <Button variant="ghost" size="icon" className="-ml-2">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div className="flex-1">
                    <h1 className="font-bold text-lg leading-tight">{deal.title}</h1>
                    <p className="text-xs text-muted-foreground">{contact.name} • {scheduledDate}</p>
                </div>
                <a href={`tel:${contact.phone}`}>
                    <Button size="icon" className="rounded-full bg-green-500 hover:bg-green-600 text-white">
                        <Phone className="h-5 w-5" />
                    </Button>
                </a>
            </header>

            {/* content */}
            <div className="p-4 space-y-4">
                {/* Status Card */}
                <Card>
                    <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Job ID</span>
                            <span className="font-mono text-sm">#{deal.id.slice(-6)}</span>
                        </div>
                        <Badge variant={jobStatus === "COMPLETED" ? "default" : "outline"} className="text-sm px-3 py-1">
                            {jobStatus}
                        </Badge>
                    </CardContent>
                </Card>

                <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid w-full grid-cols-4 bg-slate-200">
                        <TabsTrigger value="info">Info</TabsTrigger>
                        <TabsTrigger value="diary">Diary</TabsTrigger>
                        <TabsTrigger value="photos">Photos</TabsTrigger>
                        <TabsTrigger value="billing">Bill</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-4 mt-4">
                        {/* Location */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Location</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-start gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full mt-1">
                                        <MapPin className="h-5 w-5 text-blue-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold text-lg">{contact.address || "No address provided"}</p>
                                        <Button variant="link" className="p-0 h-auto text-blue-600">
                                            Open in Maps
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Contact Details */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Client Details</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex items-center gap-3">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span>{contact.email || "No email"}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{contact.phone || "No phone"}</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Job Description */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium text-muted-foreground uppercase">Scope of Work</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                    {deal.metadata ? (deal.metadata as any).description : "No description provided."}
                                </p>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="diary">
                        <Card>
                            <CardHeader>
                                <CardTitle>Job Diary</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {/* Reusing existing activity feed but scoped to this deal */}
                                <ActivityFeed
                                    activities={
                                        deal.activities.map(a => ({
                                            id: a.id,
                                            type: a.type as any,
                                            title: a.title,
                                            description: a.description || "",
                                            time: format(a.createdAt, "h:mm a"), // Use actual formatted time
                                            date: a.createdAt, // Pass date object if needed by component
                                            createdAt: a.createdAt,
                                            dealId: a.dealId || undefined,
                                            contactId: a.contactId || undefined
                                        }))
                                    }
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>




                    <TabsContent value="photos">
                        <JobPhotosTab dealId={deal.id} />
                    </TabsContent>

                    <TabsContent value="billing">
                        <JobBillingTab dealId={deal.id} />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Global Action Bar */}
            <JobStatusBar
                dealId={deal.id}
                currentStatus={jobStatus}
                contactName={contact.name}
                safetyCheckCompleted={deal.safetyCheckCompleted}
            />
        </div>
    );
}
