"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default function LoginPage() {
    const handleSocialLogin = (provider: string) => {
        alert(`${provider} Login is not yet connected to the backend. This is a frontend demo.`)
    }

    return (
        <Card className="border-slate-200 bg-white shadow-xl">
            <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-2xl font-bold text-slate-900">Welcome back</CardTitle>
                    <Link href="/" className="text-slate-400 hover:text-slate-900 transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                </div>
                <CardDescription>
                    Enter your email to sign in to your account
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="grid grid-cols-2 gap-6">
                    <Button variant="outline" onClick={() => handleSocialLogin('Google')}>
                        Google
                    </Button>
                    <Button variant="outline" onClick={() => handleSocialLogin('Github')}>
                        Github
                    </Button>
                </div>
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-500">
                            Or continue with
                        </span>
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="m@example.com" />
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="password">Password</Label>
                    <Input id="password" type="password" />
                </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
                <Link href="/dashboard" className="w-full">
                    <Button className="w-full">Sign In</Button>
                </Link>
                <p className="text-center text-sm text-slate-500">
                    Don&apos;t have an account?{" "}
                    <Link href="/signup" className="underline underline-offset-4 hover:text-slate-900">
                        Sign up
                    </Link>
                </p>
            </CardFooter>
        </Card>
    )
}
