"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, FileText, CreditCard, Loader2, RefreshCw, Send, Ban, Undo2 } from "lucide-react"
import { generateQuote, getDealInvoices, markInvoicePaid, issueInvoice, voidInvoice } from "@/actions/tradie-actions"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

const STATUS_STYLE: Record<string, string> = {
    DRAFT: "text-slate-600 border-slate-200 bg-slate-50",
    ISSUED: "text-blue-700 border-blue-200 bg-blue-50",
    PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
    VOID: "text-red-600 border-red-200 bg-red-50 line-through",
}

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

    const fetchInvoices = async () => {
        setLoading(true)
        try {
            const data = await getDealInvoices(dealId)
            setInvoices(data)
        } catch (error) {
            console.error(error)
            toast.error("Failed to load invoices")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchInvoices()
    }, [dealId])

    const handleCreateInvoice = async () => {
        const price = Number(variationPrice)
        if (!variationDesc.trim()) { toast.error("Enter an item description"); return }
        if (!variationPrice || price <= 0) { setPriceError("Price must be greater than $0"); return }
        setPriceError(null)
        setCreating(true)
        try {
            await generateQuote(dealId, [{ desc: variationDesc, price }])
            toast.success("Invoice created")
            setVariationDesc("")
            setVariationPrice("")
            fetchInvoices()
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

    return (
        <div className="space-y-6">
            {/* Quick Invoice / Variation */}
            <Card>
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
                    <Card className="bg-slate-50 border-dashed shadow-none">
                        <CardContent className="py-8 text-center text-slate-500 text-sm">
                            No invoices generated yet.
                        </CardContent>
                    </Card>
                ) : (
                    invoices.map(inv => {
                        const busy = busyId === inv.id
                        return (
                            <Card key={inv.id} className={`overflow-hidden border-slate-200 shadow-sm ${inv.status === "VOID" ? "opacity-60" : ""}`}>
                                <div className="p-4 flex justify-between items-start">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <FileText className="w-4 h-4 text-slate-400" />
                                            <span className="font-semibold text-slate-900 text-sm">{inv.number}</span>
                                        </div>
                                        <p className="text-xs text-slate-500">
                                            {new Date(inv.createdAt).toLocaleDateString()}
                                            {inv.issuedAt && ` · Issued ${new Date(inv.issuedAt).toLocaleDateString()}`}
                                            {inv.paidAt && ` · Paid ${new Date(inv.paidAt).toLocaleDateString()}`}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <span className="block font-bold text-slate-900">${Number(inv.total).toLocaleString()}</span>
                                        <Badge variant="outline" className={`shadow-none ${STATUS_STYLE[inv.status] ?? ""}`}>
                                            {inv.status}
                                        </Badge>
                                    </div>
                                </div>

                                {inv.status !== "PAID" && inv.status !== "VOID" && (
                                    <div className="bg-slate-50 p-2 flex gap-2 border-t border-slate-100">
                                        {inv.status === "DRAFT" && (
                                            <Button size="sm" className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs h-8" disabled={busy} onClick={() => handleIssue(inv.id)}>
                                                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3 mr-1" />}
                                                Issue
                                            </Button>
                                        )}
                                        {inv.status === "ISSUED" && (
                                            <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8" disabled={busy} onClick={() => handlePay(inv.id)}>
                                                {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CreditCard className="w-3 h-3 mr-1" />}
                                                Mark Paid
                                            </Button>
                                        )}
                                        <Button size="sm" variant="outline" className="flex-1 bg-white border-red-200 text-red-600 hover:bg-red-50 text-xs h-8" disabled={busy} onClick={() => handleVoid(inv.id)}>
                                            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Ban className="w-3 h-3 mr-1" />}
                                            Void
                                        </Button>
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
