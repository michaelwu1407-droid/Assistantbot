"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PhoneSignIn() {
  const { isSignedIn } = useUser();

  if (isSignedIn) {
    window.location.href = "/setup";
    return null;
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50">
      <Card className="w-full max-w-md mx-4">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in with your phone number
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SignIn 
            redirectUrl="/setup"
            afterSignInUrl="/setup"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none border-0 p-0",
                headerTitle: "hidden",
                headerSubtitle: "hidden",
                socialButtonsBlockButton: "hidden",
                dividerLine: "hidden",
                formButtonPrimary: "w-full",
                formFieldInput: "w-full",
              },
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
