"use client"

import { useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { Footer } from "@/components/layout/footer"
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
import {
  ArrowRight,
  Send,
  CheckCircle,
  Phone,
  MessageSquare,
  FileText,
  Calendar,
  MapPin,
  BarChart3,
  Users,
  ShieldCheck,
  ChevronDown,
  Check,
  X,
  AlertTriangle,
} from "lucide-react"

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1]

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, delay, ease: EASE },
})

const FEATURES = [
  { icon: Phone, title: "AI Receptionist", description: "Answers calls 24/7. Books jobs on the spot." },
  { icon: MessageSquare, title: "SMS & Email", description: "Replies, confirms, and follows up automatically." },
  { icon: FileText, title: "Invoicing", description: "Generate invoices and sync to Xero instantly." },
  { icon: Calendar, title: "Smart Scheduling", description: "Books jobs and clusters nearby work on the same day." },
  { icon: MapPin, title: "Job Map", description: "See all your jobs on a live map at a glance." },
  { icon: BarChart3, title: "Analytics", description: "Revenue and pipeline at a glance." },
  { icon: Users, title: "Team Management", description: "Assign jobs and set permissions." },
  { icon: ShieldCheck, title: "Full Control", description: "Custom rules and oversight." },
] as const

const STATS = [
  { value: "62%", label: "of missed calls never call back" },
  { value: "2+ hrs", label: "of admin saved per day" },
  { value: "3–5 jobs", label: "recovered per month on average" },
] as const

const FAQ_ITEMS = [
  {
    q: "How do I know this AI assistant is any good?",
    a: "Interview Tracey yourself for free on our homepage. If she's not up to scratch, you'll know before you spend a cent.",
  },
  {
    q: "Are there any hidden fees?",
    a: "No hidden fees. Your A$30/month subscription covers the full platform — CRM, scheduling, AI, and your dedicated AU mobile number. Calls and texts are 10¢ per call minute or text, so you only pay for what you actually use.",
  },
  {
    q: "Can I switch between monthly and yearly?",
    a: "Yes. Switch your billing period anytime from your account settings.",
  },
  {
    q: "Do you offer discounts for multiple businesses?",
    a: "Get in touch — we're happy to discuss volume pricing.",
  },
  {
    q: "What happens if I cancel?",
    a: "Cancel anytime from your dashboard. Your data stays available for 30 days. No exit fees.",
  },
  {
    q: "Is my payment secure?",
    a: "Yes. All payments are securely handled by Stripe. We never see your card details.",
  },
] as const

const DEPARTMENTS = [
  { value: "sales", label: "Sales", description: "Pricing, demos, enterprise" },
  { value: "support", label: "Support", description: "Technical help, account issues" },
  { value: "partnerships", label: "Partnerships", description: "Integrations, resellers" },
  { value: "general", label: "General", description: "Other enquiries" },
] as const

