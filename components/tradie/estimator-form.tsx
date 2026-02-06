"use client"

import { useState } from "react"
import { Plus, Trash2, FileText, Loader2, DollarSign, Calculator } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { generateQuote, type LineItem } from "@/actions/tradie-actions"
import { DealView } from "@/actions/deal-actions"

interface EstimatorFormProps {
    deals: DealView[]
}

export function EstimatorForm({ deals }: EstimatorFormProps) {
    const [selectedDealId, setSelectedDealId] = useState<string>("")
    const [items, setItems] = useState<LineItem[]>([{ desc: "", price: 0 }])
    const [loading, setLoading] = useState(false)
    const [quoteResult, setQuoteResult] = useState<{ total: number, invoiceNumber: string } | null>(null)

    // Derived state
    const subtotal = items.reduce((sum, item) => sum + (Number(item.price) || 0), 0)
    const gst = subtotal * 0.1
    const total = subtotal + gst

    const handleAddItem = () => {
        setItems([...items, { desc: "", price: 0 }])
    }

    const handleRemoveItem = (index: number) => {
        const newItems = [...items]
        newItems.splice(index, 1)
        setItems(newItems)
    }

    const handleItemChange = (index: number, field: keyof LineItem, value: string | number) => {
        const newItems = [...items]
        if (field === 'price') {
            newItems[index] = { ...newItems[index], [field]: parseFloat(value as string) || 0 }
        } else {
            newItems[index] = { ...newItems[index], [field]: value as string }
        }
        setItems(newItems)
    }

    const handleGenerate = async () => {
        if (!selectedDealId) return

        setLoading(true)
        try {
            const result = await generateQuote(selectedDealId, items)
            if (result.success && result.total && result.invoiceNumber) {
                setQuoteResult({
                    total: result.total,
                    invoiceNumber: result.invoiceNumber
                })
            } else {
                // Determine how to handle error - toast?
                console.error(result.error)
            }
        } catch (error) {
            console.error("Failed to generate quote", error)
        } finally {
            setLoading(false)
        }
    }

    if (quoteResult) {
        return (
            <Card className="max-w-md mx-auto border-slate-200 shadow-lg animate-in fade-in zoom-in-95 duration-300">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <FileText className="w-6 h-6 text-green-600" />
                    </div>
                    <CardTitle className="text-xl text-slate-900">Quote Generated!</CardTitle>
                    <p className="text-sm text-slate-500">Invoice #{quoteResult.invoiceNumber}</p>
                </CardHeader>
                <CardContent className="space-y-4 text-center">
                    <div className="text-4xl font-bold text-slate-900 tracking-tight">
                        ${quoteResult.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <p className="text-sm text-slate-500">
                        Quote has been attached to the deal and invoice created in Draft status.
                    </p>
                </CardContent>
                <CardFooter className="flex flex-col gap-3">
                    <Button className="w-full bg-slate-900 hover:bg-slate-800" disabled>
                        <FileText className="w-4 h-4 mr-2" />
                        Download PDF (Coming Soon)
                    </Button>
                    <Button variant="ghost" className="w-full" onClick={() => setQuoteResult(null)}>
                        Create Another Quote
                    </Button>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className="border-slate-200 shadow-sm">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <Calculator className="w-5 h-5 text-blue-600" />
                    Pocket Estimator
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Select Deal</label>
                    <Select onValueChange={setSelectedDealId} value={selectedDealId}>
                        <SelectTrigger className="bg-white border-slate-200">
                            <SelectValue placeholder="Choose a deal..." />
                        </SelectTrigger>
                        <SelectContent>
                            {deals.length === 0 ? (
                                <SelectItem value="none" disabled>No deals found</SelectItem>
                            ) : (
                                deals.map(deal => (
                                    <SelectItem key={deal.id} value={deal.id}>
                                        {deal.title}
                                    </SelectItem>
                                ))
                            )}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Line Items</label>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div key={index} className="flex gap-2 items-start">
                                <Input
                                    placeholder="Description (e.g. Labor)"
                                    className="flex-1 bg-white"
                                    value={item.desc}
                                    onChange={(e) => handleItemChange(index, 'desc', e.target.value)}
                                />
                                <div className="relative w-24 flex-shrink-0">
                                    <span className="absolute left-3 top-2.5 text-slate-400 text-sm">$</span>
                                    <Input
                                        type="number"
                                        className="pl-6 bg-white"
                                        placeholder="0.00"
                                        value={item.price || ''}
                                        onChange={(e) => handleItemChange(index, 'price', e.target.value)}
                                    />
                                </div>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-slate-400 hover:text-red-500 hover:bg-red-50"
                                    onClick={() => handleRemoveItem(index)}
                                    disabled={items.length === 1}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleAddItem}
                        className="w-full border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-300"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Line Item
                    </Button>
                </div>

                <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
                    <div className="flex justify-between text-sm text-slate-500">
                        <span>Subtotal</span>
                        <span>${subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-slate-500">
                        <span>GST (10%)</span>
                        <span>${gst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold text-slate-900 pt-2 border-t border-slate-100 mt-2">
                        <span>Total</span>
                        <span>${total.toFixed(2)}</span>
                    </div>
                </div>
            </CardContent>
            <CardFooter>
                <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200"
                    size="lg"
                    onClick={handleGenerate}
                    disabled={!selectedDealId || loading || items.some(i => !i.desc || i.price <= 0)}
                >
                    {loading ? (
                        <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Generatiing Quote...
                        </>
                    ) : (
                        <>
                            <DollarSign className="w-4 h-4 mr-2" />
                            Generate Quote
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    )
}
