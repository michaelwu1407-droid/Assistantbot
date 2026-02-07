"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default function SignupPage() {
    const router = useRouter()

    const handleSignup = () => {
        // For demo purposes, bypass auth and go to onboarding setup
        router.push("/setup")
    }

    return (
        <Card className="border-slate-200 bg-white shadow-xl">
            <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl font-bold text-slate-900">Create an account</CardTitle>
                    <Link href="/" className="text-slate-400 hover:text-slate-900 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </div>
                <CardDescription>
                    Enter your information below to create your account
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="grid gap-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input id="name" placeholder="John Doe" />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="m@example.com" />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="confirm-password">Confirm Password</Label>
                    <Input id="confirm-password" type="password" />
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                <Button className="w-full" onClick={handleSignup}>Create Account</Button>
                <p className="text-center text-sm text-slate-500">
                    Already have an account?{" "}
                    <Link href="/login" className="underline underline-offset-4 hover:text-slate-900">
                        Sign in
                    </Link>
                </p>
            </CardFooter>
        </Card>
    )
}
