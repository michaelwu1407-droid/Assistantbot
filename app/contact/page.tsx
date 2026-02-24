"use client"

import { useState } from "react"
import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Send, CheckCircle } from "lucide-react"

const DEPARTMENTS = [
  { value: "sales", label: "Sales", description: "Pricing, demos, enterprise" },
  { value: "support", label: "Support", description: "Technical help, account issues" },
  { value: "partnerships", label: "Partnerships", description: "Integrations, resellers" },
  { value: "general", label: "General", description: "Other enquiries" },
] as const

export default function ContactPage() {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [department, setDepartment] = useState("sales")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const form = e.currentTarget
    const formData = new FormData(form)
    const body = {
      department: department || formData.get("department"),
      name: formData.get("name"),
      email: formData.get("email"),
      phone: formData.get("phone") || undefined,
      subject: formData.get("subject"),
      message: formData.get("message"),
    }

    if (!department) {
      setStatus("error")
      setErrorMessage("Please select a department.")
      return
    }
    setStatus("sending")
    setErrorMessage("")

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setStatus("error")
        setErrorMessage(data.error || "Something went wrong. Please try again.")
        return
      }
      setStatus("success")
      form.reset()
      setDepartment("sales")
    } catch {
      setStatus("error")
      setErrorMessage("Network error. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-28 pb-20 px-6">
        <div className="container mx-auto max-w-xl">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-midnight">
              Contact us
            </h1>
            <p className="text-slate-body mt-2">
              Get in touch with the right team at Earlymark. Fill in the form below and we’ll respond as soon as we can.
            </p>
          </div>

          {status === "success" ? (
            <Card className="ott-card-elevated border-primary/20">
              <CardContent className="pt-6">
                <div className="flex flex-col items-center gap-4 text-center">
                  <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                    <CheckCircle className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="font-semibold text-midnight">Message sent</h2>
                    <p className="text-sm text-slate-body mt-1">
                      Thanks for reaching out. We’ll get back to you within 24 hours.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => { setStatus("idle"); setDepartment("sales"); }}>
                    Send another message
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="ott-card-elevated">
              <CardHeader>
                <CardTitle className="text-midnight">Contact form</CardTitle>
                <CardDescription className="text-slate-body">
                  Choose the department that best fits your enquiry, then fill in your details.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                  <div className="space-y-2">
                    <Label htmlFor="department">Department</Label>
                    <Select value={department} onValueChange={setDepartment}>
                      <SelectTrigger id="department">
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                      <SelectContent>
                        {DEPARTMENTS.map((d) => (
                          <SelectItem key={d.value} value={d.value}>
                            <span className="font-medium">{d.label}</span>
                            <span className="text-muted-foreground ml-2 text-xs">— {d.description}</span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <input type="hidden" name="department" value={department} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" placeholder="Your name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" name="email" type="email" placeholder="you@example.com" required />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input id="phone" name="phone" type="tel" placeholder="+61 400 000 000" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" name="subject" placeholder="Brief summary of your enquiry" required />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us how we can help..."
                      rows={5}
                      className="rounded-xl border-border bg-[#F8FAFC] resize-none"
                      required
                    />
                  </div>

                  {status === "error" && (
                    <p className="text-sm text-destructive">{errorMessage}</p>
                  )}

                  <Button type="submit" size="lg" disabled={status === "sending"} className="w-full sm:w-auto">
                    {status === "sending" ? (
                      "Sending..."
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

        </div>
      </main>
    </div>
  )
}
