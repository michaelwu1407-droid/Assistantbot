"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { signup, loginWithGoogle } from "@/actions/auth-actions"
import { Loader2 } from "lucide-react"

export default function SignupPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleSubmit = async (formData: FormData) => {
        setIsLoading(true)
        setError(null)
        
        const result = await signup(formData)
        
        if (result?.error) {
            setError(result.error)
            setIsLoading(false)
        }
        // If success, the action redirects
    }

    return (
        <Card className="border-slate-200 bg-white shadow-xl">
            <CardHeader className="space-y-1">
                <CardTitle className="text-2xl font-bold text-slate-900">Create an account</CardTitle>
                <CardDescription className="text-slate-500">
                    Enter your email below to create your account
                </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <div className="grid grid-cols-1 gap-2">
                    <Button 
                        variant="outline" 
                        className="bg-white text-slate-900 border-slate-200 hover:bg-slate-50"
                        onClick={() => loginWithGoogle()}
                    >
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Google
                    </Button>
                </div>
                
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-200" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-white px-2 text-slate-500">Or continue with</span>
                    </div>
                </div>

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
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input 
                            id="password" 
                            name="password" 
                            type="password" 
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
                        Create Account
                    </Button>
                </form>
            </CardContent>
            <CardFooter className="flex flex-col gap-2">
                <div className="text-sm text-slate-500 text-center">
                    Already have an account?{" "}
                    <Link href="/login" className="text-slate-900 underline underline-offset-4 hover:text-slate-700">
                        Sign in
                    </Link>
                </div>
            </CardFooter>
        </Card>
    )
}
