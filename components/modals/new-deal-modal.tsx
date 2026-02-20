"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createDeal } from "@/actions/deal-actions"
import { getContacts, createContact, type ContactView } from "@/actions/contact-actions"
import { toast } from "sonner"
import { Plus, User, Mail, Phone, MapPin } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"

interface NewDealModalProps {
    isOpen: boolean
    onClose: () => void
    workspaceId: string
}

export function NewDealModal({ isOpen, onClose, workspaceId }: NewDealModalProps) {
    const router = useRouter()
    const [title, setTitle] = useState("")
    const [value, setValue] = useState("")
    const [address, setAddress] = useState("")
    const [stage, setStage] = useState("new_request")
    const [contactId, setContactId] = useState("")
    const [contacts, setContacts] = useState<ContactView[]>([])

    // New Contact Mode State
    const [mode, setMode] = useState<"select" | "create">("create")
    const [newContactName, setNewContactName] = useState("")
    const [newContactEmail, setNewContactEmail] = useState("")
    const [newContactPhone, setNewContactPhone] = useState("")

    const [isLoading, setIsLoading] = useState(false)
    const [isFetchingContacts, setIsFetchingContacts] = useState(false)

    useEffect(() => {
        if (isOpen && workspaceId) {
            fetchContacts()
        }
    }, [isOpen, workspaceId])

    const fetchContacts = () => {
        setIsFetchingContacts(true)
        getContacts(workspaceId)
            .then(setContacts)
            .catch(console.error)
            .finally(() => setIsFetchingContacts(false))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title) return
        if (mode === "select" && !contactId) return
        if (mode === "create" && !newContactName) return

        setIsLoading(true)
        try {
            let finalContactId = contactId

            // If creating a new contact, do that first
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
                toast.success("Contact created!")
            }

            const result = await createDeal({
                title,
                value: parseFloat(value) || 0,
                contactId: finalContactId,
                stage,
                workspaceId,
                address: address || undefined
            })

            if (result.success) {
                toast.success("Deal created successfully!")
                setTitle("")
                setValue("")
                setAddress("")
                setStage("new_request")
                setContactId("")
                setNewContactName("")
                setNewContactEmail("")
                setNewContactPhone("")
                setMode("select")

                onClose()
                router.refresh()
            } else {
                console.error(result.error)
                toast.error("Failed to create deal: " + result.error)
            }
        } catch (error) {
            console.error(error)
            toast.error("An unexpected error occurred.")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create New Deal</DialogTitle>
                    <DialogDescription>
                        Add a new deal to your pipeline.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="grid gap-6 py-4">
                    {/* Deal Details */}
                    <div className="grid gap-4">
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="title" className="text-right">
                                Title *
                            </Label>
                            <Input
                                id="title"
                                placeholder="e.g. Kitchen Renovation"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="col-span-3"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="value" className="text-right">
                                Value ($)
                            </Label>
                            <Input
                                id="value"
                                type="number"
                                placeholder="0.00"
                                value={value}
                                onChange={(e) => setValue(e.target.value)}
                                className="col-span-3"
                            />
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="address" className="text-right">
                                Address
                            </Label>
                            <div className="col-span-3 relative">
                                <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    id="address"
                                    placeholder="123 Main St"
                                    value={address}
                                    onChange={(e) => setAddress(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="stage" className="text-right">
                                Stage
                            </Label>
                            <Select value={stage} onValueChange={setStage}>
                                <SelectTrigger id="stage" className="col-span-3">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new_request">New request</SelectItem>
                                    <SelectItem value="quote_sent">Quote sent</SelectItem>
                                    <SelectItem value="scheduled">Scheduled</SelectItem>
                                    <SelectItem value="pipeline">Pipeline</SelectItem>
                                    <SelectItem value="ready_to_invoice">Ready to be invoiced</SelectItem>
                                    <SelectItem value="completed">Completed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="border-t border-slate-100 my-1" />

                    {/* Contact Selection / Creation */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label>Client / Contact *</Label>
                            <Tabs value={mode} onValueChange={(v) => setMode(v as any)} className="w-[200px]">
                                <TabsList className="grid w-full grid-cols-2 h-8">
                                    <TabsTrigger value="select" className="text-xs">Select</TabsTrigger>
                                    <TabsTrigger value="create" className="text-xs">Create New</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>

                        {mode === "select" ? (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="contact" className="text-right text-slate-500">
                                    Existing
                                </Label>
                                <Select value={contactId} onValueChange={setContactId}>
                                    <SelectTrigger className="col-span-3">
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
                            <div className="space-y-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="new-name" className="text-right text-xs">Name *</Label>
                                    <div className="col-span-3 relative">
                                        <User className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="new-name"
                                            placeholder="John Doe"
                                            className="pl-9"
                                            value={newContactName}
                                            onChange={e => setNewContactName(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="new-email" className="text-right text-xs">Email</Label>
                                    <div className="col-span-3 relative">
                                        <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="new-email"
                                            type="email"
                                            placeholder="john@example.com"
                                            className="pl-9"
                                            value={newContactEmail}
                                            onChange={e => setNewContactEmail(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="new-phone" className="text-right text-xs">Phone</Label>
                                    <div className="col-span-3 relative">
                                        <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                                        <Input
                                            id="new-phone"
                                            type="tel"
                                            placeholder="0400 000 000"
                                            className="pl-9"
                                            value={newContactPhone}
                                            onChange={e => setNewContactPhone(e.target.value)}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || (mode === "select" ? !contactId : !newContactName) || !title}>
                            {isLoading ? "Creating..." : "Create Deal"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
