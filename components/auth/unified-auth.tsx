"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MonitoringService } from "@/lib/monitoring";
import { Mail, Phone, Chrome } from "lucide-react";

interface AuthState {
  email: string;
  password: string;
  name: string;
  phone: string;
  otp: string;
  loading: boolean;
  message: string;
  needsConfirmation: boolean;
  user: any;
  method: "google" | "phone" | "email";
  phoneOtpSent: boolean;
  otpResendTimer: number;
}

export function UnifiedAuth() {
  const router = useRouter();
  const supabase = createClient();
  
  const [state, setState] = useState<AuthState>({
    email: "",
    password: "",
    name: "",
    phone: "",
    otp: "",
    loading: false,
    message: "",
    needsConfirmation: false,
    user: null,
    method: "google",
    phoneOtpSent: false,
    otpResendTimer: 0,
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        router.push("/billing");
      }
      setState(prev => ({ ...prev, user }));
    };
    checkUser();
  }, [router, supabase]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state.otpResendTimer > 0) {
      interval = setInterval(() => {
        setState(prev => ({ 
          ...prev, 
          otpResendTimer: prev.otpResendTimer - 1 
        }));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [state.otpResendTimer]);

  // Format Australian phone for Supabase (E.164)
  const formatPhoneE164 = (raw: string): string => {
    const cleaned = raw.replace(/[\s\-\(\)]/g, "");
    if (cleaned.startsWith("+61")) return cleaned;
    if (cleaned.startsWith("0")) return `+61${cleaned.slice(1)}`;
    if (cleaned.startsWith("61")) return `+${cleaned}`;
    return `+61${cleaned}`;
  };

  const updateState = (updates: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const handleGoogleAuth = async () => {
    updateState({ loading: true, message: "" });
    
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    
    if (error) {
      updateState({ 
        loading: false, 
        message: error.message 
      });
    }
  };

  const handlePhoneAuth = async () => {
    updateState({ loading: true, message: "" });

    if (!state.phoneOtpSent) {
      // Send OTP
      const formattedPhone = formatPhoneE164(state.phone);
      const { error } = await supabase.auth.signInWithOtp({
        phone: formattedPhone,
        options: {
          data: {
            name: state.name || state.phone,
          }
        }
      });
      
      if (error) {
        updateState({ loading: false, message: error.message });
      } else {
        updateState({ 
          phoneOtpSent: true, 
          loading: false,
          message: "Verification code sent! Check your phone.",
          otpResendTimer: 60
        });
      }
    } else {
      // Verify OTP
      const formattedPhone = formatPhoneE164(state.phone);
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: state.otp,
        type: "sms",
      });
      
      if (error) {
        updateState({ loading: false, message: error.message });
      } else if (data.user) {
        MonitoringService.identifyUser(data.user.id, { name: state.name });
        MonitoringService.trackEvent("user_signed_in", { provider: "phone" });
        router.push("/billing");
        router.refresh();
      }
    }
  };

  const handleEmailAuth = async () => {
    updateState({ loading: true, message: "", needsConfirmation: false });

    // Try sign in first
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: state.email,
      password: state.password,
    });

    if (!signInError) {
      // Sign in successful
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        MonitoringService.identifyUser(user.id, { email: user.email, name: state.name });
        MonitoringService.trackEvent("user_signed_in", { provider: "email" });
      }
      router.push("/billing");
      router.refresh();
      return;
    }

    // If sign in fails, try sign up
    if (signInError.message.includes("Invalid login credentials")) {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: state.email,
        password: state.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            confirmed_at: new Date().toISOString(),
            name: state.name || state.email.split('@')[0],
          }
        },
      });

      if (signUpError) {
        updateState({ loading: false, message: signUpError.message });
      } else if (data.user && data.user.identities && data.user.identities.length === 0) {
        updateState({ 
          loading: false, 
          message: "Account already exists. Please check your credentials." 
        });
      } else {
        // Sign up successful, try to sign in
        const { error: finalSignInError } = await supabase.auth.signInWithPassword({
          email: state.email,
          password: state.password,
        });
        
        if (finalSignInError) {
          updateState({ 
            loading: false, 
            message: "Account created! Please sign in with your credentials." 
          });
        } else {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            MonitoringService.identifyUser(user.id, { email: user.email, name: state.name });
            MonitoringService.trackEvent("user_signed_up", { provider: "email" });
          }
          router.push("/billing");
          router.refresh();
        }
      }
    } else if (signInError.message.includes("Email not confirmed")) {
      updateState({ 
        loading: false, 
        needsConfirmation: true,
        message: "Email not confirmed. Check your inbox or resend confirmation." 
      });
    } else {
      updateState({ loading: false, message: signInError.message });
    }
  };

  const handleResendConfirmation = async () => {
    updateState({ loading: true, message: "" });
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: state.email,
    });
    if (error) {
      updateState({ loading: false, message: error.message });
    } else {
      updateState({ 
        loading: false, 
        message: "Confirmation email sent! Check your inbox." 
      });
    }
  };

  const handleResendOtp = async () => {
    if (state.otpResendTimer > 0) return;
    
    const formattedPhone = formatPhoneE164(state.phone);
    const { error } = await supabase.auth.signInWithOtp({
      phone: formattedPhone,
    });
    
    if (error) {
      updateState({ message: error.message });
    } else {
      updateState({ 
        message: "Code resent! Check your phone.",
        otpResendTimer: 60
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    switch (state.method) {
      case "google":
        await handleGoogleAuth();
        break;
      case "phone":
        await handlePhoneAuth();
        break;
      case "email":
        await handleEmailAuth();
        break;
    }
  };

  const resetForm = () => {
    updateState({
      phoneOtpSent: false,
      otp: "",
      message: "",
      needsConfirmation: false,
      otpResendTimer: 0
    });
  };

  if (state.user) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 relative">
      {/* Background effects */}
      <div className="absolute inset-0 ott-glow -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] -z-10 rounded-full bg-primary/8 blur-3xl" />

      <div className="w-full max-w-md ott-card bg-card p-8 relative z-10">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
            <span className="text-white font-extrabold italic text-lg tracking-tighter">Em</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-midnight tracking-tight mb-2">Welcome to Earlymark</h1>
          <p className="text-muted-foreground text-sm">
            The AI-powered CRM for Tradies
          </p>
        </div>

        {/* Method Selection */}
        <div className="grid gap-3 mb-6">
          <Button
            type="button"
            variant={state.method === "google" ? "default" : "outline"}
            size="lg"
            className="w-full relative overflow-hidden group"
            onClick={() => { updateState({ method: "google" }); resetForm(); }}
          >
            <Chrome className="h-5 w-5 mr-3" />
            Continue with Google
            {state.method === "google" && (
              <div className="absolute inset-0 bg-primary/20 animate-pulse" />
            )}
          </Button>

          <Button
            type="button"
            variant={state.method === "phone" ? "default" : "outline"}
            size="lg"
            className="w-full"
            onClick={() => { updateState({ method: "phone" }); resetForm(); }}
          >
            <Phone className="h-5 w-5 mr-3" />
            Continue with Phone
          </Button>

          <Button
            type="button"
            variant={state.method === "email" ? "default" : "outline"}
            size="lg"
            className="w-full"
            onClick={() => { updateState({ method: "email" }); resetForm(); }}
          >
            <Mail className="h-5 w-5 mr-3" />
            Continue with Email
          </Button>
        </div>

        {/* Auth Forms */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {state.method === "phone" && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="phone" className="text-midnight font-semibold text-sm">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={state.phone}
                  onChange={(e) => updateState({ phone: e.target.value })}
                  placeholder="04xx xxx xxx"
                  inputMode="tel"
                  required={state.method === "phone"}
                />
                <p className="text-xs text-muted-foreground">Australian mobile (04xx) or +61 format</p>
              </div>

              {state.phoneOtpSent && (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="otp" className="text-midnight font-semibold text-sm">Verification Code</Label>
                    <Input
                      id="otp"
                      type="text"
                      value={state.otp}
                      onChange={(e) => updateState({ otp: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                      placeholder="Enter 6-digit code"
                      className="text-center tracking-widest"
                      maxLength={6}
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full"
                      onClick={handleResendOtp}
                      disabled={state.otpResendTimer > 0}
                    >
                      {state.otpResendTimer > 0 
                        ? `Resend code in ${state.otpResendTimer}s` 
                        : "Resend code"
                      }
                    </Button>
                  </div>
                </>
              )}
            </>
          )}

          {state.method === "email" && (
            <>
              <div className="flex flex-col gap-2">
                <Label htmlFor="email" className="text-midnight font-semibold text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={state.email}
                  onChange={(e) => updateState({ email: e.target.value })}
                  placeholder="you@example.com"
                  required={state.method === "email"}
                />
              </div>
              
              <div className="flex flex-col gap-2">
                <Label htmlFor="password" className="text-midnight font-semibold text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={state.password}
                  onChange={(e) => updateState({ password: e.target.value })}
                  placeholder="Create a password"
                  required={state.method === "email"}
                />
              </div>

              <div className="flex flex-col gap-2">
                <Label htmlFor="name" className="text-midnight font-semibold text-sm">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={state.name}
                  onChange={(e) => updateState({ name: e.target.value })}
                  placeholder="John Smith"
                />
              </div>
            </>
          )}

          <Button 
            type="submit" 
            className="w-full mt-2" 
            size="lg" 
            disabled={state.loading}
          >
            {state.loading ? (
              state.method === "google" ? "Connecting..." : 
              state.method === "phone" && !state.phoneOtpSent ? "Sending Code..." : "Signing in..."
            ) : (
              state.method === "google" ? "Connect with Google" :
              state.method === "phone" && !state.phoneOtpSent ? "Send Code" : "Sign In"
            )}
          </Button>

          {state.needsConfirmation && (
            <Button
              type="button"
              variant="outline"
              className="w-full"
              size="lg"
              onClick={handleResendConfirmation}
              disabled={state.loading}
            >
              Resend Confirmation Email
            </Button>
          )}
        </form>

        {/* Message Display */}
        {state.message && (
          <div className={cn(
            "mt-6 p-4 rounded-xl text-center text-sm font-semibold border",
            state.message.includes("error") || state.message.includes("Error") || state.message.includes("already exists") || state.message.includes("Invalid")
              ? "bg-red-50 text-red-600 border-red-100"
              : "bg-mint-50 text-primary border-primary/20"
          )}>
            {state.message}
          </div>
        )}

        {/* Legal Footer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            By continuing, you agree to our{" "}
            <a href="/terms" className="underline hover:text-primary">Terms</a> and{" "}
            <a href="/privacy" className="underline hover:text-primary">Privacy Policy</a>
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            © 2026 Michael Wu. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
