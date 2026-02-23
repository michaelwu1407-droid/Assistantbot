"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Phone, MessageSquare, CheckCircle } from "lucide-react";

export default function SupportPage() {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    const formData = new FormData(e.currentTarget);
    const subject = formData.get("subject") as string;
    const message = formData.get("message") as string;
    const priority = formData.get("priority") as string;

    try {
      const response = await fetch("/api/support/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject, message, priority }),
      });

      const result = await response.json();

      if (result.success) {
        setSuccess("Support request sent! We'll get back to you within 24 hours.");
        (e.target as HTMLFormElement).reset();
      } else {
        setError(result.error || "Failed to send support request");
      }
    } catch (err) {
      setError("Failed to send support request. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Support</h2>
        <p className="text-muted-foreground">
          Get help with your Pj Buddy account and AI agent setup
        </p>
      </div>

      {/* Contact Options */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              support@pjbuddy.com
            </p>
            <p className="text-sm">
              Response within 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Phone Support
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              1300 PJ BUDDY
            </p>
            <p className="text-sm">
              Mon-Fri 9am-5pm AEST
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              In-app chat
            </p>
            <p className="text-sm">
              24/7 instant help
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Support Request Form */}
      <Card>
        <CardHeader>
          <CardTitle>Send Support Request</CardTitle>
          <CardDescription>
            Describe your issue and we'll help you resolve it
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  name="subject"
                  placeholder="e.g., AI agent number change, billing issue"
                  required
                />
              </div>
              <div>
                <Label htmlFor="priority">Priority</Label>
                <select
                  id="priority"
                  name="priority"
                  className="w-full h-10 px-3 py-2 text-sm border border-input rounded-md bg-background"
                  required
                >
                  <option value="low">Low - General question</option>
                  <option value="medium">Medium - Feature request</option>
                  <option value="high">High - Issue affecting work</option>
                  <option value="urgent">Urgent - System down</option>
                </select>
              </div>
            </div>
            
            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                name="message"
                placeholder="Please describe your issue in detail..."
                rows={6}
                required
              />
            </div>

            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send Support Request"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Common Issues */}
      <Card>
        <CardHeader>
          <CardTitle>Common Issues</CardTitle>
          <CardDescription>
            Quick solutions to frequent problems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium">AI agent number not working?</h4>
              <p className="text-sm text-muted-foreground">
                Check your Phone Settings to see if setup completed. If not, contact support for manual provisioning.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Need to change AI agent number?</h4>
              <p className="text-sm text-muted-foreground">
                For security reasons, AI agent number changes require support assistance. Use the form above.
              </p>
            </div>
            <div>
              <h4 className="font-medium">SMS not sending to customers?</h4>
              <p className="text-sm text-muted-foreground">
                Verify your AI agent number is active and check Twilio configuration in settings.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
