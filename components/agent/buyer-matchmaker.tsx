"use client"

import { useEffect, useState } from "react"
import { findMatches, type MatchResult } from "@/actions/agent-actions"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { User, DollarSign, Bed, Phone, Mail, Loader2 } from "lucide-react"

interface BuyerMatchmakerProps {
    dealId: string
}

export function BuyerMatchmaker({ dealId }: BuyerMatchmakerProps) {
    const [result, setResult] = useState<MatchResult | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        let mounted = true
        async function fetch() {
            try {
                const data = await findMatches(dealId)
                if (mounted) setResult(data)
            } catch (error) {
                console.error("Failed to find matches", error)
            } finally {
                if (mounted) setLoading(false)
            }
        }
        fetch()
        return () => { mounted = false }
    }, [dealId])

    if (loading) {
        return (
            <Card className="h-full border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                        Finding Buyers...
                    </CardTitle>
                </CardHeader>
            </Card>
        )
    }

    if (!result || !result.success) {
        return (
            <Card className="h-full border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-slate-900">Buyer Matchmaker</CardTitle>
                    <CardDescription className="text-red-500">
                        {result?.error || "Unable to load matches."}
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    const { matches = [], listingPrice, listingBedrooms } = result

    // Fallback if price isn't set
    const displayPrice = listingPrice ? `$${listingPrice.toLocaleString()}` : "Price TBD"

    return (
        <Card className="h-full border-slate-200 shadow-sm flex flex-col">
            <CardHeader className="pb-3 border-b border-slate-100">
                <div className="flex justify-between items-start">
                    <div>
                        <CardTitle className="text-slate-900 flex items-center gap-2">
                            Buyer Matchmaker
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-200">
                                {matches.length} matches
                            </Badge>
                        </CardTitle>
                        <CardDescription className="mt-1">
                            Matching budget {'>'} {displayPrice} {listingBedrooms ? `and ${listingBedrooms}+ beds` : ''}
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-auto pt-4 space-y-4">
                {matches.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <User className="w-12 h-12 mx-auto text-slate-200 mb-3" />
                        <p>No matching buyers found in this workspace.</p>
                        <Button variant="link" className="text-blue-600">Convert Lead to Buyer</Button>
                    </div>
                ) : (
                    matches.map(contact => {
                        // Calculate a "Score"
                        const budgetBuffer = contact.budget && listingPrice ? contact.budget - listingPrice : 0
                        const isGreatMatch = budgetBuffer > 50000 // $50k buffer

                        return (
                            <div key={contact.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 rounded-lg border border-slate-100 bg-slate-50/50 hover:border-blue-200 hover:bg-blue-50/50 transition-all gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-semibold shrink-0">
                                        {contact.name.substring(0, 2).toUpperCase()}
                                    </div>
                                    <div>
                                        <div className="font-medium text-slate-900 flex items-center gap-2">
                                            {contact.name}
                                            {isGreatMatch && (
                                                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 shadow-none h-5 px-1.5 text-[10px]">
                                                    Strong Match
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                                            {contact.budget && (
                                                <span className="flex items-center gap-1 text-emerald-600 font-medium">
                                                    <DollarSign className="w-3 h-3" />
                                                    Max ${contact.budget.toLocaleString()}
                                                </span>
                                            )}
                                            {contact.bedroomsReq && (
                                                <span className="flex items-center gap-1">
                                                    <Bed className="w-3 h-3" />
                                                    {contact.bedroomsReq}+ Beds
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-slate-200 bg-white" title="Call">
                                        <Phone className="w-3.5 h-3.5 text-slate-600" />
                                    </Button>
                                    <Button size="sm" variant="outline" className="h-8 w-8 p-0 border-slate-200 bg-white" title="Email Listing">
                                        <Mail className="w-3.5 h-3.5 text-slate-600" />
                                    </Button>
                                    <Button size="sm" className="bg-slate-900 text-xs h-8">
                                        Match
                                    </Button>
                                </div>
                            </div>
                        )
                    })
                )}
            </CardContent>
        </Card>
    )
}
