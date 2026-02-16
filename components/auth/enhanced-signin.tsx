"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Phone, Chrome } from "lucide-react";

export function EnhancedSignIn() {
  const [activeTab, setActiveTab] = useState("email");
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
            Sign in to your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </TabsTrigger>
              <TabsTrigger value="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="email" className="mt-6">
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
            </TabsContent>

            <TabsContent value="phone" className="mt-6">
              <SignIn 
                redirectUrl="/setup"
                afterSignInUrl="/setup"
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none border-0 p-0",
                    headerTitle: "hidden",
                    headerSubtitle: "hidden",
                    formFieldInput: "w-full",
                    formButtonPrimary: "w-full",
                  },
                }}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
