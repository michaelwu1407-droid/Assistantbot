"use client"

import * as React from "react"
import {
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    LayoutDashboard,
    Search,
    Loader2
} from "lucide-react"
import { useRouter } from "next/navigation"

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

import { globalSearch, SearchResultItem } from "@/actions/search-actions"
import { useShellStore } from "@/lib/store"

// Debounce hook
function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = React.useState(value)

    React.useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value)
        }, delay)
        return () => clearTimeout(handler)
    }, [value, delay])

    return debouncedValue
}

export function SearchDialog({ children }: { children?: React.ReactNode }) {
    const [open, setOpen] = React.useState(false)
    const [query, setQuery] = React.useState("")
    const debouncedQuery = useDebounce(query, 300)
    const [results, setResults] = React.useState<SearchResultItem[]>([])
    const [isLoading, setIsLoading] = React.useState(false)
    const router = useRouter()
    const workspaceId = useShellStore(s => s.workspaceId)

    React.useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }

        document.addEventListener("keydown", down)
        return () => document.removeEventListener("keydown", down)
    }, [])

    React.useEffect(() => {
        if (!debouncedQuery || debouncedQuery.length < 2 || !workspaceId) {
            setResults([])
            return
        }

        const search = async () => {
            setIsLoading(true)
            try {
                const items = await globalSearch(workspaceId!, debouncedQuery)
                setResults(items)
            } catch (error) {
                console.error("Search failed:", error)
            } finally {
                setIsLoading(false)
            }
        }

        search()
    }, [debouncedQuery, workspaceId])

    const runCommand = React.useCallback((command: () => unknown) => {
        setOpen(false)
        command()
    }, [])

    return (
        <>
            {children ? (
                <div onClick={() => setOpen(true)}>{children}</div>
            ) : (
                <button
                    onClick={() => setOpen(true)}
                    className="inline-flex items-center gap-2 whitespace-nowrap rounded-md border border-slate-200 bg-slate-50/50 px-4 py-2 text-sm font-medium text-slate-500 hover:border-slate-300 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-950 disabled:pointer-events-none disabled:opacity-50 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400 dark:hover:text-slate-50"
                >
                    <Search className="h-4 w-4" />
                    <span className="hidden lg:inline-flex">Search...</span>
                    <span className="inline-flex lg:hidden">Search</span>
                    <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border border-slate-200 bg-slate-100 px-1.5 font-mono text-[10px] font-medium text-slate-500 opacity-100 dark:border-slate-800 dark:bg-slate-950 lg:inline-flex">
                        <span className="text-xs">⌘</span>K
                    </kbd>
                </button>
            )}

            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput
                    placeholder="Type a command or search..."
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList>
                    <CommandEmpty>
                        {isLoading ? (
                            <div className="flex items-center justify-center p-4">
                                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                Searching...
                            </div>
                        ) : "No results found."}
                    </CommandEmpty>

                    {results.length > 0 && (
                        <CommandGroup heading="Search Results">
                            {results.map((item) => (
                                <CommandItem key={item.id} onSelect={() => runCommand(() => router.push(item.url))}>
                                    {item.type === 'contact' ? <User className="mr-2 h-4 w-4" /> :
                                        item.type === 'deal' ? <CreditCard className="mr-2 h-4 w-4" /> :
                                            <LayoutDashboard className="mr-2 h-4 w-4" />}
                                    <div className="flex flex-col">
                                        <span>{item.title}</span>
                                        {item.subtitle && <span className="text-xs text-muted-foreground">{item.subtitle}</span>}
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    )}

                    <CommandSeparator />

                    <CommandGroup heading="Suggestions">
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                            <LayoutDashboard className="mr-2 h-4 w-4" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/tradie/schedule"))}>
                            <Calendar className="mr-2 h-4 w-4" />
                            <span>Calendar</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/agent"))}>
                            <Smile className="mr-2 h-4 w-4" />
                            <span>Agent View</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Settings">
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))}>
                            <User className="mr-2 h-4 w-4" />
                            <span>Profile</span>
                            <CommandShortcut>⌘P</CommandShortcut>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings/billing"))}>
                            <CreditCard className="mr-2 h-4 w-4" />
                            <span>Billing</span>
                            <CommandShortcut>⌘B</CommandShortcut>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard/settings"))}>
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                            <CommandShortcut>⌘S</CommandShortcut>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    )
}
