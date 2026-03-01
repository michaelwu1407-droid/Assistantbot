"use client"

import { useState, useEffect, FormEvent } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createDeal } from "@/actions/deal-actions"
import { getContacts, createContact, type ContactView } from "@/actions/contact-actions"
import { getTeamMembers } from "@/actions/invite-actions"
import { toast } from "sonner"
import { User, Mail, Phone, CalendarClock, AlertCircle, ChevronLeft } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import { cn } from "@/lib/utils"

interface TeamMemberOption {
    id: string
    name: string | null
    email: string
    role: string
}

interface NewDealModalStandaloneProps {
    workspaceId: string
}

export function NewDealModalStandalone({ workspaceId }: NewDealModalStandaloneProps) {
    const router = useRouter()
    const [title, setTitle] = useState("")
    const [value, setValue] = useState("")
    const [address, setAddress] = useState("")
    const [latitude, setLatitude] = useState<number | null>(null)
    const [longitude, setLongitude] = useState<number | null>(null)
    const [scheduledAt, setScheduledAt] = useState("")
    const [stage, setStage] = useState("new_request")
    const [assignedToId, setAssignedToId] = useState("")
    const [contactId, setContactId] = useState("")
    const [contacts, setContacts] = useState<ContactView[]>([])
    const [teamMembers, setTeamMembers] = useState<TeamMemberOption[]>([])

    // New Contact Mode State
    const [mode, setMode] = useState<"select" | "create">("create")
    const [newContactName, setNewContactName] = useState("")
    const [newContactEmail, setNewContactEmail] = useState("")
    const [newContactPhone, setNewContactPhone] = useState("")

    const [isLoading, setIsLoading] = useState(false)
    const [isFetchingContacts, setIsFetchingContacts] = useState(false)
    const [contactError, setContactError] = useState("")

    useEffect(() => {
        if (workspaceId) {
            setIsFetchingContacts(true)
            Promise.all([
                getContacts(workspaceId),
                getTeamMembers()
            ]).then(([c, tm]) => {
                setContacts(c)
                setTeamMembers(tm as any)
            }).catch(console.error)
                .finally(() => setIsFetchingContacts(false))
        }
    }, [workspaceId])

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (!title) return
        if (mode === "select" && !contactId) return
        if (stage === "scheduled" && !assignedToId) {
            toast.error("Assign a team member when creating a job in Scheduled stage.")
            return
        }
        if (mode === "create") {
            if (!newContactName) return
            if (!newContactEmail && !newContactPhone) {
                setContactError("Please provide at least an email or phone number.")
                return
            }
        }

        setIsLoading(true)
        try {
            let finalContactId = contactId

            if (mode === "create") {
                const contactResult = await createContact({
                    name: newContactName,
                    email: newContactEmail || undefined,
                    phone: newContactPhone || undefined,
                    workspaceId
                })

                if (!contactResult.success) {
                    toast.error("Failed to create contact: " + contactResult.error)
                    setIsLoading(false)
                    return
                }

                finalContactId = contactResult.contactId
            }

            const result = await createDeal({
                title,
                value: parseFloat(value) || 0,
                contactId: finalContactId,
                stage,
                workspaceId,
                address: address || undefined,
                latitude: latitude ?? undefined,
                longitude: longitude ?? undefined,
                scheduledAt: scheduledAt ? new Date(scheduledAt) : undefined,
                assignedToId: assignedToId || undefined
            })

            if (result.success) {
                toast.success("Job created successfully!")
                router.push("/dashboard")
            } else {
                toast.error("Failed: " + result.error)
            }
        } catch (error) {
            toast.error("An unexpected error occurred.")
        } finally {
            setIsLoading(false)
        }
    }

    const isCreateDisabled = isLoading || !title || (mode === "select" ? !contactId : !newContactName)

    return (
        <Card className="w-full max-w-2xl bg-white shadow-xl border-slate-200">
            <CardHeader className="border-b bg-slate-50/50 rounded-t-xl">
                <div className="flex items-center gap-2 mb-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} className="h-8 w-8 -ml-2">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <CardTitle className="text-xl">New Booking</CardTitle>
                </div>
                <CardDescription>
                    Add a new job to your pipeline. Required fields: description, client name, and a contact method.
                </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6 pt-6 mr-1">
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-xs font-bold uppercase tracking-wider text-slate-500">Job Description *</Label>
                            <Input
                                id="title"
                                placeholder="e.g. Toilet Repair, Kitchen Reno..."
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="h-11"
                                required
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="value" className="text-xs font-bold uppercase tracking-wider text-slate-500">Value ($)</Label>
                                <Input
                                    id="value"
                                    type="number"
                                    placeholder="0.00"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    className="h-11"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="stage" className="text-xs font-bold uppercase tracking-wider text-slate-500">Stage</Label>
                                <Select value={stage} onValueChange={setStage}>
                                    <SelectTrigger id="stage" className="h-11">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="new_request">New lead</SelectItem>
                                        <SelectItem value="quote_sent">Quoting</SelectItem>
                                        <SelectItem value="scheduled">Scheduled</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="scheduledAt" className="text-xs font-bold uppercase tracking-wider text-slate-500">Schedule Time</Label>
                                <div className="relative">
                                    <CalendarClock className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                    <Input
                                        id="scheduledAt"
                                        type="datetime-local"
                                        value={scheduledAt}
                                        onChange={(e) => setScheduledAt(e.target.value)}
                                        className="h-11 pl-10"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="assignedTo" className="text-xs font-bold uppercase tracking-wider text-slate-500">Assign To {stage === "scheduled" ? "*" : ""}</Label>
                                <Select value={assignedToId} onValueChange={setAssignedToId}>
                                    <SelectTrigger id="assignedTo" className="h-11">
                                        <SelectValue placeholder="Optional" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">None (Unassigned)</SelectItem>
                                        {teamMembers.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>{m.name || m.email}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address" className="text-xs font-bold uppercase tracking-wider text-slate-500">Location / Address</Label>
                            <AddressAutocomplete
                                id="address"
                                value={address}
                                onChange={setAddress}
                                onPlaceSelect={(place) => {
                                    setAddress(place.address)
                                    setLatitude(place.latitude)
                                    setLongitude(place.longitude)
                                }}
                                className="h-11 shadow-none"
                                placeholder="Search for address..."
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-100 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer Details *</Label>
                            <Tabs value={mode} onValueChange={(v) => { setMode(v as any); setContactError("") }} className="w-[180px]">
                                <TabsList className="grid w-full grid-cols-2 h-8">
                                    <TabsTrigger value="select" className="text-[10px] font-bold">SELECT</TabsTrigger>
                                    <TabsTrigger value="create" className="text-[10px] font-bold">NEW</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {mode === "select" ? (
                            <div className="space-y-2">
                                <Select value={contactId} onValueChange={setContactId}>
                                    <SelectTrigger className="h-11">
                                        <SelectValue placeholder={isFetchingContacts ? "Loading..." : "Select a customer"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {contacts.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name} {c.company && `(${c.company})`}</SelectItem>
                                        ))}
                                        {contacts.length === 0 && !isFetchingContacts && <div className="p-2 text-sm text-center text-slate-400">No customers found</div>}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100 shadow-inner">
                                <div className="space-y-1.5">
                                    <Label htmlFor="new-name" className="text-[10px] font-bold text-slate-400 ml-1">NAME *</Label>
                                    <div className="relative">
                                        <User className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                        <Input id="new-name" placeholder="Full Name" className="h-11 pl-10 bg-white" value={newContactName} onChange={e => setNewContactName(e.target.value)} required />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="new-email" className="text-[10px] font-bold text-slate-400 ml-1">EMAIL</Label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                            <Input id="new-email" type="email" placeholder="email@address.com" className="h-11 pl-10 bg-white" value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} />
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label htmlFor="new-phone" className="text-[10px] font-bold text-slate-400 ml-1">PHONE</Label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
                                            <Input id="new-phone" type="tel" placeholder="0400 000 000" className="h-11 pl-10 bg-white" value={newContactPhone} onChange={e => setNewContactPhone(e.target.value)} />
                                        </div>
                                    </div>
                                </div>
                                {contactError && <div className="flex items-center gap-1.5 text-red-500 text-xs mt-1 font-medium"><AlertCircle className="h-3 w-3" />{contactError}</div>}
                            </div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="border-t bg-slate-50/50 rounded-b-xl flex justify-between py-4">
                    <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isLoading}>Cancel</Button>
                    <Button type="submit" size="lg" disabled={isCreateDisabled} className="shadow-lg px-8">
                        {isLoading ? "Saving..." : "Save Job & Close"}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    )
}
