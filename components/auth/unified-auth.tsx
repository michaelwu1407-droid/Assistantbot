"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MonitoringService } from "@/lib/monitoring";
import { logger } from "@/lib/logging";
import { checkUserRoute } from "@/actions/workspace-actions";
import { Mail, Phone, Chrome } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface AuthState {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phone: string;
  otp: string;
  loading: boolean;
  message: string;
  needsConfirmation: boolean;
  user: User | null;
  method: "google" | "phone" | "email";
  phoneOtpSent: boolean;
  otpResendTimer: number;
  emailStep: "email" | "password";
  emailIntent: "signin" | "signup";
}

const supabase = getSupabaseClient();

export function UnifiedAuth({ connectionError = false }: { connectionError?: boolean }) {
  const router = useRouter();

  const [state, setState] = useState<AuthState>({
    email: "",
    password: "",
    confirmPassword: "",
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
    emailStep: "email",
    emailIntent: "signin",
  });

  const finalizeSignedInUser = async (
    user: User,
    provider: "email" | "phone" | "google",
    traits?: { email?: string; name?: string }
  ) => {
    MonitoringService.identifyUser(user.id, {
      email: traits?.email ?? user.email,
      name: traits?.name ?? user.user_metadata?.name,
    });
    MonitoringService.trackEvent("user_signed_in", { provider });

    const route = await checkUserRoute(user.id);
    router.push(route);
  };

  useEffect(() => {
    const checkUser = async () => {
      logger.authFlow("Checking for existing user session", { action: "check_existing_user" });

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user ?? null;

      if (user) {
        logger.authFlow("Found existing user session, determining route", {
          userId: user.id,
          email: user.email,
          action: "check_user_route"
        });
        const route = await checkUserRoute(user.id);
        router.push(route);
      } else {
        logger.authFlow("No existing user session found", { action: "show_auth_form" });
      }

      setState(prev => ({ ...prev, user }));
    };
    void checkUser();
  }, [router]);

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

  const handleGoogleAuth = () => {
    // Use our own OAuth flow so Google shows "Earlymark.ai" instead of the Supabase URL
    updateState({ loading: true, message: "" });
    window.location.href = "/api/auth/google-signin";
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
      logger.authFlow("Starting OTP verification", {
        phone: state.phone,
        hasOtp: !!state.otp,
        otpLength: state.otp.length
      });

      const formattedPhone = formatPhoneE164(state.phone);
      const { data, error } = await supabase.auth.verifyOtp({
        phone: formattedPhone,
        token: state.otp,
        type: "sms",
      });

      if (error) {
        logger.authError("OTP verification failed", {
          phone: formattedPhone,
          error: error.message,
          details: error
        }, error);
        updateState({ loading: false, message: error.message });
      } else if (data.user) {
        logger.authFlow("OTP verification successful", {
          userId: data.user.id,
          phone: formattedPhone,
          session: !!data.session
        });

        let sessionVerified = Boolean(data.session);
        if (!sessionVerified) {
          for (const delayMs of [200, 500]) {
            await new Promise(resolve => setTimeout(resolve, delayMs));
            const {
              data: { session },
            } = await supabase.auth.getSession();

            if (session?.user) {
              sessionVerified = true;
              break;
            }
          }
        }

        if (!sessionVerified) {
          logger.authError("Session verification failed after all attempts", {
            userId: data.user.id,
          }, new Error("Session verification failed"));
          updateState({ loading: false, message: "Authentication successful but session failed to establish. Please try again." });
        } else {
          logger.authFlow("Redirecting based on route check", { userId: data.user.id });
          await finalizeSignedInUser(data.user, "phone", { name: state.name });
        }
      } else {
        logger.authError("OTP verification returned no user", {
          phone: formattedPhone,
          data: data
        });
        updateState({ loading: false, message: "Verification failed. No user data returned." });
      }
    }
  };

  const handleEmailContinue = async () => {
    const email = state.email.trim().toLowerCase();
    if (!email) {
      updateState({ message: "Please enter an email address." });
      return;
    }

    updateState({
      email: email,
      emailStep: "password",
      emailIntent: "signin",
      password: "",
      confirmPassword: "",
      message: "",
    });
  };

  const handleEmailAuth = async () => {
    updateState({ loading: true, message: "", needsConfirmation: false });

    const email = state.email.trim().toLowerCase();
    const password = state.password;

    if (state.emailIntent === "signin") {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!signInError) {
        const user = data.user;
        if (user) {
          await finalizeSignedInUser(user, "email", {
            email: user.email,
            name: user.user_metadata?.name,
          });
        } else {
          router.push("/crm/dashboard");
        }
        return;
      }

      if (signInError.message.includes("Invalid login credentials")) {
        updateState({
          loading: false,
          message: "Invalid email or password. Please try again."
        });
      } else if (signInError.message.includes("Email not confirmed")) {
        updateState({
          loading: false,
          needsConfirmation: true,
          message: "Email not confirmed. Check your inbox or resend confirmation."
        });
      } else {
        updateState({ loading: false, message: signInError.message });
      }
      return;
    }

    if (password.length < 6) {
      updateState({ loading: false, message: "Password must be at least 6 characters." });
      return;
    }

    if (password !== state.confirmPassword) {
      updateState({ loading: false, message: "Passwords do not match." });
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          name: email.split("@")[0],
        },
      },
    });

    if (signUpError) {
      updateState({ loading: false, message: signUpError.message });
      return;
    }

    // Existing account fallback when detector missed auth-only users
    if (data.user && data.user.identities && data.user.identities.length === 0) {
      updateState({
        loading: false,
        message: "Unable to create account with that email. Try signing in instead."
      });
      return;
    }

    updateState({
      loading: false,
      needsConfirmation: true,
      message: "Account created. Check your email to verify. You will be signed in automatically after confirmation.",
    });
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
        if (state.emailStep === "email") {
          await handleEmailContinue();
        } else {
          await handleEmailAuth();
        }
        break;
    }
  };

  const resetForm = () => {
    updateState({
      phoneOtpSent: false,
      otp: "",
      message: "",
      needsConfirmation: false,
      otpResendTimer: 0,
      emailStep: "email",
      emailIntent: "signin",
      password: "",
      confirmPassword: "",
    });
  };

  if (state.user) return null;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background p-4 relative">
      {/* Background effects */}
      <div className="absolute inset-0 ott-glow -z-10" />
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] -z-10 rounded-full bg-primary/8 blur-3xl" />

      <div className="w-full max-w-md ott-card bg-card p-8 relative z-10">
        {/* Back to website home page */}
        <Link
          href="/"
          className="absolute top-5 left-5 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/70 text-muted-foreground/80 shadow-sm backdrop-blur-sm transition-all duration-200 hover:border-border hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20"
          aria-label="Back to website"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <path
              d="M9.5 3.5L5 8L9.5 12.5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>

        {connectionError && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 p-3 text-sm text-amber-800 dark:text-amber-200">
            <p className="font-medium">We couldn’t reach the login service.</p>
            <p className="mt-1 text-xs opacity-90">
              If you use Supabase’s free tier, your project may be paused. Open the{" "}
              <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Supabase dashboard</a>
              , select your project, and click <strong>Restore project</strong>. Then try again.
            </p>
          </div>
        )}
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Image
            src="/latest-logo.png"
            alt="Earlymark"
            width={48}
            height={48}
            className="h-12 w-12 object-contain"
            unoptimized
          />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-extrabold text-midnight tracking-tight mb-2">Welcome to Earlymark</h1>
          <p className="text-muted-foreground text-sm">
            The AI assistant & CRM for you
          </p>
        </div>

        {/* Method Selection */}
        <div className="grid gap-3 mb-6">
          <Button
            type="button"
            variant={state.method === "google" ? "default" : "outline"}
            size="lg"
            className="w-full relative overflow-hidden group"
            onClick={async () => {
              updateState({ method: "google" });
              resetForm();
              await handleGoogleAuth();
            }}
            disabled={state.loading}
          >
            <Chrome className="h-5 w-5 mr-3" />
            {state.loading && state.method === "google" ? "Connecting..." : "Continue with Google"}
            {state.method === "google" && (
              <div className="absolute inset-0 bg-primary/20 animate-pulse pointer-events-none" />
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
                  disabled={state.emailStep === "password"}
                />
              </div>

              {state.emailStep === "password" && (
                <>
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="password" className="text-midnight font-semibold text-sm">
                      {state.emailIntent === "signin" ? "Password" : "Set Password"}
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      value={state.password}
                      onChange={(e) => updateState({ password: e.target.value })}
                      placeholder={state.emailIntent === "signin" ? "Enter your password" : "Create a password"}
                      required={state.method === "email" && state.emailStep === "password"}
                    />
                  </div>

                  {state.emailIntent === "signup" && (
                    <div className="flex flex-col gap-2">
                      <Label htmlFor="confirmPassword" className="text-midnight font-semibold text-sm">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={state.confirmPassword}
                        onChange={(e) => updateState({ confirmPassword: e.target.value })}
                        placeholder="Retype password"
                        required={state.method === "email" && state.emailStep === "password" && state.emailIntent === "signup"}
                      />
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      updateState({
                        emailIntent: state.emailIntent === "signin" ? "signup" : "signin",
                        password: "",
                        confirmPassword: "",
                        message: "",
                      })
                    }
                  >
                    {state.emailIntent === "signin" ? "New here? Create account" : "Already have an account? Sign in"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full"
                    onClick={() => updateState({
                      emailStep: "email",
                      emailIntent: "signin",
                      password: "",
                      confirmPassword: "",
                      message: "",
                    })}
                  >
                    Use different email
                  </Button>
                </>
              )}
            </>
          )}

          {/* Only show submit button for phone and email methods */}
          {state.method !== "google" && (
            <Button
              type="submit"
              className="w-full mt-2"
              size="lg"
              disabled={state.loading}
            >
              {state.loading ? (
                state.method === "phone" && !state.phoneOtpSent
                  ? "Sending Code..."
                  : state.method === "email" && state.emailStep === "email"
                    ? "Checking..."
                    : state.method === "email" && state.emailIntent === "signup"
                      ? "Creating account..."
                      : "Signing in..."
              ) : (
                state.method === "phone" && !state.phoneOtpSent
                  ? "Send Code"
                  : state.method === "email" && state.emailStep === "email"
                    ? "Continue"
                    : state.method === "email" && state.emailIntent === "signup"
                      ? "Create Account"
                      : "Sign In"
              )}
            </Button>
          )}

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
            © 2026 Earlymark AI. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
