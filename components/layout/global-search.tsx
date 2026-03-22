"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Calendar, User, FileText, History, PhoneCall } from "lucide-react"

import {
    Command,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { globalSearch, SearchResultItem } from "@/actions/search-actions"

interface GlobalSearchProps {
    className?: string
    workspaceId?: string
    open?: boolean
    onOpenChange?: (open: boolean) => void
    /** Wider trigger bar (e.g. dashboard header); default keeps compact palette-style widths elsewhere */
    variant?: "default" | "bar"
    /** `onDark` = white search field on dark green dashboard bar */
    tone?: "default" | "onDark"
}

export function GlobalSearch({
    className,
    workspaceId,
    open: externalOpen,
    onOpenChange: externalOnOpenChange,
    variant = "default",
    tone = "default",
}: GlobalSearchProps) {
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
            if (!query || query.length < 2 || !workspaceId) {
                setResults([])
                return
            }

            setLoading(true)
            try {
                const searchResults = await globalSearch(workspaceId, query)
                setResults(searchResults)
            } catch (error) {
                console.error("Global search error:", error)
            } finally {
                setLoading(false)
            }
        }, 300)

        return () => clearTimeout(timer)
    }, [query, workspaceId])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [setOpen])

    const contactResults = results.filter(r => r.type === 'contact')
    const dealResults = results.filter(r => r.type === 'deal')
    const taskResults = results.filter(r => r.type === 'task')
    const activityResults = results.filter(r => r.type === 'activity')
    const callResults = results.filter(r => r.type === 'call')

    const showShortcutHint = !(variant === "bar" && tone === "onDark")

    return (
        <>
            {!isControlled && (
                <Button
                    variant="outline"
                    className={cn(
                        "relative w-full justify-start font-normal shadow-none",
                        variant === "bar" && tone === "onDark" &&
                            "h-9 min-h-9 w-full rounded-lg border border-slate-200/90 bg-white text-sm text-slate-600 min-w-0 hover:bg-white hover:text-slate-800 focus-visible:shadow-none",
                        variant === "bar" && tone === "onDark" && showShortcutHint && "sm:pr-12",
                        variant === "bar" && tone !== "onDark" &&
                            "h-9 min-h-9 rounded-lg border-border/40 bg-muted/40 text-sm text-muted-foreground sm:pr-12 md:w-full md:min-w-0",
                        variant === "default" &&
                            "h-9 rounded-[0.5rem] bg-background text-sm text-muted-foreground sm:pr-12 md:w-40 lg:w-64",
                        className
                    )}
                    onClick={() => setOpen(true)}
                >
                    <span className="hidden lg:inline-flex">Search...</span>
                    <span className="inline-flex lg:hidden">Search...</span>
                    {showShortcutHint && (
                        <kbd
                            className={cn(
                                "pointer-events-none absolute right-[0.3rem] top-[0.3rem] hidden h-5 select-none items-center gap-1 rounded border px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex",
                                "border bg-muted"
                            )}
                        >
                            <span className="text-xs">⌘</span>K
                        </kbd>
                    )}
                </Button>
            )}
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="overflow-hidden p-0 shadow-lg">
                    <Command shouldFilter={false} className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground [&_[cmdk-group]:not([hidden])_~[cmdk-group]]:pt-0 [&_[cmdk-group]]:px-2 [&_[cmdk-input-wrapper]_svg]:h-5 [&_[cmdk-input-wrapper]_svg]:w-5 [&_[cmdk-input]]:h-12 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-3 [&_[cmdk-item]_svg]:h-5 [&_[cmdk-item]_svg]:w-5">
                        <CommandInput
                            placeholder="Search contacts, deals, tasks, activity, calls..."
                            value={query}
                            onValueChange={setQuery}
                        />
                        <CommandList>
                            {loading ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    Searching...
                                </div>
                            ) : query.length < 2 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    Type at least 2 characters to search
                                </div>
                            ) : results.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No results found for &ldquo;{query}&rdquo;
                                </div>
                            ) : (
                                <>
                                    {contactResults.length > 0 && (
                                        <CommandGroup heading="Contacts">
                                            {contactResults.map(contact => (
                                                <CommandItem
                                                    key={contact.id}
                                                    value={contact.id}
                                                    onSelect={() => runCommand(() => router.push(contact.url))}
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
                                                    value={deal.id}
                                                    onSelect={() => runCommand(() => router.push(deal.url))}
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
                                                    value={task.id}
                                                    onSelect={() => runCommand(() => router.push(task.url))}
                                                >
                                                    <Calendar className="mr-2 h-4 w-4" />
                                                    <span>{task.title}</span>
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    )}

                                    {activityResults.length > 0 && (
                                        <CommandGroup heading="Activity">
                                            {activityResults.map(activity => (
                                                <CommandItem
                                                    key={activity.id}
                                                    value={activity.id}
                                                    onSelect={() => runCommand(() => router.push(activity.url))}
                                                >
                                                    <History className="mr-2 h-4 w-4" />
                                                    <span>{activity.title}</span>
                                                    {activity.subtitle && <span className="ml-auto text-xs text-muted-foreground">{activity.subtitle}</span>}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    )}

                                    {callResults.length > 0 && (
                                        <CommandGroup heading="Calls">
                                            {callResults.map(call => (
                                                <CommandItem
                                                    key={call.id}
                                                    value={call.id}
                                                    onSelect={() => runCommand(() => router.push(call.url))}
                                                >
                                                    <PhoneCall className="mr-2 h-4 w-4" />
                                                    <span>{call.title}</span>
                                                    {call.subtitle && <span className="ml-auto text-xs text-muted-foreground">{call.subtitle}</span>}
                                                </CommandItem>
                                            ))}
                                        </CommandGroup>
                                    )}
                                </>
                            )}
                        </CommandList>
                    </Command>
                </DialogContent>
            </Dialog>
        </>
    )
}
