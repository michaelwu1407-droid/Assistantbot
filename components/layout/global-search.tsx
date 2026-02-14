"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Calculator, Calendar, CreditCard, Settings, Smile, User, Search, FileText, Phone } from "lucide-react"

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { searchContacts, ContactView } from "@/actions/contact-actions"
import { searchDeals, DealView } from "@/actions/deal-actions"

interface GlobalSearchProps {
    className?: string
    workspaceId?: string
    open?: boolean
    onOpenChange?: (open: boolean) => void
}

export function GlobalSearch({ className, workspaceId, open: externalOpen, onOpenChange: externalOnOpenChange }: GlobalSearchProps) {
    const [internalOpen, setInternalOpen] = React.useState(false)
    const router = useRouter()

    const isControlled = externalOpen !== undefined
    const open = isControlled ? externalOpen : internalOpen
    const setOpen = isControlled ? externalOnOpenChange! : setInternalOpen

    const [query, setQuery] = React.useState("")
    const [contacts, setContacts] = React.useState<ContactView[]>([])
    const [deals, setDeals] = React.useState<DealView[]>([])
    const [loading, setLoading] = React.useState(false)

    // Toggle with Cmd+K
    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen(!open)
            }
        }
        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [setOpen, open])

    // Debounced Search
    React.useEffect(() => {
        const timer = setTimeout(async () => {
            if (!query || !workspaceId) {
                setContacts([])
                setDeals([])
                return
            }

            setLoading(true)
            try {
                const [contactResults, dealResults] = await Promise.all([
                    searchContacts(workspaceId, query),
                    searchDeals(workspaceId, query)
                ])
                setContacts(contactResults)
                setDeals(dealResults)
            } catch (error) {
                console.error(error)
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query, workspaceId])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    return (
        <>
            {!isControlled && (
                <Button
                    variant="outline"
                    className={cn(
                        "relative h-9 w-full justify-start rounded-[0.5rem] bg-background text-sm font-normal text-muted-foreground shadow-none sm:pr-12 md:w-40 lg:w-64",
                        className
                    )}
                    onClick={() => setOpen(true)}
                >
                    <span className="hidden lg:inline-flex">Search...</span>
                    <span className="inline-flex lg:hidden">Search...</span>
                    <kbd className="pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </Button>
            )}
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput
                    placeholder="Type to search..."
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>

                    {(contacts.length > 0) && (
                        <CommandGroup heading="Contacts">
                            {contacts.map(contact => (
                                <CommandItem
                                    key={contact.id}
                                    value={`${contact.name} ${contact.email}`} // Value for internal filtering if we wanted client side too, but we do server
                                    onSelect={() => {
                                        runCommand(() => router.push(`/dashboard/contacts?id=${contact.id}`)) // Or modal
                                    }}
                                >
                                    <User className="mr-2 h-4 w-4" />
                                    <span>{contact.name}</span>
                                    {contact.company && <span className="ml-2 text-muted-foreground text-xs">({contact.company})</span>}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    {(deals.length > 0) && (
                        <CommandGroup heading="Deals">
                            {deals.map(deal => (
                                <CommandItem
                                    key={deal.id}
                                    value={`${deal.title} ${deal.company}`}
                                    onSelect={() => {
                                        runCommand(() => router.push(`/dashboard/deals/${deal.id}`))
                                    }}
                                >
                                    <FileText className="mr-2 h-4 w-4" />
                                    <span>{deal.title}</span>
                                    <span className="ml-auto text-xs text-muted-foreground">${deal.value.toLocaleString()}</span>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    <CommandSeparator />
                    <CommandGroup heading="Pages">
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/contacts"))}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Contacts</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
