"use client"

import * as React from "react"
import {
  Settings,
  User,
  Search,
  LayoutDashboard,
  Users,
  Briefcase
} from "lucide-react"

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
import { useRouter } from "next/navigation"
import { searchContacts, ContactView } from "@/actions/contact-actions"

export function SearchCommand() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [contacts, setContacts] = React.useState<ContactView[]>([])
  const router = useRouter()

  // Toggle with Cmd+K
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

  // Search contacts when query changes
  React.useEffect(() => {
    if (!open) return
    
    // Debounce to avoid slamming the server
    const timer = setTimeout(async () => {
      if (query.length > 0) {
        try {
          // Pass "demo-workspace" or similar until we have real auth context
          const results = await searchContacts("demo-workspace", query)
          setContacts(results)
        } catch (error) {
          console.error("Search failed", error)
        }
      } else {
        setContacts([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, open])

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false)
    command()
  }, [])

  return (
    <>
      <div 
        onClick={() => setOpen(true)}
         className="hidden md:flex items-center w-64 px-3 py-1.5 text-sm text-slate-500 border border-slate-200 rounded-full cursor-text hover:border-slate-300 hover:bg-white transition-all bg-white/60 shadow-sm"
      >
        <Search className="mr-2 h-4 w-4 opacity-50" />
        <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
            Search (Cmd+K)...
        </span>
        <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-slate-100 px-1.5 font-mono text-[10px] font-medium text-slate-500 opacity-100">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput 
          placeholder="Type a command or search..." 
          value={query}
          onValueChange={setQuery}
        />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          
          {query.length > 0 && contacts.length > 0 && (
            <CommandGroup heading="Contacts">
              {contacts.map(contact => (
                <CommandItem
                  key={contact.id}
                  onSelect={() => runCommand(() => router.push(`/contacts/${contact.id}`))}
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>{contact.name}</span>
                  {contact.company && <span className="ml-2 text-slate-400 text-xs">({contact.company})</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          )}

          <CommandSeparator />

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span>Dashboard</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
              <Briefcase className="mr-2 h-4 w-4" />
              <span>Pipeline</span>
            </CommandItem>
            {/* We don't have a dedicated contacts list page yet, just details, but lets assume */}
            <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
              <Users className="mr-2 h-4 w-4" />
              <span>Contacts</span>
            </CommandItem>
          </CommandGroup>

          <CommandGroup heading="System">
            <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
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
