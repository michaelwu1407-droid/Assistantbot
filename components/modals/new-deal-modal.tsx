"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createDeal } from "@/actions/deal-actions"
import { getContacts, createContact, type ContactView } from "@/actions/contact-actions"
import { getWorkspaceSettings } from "@/actions/settings-actions"
import { toast } from "sonner"
import { NEW_JOB_STAGE_OPTIONS, isNewJobStage, type NewJobStage } from "@/lib/deal-utils"
import { getTeamMembers } from "@/actions/invite-actions"
import { User, Mail, Phone, AlertCircle, CalendarClock } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import { DEFAULT_WORKSPACE_TIMEZONE, parseDateTimeLocalInTimezone, resolveWorkspaceTimezone } from "@/lib/timezone"

interface TeamMemberOption {
    id: string
    name: string | null
    email: string
    role: string
}

interface NewDealModalProps {
    isOpen: boolean
    onClose: () => void
    workspaceId: string
    teamMembers?: TeamMemberOption[]
    initialStage?: NewJobStage
}

export function NewDealModal({ isOpen, onClose, workspaceId, teamMembers = [], initialStage = "new_request" }: NewDealModalProps) {
    const router = useRouter()
    const [title, setTitle] = useState("")
    const [value, setValue] = useState("")
    const [address, setAddress] = useState("")
    const [latitude, setLatitude] = useState<number | null>(null)
    const [longitude, setLongitude] = useState<number | null>(null)
    const [scheduledAt, setScheduledAt] = useState("")
    const [stage, setStage] = useState<NewJobStage>(initialStage)
    const [assignedToId, setAssignedToId] = useState("")
    const [contactId, setContactId] = useState("")
    const [contacts, setContacts] = useState<ContactView[]>([])
    const [fetchedTeamMembers, setFetchedTeamMembers] = useState<TeamMemberOption[]>([])
    const [workspaceTimezone, setWorkspaceTimezone] = useState(DEFAULT_WORKSPACE_TIMEZONE)
    
    const activeTeamMembers = teamMembers.length > 0 ? teamMembers : fetchedTeamMembers

    // New Contact Mode State
    const [mode, setMode] = useState<"select" | "create">("create")
    const [newContactName, setNewContactName] = useState("")
    const [newContactEmail, setNewContactEmail] = useState("")
    const [newContactPhone, setNewContactPhone] = useState("")
    const [newContactType, setNewContactType] = useState<"PERSON" | "BUSINESS">("PERSON")
    const [newContactCompany, setNewContactCompany] = useState("")

    const [isLoading, setIsLoading] = useState(false)
    const [isFetchingContacts, setIsFetchingContacts] = useState(false)
    const [contactError, setContactError] = useState("")
    const [attemptedSubmit, setAttemptedSubmit] = useState(false)

    const fetchContacts = useCallback(() => {
        setIsFetchingContacts(true)
        Promise.allSettled([getContacts(workspaceId), getWorkspaceSettings(), getTeamMembers()])
            .then((results) => {
                const contactsResult = results[0]
                const settingsResult = results[1]
                const teamResult = results[2]
                
                const nextContacts = contactsResult.status === "fulfilled" ? contactsResult.value : []
                const settings = settingsResult.status === "fulfilled" ? settingsResult.value : null
                const members = teamResult.status === "fulfilled" ? teamResult.value : []
                
                setContacts(nextContacts)
                setWorkspaceTimezone(resolveWorkspaceTimezone(settings?.workspaceTimezone))
                setFetchedTeamMembers(members)
            })
            .catch(console.error)
            .finally(() => setIsFetchingContacts(false))
    }, [workspaceId])

    useEffect(() => {
        if (isOpen && workspaceId) {
            fetchContacts()
        }
    }, [isOpen, workspaceId, fetchContacts])

    useEffect(() => {
        if (isOpen) {
            setStage(initialStage)
        }
    }, [isOpen, initialStage])

    // Reset error when contact fields change
    useEffect(() => {
        if (newContactEmail || newContactPhone) setContactError("")
    }, [newContactEmail, newContactPhone])

    const hasValidEmail = (value: string) => !value.trim() || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setAttemptedSubmit(true)
        if (!title) return
        if (mode === "select" && !contactId) return
        if (stage === "scheduled" && !assignedToId) {
            toast.error("Assign a team member when creating a job in Scheduled stage.")
            return
        }
        if (mode === "create") {
            if (!newContactName) return
            // Require at least email or phone
            if (!newContactEmail && !newContactPhone) {
                setContactError("Please provide at least an email or phone number.")
                return
            }
            if (!hasValidEmail(newContactEmail)) {
                setContactError("Enter a valid email address.")
                return
            }
            if (newContactType === "BUSINESS" && !newContactCompany.trim()) {
                setContactError("Business name is required when client type is Business.")
                return
            }
        }

        setIsLoading(true)
        try {
            let finalContactId = contactId

            // If creating a new contact, do that first
            if (mode === "create") {
                const contactResult = await createContact({
                    name: newContactName,
                    email: newContactEmail || undefined,
                    phone: newContactPhone || undefined,
                    company: newContactType === "BUSINESS" ? newContactCompany || undefined : undefined,
                    contactType: newContactType,
                    workspaceId
                })

                if (!contactResult.success) {
                    toast.error("Failed to create contact: " + contactResult.error)
                    setIsLoading(false)
                    return
                }

                finalContactId = contactResult.contactId
                toast.success("Contact created!")
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
                scheduledAt: scheduledAt ? parseDateTimeLocalInTimezone(scheduledAt, workspaceTimezone) ?? undefined : undefined,
                assignedToId: assignedToId || undefined,
            })

            if (result.success && result.dealId) {
                toast.success("Job created. Opening it now.")
                setTitle("")
                setValue("")
                setAddress("")
                setLatitude(null)
                setLongitude(null)
                setScheduledAt("")
                setStage(initialStage)
                setContactId("")
                setNewContactName("")
                setNewContactEmail("")
                setNewContactPhone("")
                setNewContactType("PERSON")
                setNewContactCompany("")
                setMode("create")
                setContactError("")
                setAttemptedSubmit(false)

                onClose()
                router.push(`/crm/deals/${result.dealId}`)
                router.refresh()
            } else {
                console.error(result.error)
                toast.error("Failed to create job: " + result.error)
            }
        } catch (error) {
            console.error(error)
            toast.error("An unexpected error occurred.")
        } finally {
            setIsLoading(false)
        }
    }

    const isCreateDisabled = isLoading ||
        !title ||
        (mode === "select" ? !contactId : !newContactName)
    const shouldHighlightContactMethod = attemptedSubmit && mode === "create" && !newContactEmail.trim() && !newContactPhone.trim()
    const shouldHighlightBusinessName = attemptedSubmit && mode === "create" && newContactType === "BUSINESS" && !newContactCompany.trim()

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="w-[min(calc(100vw-1.5rem),54rem)] max-h-[88vh] overflow-y-auto p-0">
                <DialogHeader className="border-b border-emerald-100/80 bg-[linear-gradient(180deg,rgba(16,185,129,0.08),rgba(255,255,255,0.5))] px-6 pb-5 pt-6 dark:border-white/10 dark:bg-[linear-gradient(180deg,rgba(16,185,129,0.12),rgba(255,255,255,0.03))]">
                    <DialogTitle className="mt-1">Create new job</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-5 bg-[linear-gradient(180deg,rgba(248,250,249,0.96),rgba(241,245,243,0.98))] px-6 py-6 dark:bg-[linear-gradient(180deg,rgba(12,22,18,0.35),rgba(10,18,15,0.75))]">
                    {/* Job Details */}
                    <div className="grid gap-4 rounded-[20px] border border-white/80 bg-white/80 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/5">
                        <div className="space-y-1">
                            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-400">Job details</p>
                            <p className="text-sm text-slate-500">Describe the work, its value, timing, and pipeline stage.</p>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                Job description <span className="text-red-500">*</span>
                            </Label>
                            <Input
                                id="title"
                                placeholder="e.g. Kitchen Renovation"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className={`col-span-3 h-11 rounded-xl border-slate-200 bg-white/90 ${attemptedSubmit && !title.trim() ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="value" className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                Value ($)
                            </Label>
                            <Input
                                id="value"
                                type="number"
                                placeholder="0.00"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="col-span-3 h-11 rounded-xl border-slate-200 bg-white/90"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="address" className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                Address
                            </Label>
                            <div className="col-span-3">
                                <AddressAutocomplete
                                    id="address"
                                    value={address}
                                    onChange={(nextAddress) => {
                                        setAddress(nextAddress)
                                        setLatitude(null)
                                        setLongitude(null)
                                    }}
                                    onPlaceSelect={(place) => {
                                        setAddress(place.address)
                                        setLatitude(place.latitude)
                                        setLongitude(place.longitude)
                                    }}
                                    placeholder="Start typing an address..."
                                />
                                <p className="mt-2 text-xs text-slate-500">
                                    Typed addresses are saved as written. Select a suggestion only if you want Tracey to lock in the map pin.
                                </p>
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="scheduledAt" className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                Schedule
                            </Label>
                            <div className="col-span-3 relative">
                                <CalendarClock className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    id="scheduledAt"
                                    type="datetime-local"
                                    value={scheduledAt}
                                    onChange={(e) => setScheduledAt(e.target.value)}
                                    className="h-11 rounded-xl border-slate-200 bg-white/90 pl-9"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="stage" className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                Stage
                            </Label>
                            <Select value={stage} onValueChange={(value) => {
                                if (isNewJobStage(value)) {
                                    setStage(value)
                                }
                            }}>
                                <SelectTrigger id="stage" className="col-span-3 h-11 rounded-xl border-slate-200 bg-white/90">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {NEW_JOB_STAGE_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        {activeTeamMembers.length > 0 && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="assignedTo" className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                    Assigned to {stage === "scheduled" ? <span className="text-red-500">*</span> : ""}
                                </Label>
                                <Select value={assignedToId || "__unassigned__"} onValueChange={(v) => setAssignedToId(v === "__unassigned__" ? "" : v)}>
                                    <SelectTrigger id="assignedTo" className="col-span-3 h-11 rounded-xl border-slate-200 bg-white/90">
                                        <SelectValue placeholder="Unassigned" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="__unassigned__">
                                            <span className="text-slate-500">Unassigned</span>
                                        </SelectItem>
                                        {activeTeamMembers.map((member) => (
                                            <SelectItem key={member.id} value={member.id}>
                                                <div className="flex flex-col">
                                                    <span>{member.name || member.email}</span>
                                                    {member.name && <span className="text-xs text-muted-foreground">{member.email}</span>}
                                                </div>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Contact Selection / Creation */}
                    <div className="space-y-4 rounded-[20px] border border-white/80 bg-white/80 p-5 shadow-[0_10px_30px_rgba(15,23,42,0.06)] dark:border-white/10 dark:bg-white/5">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label className="text-[11px] font-bold uppercase tracking-[0.22em] text-slate-500">Client <span className="text-red-500">*</span></Label>
                                <p className="text-sm text-slate-500">Select an existing contact or create a new one inline.</p>
                            </div>
                            <Tabs value={mode} onValueChange={(v) => { setMode(v as "select" | "create"); setContactError("") }} className="w-[220px]">
                                <TabsList className="grid w-full grid-cols-2 h-8">
                                    <TabsTrigger value="select" className="text-xs">Existing</TabsTrigger>
                                    <TabsTrigger value="create" className="text-xs">Create new</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {mode === "select" ? (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="contact" className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                    Existing
                                </Label>
                                <Select value={contactId} onValueChange={setContactId}>
                                    <SelectTrigger className={`col-span-3 h-11 rounded-xl border-slate-200 bg-white/90 ${attemptedSubmit && mode === "select" && !contactId ? "border-red-500 focus-visible:ring-red-500" : ""}`}>
                                        <SelectValue placeholder={isFetchingContacts ? "Loading..." : "Select a contact"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {contacts.map(contact => (
                                            <SelectItem key={contact.id} value={contact.id}>
                                                {contact.name} {contact.company && `(${contact.company})`}
                                            </SelectItem>
                                        ))}
                                        {contacts.length === 0 && !isFetchingContacts && (
                                            <div className="p-2 text-sm text-muted-foreground text-center">No contacts found</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        ) : (
                            <div className="space-y-3 rounded-2xl border border-emerald-100/80 bg-emerald-50/60 p-4 dark:border-white/10 dark:bg-white/5">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="new-name" className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">First name <span className="text-red-500">*</span></Label>
                                    <div className="col-span-3 relative">
                                        <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="new-name"
                                            placeholder="John Doe"
                                            className={`h-11 rounded-xl border-slate-200 bg-white/90 pl-9 ${attemptedSubmit && !newContactName.trim() ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                            value={newContactName}
                                            onChange={e => setNewContactName(e.target.value)}
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="new-email" className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
                                        Email
                                    </Label>
                                    <div className="col-span-3 relative">
                                        <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="new-email"
                                            type="email"
                                            placeholder="john@example.com"
                                            className={`h-11 rounded-xl border-slate-200 bg-white/90 pl-9 ${shouldHighlightContactMethod ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                            value={newContactEmail}
                                            onChange={e => setNewContactEmail(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="new-phone" className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Phone</Label>
                                    <div className="col-span-3 relative">
                                        <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="new-phone"
                                            type="tel"
                                            placeholder="0400 000 000"
                                            className={`h-11 rounded-xl border-slate-200 bg-white/90 pl-9 ${shouldHighlightContactMethod ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                            value={newContactPhone}
                                            onChange={e => setNewContactPhone(e.target.value)}
                                        />
                                    </div>
                                </div>
                                {newContactType === "BUSINESS" && (
                                    <div className="grid grid-cols-4 items-center gap-4">
                                        <Label htmlFor="new-company" className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Business name <span className="text-red-500">*</span></Label>
                                        <div className="col-span-3">
                                            <Input
                                                id="new-company"
                                                placeholder="e.g. Acme Plumbing"
                                                value={newContactCompany}
                                                onChange={e => setNewContactCompany(e.target.value)}
                                                className={`h-11 rounded-xl border-slate-200 bg-white/90 ${shouldHighlightBusinessName ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                            />
                                        </div>
                                    </div>
                                )}
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label className="text-left text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">Client type <span className="text-red-500">*</span></Label>
                                    <Tabs
                                        value={newContactType}
                                        onValueChange={(v) => setNewContactType(v as "PERSON" | "BUSINESS")}
                                        className="col-span-3"
                                    >
                                        <TabsList className="grid w-full grid-cols-2 h-8">
                                            <TabsTrigger value="PERSON" className="text-xs">Person</TabsTrigger>
                                            <TabsTrigger value="BUSINESS" className="text-xs">Business</TabsTrigger>
                                        </TabsList>
                                    </Tabs>
                                </div>
                                <p className="text-[11px] text-slate-500 text-right"><span className="text-red-500">*</span> Name required. Email or phone required.</p>
                                {contactError && (
                                    <div className="flex items-center gap-1.5 text-red-600 text-xs mt-1">
                                        <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                        {contactError}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    <DialogFooter className="border-t border-white/70 pt-1 dark:border-white/10">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isCreateDisabled} className="shadow-sm">
                            {isLoading ? "Creating..." : "Create Job"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
