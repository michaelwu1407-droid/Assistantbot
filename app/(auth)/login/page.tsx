'use client';

import { SignIn } from "@clerk/nextjs";
import { ConditionalClerkProvider } from "@/components/providers/conditional-clerk-provider";

export default function LoginPage() {
  const publishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  
  // If Clerk is not configured, show a simple login form or message
  if (!publishableKey || publishableKey.includes('placeholder')) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4 p-8 border rounded-lg">
          <h1 className="text-2xl font-bold">Authentication Not Configured</h1>
          <p className="text-muted-foreground">
            Please configure Clerk authentication keys in your environment variables.
          </p>
          <p className="text-sm text-muted-foreground">
            Visit <a href="https://dashboard.clerk.com" className="text-blue-600 hover:underline">Clerk Dashboard</a> to get your keys.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ConditionalClerkProvider>
      <div className="flex items-center justify-center">
        <SignIn
          afterSignInUrl="/setup"
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "shadow-xl border border-slate-200",
            },
          }}
        />
      </div>
    </ConditionalClerkProvider>
  );
}
