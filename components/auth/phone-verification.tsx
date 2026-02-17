"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Phone, MessageSquare, CheckCircle } from "lucide-react";

interface PhoneVerificationProps {
  onVerified: (phone: string) => void;
  onCancel: () => void;
}

export function PhoneVerification({ onVerified, onCancel }: PhoneVerificationProps) {
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCodeSent, setIsCodeSent] = useState(false);
  const [error, setError] = useState("");

  // Australian phone number validation
  const validateAustralianPhone = (phone: string) => {
    const cleaned = phone.replace(/\s+/g, "").replace("+61", "0");
    const australianRegex = /^0[45678]\d{8}$/;
    return australianRegex.test(cleaned);
  };

  const formatPhoneNumber = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("61")) {
      return `+61 ${cleaned.slice(2, 5)} ${cleaned.slice(5, 8)} ${cleaned.slice(8)}`;
    } else if (cleaned.startsWith("0")) {
      return `+61 ${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
    }
    return phone;
  };

  const handleSendCode = async () => {
    if (!validateAustralianPhone(phoneNumber)) {
      setError("Please enter a valid Australian mobile number (04xx xxx xxx)");
      return;
    }

    setIsSending(true);
    setError("");

    try {
      // Using MessageBird API for Australian SMS
      const response = await fetch("/api/auth/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: formatPhoneNumber(phoneNumber),
          countryCode: "+61"
        }),
      });

      if (response.ok) {
        setIsCodeSent(true);
      } else {
        throw new Error("Failed to send verification code");
      }
    } catch (err) {
      setError("Failed to send SMS. Please try again or use email authentication.");
    } finally {
      setIsSending(false);
    }
  };

  const handleVerifyCode = async () => {
    setIsVerifying(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phoneNumber: formatPhoneNumber(phoneNumber),
          code: verificationCode
        }),
      });

      if (response.ok) {
        onVerified(formatPhoneNumber(phoneNumber));
      } else {
        throw new Error("Invalid verification code");
      }
    } catch (err) {
      setError("Invalid verification code. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-4 glass-card border-border/50 shadow-xl">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2 text-foreground">
          <Phone className="h-5 w-5 text-primary" />
          Phone Verification
        </CardTitle>
        <CardDescription className="text-muted-foreground">
          Verify your Australian mobile number
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isCodeSent ? (
          <div className="space-y-4">
            <div>
              <Label htmlFor="phone">Australian Mobile Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="04xx xxx xxx"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="mt-1 bg-background/50 border-border/50 focus:bg-background transition-colors"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Format: 04xx xxx xxx or +61 4xx xxx xxx
              </p>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleSendCode}
                disabled={isSending || !phoneNumber}
                className="flex-1 shadow-lg shadow-primary/20"
              >
                {isSending ? (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2 animate-pulse" />
                    Sending...
                  </>
                ) : (
                  <>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Send Code
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={onCancel} className="bg-transparent border-border/50 hover:bg-muted">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
              <CheckCircle className="h-5 w-5 text-emerald-500 mb-2" />
              <p className="text-sm text-emerald-600 dark:text-emerald-400">
                Verification code sent to {formatPhoneNumber(phoneNumber)}
              </p>
            </div>
            <div>
              <Label htmlFor="code">Verification Code</Label>
              <Input
                id="code"
                type="text"
                placeholder="Enter 6-digit code"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="mt-1 text-center text-lg tracking-widest bg-background/50 border-border/50 focus:bg-background transition-colors"
                maxLength={6}
              />
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="flex gap-2">
              <Button
                onClick={handleVerifyCode}
                disabled={isVerifying || verificationCode.length !== 6}
                className="flex-1 shadow-lg shadow-primary/20"
              >
                {isVerifying ? "Verifying..." : "Verify"}
              </Button>
              <Button variant="outline" onClick={() => setIsCodeSent(false)} className="bg-transparent border-border/50 hover:bg-muted">
                Back
              </Button>
            </div>
            <Button
              variant="ghost"
              onClick={handleSendCode}
              disabled={isSending}
              className="w-full text-sm text-muted-foreground hover:text-foreground"
            >
              Resend code
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
