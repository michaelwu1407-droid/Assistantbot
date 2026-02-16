"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, Chrome } from "lucide-react";
import Link from "next/link";

export function AuthSelector() {
  const [selectedMethod, setSelectedMethod] = useState<"email" | "phone" | "google">("email");
  const [isSignUp, setIsSignUp] = useState(false);

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription>
            Choose how you'd like to {isSignUp ? "sign up" : "sign in"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            <Button
              variant={selectedMethod === "email" ? "default" : "outline"}
              className="w-full h-16 flex items-center justify-center gap-3"
              onClick={() => setSelectedMethod("email")}
            >
              <Mail className="h-6 w-6" />
              <div className="text-left">
                <div className="font-semibold">Email Address</div>
                <div className="text-sm text-slate-500">Use your email to {isSignUp ? "sign up" : "sign in"}</div>
              </div>
            </Button>

            <Button
              variant={selectedMethod === "phone" ? "default" : "outline"}
              className="w-full h-16 flex items-center justify-center gap-3"
              onClick={() => setSelectedMethod("phone")}
            >
              <Phone className="h-6 w-6" />
              <div className="text-left">
                <div className="font-semibold">Phone Number</div>
                <div className="text-sm text-slate-500">Use your phone number to {isSignUp ? "sign up" : "sign in"}</div>
              </div>
            </Button>

            <Button
              variant={selectedMethod === "google" ? "default" : "outline"}
              className="w-full h-16 flex items-center justify-center gap-3"
              onClick={() => setSelectedMethod("google")}
            >
              <Chrome className="h-6 w-6" />
              <div className="text-left">
                <div className="font-semibold">Google Account</div>
                <div className="text-sm text-slate-500">{isSignUp ? "Sign up" : "Sign in"} with Google</div>
              </div>
            </Button>
          </div>

          {selectedMethod && (
            <div className="mt-6 text-center">
              <Link href={
                selectedMethod === "email" 
                  ? (isSignUp ? "/signup" : "/login")
                  : selectedMethod === "phone" 
                    ? (isSignUp ? "/signup/phone" : "/login/phone")
                    : (isSignUp ? "/signup/google" : "/login/google")
              }>
                <Button size="lg" className="w-full">
                  {isSignUp ? "Sign Up" : "Sign In"} with {selectedMethod === "email" ? "Email" : selectedMethod === "phone" ? "Phone" : "Google"}
                </Button>
              </Link>
            </div>
          )}

          <div className="mt-6 text-center text-sm text-slate-600">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              {isSignUp ? "Sign in here" : "Sign up here"}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