function FaqSection() {
  const [openIndices, setOpenIndices] = useState<number[]>([])

  const toggle = (idx: number) => {
    setOpenIndices((prev) => (prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]))
  }

  return (
    <div className="space-y-3 max-w-3xl mx-auto">
      {FAQ_ITEMS.map((item, idx) => {
        const isOpen = openIndices.includes(idx)
        return (
          <div key={idx} className="border border-border rounded-[18px] overflow-hidden bg-white">
            <button
              onClick={() => toggle(idx)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-slate-50 transition-colors"
            >
              <span className="font-semibold text-midnight text-sm pr-4">{item.q}</span>
              <ChevronDown
                className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-200 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            <div className={`transition-all duration-200 overflow-hidden ${isOpen ? "max-h-60" : "max-h-0"}`}>
              <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{item.a}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default function PricingPage() {
  const [billingPeriod, setBillingPeriod] = useState<"monthly" | "yearly">("yearly")
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [errorMessage, setErrorMessage] = useState("")
  const [department, setDepartment] = useState("sales")
  const [callPlaced, setCallPlaced] = useState(false)

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
    setCallPlaced(false)

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
      setCallPlaced(Boolean(data?.callPlaced))
      setStatus("success")
      form.reset()
      setDepartment("sales")
    } catch {
      setStatus("error")
      setErrorMessage("Network error. Please try again.")
    }
  }

  return (
    <div className="min-h-screen bg-background text-slate-900">
      <Navbar />

      <main>
        {/* ── 1. Hero / Pricing Header ── */}
        <section className="pt-24 sm:pt-32 pb-10 md:pb-16 px-6 relative overflow-hidden isolate bg-[linear-gradient(180deg,#F5F7F8_0%,#F4F7F5_60%,#F7F6F3_100%)]">
          <div
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(110% 60% at 50% 0%,rgba(16,185,129,0.18) 0%,rgba(16,185,129,0.00) 72%)",
            }}
          />
          <div className="relative z-10 mx-auto max-w-3xl text-center flex flex-col items-center gap-6">
            <motion.p {...fadeUp()} className="text-[11px] font-semibold uppercase tracking-[0.28em] text-primary">
              Pricing
            </motion.p>
            <motion.h1
              {...fadeUp(0.04)}
              className="text-4xl md:text-6xl font-extrabold tracking-[-0.04em] leading-[1.07] text-midnight text-balance"
            >
              One plan. Everything included.
            </motion.h1>
            <motion.p {...fadeUp(0.08)} className="text-lg leading-8 text-slate-600 max-w-xl text-balance">
              A$30/month platform. 10¢ per call minute or text. That&apos;s it.
            </motion.p>
          </div>
        </section>

        {/* ── 2. Pricing Section ── */}
        <section className="py-12 px-6">
          <div className="max-w-5xl mx-auto">
            {/* Toggle */}
            <motion.div {...fadeUp(0.12)} className="flex justify-center mb-12">
              <div className="flex items-center gap-2 p-1.5 bg-slate-100 rounded-[18px]">
                <button
                  type="button"
                  onClick={() => setBillingPeriod("monthly")}
                  className={`py-2.5 px-6 rounded-[18px] text-sm font-semibold transition-all shadow-sm ${
                    billingPeriod === "monthly"
                      ? "bg-white text-midnight"
                      : "text-slate-500 hover:text-midnight shadow-none bg-transparent"
                  }`}
                >
                  Monthly
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setBillingPeriod("yearly")}
                    className={`py-2.5 px-6 rounded-[18px] text-sm font-semibold transition-all shadow-sm ${
                      billingPeriod === "yearly"
                        ? "bg-white text-midnight"
                        : "text-slate-500 hover:text-midnight shadow-none bg-transparent"
                    }`}
                  >
                    Yearly
                  </button>
                  <span className="absolute -top-3 -right-3 bg-emerald-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    Save 20%
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Comparison Grid */}
            <motion.div {...fadeUp(0.16)} className="grid md:grid-cols-2 gap-6 items-end">
              {/* Left Column: Job Management Software */}
              <div className="rounded-[18px] border border-slate-200 bg-slate-50 p-8 opacity-80 flex flex-col items-center text-center">
                <h3 className="text-xl font-bold text-slate-500 mb-1">Job Management Software</h3>
                <div className="text-xs text-slate-400 mb-3">ServiceM8 / Tradify / Jobber</div>
                <div className="text-4xl font-extrabold text-slate-400 mb-1">$39–69</div>
                <div className="text-sm font-semibold text-slate-400 mb-2">/month</div>
                <div className="text-xs text-slate-500 mb-8 max-w-[220px]">Plus you still answer every call yourself</div>

                <ul className="text-left w-full space-y-4 mb-10">
                  <li className="flex items-start gap-3 text-sm text-slate-500">
                    <X className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    No AI receptionist — you answer every call
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-500">
                    <X className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    No after-hours call handling
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-500">
                    <X className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    No automated SMS follow-ups
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-500">
                    <X className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    No voice agent that knows your business
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-500">
                    <X className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    CRM only — no lead capture from calls
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-500">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    Still need a separate phone system
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-500">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    Manual data entry for every job
                  </li>
                </ul>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full text-slate-400 border-slate-200 cursor-not-allowed hover:bg-transparent hover:text-slate-400 pointer-events-none"
                >
                  Just a job tracker
                </Button>
              </div>

              {/* Right Column: Earlymark Pro */}
              <div className="rounded-[18px] border-2 border-primary bg-white shadow-2xl shadow-primary/10 p-8 relative flex flex-col items-center text-center -mt-6">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Recommended
                  </span>
                </div>
                <h3 className="text-xl font-bold text-midnight mb-2">Earlymark Pro</h3>
                <div className="text-5xl font-extrabold text-midnight mb-1">
                  {billingPeriod === "monthly" ? "A$30" : "A$24"}
                </div>
                <div className="text-sm font-semibold text-slate-500 mb-1">
                  {billingPeriod === "monthly" ? "/month" : "/month, billed annually at A$288"}
                </div>
                <div className="text-sm font-semibold text-primary mb-2">
                  + 10¢ per call minute or text
                </div>
                <div className="text-xs text-slate-500 mb-8 max-w-[240px]">
                  {billingPeriod === "monthly"
                    ? "Cancel anytime. No lock-in contracts."
                    : "Save 20% on the base fee. Promo codes accepted at checkout."}
                </div>

                <ul className="text-left w-full space-y-4 mb-10">
                  <li className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    Available 24/7/365
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    Answers instantly as your business
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    Automated quote follow-up sequences
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    No hold times. No sick leaves.
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    Learns once. Remembers forever.
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    Captures all after-hours leads
                  </li>
                  <li className="flex items-start gap-3 text-sm text-slate-700 font-medium">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    Updates CRM in real-time
                  </li>
                </ul>

                <Link href="/auth" className="w-full">
                  <Button
                    size="lg"
                    variant="mint"
                    className="w-full h-14 text-[15px] shadow-xl shadow-primary/20"
                  >
                    Get started <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </div>
        </section>

        {/* ── 3. ROI Justification ── */}
        <section className="py-10 md:py-20 px-6 bg-white border-t border-slate-200/60">
          <div className="max-w-4xl mx-auto">
            <motion.div {...fadeUp()} className="text-center mb-14">
              <h2 className="text-3xl font-extrabold text-midnight">Pays for itself by saving 1 missed job</h2>
              <p className="mt-3 text-slate-600 max-w-2xl mx-auto">
                Stop losing money on missed calls, forgotten follow-ups, and wasted admin hours.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {STATS.map((stat, i) => (
                <motion.div
                  key={i}
                  {...fadeUp(0.1 + i * 0.1)}
                  className="bg-slate-50/50 rounded-[18px] p-8 border border-slate-200 shadow-sm text-center flex flex-col items-center justify-center"
                >
                  <div className="text-4xl font-extrabold text-primary mb-3">{stat.value}</div>
                  <div className="text-sm font-semibold text-slate-600">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. Feature Grid ── */}
        <section className="py-10 md:py-20 px-6 bg-[#F8FAFC] border-t border-slate-200/60">
          <div className="max-w-5xl mx-auto">
            <motion.div {...fadeUp()} className="text-center mb-14">
              <h2 className="text-3xl font-extrabold text-midnight">Everything you need is included</h2>
              <p className="mt-3 text-slate-600">No add-ons, no hidden modules. You get the full platform from day one.</p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map((f, i) => {
                const Icon = f.icon
                return (
                  <motion.div
                    key={f.title}
                    {...fadeUp(0.1 + i * 0.05)}
                    className="bg-white border border-slate-100 p-5 rounded-[18px] flex flex-col items-start gap-4 hover:shadow-md transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-[18px] bg-emerald-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-midnight text-sm mb-1">{f.title}</h4>
                      <p className="text-xs text-slate-600 leading-relaxed">{f.description}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── 5. FAQ ── */}
        <section className="py-10 md:py-20 px-6 bg-white border-t border-slate-200/60">
          <div className="max-w-3xl mx-auto">
            <motion.div {...fadeUp()} className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-midnight">Pricing questions</h2>
            </motion.div>

            <motion.div {...fadeUp(0.1)}>
              <FaqSection />
            </motion.div>
          </div>
        </section>

        {/* ── 6. Contact Form ── */}
        <section id="contact-form" className="py-10 md:py-20 px-6 bg-[#F8FAFC] border-t border-slate-200/60 scroll-mt-20">
          <div className="container mx-auto max-w-xl">
            <motion.div {...fadeUp()} className="text-center mb-10">
              <h2 className="text-3xl font-extrabold text-midnight">Still have questions?</h2>
              <p className="text-slate-600 mt-2">Get in touch with the team.</p>
            </motion.div>

            <motion.div {...fadeUp(0.1)}>
              {status === "success" ? (
                <Card className="ott-card-elevated border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="h-12 w-12 rounded-full bg-primary/20 flex items-center justify-center">
                        <CheckCircle className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-midnight">
                          {callPlaced ? "Tracey is calling you now" : "Message sent"}
                        </h2>
                        {callPlaced && (
                          <p className="text-sm text-slate-600 mt-1">
                            Pick up - Tracey will be on the line in a few seconds.
                          </p>
                        )}
                        <p className="text-sm text-slate-600 mt-1" hidden={callPlaced}>
                          Thanks for reaching out. We’ll get back to you within 24 hours.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setStatus("idle")
                          setDepartment("sales")
                          setCallPlaced(false)
                        }}
                      >
                        Send another message
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card className="rounded-[18px] border border-border shadow-sm bg-white">
                  <CardHeader className="px-8 pt-8 pb-0">
                    <CardTitle className="text-midnight">Get in touch</CardTitle>
                    <CardDescription>Choose the team that best fits your question.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Select value={department} onValueChange={setDepartment}>
                          <SelectTrigger id="department" className="bg-slate-50/50">
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

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name</Label>
                          <Input
                            id="name"
                            name="name"
                            placeholder="Your name"
                            required
                            className="bg-slate-50/50"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email">Email</Label>
                          <Input
                            id="email"
                            name="email"
                            type="email"
                            placeholder="you@example.com"
                            required
                            className="bg-slate-50/50"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone (optional)</Label>
                        <Input
                          id="phone"
                          name="phone"
                          type="tel"
                          placeholder="+61 400 000 000"
                          className="bg-slate-50/50"
                        />
                        <p className="text-xs text-slate-600">
                          Add your phone if you want Tracey to call you back right away.
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          name="subject"
                          placeholder="Brief summary of your enquiry"
                          required
                          className="bg-slate-50/50"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          name="message"
                          placeholder="Tell us how we can help..."
                          rows={4}
                          className="rounded-[18px] border-border bg-slate-50/50 resize-none"
                          required
                        />
                      </div>

                      {status === "error" && <p className="text-sm text-destructive">{errorMessage}</p>}

                      <Button type="submit" size="lg" disabled={status === "sending"} className="w-full">
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
            </motion.div>
          </div>
        </section>

        {/* ── 7. Final CTA ── */}
        <section className="py-14 md:py-24 px-6 bg-[linear-gradient(135deg,#0f172a_0%,#065f46_100%)]">
          <div className="mx-auto max-w-3xl text-center flex flex-col items-center gap-6">
            <motion.h2
              {...fadeUp()}
              className="text-4xl md:text-5xl font-extrabold tracking-[-0.03em] text-white leading-tight text-balance"
            >
              Give yourself an early mark
            </motion.h2>
            <motion.p {...fadeUp(0.04)} className="text-lg text-white/65 leading-7 max-w-xl">
              No contracts. No complexity. Try Earlymark free.
            </motion.p>
            <motion.div {...fadeUp(0.12)} className="flex flex-col sm:flex-row gap-3">
              <Link href="/auth">
                <Button size="lg" variant="mint">
                  Get started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/#interview-assistant">
                <Button size="lg" variant="ghost" className="text-white border border-white/30 hover:bg-white/10">
                  Interview Tracey for free
                </Button>
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

