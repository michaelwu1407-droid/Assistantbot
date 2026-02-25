"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Phone, CheckCircle, AlertCircle, RefreshCw, Headphones } from "lucide-react";
import { sendPhoneVerificationCode, updatePhoneNumber, getPhoneNumberStatus } from "@/actions/phone-settings";
import { AIReceptionistSettings } from "@/components/settings/ai-receptionist-settings";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const phoneSchema = z.object({
  newPhoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format"),
});

const verificationSchema = z.object({
  verificationCode: z.string().length(6, "Code must be exactly 6 digits"),
});

export default function PhoneSettingsPage() {
  const [phoneStatus, setPhoneStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingCode, setSendingCode] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const phoneForm = useForm({
    resolver: zodResolver(phoneSchema),
    defaultValues: {
      newPhoneNumber: "",
    },
  });

  const verificationForm = useForm({
    resolver: zodResolver(verificationSchema),
    defaultValues: {
      verificationCode: "",
    },
  });

  // Load current status
  useState(() => {
    async function loadStatus() {
      try {
        const status = await getPhoneNumberStatus();
        setPhoneStatus(status);
      } catch (err) {
        setError("Failed to load phone settings");
      } finally {
        setLoading(false);
      }
    }
    loadStatus();
  });

  const handleSendVerification = async (data: any) => {
    setSendingCode(true);
    setError("");
    setSuccess("");

    try {
      const result = await sendPhoneVerificationCode({ newPhoneNumber: data.newPhoneNumber });
      
      if (result.skipVerification) {
        // First-time setup - proceed directly to phone number setup
        setSuccess("First-time setup detected. Setting up your phone number...");
        
        // Call the setup API directly
        const setupResponse = await fetch("/api/workspace/setup-comms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessName: phoneStatus?.name || "Your Business",
            ownerPhone: data.newPhoneNumber,
          }),
        });
        
        const setupResult = await setupResponse.json();
        
        if (setupResult.success) {
          setSuccess(`Phone number setup complete! Your new number is ${setupResult.result.phoneNumber}`);
          // Reload status
          const status = await getPhoneNumberStatus();
          setPhoneStatus(status);
        } else {
          setError(`Setup failed: ${setupResult.error}`);
        }
      } else {
        setVerificationSent(true);
        setSuccess(`Verification code sent to ${data.newPhoneNumber}`);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send verification code");
    } finally {
      setSendingCode(false);
    }
  };

  const handleUpdatePhone = async (data: any) => {
    setUpdating(true);
    setError("");
    setSuccess("");

    try {
      const result = await updatePhoneNumber({
        newPhoneNumber: phoneForm.getValues("newPhoneNumber"),
        verificationCode: data.verificationCode,
      });

      setSuccess(`Phone number updated to ${result.phoneNumber}`);
      setVerificationSent(false);
      phoneForm.reset();
      verificationForm.reset();
      
      // Reload status
      const status = await getPhoneNumberStatus();
      setPhoneStatus(status);
    } catch (err: any) {
      setError(err.message || "Failed to update phone number");
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Phone Settings</h2>
        <p className="text-muted-foreground">
          Manage your business phone number for SMS and voice calls
        </p>
      </div>

      {/* Current Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Current Phone Number
          </CardTitle>
        </CardHeader>
        <CardContent>
          {phoneStatus?.hasPhoneNumber ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Active
                </Badge>
                <span className="font-medium">{phoneStatus.phoneNumber}</span>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  {phoneStatus.hasSubaccount ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>Twilio Account</span>
                </div>
                <div className="flex items-center gap-2">
                  {phoneStatus.hasVoiceAgent ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>Voice Agent</span>
                </div>
                <div className="flex items-center gap-2">
                  {phoneStatus.setupComplete ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span>Setup Complete</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No phone number configured</p>
              <p className="text-sm text-muted-foreground">
                Set up a phone number to enable SMS and voice features
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Phone Number */}
      <Card>
        <CardHeader>
          <CardTitle>Update Phone Number</CardTitle>
          <CardDescription>
            Change your business phone number. A verification code will be sent to the new number.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {!verificationSent ? (
            <form onSubmit={phoneForm.handleSubmit(handleSendVerification)} className="space-y-4">
              <div>
                <Label htmlFor="newPhoneNumber">New Phone Number</Label>
                <Input
                  id="newPhoneNumber"
                  type="tel"
                  placeholder="+61412345678"
                  {...phoneForm.register("newPhoneNumber")}
                />
                {phoneForm.formState.errors.newPhoneNumber && (
                  <p className="text-sm text-red-500 mt-1">
                    {phoneForm.formState.errors.newPhoneNumber.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={sendingCode}>
                {sendingCode ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Send Verification Code
                  </>
                )}
              </Button>
            </form>
          ) : (
            <form onSubmit={verificationForm.handleSubmit(handleUpdatePhone)} className="space-y-4">
              <div>
                <Label htmlFor="verificationCode">Verification Code</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  placeholder="123456"
                  maxLength={6}
                  {...verificationForm.register("verificationCode")}
                />
                {verificationForm.formState.errors.verificationCode && (
                  <p className="text-sm text-red-500 mt-1">
                    {verificationForm.formState.errors.verificationCode.message}
                  </p>
                )}
                <p className="text-sm text-muted-foreground mt-1">
                  Enter the 6-digit code sent to {phoneForm.getValues("newPhoneNumber")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={updating}>
                  {updating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Updating...
                    </>
                  ) : (
                    "Update Phone Number"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setVerificationSent(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <AIReceptionistSettings />
    </div>
  );
}
