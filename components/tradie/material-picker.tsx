"use client"

import * as React from "react"
import { Search, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useShellStore } from "@/lib/store"
import { searchMaterials, createMaterial, MaterialView } from "@/actions/material-actions"
import { useDebounce } from "@/hooks/use-debounce"

interface MaterialPickerProps {
  onSelect: (material: { description: string, price: number }) => void
  trigger?: React.ReactNode
  workspaceId?: string
}

export function MaterialPicker({ onSelect, trigger, workspaceId: propWorkspaceId }: MaterialPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")
  const [results, setResults] = React.useState<MaterialView[]>([])
  const [loading, setLoading] = React.useState(false)

  const debouncedSearch = useDebounce(search, 300)
  const storeWorkspaceId = useShellStore(s => s.workspaceId)
  const workspaceId = propWorkspaceId || storeWorkspaceId

  React.useEffect(() => {
    async function performSearch() {
      if (!workspaceId) return

      setLoading(true)
      try {
        const data = await searchMaterials(workspaceId, debouncedSearch)
        setResults(data)
      } catch (error) {
        console.error("Failed to search materials", error)
      } finally {
        setLoading(false)
      }
    }

    if (open) {
      performSearch()
    }
  }, [debouncedSearch, workspaceId, open])

  const handleSelect = (material: MaterialView) => {
    onSelect({
      description: material.name + (material.description ? ` - ${material.description}` : ""),
      price: material.price
    })
    setOpen(false)
    setSearch("")
  }

  const handleCreate = async () => {
    if (!workspaceId || !search) return

    const result = await createMaterial({
      name: search,
      unit: 'each',
      price: 0,
      workspaceId
    })

    if (result.success) {
      // Toast would go here
      onSelect({ description: search, price: 0 })
      setOpen(false)
      setSearch("")
    }
  }

  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer inline-block">
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2 bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-white">
            <Search className="h-4 w-4" />
            Search
          </Button>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="p-0 gap-0 bg-slate-900 border-slate-800 text-slate-50 overflow-hidden sm:max-w-[400px]">
          <DialogHeader className="sr-only">
            <DialogTitle>Search Materials</DialogTitle>
          </DialogHeader>
          <Command shouldFilter={false} className="bg-transparent">
            <CommandInput
              placeholder="Search database..."
              value={search}
              onValueChange={setSearch}
              className="border-none focus:ring-0 text-slate-50 placeholder:text-slate-500"
            />
            <CommandList>
              {loading && (
                <div className="py-6 text-center text-sm text-slate-500">
                  Searching...
                </div>
              )}

              {!loading && results.length === 0 && (
                <CommandEmpty className="py-6 text-center">
                  <p className="text-sm text-slate-500 mb-2">No materials found.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs border-slate-700 text-slate-300 hover:text-[#ccff00]"
                    onClick={async () => {
                      if (!workspaceId || !search.trim()) return
                      const result = await createMaterial({
                        name: search.trim(),
                        unit: "each",
                        price: 0,
                        workspaceId,
                      })
                      if (result.success) {
                        const updated = await searchMaterials(workspaceId, search)
                        setResults(updated)
                      }
                    }}
                  >
                    <Plus className="h-3 w-3 mr-1" /> Add &quot;{search}&quot; to database
                  </Button>
                </CommandEmpty>
              )}

              {!loading && results.length > 0 && (
                <CommandGroup heading="Materials">
                  {results.map((material) => (
                    <CommandItem
                      key={material.id}
                      value={material.id}
                      onSelect={() => handleSelect(material)}
                      className="flex flex-col items-start gap-1 py-3 aria-selected:bg-slate-800 aria-selected:text-white data-[selected=true]:bg-slate-800 data-[selected=true]:text-white"
                    >
                      <div className="flex w-full justify-between items-center">
                        <span className="font-medium text-slate-200">{material.name}</span>
                        <span className="text-[#ccff00] font-mono text-xs bg-slate-950 px-2 py-0.5 rounded-full border border-slate-700">
                          ${material.price.toFixed(2)}
                        </span>
                      </div>
                      {material.description && (
                        <p className="text-xs text-slate-500 line-clamp-1">{material.description}</p>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </DialogContent>
      </Dialog>
    </>
  )
}
