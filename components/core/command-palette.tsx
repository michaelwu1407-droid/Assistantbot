"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Search, User, DollarSign, CheckCircle2, Loader2, ArrowRight } from "lucide-react"
import { globalSearch, type SearchResultItem } from "@/actions/search-actions"
import { useShellStore } from "@/lib/store"
import { cn } from "@/lib/utils"

export function CommandPalette() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<SearchResultItem[]>([])
  const [loading, setLoading] = React.useState(false)
  const workspaceId = useShellStore(s => s.workspaceId)
  const router = useRouter()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
      if (e.key === "Escape") {
        setOpen(false)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 10)
    } else {
      setQuery("")
      setResults([])
    }
  }, [open])

  React.useEffect(() => {
    if (!query || !workspaceId) {
      setResults([])
      setLoading(false)
      return
    }

    setLoading(true)
    const timer = setTimeout(async () => {
      try {
        const data = await globalSearch(workspaceId, query)
        setResults(data)
      } catch (error) {
        console.error(error)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query, workspaceId])

  const handleSelect = (item: SearchResultItem) => {
    setOpen(false)
    router.push(item.url)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-slate-900/20 backdrop-blur-sm transition-all">
      <div
        ref={containerRef}
        className="w-full max-w-lg bg-white rounded-xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-100"
      >
        <div className="flex items-center border-b border-slate-100 px-4 py-3">
          <Search className="h-5 w-5 text-slate-400 mr-3" />
          <input
            ref={inputRef}
            className="flex-1 bg-transparent outline-none text-slate-900 placeholder:text-slate-400 text-base"
            placeholder="Search contacts, deals, tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {loading ? (
            <Loader2 className="h-4 w-4 text-slate-400 animate-spin" />
          ) : (
            <div className="text-xs text-slate-400 font-medium border border-slate-200 rounded px-1.5 py-0.5">ESC</div>
          )}
        </div>

        <div className="max-h-[300px] overflow-y-auto p-2">
          {results.length === 0 && query && !loading && (
            <div className="py-8 text-center text-sm text-slate-500">
              No results found for &quot;{query}&quot;
            </div>
          )}

          {results.length === 0 && !query && (
            <div className="py-8 text-center text-sm text-slate-400">
              Type to search across your workspace...
            </div>
          )}

          {results.map((item) => (
            <button
              key={`${item.type}-${item.id}`}
              onClick={() => handleSelect(item)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-100 transition-colors text-left group"
            >
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                item.type === "contact" && "bg-blue-100 text-blue-600",
                item.type === "deal" && "bg-emerald-100 text-emerald-600",
                item.type === "task" && "bg-amber-100 text-amber-600"
              )}>
                {item.type === "contact" && <User className="h-4 w-4" />}
                {item.type === "deal" && <DollarSign className="h-4 w-4" />}
                {item.type === "task" && <CheckCircle2 className="h-4 w-4" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium text-slate-900 truncate">{item.title}</div>
                {item.subtitle && (
                  <div className="text-xs text-slate-500 truncate">{item.subtitle}</div>
                )}
              </div>
              <ArrowRight className="h-4 w-4 text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* Backdrop click to close */}
      <div className="absolute inset-0 -z-10" onClick={() => setOpen(false)} />
    </div>
  )
}
