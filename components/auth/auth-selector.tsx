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
import { Phone, Mail } from "lucide-react";

export function AuthSelector() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [needsConfirmation, setNeedsConfirmation] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [signUpMethod, setSignUpMethod] = useState<"email" | "phone">("email");
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [signInMethod, setSignInMethod] = useState<"email" | "phone">("email");
  const [signInPhoneOtpSent, setSignInPhoneOtpSent] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push("/auth/next");
      }
      setUser(user);
    };
    checkUser();
  }, [router, supabase]);

  // Format Australian phone for Supabase (E.164)
  const formatPhoneE164 = (raw: string): string => {
    const cleaned = raw.replace(/[\s\-\(\)]/g, "");
    if (cleaned.startsWith("+61")) return cleaned;
    if (cleaned.startsWith("0")) return `+61${cleaned.slice(1)}`;
    if (cleaned.startsWith("61")) return `+${cleaned}`;
    return `+61${cleaned}`;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    if (signUpMethod === "phone") {
      // Phone sign up: send OTP
      if (!phoneOtpSent) {
        const formattedPhone = formatPhoneE164(phone);
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
          options: {
            data: {
              name: name || phone,
            }
          }
        });
        if (error) {
          setMessage(error.message);
        } else {
          setPhoneOtpSent(true);
          setMessage("Verification code sent! Check your phone.");
        }
      } else {
        // Verify OTP
        const formattedPhone = formatPhoneE164(phone);
        const { data, error } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: otp,
          type: "sms",
        });
        if (error) {
          setMessage(error.message);
        } else if (data.user) {
          MonitoringService.identifyUser(data.user.id, { name });
          MonitoringService.trackEvent("user_signed_up", { provider: "phone" });
          router.push("/auth/next");
          router.refresh();
        }
      }
    } else {
      // Email sign up
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
          router.push("/auth/next");
          router.refresh();
        }
      }
    }
    setLoading(false);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setNeedsConfirmation(false);

    if (signInMethod === "phone") {
      if (!signInPhoneOtpSent) {
        const formattedPhone = formatPhoneE164(phone);
        const { error } = await supabase.auth.signInWithOtp({
          phone: formattedPhone,
        });
        if (error) {
          setMessage(error.message);
        } else {
          setSignInPhoneOtpSent(true);
          setMessage("Verification code sent! Check your phone.");
        }
      } else {
        const formattedPhone = formatPhoneE164(phone);
        const { data, error } = await supabase.auth.verifyOtp({
          phone: formattedPhone,
          token: otp,
          type: "sms",
        });
        if (error) {
          setMessage(error.message);
        } else if (data.user) {
          MonitoringService.identifyUser(data.user.id, {});
          MonitoringService.trackEvent("user_signed_in", { provider: "phone" });
          router.push("/auth/next");
          router.refresh();
        }
      }
    } else {
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
        router.push("/auth/next");
        router.refresh();
      }
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
          <img src="/Latest logo.png" alt="Earlymark" className="h-12 w-12 object-contain" />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-midnight tracking-tight mb-2">Welcome to Earlymark</h1>
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
            {/* Method toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={signInMethod === "email" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => { setSignInMethod("email"); setSignInPhoneOtpSent(false); setMessage(""); }}
              >
                <Mail className="h-4 w-4 mr-1.5" />
                Email
              </Button>
              <Button
                type="button"
                variant={signInMethod === "phone" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => { setSignInMethod("phone"); setMessage(""); }}
              >
                <Phone className="h-4 w-4 mr-1.5" />
                Phone
              </Button>
            </div>

            <form onSubmit={handleSignIn} className="flex flex-col gap-4">
              {signInMethod === "email" ? (
                <>
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
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="signin-phone" className="text-midnight font-semibold text-sm">Phone Number</Label>
                    <Input
                      id="signin-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="04xx xxx xxx"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Australian mobile (04xx) or +61 format</p>
                  </div>
                  {signInPhoneOtpSent && (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="signin-otp" className="text-midnight font-semibold text-sm">Verification Code</Label>
                      <Input
                        id="signin-otp"
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Enter 6-digit code"
                        className="text-center tracking-widest"
                        maxLength={6}
                        required
                      />
                    </div>
                  )}
                </>
              )}
              <Button type="submit" className="w-full mt-2" size="lg" disabled={loading}>
                {loading ? "Signing in..." : signInMethod === "phone" && !signInPhoneOtpSent ? "Send Code" : "Sign In"}
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
            {/* Method toggle */}
            <div className="flex gap-2 mb-4">
              <Button
                type="button"
                variant={signUpMethod === "email" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => { setSignUpMethod("email"); setPhoneOtpSent(false); setMessage(""); }}
              >
                <Mail className="h-4 w-4 mr-1.5" />
                Email
              </Button>
              <Button
                type="button"
                variant={signUpMethod === "phone" ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => { setSignUpMethod("phone"); setMessage(""); }}
              >
                <Phone className="h-4 w-4 mr-1.5" />
                Phone
              </Button>
            </div>

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

              {signUpMethod === "email" ? (
                <>
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
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="signup-phone" className="text-midnight font-semibold text-sm">Phone Number</Label>
                    <Input
                      id="signup-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="04xx xxx xxx"
                      required
                    />
                    <p className="text-xs text-muted-foreground">Australian mobile (04xx) or +61 format</p>
                  </div>
                  {phoneOtpSent && (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="signup-otp" className="text-midnight font-semibold text-sm">Verification Code</Label>
                      <Input
                        id="signup-otp"
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="Enter 6-digit code"
                        className="text-center tracking-widest"
                        maxLength={6}
                        required
                      />
                    </div>
                  )}
                </>
              )}
              <Button type="submit" className="w-full mt-2" size="lg" disabled={loading}>
                {loading ? "Signing up..." : signUpMethod === "phone" && !phoneOtpSent ? "Send Code" : "Sign Up"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        {message && (
          <div className={cn(
            "mt-6 p-4 rounded-xl text-center text-sm font-semibold border",
            message.includes("error") || message.includes("Error") || message.includes("already exists") || message.includes("Invalid")
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
