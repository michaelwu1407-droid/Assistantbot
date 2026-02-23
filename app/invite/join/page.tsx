"use client";

export const dynamic = "force-dynamic";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Users, Shield } from "lucide-react";
import { validateInviteToken, acceptInvite } from "@/actions/invite-actions";
import { toast } from "sonner";

function JoinByInviteContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [inviteInfo, setInviteInfo] = useState<{
    valid: boolean;
    workspaceName?: string;
    role?: string;
  } | null>(null);

  // Sign-up form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const supabase = createClient();

  useEffect(() => {
    if (!token) {
      setError("No invite token provided.");
      setLoading(false);
      return;
    }
    validateInviteToken(token).then((result) => {
      if (!result.valid) {
        setError(result.error || "Invalid invite");
      } else {
        setInviteInfo(result);
      }
      setLoading(false);
    });
  }, [token]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setMessage("");

    // Sign up with Supabase
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/dashboard`,
        data: {
          confirmed_at: new Date().toISOString(),
          name: name || email.split("@")[0],
        },
      },
    });

    if (signUpError) {
      setMessage(signUpError.message);
      setSubmitting(false);
      return;
    }

    // Auto sign-in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setMessage("Account created! Please sign in manually.");
      setSubmitting(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Failed to get user after sign-up");
      setSubmitting(false);
      return;
    }

    // Accept the invite — this links the user to the workspace with the correct role
    const result = await acceptInvite(token, user.id);
    if (!result.success) {
      setMessage(result.error || "Failed to accept invite");
      setSubmitting(false);
      return;
    }

    toast.success("Welcome to the team!");
    router.push("/dashboard");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center space-y-4">
            <div className="h-12 w-12 mx-auto rounded-full bg-red-100 flex items-center justify-center">
              <Shield className="h-6 w-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-midnight">Invalid Invite</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => router.push("/auth")} variant="outline">
              Go to Sign In
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const roleLabel =
    inviteInfo?.role === "MANAGER" ? "Team Manager" : "Team Member";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative">
      <div className="absolute inset-0 ott-glow -z-10" />

      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="h-12 w-12 mx-auto rounded-xl bg-primary flex items-center justify-center shadow-md shadow-primary/20">
            <span className="text-white font-extrabold italic text-lg tracking-tighter">
              Pj
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-midnight tracking-tight">
            Join {inviteInfo?.workspaceName}
          </h1>
          <div className="flex items-center justify-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              You&apos;ve been invited as a <strong>{roleLabel}</strong>
            </span>
          </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-6">
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="join-name" className="text-midnight font-semibold text-sm">
                  Full Name
                </Label>
                <Input
                  id="join-name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="John Smith"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-email" className="text-midnight font-semibold text-sm">
                  Email
                </Label>
                <Input
                  id="join-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="join-password" className="text-midnight font-semibold text-sm">
                  Password
                </Label>
                <Input
                  id="join-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={submitting}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Joining...
                  </>
                ) : (
                  "Create Account & Join Team"
                )}
              </Button>
            </form>

            {message && (
              <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm text-center border border-red-100">
                {message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function JoinByInvitePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <JoinByInviteContent />
    </Suspense>
  );
}
