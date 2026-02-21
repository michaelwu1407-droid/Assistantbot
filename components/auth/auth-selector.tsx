"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { MonitoringService } from "@/lib/monitoring";

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
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setMessage("Account created! Please sign in with your credentials.");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          MonitoringService.identifyUser(user.id, { email: user.email, name });
          MonitoringService.trackEvent("user_signed_up", { provider: "email" });
        }
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
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        MonitoringService.identifyUser(user.id, { email: user.email });
        MonitoringService.trackEvent("user_signed_in", { provider: "email" });
      }
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
    <div className="flex items-center justify-center min-h-screen bg-background p-4 relative">
      <div className="absolute inset-0 ott-glow -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] -z-10 rounded-full bg-primary/8 blur-3xl" />

      <div className="w-full max-w-md ott-card bg-card p-8 relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
            <span className="text-white font-extrabold italic text-lg tracking-tighter">Pj</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-midnight tracking-tight mb-2">Welcome to Pj Buddy</h1>
          <p className="text-muted-foreground text-sm">
            Sign in to your account or create a new one
          </p>
        </div>

        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <form onSubmit={handleSignIn} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="signin-email" className="text-midnight font-semibold text-sm">Email</Label>
                <Input
                  id="signin-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="signin-password" className="text-midnight font-semibold text-sm">Password</Label>
                <Input
                  id="signin-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>
              <Button type="submit" className="w-full mt-2" size="lg" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
              {needsConfirmation && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  size="lg"
                  onClick={handleResendConfirmation}
                  disabled={loading}
                >
                  Resend Confirmation Email
                </Button>
              )}
            </form>
          </TabsContent>

          <TabsContent value="signup" className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            <form onSubmit={handleSignUp} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Label htmlFor="signup-name" className="text-midnight font-semibold text-sm">Full Name</Label>
                <Input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="signup-email" className="text-midnight font-semibold text-sm">Email</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="flex flex-col gap-2">
                <Label htmlFor="signup-password" className="text-midnight font-semibold text-sm">Password</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                />
              </div>
              <Button type="submit" className="w-full mt-2" size="lg" disabled={loading}>
                {loading ? "Signing up..." : "Sign Up"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {message && (
          <div className={cn(
            "mt-6 p-4 rounded-xl text-center text-sm font-semibold border",
            message.includes("error") || message.includes("Error") || message.includes("already exists")
              ? "bg-red-50 text-red-600 border-red-100"
              : "bg-mint-50 text-primary border-primary/20"
          )}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
