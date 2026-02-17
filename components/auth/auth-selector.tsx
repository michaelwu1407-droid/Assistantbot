"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

export function AuthSelector() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push("/setup");
      }
      setUser(user);
    };
    checkUser();
  }, [router, supabase]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          confirmed_at: new Date().toISOString(),
          name: name || email.split('@')[0],
        }
      },
    });

    if (error) {
      setMessage(error.message);
    } else if (data.user && data.user.identities && data.user.identities.length === 0) {
      setMessage("An account with this email already exists. Please sign in instead.");
    } else {
      // Auto sign in after signup
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setMessage("Account created! Please sign in with your credentials.");
      } else {
        router.push("/setup");
        router.refresh();
      }
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setNeedsConfirmation(false);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message.includes("Email not confirmed")) {
        setNeedsConfirmation(true);
        setMessage("Email not confirmed. Check your inbox or resend confirmation.");
      } else {
        setMessage(error.message);
      }
    } else {
      router.push("/setup");
      router.refresh();
    }
    setLoading(false);
  };

  const handleResendConfirmation = async () => {
    setLoading(true);
    setMessage("");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
    });
    if (error) {
      setMessage(error.message);
    } else {
      setMessage("Confirmation email sent! Check your inbox.");
    }
    setLoading(false);
  };

  if (user) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4">
      <div className="w-full max-w-md mx-4 ott-card bg-white p-8 relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-[#0F172A] tracking-tight mb-2">Welcome to Pj Buddy</h1>
          <p className="text-[#475569] text-base font-medium">
            Sign in to your account or create a new one
          </p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-8 bg-[#F1F5F9] p-1 rounded-full h-12">
            <TabsTrigger value="signin" className="rounded-full h-10 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0F172A] data-[state=active]:shadow-sm transition-all text-[#64748B]">Sign In</TabsTrigger>
            <TabsTrigger value="signup" className="rounded-full h-10 text-sm font-semibold data-[state=active]:bg-white data-[state=active]:text-[#0F172A] data-[state=active]:shadow-sm transition-all text-[#64748B]">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <form onSubmit={handleSignIn} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signin-email" className="text-[#0F172A] font-semibold">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="bg-[#F8FAFC] border-[#E2E8F0] focus:bg-white focus:border-[#00D28B] h-12 rounded-xl transition-all font-medium text-[#0F172A] px-4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signin-password" className="text-[#0F172A] font-semibold">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-[#F8FAFC] border-[#E2E8F0] focus:bg-white focus:border-[#00D28B] h-12 rounded-xl transition-all font-medium text-[#0F172A] px-4"
                />
              </div>
              <Button type="submit" className="ott-btn-primary w-full shadow-xl shadow-black/10 mt-2" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              {needsConfirmation && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-12 rounded-full border-[#E2E8F0] text-[#475569] font-semibold hover:bg-[#F8FAFC]"
                  onClick={handleResendConfirmation}
                  disabled={loading}
                >
                  Resend Confirmation Email
                </Button>
              )}
            </form>
          </TabsContent>

          <TabsContent value="signup" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <form onSubmit={handleSignUp} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="signup-name" className="text-[#0F172A] font-semibold">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  required
                  className="bg-[#F8FAFC] border-[#E2E8F0] focus:bg-white focus:border-[#00D28B] h-12 rounded-xl transition-all font-medium text-[#0F172A] px-4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email" className="text-[#0F172A] font-semibold">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  className="bg-[#F8FAFC] border-[#E2E8F0] focus:bg-white focus:border-[#00D28B] h-12 rounded-xl transition-all font-medium text-[#0F172A] px-4"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password" className="text-[#0F172A] font-semibold">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-[#F8FAFC] border-[#E2E8F0] focus:bg-white focus:border-[#00D28B] h-12 rounded-xl transition-all font-medium text-[#0F172A] px-4"
                />
              </div>
              <Button type="submit" className="ott-btn-primary w-full shadow-xl shadow-black/10 mt-2" disabled={loading}>
                {loading ? "Signing up..." : "Sign Up"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {message && (
          <div className={cn(
            "mt-6 p-4 rounded-xl text-center text-sm font-bold border",
            message.includes("error") || message.includes("Error")
              ? "bg-red-50 text-red-600 border-red-100"
              : "bg-[#ECFDF5] text-[#00D28B] border-[#00D28B]/20"
          )}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
