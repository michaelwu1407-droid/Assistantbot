"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
    Plus, FileText, CreditCard, Loader2, RefreshCw, Send, Ban,
    Undo2, Mail, Pencil, Check, X, CloudOff, Cloud
} from "lucide-react"
import {
    generateQuote, getDealInvoices, markInvoicePaid, issueInvoice,
    voidInvoice, reverseInvoiceStatus, updateInvoiceLineItems,
    emailInvoice, getInvoiceSyncStatus,
} from "@/actions/tradie-actions"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { formatInvoiceStatusLabel } from "@/lib/job-portal-status-labels"

const STATUS_STYLE: Record<string, string> = {
    DRAFT: "text-slate-600 border-slate-200 bg-slate-50",
    ISSUED: "text-blue-700 border-blue-200 bg-blue-50",
    PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
    VOID: "text-red-600 border-red-200 bg-red-50 line-through",
}

interface LineItem { desc: string; price: number }

// ─── Inline Line-Item Editor ────────────────────────────────────────

function LineItemEditor({
    initial,
    onSave,
    onCancel,
    saving,
}: {
    initial: LineItem[]
    onSave: (items: LineItem[]) => void
    onCancel: () => void
    saving: boolean
}) {
    const [items, setItems] = useState<LineItem[]>(initial.length ? initial : [{ desc: "", price: 0 }])

    const update = (idx: number, field: keyof LineItem, val: string) => {
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: field === "price" ? Number(val) : val } : it))
    }
    const add = () => setItems(prev => [...prev, { desc: "", price: 0 }])
    const remove = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx))

    return (
        <div className="space-y-2 p-3 bg-white border border-slate-200 rounded-lg">
            {items.map((it, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                    <Input
                        className="text-xs h-8 flex-1"
                        placeholder="Description"
                        value={it.desc}
                        onChange={e => update(idx, "desc", e.target.value)}
                    />
                    <div className="relative w-20 shrink-0">
                        <span className="absolute left-2 top-1.5 text-slate-400 text-xs">$</span>
                        <Input
                            type="number"
                            className="text-xs h-8 pl-5"
                            min={0}
                            step="0.01"
                            value={it.price || ""}
                            onChange={e => update(idx, "price", e.target.value)}
                        />
                    </div>
                    {items.length > 1 && (
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-slate-400 hover:text-red-500" onClick={() => remove(idx)}>
                            <X className="w-3 h-3" />
                        </Button>
                    )}
                </div>
            ))}
            <div className="flex gap-2 pt-1">
                <Button variant="outline" size="sm" className="text-xs h-7" onClick={add}>
                    <Plus className="w-3 h-3 mr-1" /> Add line
                </Button>
                <div className="flex-1" />
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={onCancel} disabled={saving}>Cancel</Button>
                <Button size="sm" className="text-xs h-7 bg-slate-900 hover:bg-slate-800" disabled={saving || !items.some(i => i.desc.trim())} onClick={() => onSave(items)}>
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3 mr-1" />}
                    Save
                </Button>
            </div>
        </div>
    )
}

// ─── Main Component ─────────────────────────────────────────────────

interface JobBillingTabProps {
    dealId: string
}

