"use client"

import { ContactView } from "@/actions/contact-actions"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Mail, Phone, Building2, Calendar, Edit, MapPin, Home } from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface ContactProfileProps {
    contact: ContactView
}

export function ContactProfile({ contact }: ContactProfileProps) {
    // Extract unique addresses from deals as "properties"
    const properties = (contact.deals ?? [])
        .filter((d) => d.address)
        .map((d) => ({
            title: d.title,
            address: d.address,
            stage: d.stage,
            value: d.value
        }));

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header / Banner Card */}
            <div className="glass-card rounded-2xl overflow-hidden relative group">
                <div className="h-32 bg-gradient-to-r from-primary/10 via-background to-secondary/10" />
                <div className="relative pt-0 pb-6 px-6">
                    <div className="flex flex-col md:flex-row items-start md:items-end -mt-12 gap-5">
                        <Avatar className="w-24 h-24 border-4 border-background shadow-lg ring-1 ring-border/10">
                            <AvatarImage src={contact.avatarUrl || undefined} />
                            <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                                {contact.name.slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-1 mb-2">
                            <h1 className="text-2xl font-bold text-foreground tracking-tight">{contact.name}</h1>
                            <div className="flex items-center gap-2 text-muted-foreground text-sm">
                                {contact.company && (
                                    <span className="flex items-center gap-1.5">
                                        <Building2 className="w-3.5 h-3.5 opacity-70" />
                                        {contact.company}
                                    </span>
                                )}
                                {contact.company && <span className="opacity-30">•</span>}
                                {contact.dealCount > 0 && (
                                    <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20 border-primary/20 transition-colors">
                                        {contact.dealCount} Open Deals
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3 w-full md:w-auto mt-4 md:mt-0">
                            <Button variant="outline" className="flex-1 md:flex-none hover:bg-white/5 hover:text-foreground">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                            </Button>
                            <Button className="flex-1 md:flex-none">
                                <Phone className="w-4 h-4 mr-2" />
                                Call
                            </Button>
                            <Button className="flex-1 md:flex-none bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20">
                                <Mail className="w-4 h-4 mr-2" />
                                Email
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Layout Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Left: Info */}
                <div className="space-y-6">
                    <div className="glass-card rounded-xl p-5 space-y-5">
                        <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <UserCircle className="w-4 h-4 text-primary" />
                            Details
                        </h3>

                        <div className="space-y-4">
                            <div className="flex items-center gap-3 text-sm group">
                                <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <Mail className="w-4 h-4" />
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium">Email</div>
                                    <a href={`mailto:${contact.email}`} className="text-foreground truncate hover:text-primary transition-colors block font-medium">
                                        {contact.email || "—"}
                                    </a>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-sm group">
                                <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <Phone className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium">Phone</div>
                                    <div className="text-foreground font-medium">{contact.phone || "—"}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 text-sm group">
                                <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-muted-foreground text-[10px] uppercase tracking-wider font-medium">Last Activity</div>
                                    <div className="text-foreground font-medium">
                                        {contact.lastActivityDate
                                            ? new Date(contact.lastActivityDate).toLocaleDateString()
                                            : "Never"}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Properties Section (Multi-Property UC13) */}
                    {properties.length > 0 && (
                        <div className="glass-card rounded-xl p-5 space-y-4">
                            <h3 className="font-semibold text-foreground flex items-center gap-2">
                                <Home className="w-4 h-4 text-primary" />
                                Properties ({properties.length})
                            </h3>
                            <div className="space-y-3">
                                {properties.map((prop: any, i: number) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/20 border border-border/10 hover:bg-muted/30 transition-colors">
                                        <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-foreground truncate">{prop.title}</p>
                                            <p className="text-xs text-muted-foreground truncate opacity-80">{prop.address}</p>
                                        </div>
                                        <Badge variant="outline" className="text-[10px] flex-shrink-0 bg-background/50">
                                            {prop.stage}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Right: Activity Feed Placeholder */}
                <div className="md:col-span-2 space-y-6">
                    {/* We will render the ActivityFeed client component here in the Page */}
                    <div className="glass-card rounded-xl p-8 flex flex-col items-center justify-center text-center min-h-[300px] border-dashed border-2 bg-transparent text-muted-foreground">
                        <div className="bg-muted/30 p-4 rounded-full mb-3">
                            <Calendar className="w-8 h-8 opacity-50" />
                        </div>
                        <h3 className="text-lg font-medium text-foreground">Activity Timeline</h3>
                        <p className="text-sm max-w-xs mx-auto mt-2 opacity-70">
                            Activity feed will be rendered here via the page layout.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}

function UserCircle(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="10" r="3" />
            <path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" />
        </svg>
    )
}
