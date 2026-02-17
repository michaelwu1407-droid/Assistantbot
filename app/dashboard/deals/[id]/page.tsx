import { db } from "@/lib/db"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic";
import { ActivityFeed } from "@/components/crm/activity-feed"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, Edit, Camera, MessageSquare, FileText, Images } from "lucide-react"
import Link from "next/link"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function DealDetailPage({ params }: PageProps) {
    const { id } = await params

    const deal = await db.deal.findUnique({
        where: { id },
        include: { contact: true, jobPhotos: { orderBy: { createdAt: 'desc' } } }
    })

    if (!deal) {
        notFound()
    }

    const metadata = (deal.metadata || {}) as Record<string, unknown>
    const contact = deal.contact

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-8 space-y-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-900 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <div className="flex items-center gap-3">
                            <h1 className="text-2xl font-bold text-slate-900">{deal.title}</h1>
                            <Badge variant="outline" className="uppercase text-xs tracking-wider font-semibold">
                                {deal.stage}
                            </Badge>
                        </div>
                        <p className="text-slate-500 flex items-center gap-2 text-sm mt-1">
                            {contact?.company || 'No company'} •
                            <span className="text-emerald-600 font-medium">${Number(deal.value).toLocaleString()}</span>
                            {typeof metadata.address === 'string' && metadata.address && ` • ${metadata.address}`}
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                    </Button>
                </div>
            </div>

            <div className="flex-1 min-h-0">
                <Tabs defaultValue="details" className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="details" className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Details
                        </TabsTrigger>
                        <TabsTrigger value="photos" className="flex items-center gap-2">
                            <Images className="w-4 h-4" />
                            Photos {deal.jobPhotos && deal.jobPhotos.length > 0 && `(${deal.jobPhotos.length})`}
                        </TabsTrigger>
                        <TabsTrigger value="activity" className="flex items-center gap-2">
                            <MessageSquare className="w-4 h-4" />
                            Activity
                        </TabsTrigger>
                    </TabsList>

                    <div className="flex-1 mt-6">
                        {/* Details Tab */}
                        <TabsContent value="details" className="h-full">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full">
                                {/* Left Column: Contact Info */}
                                <div className="space-y-6 overflow-y-auto pr-2">
                                    {/* Contact Details Card */}
                                    <div className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm">
                                        <h3 className="font-semibold text-slate-900 mb-4">Contact Details</h3>
                                        {contact ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <p className="text-sm text-slate-500">Name</p>
                                                    <p className="font-medium text-slate-900">{contact.name}</p>
                                                </div>
                                                {contact.email && (
                                                    <div>
                                                        <p className="text-sm text-slate-500">Email</p>
                                                        <p className="font-medium text-slate-900">{contact.email}</p>
                                                    </div>
                                                )}
                                                {contact.phone && (
                                                    <div>
                                                        <p className="text-sm text-slate-500">Phone</p>
                                                        <p className="font-medium text-slate-900">{contact.phone}</p>
                                                    </div>
                                                )}
                                                {contact.company && (
                                                    <div>
                                                        <p className="text-sm text-slate-500">Company</p>
                                                        <p className="font-medium text-slate-900">{contact.company}</p>
                                                    </div>
                                                )}
                                                {typeof metadata.address === 'string' && metadata.address && (
                                                    <div>
                                                        <p className="text-sm text-slate-500">Address</p>
                                                        <p className="font-medium text-slate-900">{metadata.address}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            <p className="text-slate-500">No contact associated with this deal.</p>
                                        )}
                                    </div>

                                    {/* Deal Details Card */}
                                    <div className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm">
                                        <h3 className="font-semibold text-slate-900 mb-4">Job Details</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <p className="text-sm text-slate-500">Value</p>
                                                <p className="font-medium text-emerald-600">${Number(deal.value).toLocaleString()}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">Stage</p>
                                                <p className="font-medium text-slate-900 capitalize">{deal.stage.toLowerCase()}</p>
                                            </div>
                                            <div>
                                                <p className="text-sm text-slate-500">Created</p>
                                                <p className="font-medium text-slate-900">{deal.createdAt.toLocaleDateString()}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Photos Tab */}
                        <TabsContent value="photos" className="h-full">
                            <div className="p-6 border border-slate-200 rounded-xl bg-white shadow-sm h-full">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                                        <Camera className="w-4 h-4" />
                                        Job Photos
                                    </h3>
                                    {deal.jobPhotos && deal.jobPhotos.length > 0 && (
                                        <span className="text-sm text-slate-500">
                                            {deal.jobPhotos.length} photo{deal.jobPhotos.length !== 1 ? 's' : ''}
                                        </span>
                                    )}
                                </div>
                                
                                {deal.jobPhotos && deal.jobPhotos.length > 0 ? (
                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                        {deal.jobPhotos.map((photo) => (
                                            <div key={photo.id} className="aspect-square rounded-lg overflow-hidden bg-slate-100 border border-slate-200 group hover:shadow-lg transition-shadow">
                                                <img
                                                    src={photo.url}
                                                    alt={photo.caption || 'Job photo'}
                                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                                                />
                                                {photo.caption && (
                                                    <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-2 text-xs">
                                                        {photo.caption}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center h-64 text-center">
                                        <Camera className="w-12 h-12 text-slate-300 mb-4" />
                                        <h4 className="text-lg font-medium text-slate-900 mb-2">No Photos Yet</h4>
                                        <p className="text-slate-500">Photos will appear here once they're added to this job.</p>
                                        <Button className="mt-4" variant="outline">
                                            <Camera className="w-4 h-4 mr-2" />
                                            Add Photo
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* Activity Tab */}
                        <TabsContent value="activity" className="h-full">
                            <div className="h-full overflow-hidden border border-slate-200 rounded-xl bg-white flex flex-col">
                                <div className="select-none p-4 border-b border-slate-100 font-semibold text-slate-900 bg-slate-50/50 flex items-center justify-between">
                                    Activity History
                                    <Link href={`/dashboard/inbox?contact=${deal.contactId}`}>
                                        <Button size="sm" variant="outline" className="gap-1 text-xs">
                                            <MessageSquare className="w-3 h-3" />
                                            Quick Reply
                                        </Button>
                                    </Link>
                                </div>
                                <div className="flex-1 overflow-hidden p-0">
                                    <ActivityFeed dealId={deal.id} />
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    )
}