export function JobBillingTab({ dealId }: JobBillingTabProps) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [invoices, setInvoices] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [variationDesc, setVariationDesc] = useState("")
    const [variationPrice, setVariationPrice] = useState("")
    const [creating, setCreating] = useState(false)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [priceError, setPriceError] = useState<string | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [syncCache, setSyncCache] = useState<Record<string, { synced: boolean; provider: string | null }>>({})

    const fetchInvoices = useCallback(async () => {
        setLoading(true)
        try {
            const data = await getDealInvoices(dealId)
            setInvoices(data)
            const syncResults: Record<string, { synced: boolean; provider: string | null }> = {}
            await Promise.all(data.map(async (inv: { id: string }) => {
                const status = await getInvoiceSyncStatus(inv.id)
                if (status) syncResults[inv.id] = { synced: status.synced, provider: status.provider }
            }))
            setSyncCache(syncResults)
        } catch (error) {
            console.error(error)
            toast.error("Failed to load invoices")
        } finally {
            setLoading(false)
        }
    }, [dealId])

    useEffect(() => { fetchInvoices() }, [fetchInvoices])

    const handleCreateInvoice = async () => {
        const price = Number(variationPrice)
        if (!variationDesc.trim()) { toast.error("Enter an item description"); return }
        if (!variationPrice || price <= 0) { setPriceError("Price must be greater than $0"); return }
        setPriceError(null)
        setCreating(true)
        try {
            const result = await generateQuote(dealId, [{ desc: variationDesc, price }])
            if (result.success === false) {
                toast.error(result.error ?? "Failed to create invoice")
                return
            }
            toast.success("Invoice created")
            setVariationDesc("")
            setVariationPrice("")
            await fetchInvoices()
        } catch (error) {
            console.error(error)
            toast.error("Failed to create invoice")
        } finally {
            setCreating(false)
        }
    }

    const withBusy = async (id: string, fn: () => Promise<void>) => {
        setBusyId(id)
        try { await fn() } finally { setBusyId(null) }
    }

    const handleIssue = (id: string) => withBusy(id, async () => {
        const res = await issueInvoice(id)
        if (res?.success === false) { toast.error(res.error ?? "Failed"); return }
        toast.success("Invoice issued")
        fetchInvoices()
    })

    const handlePay = (id: string) => withBusy(id, async () => {
        const res = await markInvoicePaid(id)
        if (res?.success === false) { toast.error(res.error ?? "Failed"); return }
        toast.success("Marked as paid")
        fetchInvoices()
    })

    const handleVoid = (id: string) => withBusy(id, async () => {
        const res = await voidInvoice(id)
        if (res?.success === false) { toast.error(res.error ?? "Failed"); return }
        toast.success("Invoice voided")
        fetchInvoices()
    })

    const handleReverse = (id: string, target: "DRAFT" | "ISSUED") => withBusy(id, async () => {
        const res = await reverseInvoiceStatus(id, target)
        if (res?.success === false) { toast.error(res.error ?? "Failed"); return }
        toast.success(`Reversed to ${target}`)
        fetchInvoices()
    })

    const handleEmail = (id: string) => withBusy(id, async () => {
        const res = await emailInvoice(id)
        if (res?.success === false) { toast.error(res.error ?? "Failed"); return }
        toast.success("Invoice emailed to contact")
        fetchInvoices()
    })

    const handleSaveLineItems = (id: string, items: LineItem[]) => withBusy(id, async () => {
        const res = await updateInvoiceLineItems(id, items)
        if (res?.success === false) { toast.error(res.error ?? "Failed"); return }
        toast.success("Line items updated")
        setEditingId(null)
        fetchInvoices()
    })

    return (
        <div className="space-y-6">
            {/* Quick Invoice / Variation */}
            <Card className="min-h-[17rem]">
                <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">Quick Invoice / Variation</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="flex gap-2">
                        <Input
                            placeholder="Item (e.g. Extra materials)"
                            value={variationDesc}
                            onChange={(e) => setVariationDesc(e.target.value)}
                        />
                        <div className="relative w-24 shrink-0">
                            <span className="absolute left-2 top-2.5 text-slate-400 text-sm">$</span>
                            <Input
                                type="number"
                                className={`pl-5 ${priceError ? "border-red-400" : ""}`}
                                placeholder="0"
                                min={0.01}
                                step="0.01"
                                value={variationPrice}
                                onChange={(e) => { setVariationPrice(e.target.value); setPriceError(null) }}
                            />
                        </div>
                    </div>
                    {priceError && <p className="text-xs text-red-500">{priceError}</p>}
                    <Button onClick={handleCreateInvoice} disabled={creating || !variationDesc.trim()} className="w-full bg-slate-900 hover:bg-slate-800">
                        {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                        Create Invoice
                    </Button>
                </CardContent>
            </Card>

            {/* Invoices List */}
            <div className="space-y-3">
                <div className="flex items-center justify-between px-1">
                    <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider">Invoices</h3>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={fetchInvoices}>
                        <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
                    </Button>
                </div>

                {loading && invoices.length === 0 ? (
                    <div className="text-center py-4 text-slate-400 text-xs">Loading invoices...</div>
                ) : invoices.length === 0 ? (
                    <Card className="min-h-[10rem] bg-slate-50 border-dashed shadow-none">
                        <CardContent className="flex min-h-[10rem] items-center justify-center py-8 text-center text-slate-500 text-sm">
                            No invoices generated yet.
                        </CardContent>
                    </Card>
                ) : (
                    invoices.map(inv => {
                        const busy = busyId === inv.id
                        const sync = syncCache[inv.id]
                        const lineItems: LineItem[] = Array.isArray(inv.lineItems)
                            ? inv.lineItems.map((it: Record<string, unknown>) => ({ desc: String(it.desc ?? ""), price: Number(it.price ?? 0) }))
                            : []

                        return (
                            <Card key={inv.id} className={`overflow-hidden border-slate-200 shadow-sm ${inv.status === "VOID" ? "opacity-60" : ""}`}>
                                <div className="p-4 flex justify-between items-start">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                                            <span className="font-semibold text-slate-900 text-sm">{inv.number}</span>
                                            {sync && (
                                                <span className="inline-flex items-center gap-1 text-[10px]" title={sync.synced ? `Synced to ${sync.provider}` : "Not synced to accounting"}>
                                                    {sync.synced
                                                        ? <Cloud className="w-3 h-3 text-emerald-500" />
                                                        : <CloudOff className="w-3 h-3 text-slate-300" />}
                                                    <span className={sync.synced ? "text-emerald-600" : "text-slate-400"}>{sync.synced ? sync.provider : "Not synced"}</span>
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {new Date(inv.createdAt).toLocaleDateString("en-AU")}
                                            {inv.issuedAt && ` · Issued ${new Date(inv.issuedAt).toLocaleDateString("en-AU")}`}
                                            {inv.paidAt && ` · Paid ${new Date(inv.paidAt).toLocaleDateString("en-AU")}`}
                                        </p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="block font-bold text-slate-900">${Number(inv.total).toLocaleString()}</span>
                                        <Badge variant="outline" className={`shadow-none ${STATUS_STYLE[inv.status] ?? ""}`}>
                                            {formatInvoiceStatusLabel(inv.status)}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Line items (collapsed) */}
                                {lineItems.length > 0 && editingId !== inv.id && (
                                    <div className="px-4 pb-2">
                                        <div className="text-[11px] text-slate-500 space-y-0.5">
                                            {lineItems.map((it, i) => (
                                                <div key={i} className="flex justify-between">
                                                    <span className="truncate mr-2">{it.desc}</span>
                                                    <span className="shrink-0 font-medium">${it.price.toFixed(2)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Inline line-item editor */}
                                {editingId === inv.id && (
                                    <div className="px-3 pb-3">
                                        <LineItemEditor
                                            initial={lineItems}
                                            saving={busy}
                                            onCancel={() => setEditingId(null)}
                                            onSave={(items) => handleSaveLineItems(inv.id, items)}
                                        />
                                    </div>
                                )}

                                {/* Action bar */}
                                {inv.status !== "VOID" && editingId !== inv.id && (
                                    <div className="bg-slate-50 p-2 flex gap-2 flex-wrap border-t border-slate-100">
                                        {/* Primary actions based on status */}
                                        {inv.status === "DRAFT" && (
                                            <>
                                                <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8" disabled={busy} onClick={() => handleIssue(inv.id)}>
                                                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                                                    Issue
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-xs h-8" disabled={busy} onClick={() => setEditingId(inv.id)}>
                                                    <Pencil className="w-3 h-3 mr-1" /> Edit
                                                </Button>
                                            </>
                                        )}
                                        {inv.status === "ISSUED" && (
                                            <>
                                                <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8" disabled={busy} onClick={() => handlePay(inv.id)}>
                                                    {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3 mr-1" />}
                                                    Mark Paid
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-xs h-8" disabled={busy} onClick={() => handleReverse(inv.id, "DRAFT")}>
                                                    <Undo2 className="w-3 h-3 mr-1" /> Back to Draft
                                                </Button>
                                            </>
                                        )}
                                        {inv.status === "PAID" && (
                                            <Button size="sm" variant="outline" className="flex-1 text-xs h-8" disabled={busy} onClick={() => handleReverse(inv.id, "ISSUED")}>
                                                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Undo2 className="w-3 h-3 mr-1" />}
                                                Reverse to Issued
                                            </Button>
                                        )}

                                        {/* Email — available on DRAFT, ISSUED */}
                                        {(inv.status === "DRAFT" || inv.status === "ISSUED") && (
                                            <Button size="sm" variant="outline" className="text-xs h-8" disabled={busy} onClick={() => handleEmail(inv.id)}>
                                                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3 mr-1" />}
                                                Email
                                            </Button>
                                        )}

                                        {/* Void — available on DRAFT, ISSUED */}
                                        {(inv.status === "DRAFT" || inv.status === "ISSUED") && (
                                            <Button size="sm" variant="outline" className="bg-white border-red-200 text-red-600 hover:bg-red-50 text-xs h-8" disabled={busy} onClick={() => handleVoid(inv.id)}>
                                                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3 mr-1" />}
                                                Void
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </Card>
                        )
                    })
                )}
            </div>
        </div>
    )
}
