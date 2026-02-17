import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, Edit, Mail, Phone, Building, MapPin, Home } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ContactDetailPage({ params }: PageProps) {
    const { id } = await params

    const contact = await db.contact.findUnique({
        where: { id },
        include: { deals: { take: 5, orderBy: { createdAt: 'desc' } } }
    })

    if (!contact) {
        notFound()
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-8 space-y-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-900 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{contact.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            {contact.email && (
                                <a href={`mailto:${contact.email}`} className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {contact.email}
                                </a>
                            )}
                            {contact.phone && (
                                <a href={`tel:${contact.phone}`} className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {contact.phone}
                                </a>
                            )}
                        </div>
                    </div>
                </div>
                <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                </Button>
            </div>

            <div className="flex-1 min-h-0">
                <Tabs defaultValue="deals" className="h-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="deals">Deals ({contact.deals.length})</TabsTrigger>
                        <TabsTrigger value="properties">Properties</TabsTrigger>
                        <TabsTrigger value="activity">Activity</TabsTrigger>
                    </TabsList>

                    <div className="flex-1 mt-6">
                        {/* Deals Tab */}
                        <TabsContent value="deals" className="h-full">
                            <div className="space-y-4 overflow-y-auto">
                                <h3 className="font-semibold text-slate-900">Associated Deals ({contact.deals.length})</h3>
                                {contact.deals.length === 0 ? (
                                    <p className="text-slate-500 text-sm">No deals yet.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {contact.deals.map(deal => (
                                            <Link
                                                key={deal.id}
                                                href={`/dashboard/deals/${deal.id}`}
                                                className="block p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-slate-900">{deal.title}</p>
                                                        <p className="text-xs text-slate-500">{contact.company || 'No company'}</p>
                                                    </div>
                                                    <Badge variant="outline">{deal.stage}</Badge>
                                                </div>
                                                <p className="text-sm text-emerald-600 font-medium mt-2">
                                                    ${Number(deal.value).toLocaleString()}
                                                </p>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* Properties Tab */}
                        <TabsContent value="properties" className="h-full">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h3 className="font-semibold text-slate-900">Property Portfolio</h3>
                                    <Button>
                                        <Building className="w-4 h-4 mr-2" />
                                        Add Property
                                    </Button>
                                </div>
                                
                                {/* Mock Properties Data */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="border border-slate-200 rounded-lg p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-medium text-slate-900">123 Main Street</h4>
                                                <p className="text-sm text-slate-500">Apartment 4B</p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <MapPin className="h-3 w-3 text-slate-400" />
                                                    <span className="text-xs text-slate-500">Sydney, NSW 2000</span>
                                                </div>
                                            </div>
                                            <Badge variant="outline">Owner</Badge>
                                        </div>
                                        <div className="mt-3 text-sm text-slate-600">
                                            <p>2 bedroom, 1 bathroom</p>
                                            <p>Purchased: 2020</p>
                                            <p>Est. Value: $850,000</p>
                                        </div>
                                    </div>
                                    
                                    <div className="border border-slate-200 rounded-lg p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-medium text-slate-900">456 Oak Avenue</h4>
                                                <p className="text-sm text-slate-500">House</p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <MapPin className="h-3 w-3 text-slate-400" />
                                                    <span className="text-xs text-slate-500">Melbourne, VIC 3000</span>
                                                </div>
                                            </div>
                                            <Badge variant="outline">Landlord</Badge>
                                        </div>
                                        <div className="mt-3 text-sm text-slate-600">
                                            <p>4 bedroom, 2 bathroom</p>
                                            <p>Acquired: 2018</p>
                                            <p>Est. Value: $1,200,000</p>
                                        </div>
                                    </div>
                                    
                                    <div className="border border-slate-200 rounded-lg p-4">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <h4 className="font-medium text-slate-900">789 Beach Road</h4>
                                                <p className="text-sm text-slate-500">Townhouse</p>
                                                <div className="flex items-center gap-1 mt-1">
                                                    <MapPin className="h-3 w-3 text-slate-400" />
                                                    <span className="text-xs text-slate-500">Gold Coast, QLD 4215</span>
                                                </div>
                                            </div>
                                            <Badge variant="outline">Owner</Badge>
                                        </div>
                                        <div className="mt-3 text-sm text-slate-600">
                                            <p>3 bedroom, 2 bathroom</p>
                                            <p>Purchased: 2021</p>
                                            <p>Est. Value: $650,000</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Property Stats */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="bg-slate-50 rounded-lg p-4">
                                        <div className="flex items-center gap-2">
                                            <Home className="h-5 w-5 text-slate-600" />
                                            <span className="text-sm font-medium text-slate-900">Total Properties</span>
                                        </div>
                                        <p className="text-2xl font-bold text-slate-900 mt-1">3</p>
                                    </div>
                                    <div className="bg-green-50 rounded-lg p-4">
                                        <div className="flex items-center gap-2">
                                            <Building className="h-5 w-5 text-green-600" />
                                            <span className="text-sm font-medium text-slate-900">Total Value</span>
                                        </div>
                                        <p className="text-2xl font-bold text-green-600 mt-1">$2.7M</p>
                                    </div>
                                    <div className="bg-blue-50 rounded-lg p-4">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-5 w-5 text-blue-600" />
                                            <span className="text-sm font-medium text-slate-900">Locations</span>
                                        </div>
                                        <p className="text-2xl font-bold text-blue-600 mt-1">3</p>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Activity Tab */}
                        <TabsContent value="activity" className="h-full">
                            <div className="h-full overflow-hidden border border-slate-200 rounded-xl bg-white flex flex-col">
                                <div className="p-4 border-b border-slate-100 font-semibold text-slate-900 bg-slate-50/50">
                                    Activity History
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <ActivityFeed contactId={contact.id} />
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>
            </div>
        </div>
    )
}
