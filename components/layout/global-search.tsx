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
import { globalSearch, SearchResultItem } from "@/actions/search-actions"

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
    const [results, setResults] = React.useState<SearchResultItem[]>([])
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
                setResults([])
                return
            }

            setLoading(true)
            try {
                const searchResults = await globalSearch(workspaceId, query)
                setResults(searchResults)
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

                    {(() => {
                        const contactResults = results.filter(r => r.type === 'contact')
                        const dealResults = results.filter(r => r.type === 'deal')
                        const taskResults = results.filter(r => r.type === 'task')

                        return (
                            <>
                                {contactResults.length > 0 && (
                                    <CommandGroup heading="Contacts">
                                        {contactResults.map(contact => (
                                            <CommandItem
                                                key={contact.id}
                                                value={contact.title}
                                                onSelect={() => {
                                                    runCommand(() => router.push(contact.url))
                                                }}
                                            >
                                                <User className="mr-2 h-4 w-4" />
                                                <span>{contact.title}</span>
                                                {contact.subtitle && <span className="ml-2 text-muted-foreground text-xs">({contact.subtitle})</span>}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}

                                {dealResults.length > 0 && (
                                    <CommandGroup heading="Deals">
                                        {dealResults.map(deal => (
                                            <CommandItem
                                                key={deal.id}
                                                value={deal.title}
                                                onSelect={() => {
                                                    runCommand(() => router.push(deal.url))
                                                }}
                                            >
                                                <FileText className="mr-2 h-4 w-4" />
                                                <span>{deal.title}</span>
                                                {deal.subtitle && <span className="ml-auto text-xs text-muted-foreground">{deal.subtitle}</span>}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}

                                {taskResults.length > 0 && (
                                    <CommandGroup heading="Tasks">
                                        {taskResults.map(task => (
                                            <CommandItem
                                                key={task.id}
                                                value={task.title}
                                                onSelect={() => {
                                                    runCommand(() => router.push(task.url))
                                                }}
                                            >
                                                <Calendar className="mr-2 h-4 w-4" />
                                                <span>{task.title}</span>
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                )}
                            </>
                        )
                    })()}

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
