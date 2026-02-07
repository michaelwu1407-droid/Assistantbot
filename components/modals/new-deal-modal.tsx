"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createDeal } from "@/actions/deal-actions"
import { getContacts, type ContactView } from "@/actions/contact-actions"
import { toast } from "sonner"

interface NewDealModalProps {
    isOpen: boolean
    onClose: () => void
    workspaceId: string
}

export function NewDealModal({ isOpen, onClose, workspaceId }: NewDealModalProps) {
    const [title, setTitle] = useState("")
    const [value, setValue] = useState("")
    const [contactId, setContactId] = useState("")
    const [contacts, setContacts] = useState<ContactView[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [isFetchingContacts, setIsFetchingContacts] = useState(false)

    useEffect(() => {
        if (isOpen && workspaceId) {
            setIsFetchingContacts(true)
            getContacts(workspaceId)
                .then(setContacts)
                .catch(console.error)
                .finally(() => setIsFetchingContacts(false))
        }
    }, [isOpen, workspaceId])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title || !contactId) return

        setIsLoading(true)
        try {
            const result = await createDeal({
                title,
                value: parseFloat(value) || 0,
                contactId,
                stage: "new",
                workspaceId
            })

            if (result.success) {
                toast.success("Deal created successfully!")
                onClose()
                // Refresh logic would be needed here (e.g. router.refresh())
                // For now, let's just close. The parent might need to refresh.
                window.location.reload() // Brute force refresh for now to see data
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
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Create New Deal</DialogTitle>
                    <DialogDescription>
                        Add a new deal to your pipeline.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Deal Title</Label>
                        <Input
                            id="title"
                            placeholder="e.g. Kitchen Renovation"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            required
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="value">Value ($)</Label>
                        <Input
                            id="value"
                            type="number"
                            placeholder="0.00"
                            value={value}
                            onChange={(e) => setValue(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="contact">Contact</Label>
                        <Select value={contactId} onValueChange={setContactId} required>
                            <SelectTrigger>
                                <SelectValue placeholder={isFetchingContacts ? "Loading contacts..." : "Select a contact"} />
                            </SelectTrigger>
                            <SelectContent>
                                {contacts.map(contact => (
                                    <SelectItem key={contact.id} value={contact.id}>
                                        {contact.name}
                                    </SelectItem>
                                ))}
                                {contacts.length === 0 && !isFetchingContacts && (
                                    <div className="p-2 text-sm text-muted-foreground text-center">No contacts found</div>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading || !contactId || !title}>
                            {isLoading ? "Creating..." : "Create Deal"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
