"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle2, User, Mail, Phone } from "lucide-react"
import { logOpenHouseAttendee } from "@/actions/agent-actions"

interface KioskFormProps {
    dealId: string
    dealTitle: string
}

export function KioskForm({ dealId, dealTitle }: KioskFormProps) {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        notes: "",
        interestedLevel: 3
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)

        try {
            await logOpenHouseAttendee({
                dealId,
                attendeeName: formData.name,
                attendeeEmail: formData.email,
                attendeePhone: formData.phone,
                notes: formData.notes,
                interestedLevel: formData.interestedLevel
            })
            setSuccess(true)
            // Reset after delay or keep as confirmation screen?
            // For a kiosk, we usually want a "Next Visitor" button.
        } catch (error) {
            console.error(error)
        } finally {
            setLoading(false)
        }
    }

    const handleReset = () => {
        setSuccess(false)
        setFormData({
            name: "",
            email: "",
            phone: "",
            notes: "",
            interestedLevel: 3
        })
    }

    if (success) {
        return (
            <Card className="w-full max-w-md mx-auto mt-10 border-none shadow-xl bg-white/90 backdrop-blur">
                <CardContent className="pt-10 pb-10 flex flex-col items-center text-center space-y-4">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-10 h-10 text-green-600" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900">Thank You!</h2>
                    <p className="text-slate-500 max-w-xs">
                        Your details have been registered. The agent has been notified of your visit.
                    </p>
                    <Button onClick={handleReset} className="mt-6 w-full max-w-xs" size="lg">
                        Register Another Visitor
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="w-full max-w-lg mx-auto border-slate-200 shadow-xl bg-white/95">
            <CardHeader className="text-center border-b border-slate-100 pb-6 bg-slate-50/50 rounded-t-xl">
                <CardTitle className="text-2xl font-bold tracking-tight text-slate-900">
                    Welcome to the Open House
                </CardTitle>
                <CardDescription className="text-base text-slate-500 mt-2">
                    Please sign in to view {dealTitle}
                </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="name" className="text-sm font-medium text-slate-700">Full Name</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                id="name"
                                className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                placeholder="Jane Doe"
                                required
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-sm font-medium text-slate-700">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                id="email"
                                type="email"
                                className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                placeholder="jane@example.com"
                                value={formData.email}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone" className="text-sm font-medium text-slate-700">Phone Number</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                            <Input
                                id="phone"
                                type="tel"
                                className="pl-10 h-12 bg-slate-50 border-slate-200 focus:bg-white transition-all"
                                placeholder="0412 345 678"
                                value={formData.phone}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-sm font-medium text-slate-700 mb-2 block">I am a...</Label>
                        <div className="grid grid-cols-3 gap-3">
                            {['Buying', 'Renting', 'Just Looking'].map((level, i) => (
                                <button
                                    key={level}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, interestedLevel: (i === 2 ? 1 : 5 - i * 2) })} // 5, 3, 1 logic roughly
                                    className={`
                                        h-12 rounded-lg border text-sm font-medium transition-all
                                        ${(i === 2 && formData.interestedLevel === 1) || (i !== 2 && formData.interestedLevel === 5 - i * 2)
                                            ? "bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-900 ring-offset-2"
                                            : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"}
                                    `}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="notes" className="text-sm font-medium text-slate-700">Notes / Feedback (Optional)</Label>
                        <Textarea
                            id="notes"
                            className="bg-slate-50 border-slate-200 focus:bg-white min-h-[80px]"
                            placeholder="What are you looking for?"
                            value={formData.notes}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFormData({ ...formData, notes: e.target.value })}
                        />
                    </div>

                    <Button className="w-full h-12 text-lg font-semibold bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200" disabled={loading}>
                        {loading ? "Checking In..." : "Check In"}
                    </Button>
                </form>
            </CardContent>
        </Card>
    )
}
