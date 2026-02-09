"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft } from "lucide-react"
import { createBrowserClient } from "@supabase/ssr"

export default function ForgotPasswordPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true)
        setError(null)

        const email = formData.get("email") as string
        const supabase = createBrowserClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/dashboard/settings/profile`,
        })

        if (error) {
            setError(error.message)
            setIsLoading(false)
        } else {
            setIsSubmitted(true)
            setIsLoading(false)
        }
    }

    if (isSubmitted) {
        return (
            <Card className="border-slate-200 bg-white shadow-xl max-w-sm w-full">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-2xl font-bold text-slate-900">Check your email</CardTitle>
                    <CardDescription className="text-slate-500">
                        We've sent you a password reset link.
                    </CardDescription>
                </CardHeader>
                <CardFooter>
                    <Link href="/login" className="w-full">
                        <Button variant="outline" className="w-full pointer-events-none" tabIndex={-1}>
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Login
                        </Button>
                    </Link>
                </CardFooter>
            </Card>
        )
    }

    return (
        <Card className="border-slate-200 bg-white shadow-xl max-w-sm w-full">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-slate-900">Reset Password</CardTitle>
                <CardDescription className="text-slate-500">
                    Enter your email to receive a reset link
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form action={handleSubmit} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="m@example.com"
                            required
                            className="bg-white border-slate-200"
                        />
                    </div>

                    {error && (
                        <div className="text-sm text-red-500 bg-red-50 p-2 rounded border border-red-100">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white"
                        disabled={isLoading}
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Send Reset Link
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex justify-center">
                <Link href="/login" className="text-sm text-slate-500 hover:text-slate-900 flex items-center">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Login
                </Link>
            </CardFooter>
        </Card>
    )
}
