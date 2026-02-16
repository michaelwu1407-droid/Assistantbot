"use client";

import { SignIn, SignUp, useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function AuthSelector() {
  const { isSignedIn } = useUser();
  const [isSignUp, setIsSignUp] = useState(false);

  if (isSignedIn) {
    window.location.href = "/setup";
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? "Create Account" : "Welcome Back"}
          </CardTitle>
          <CardDescription>
            {isSignUp ? "Sign up to get started" : "Sign in to your account"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isSignUp ? (
            <SignUp 
              redirectUrl="/setup"
              afterSignUpUrl="/setup"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none border-0 p-0",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: "w-full",
                  formButtonPrimary: "w-full",
                  formFieldInput: "w-full",
                },
              }}
            />
          ) : (
            <SignIn 
              redirectUrl="/setup"
              afterSignInUrl="/setup"
              appearance={{
                elements: {
                  rootBox: "w-full",
                  card: "shadow-none border-0 p-0",
                  headerTitle: "hidden",
                  headerSubtitle: "hidden",
                  socialButtonsBlockButton: "w-full",
                  formButtonPrimary: "w-full",
                  formFieldInput: "w-full",
                },
              }}
            />
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
