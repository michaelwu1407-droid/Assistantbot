"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, FileText, CreditCard, Loader2, RefreshCw } from "lucide-react"
import { generateQuote, getDealInvoices, markInvoicePaid } from "@/actions/tradie-actions"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"

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
        if (!variationDesc || !variationPrice) return
        setCreating(true)
        try {
            // Use generateQuote to create an immediate invoice for this item
            await generateQuote(dealId, [{ desc: variationDesc, price: Number(variationPrice) }])
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

    const handlePay = async (invoiceId: string) => {
        toast.loading("Processing payment...")
        try {
            await markInvoicePaid(invoiceId)
            toast.dismiss()
            toast.success("Payment successful")
            fetchInvoices()
        } catch (error) {
            console.error(error)
            toast.dismiss()
            toast.error("Payment failed")
        }
    }

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
                                className="pl-5" 
                                placeholder="0"
                                value={variationPrice}
                                onChange={(e) => setVariationPrice(e.target.value)}
                            />
                        </div>
                    </div>
                    <Button onClick={handleCreateInvoice} disabled={creating || !variationDesc} className="w-full bg-slate-900 hover:bg-slate-800">
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
                    invoices.map(inv => (
                        <Card key={inv.id} className="overflow-hidden border-slate-200 shadow-sm">
                            <div className="p-4 flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <FileText className="w-4 h-4 text-slate-400" />
                                        <span className="font-semibold text-slate-900 text-sm">{inv.number}</span>
                                    </div>
                                    <p className="text-xs text-slate-500">
                                        {new Date(inv.createdAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <span className="block font-bold text-slate-900">${Number(inv.total).toLocaleString()}</span>
                                    <Badge variant={inv.status === 'PAID' ? 'default' : 'outline'} className={
                                        inv.status === 'PAID' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200 shadow-none" : 
                                        "text-amber-600 border-amber-200 bg-amber-50 shadow-none"
                                    }>
                                        {inv.status}
                                    </Badge>
                                </div>
                            </div>
                            {inv.status !== 'PAID' && (
                                <div className="bg-slate-50 p-2 flex gap-2 border-t border-slate-100">
                                    <Button size="sm" variant="outline" className="flex-1 bg-white border-slate-200 text-xs h-8">
                                        Email
                                    </Button>
                                    <Button size="sm" className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs h-8" onClick={() => handlePay(inv.id)}>
                                        <CreditCard className="w-3 h-3 mr-2" />
                                        Pay Now
                                    </Button>
                                </div>
                            )}
                        </Card>
                    ))
                )}
            </div>
        </div>
    )
}
