"use client"

import { ContactView } from "@/actions/contact-actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Mail, Phone, Linkedin, MapPin, Building2, Calendar, Edit } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

interface ContactProfileProps {
    contact: ContactView
}

export function ContactProfile({ contact }: ContactProfileProps) {
    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header / Banner Card */}
            <Card className="border-slate-200 overflow-hidden">
                <div className="h-32 bg-gradient-to-r from-slate-100 to-slate-200" />
                <CardContent className="relative pt-0 pb-6 px-6">
                    <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 gap-4">
                        <Avatar className="w-24 h-24 border-4 border-white shadow-sm bg-white">
                            <AvatarImage src={contact.avatarUrl || undefined} />
                            <AvatarFallback className="text-xl bg-indigo-50 text-indigo-700">
                                {contact.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-1 mb-2">
                            <h1 className="text-2xl font-bold text-slate-900">{contact.name}</h1>
                            <div className="flex items-center gap-2 text-slate-500 text-sm">
                                {contact.company && (
                                    <span className="flex items-center gap-1">
                                        <Building2 className="w-3.5 h-3.5" />
                                        {contact.company}
                                    </span>
                                )}
                                {contact.company && <span className="text-slate-300">•</span>}
                                {contact.dealCount > 0 && (
                                    <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-100">
                                        {contact.dealCount} Open Deals
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                            <Button variant="outline" className="flex-1 md:flex-none">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                            </Button>
                            <Button className="flex-1 md:flex-none">
                                <Phone className="w-4 h-4 mr-2" />
                                Call
                            </Button>
                            <Button className="flex-1 md:flex-none">
                                <Mail className="w-4 h-4 mr-2" />
                                Email
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left: Info */}
                <div className="space-y-6">
                    <Card>
                        <CardContent className="p-4 space-y-4">
                            <h3 className="font-semibold text-slate-900">Details</h3>

                            <div className="space-y-3">
                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                        <Mail className="w-4 h-4" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="text-slate-500 text-xs uppercase tracking-wider font-medium">Email</div>
                                        <a href={`mailto:${contact.email}`} className="text-slate-900 truncate hover:text-blue-600 block">
                                            {contact.email || "—"}
                                        </a>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                        <Phone className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-slate-500 text-xs uppercase tracking-wider font-medium">Phone</div>
                                        <div className="text-slate-900">{contact.phone || "—"}</div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 text-sm">
                                    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                        <Calendar className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="text-slate-500 text-xs uppercase tracking-wider font-medium">Last Activity</div>
                                        <div className="text-slate-900">
                                            {contact.lastActivityDate
                                                ? new Date(contact.lastActivityDate).toLocaleDateString()
                                                : "Never"}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Activity Feed Placeholder (Wait for ActivityFeed update) */}
                <div className="md:col-span-2 space-y-6">
                    {/* We will render the ActivityFeed client component here in the Page */}
                </div>
            </div>
        </div>
    )
}
