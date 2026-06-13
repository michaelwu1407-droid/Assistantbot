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
import { MastheadHero } from "@/components/marketing/masthead-hero"
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
    <div className="max-w-3xl mx-auto border-t border-hair">
      {FAQ_ITEMS.map((item, idx) => {
        const isOpen = openIndices.includes(idx)
        return (
          <div key={idx} className="border-b border-hair">
            <button
              onClick={() => toggle(idx)}
              className="w-full flex items-center justify-between gap-4 py-5 text-left group"
            >
              <span className="font-semibold text-[15px] pr-4 text-ink group-hover:text-forest transition-colors">{item.q}</span>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-hair bg-card transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}>
                <ChevronDown className="w-4 h-4 text-forest" />
              </span>
            </button>
            <div className={`transition-all duration-200 overflow-hidden ${isOpen ? "max-h-60" : "max-h-0"}`}>
              <p className="pb-5 pr-10 text-sm text-ink2 leading-relaxed">{item.a}</p>
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
    <div className="min-h-screen bg-paper text-ink">
      <Navbar />

      <main>
        {/* ── 1. Hero / Pricing Header ── */}
        <MastheadHero
          index="§ Pricing"
          kicker="One plan, everything in"
          title={<>One plan.<br />Everything included.</>}
          lead="A$30/month platform. 10¢ per call minute or text. That's it."
        />

        {/* ── 2. Pricing Section ── */}
        <section className="py-12 px-6">
          <div className="max-w-5xl mx-auto">
            {/* Toggle */}
            <motion.div {...fadeUp(0.12)} className="flex justify-center mb-12">
              <div className="flex items-center gap-2 p-1.5 bg-muted rounded-md">
                <button
                  type="button"
                  onClick={() => setBillingPeriod("monthly")}
                  className={`py-2.5 px-6 rounded-md text-sm font-semibold transition-all shadow-sm ${
                    billingPeriod === "monthly"
                      ? "bg-card"
                      : "text-muted-foreground shadow-none bg-transparent"
                  }`}
                >
                  Monthly
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setBillingPeriod("yearly")}
                    className={`py-2.5 px-6 rounded-md text-sm font-semibold transition-all shadow-sm ${
                      billingPeriod === "yearly"
                        ? "bg-card"
                        : "text-muted-foreground shadow-none bg-transparent"
                    }`}
                  >
                    Yearly
                  </button>
                  <span className="absolute -top-3 -right-3 bg-forest text-paper text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    Save 20%
                  </span>
                </div>
              </div>
            </motion.div>

            {/* Comparison Grid */}
            <motion.div {...fadeUp(0.16)} className="grid gap-6 items-end md:grid-cols-2">
              {/* Left Column: Job Management Software */}
              <div className="order-2 rounded-md border border-border bg-muted/30 p-6 opacity-80 flex flex-col items-center text-center md:order-1 md:p-8">
                <h3 className="text-xl font-bold text-muted-foreground mb-1">Job Management Software</h3>
                <div className="text-xs text-muted-foreground mb-3">ServiceM8 / Tradify / Jobber</div>
                <div className="text-4xl font-extrabold text-muted-foreground mb-1">$39–69</div>
                <div className="text-sm font-semibold text-muted-foreground mb-2">/month</div>
                <div className="text-xs text-muted-foreground mb-8 max-w-[220px]">Plus you still answer every call yourself</div>

                <ul className="text-left w-full space-y-4 mb-10">
                  <li className="flex items-start gap-3 text-sm text-muted-foreground">
                    <X className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    No AI receptionist — you answer every call
                  </li>
                  <li className="flex items-start gap-3 text-sm text-muted-foreground">
                    <X className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    No after-hours call handling
                  </li>
                  <li className="flex items-start gap-3 text-sm text-muted-foreground">
                    <X className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    No automated SMS follow-ups
                  </li>
                  <li className="flex items-start gap-3 text-sm text-muted-foreground">
                    <X className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    No voice agent that knows your business
                  </li>
                  <li className="flex items-start gap-3 text-sm text-muted-foreground">
                    <X className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    CRM only — no lead capture from calls
                  </li>
                  <li className="flex items-start gap-3 text-sm text-muted-foreground">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    Still need a separate phone system
                  </li>
                  <li className="flex items-start gap-3 text-sm text-muted-foreground">
                    <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    Manual data entry for every job
                  </li>
                </ul>

                <Button
                  size="lg"
                  variant="outline"
                  className="w-full text-muted-foreground border-border cursor-not-allowed hover:bg-transparent hover:text-muted-foreground pointer-events-none"
                >
                  Just a job tracker
                </Button>
              </div>

              {/* Right Column: Earlymark Pro */}
              <div className="order-1 rounded-md border-2 border-primary bg-card shadow-2xl shadow-primary/10 p-6 relative flex flex-col items-center text-center md:order-2 md:-mt-6 md:p-8">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2">
                  <span className="bg-primary text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider">
                    Recommended
                  </span>
                </div>
                <h3 className="text-xl font-bold mb-2" style={{ color: "var(--color-ink)" }}>Earlymark Pro</h3>
                <div className="text-5xl font-extrabold mb-1" style={{ color: "var(--color-ink)" }}>
                  {billingPeriod === "monthly" ? "A$30" : "A$24"}
                </div>
                <div className="text-sm font-semibold text-muted-foreground mb-1">
                  {billingPeriod === "monthly" ? "/month" : "/month, billed annually at A$288"}
                </div>
                <div className="text-sm font-semibold text-primary mb-2">
                  + 10¢ per call minute or text
                </div>
                <div className="text-xs text-muted-foreground mb-8 max-w-[240px]">
                  {billingPeriod === "monthly"
                    ? "Cancel anytime. No lock-in contracts."
                    : "Save 20% on the base fee. Promo codes accepted at checkout."}
                </div>

                <ul className="text-left w-full space-y-4 mb-10">
                  <li className="flex items-start gap-3 text-sm text-foreground font-medium">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    Available 24/7/365
                  </li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-medium">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    Answers instantly as your business
                  </li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-medium">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    Automated quote follow-up sequences
                  </li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-medium">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    No hold times. No sick leaves.
                  </li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-medium">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    Learns once. Remembers forever.
                  </li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-medium">
                    <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                    Captures all after-hours leads
                  </li>
                  <li className="flex items-start gap-3 text-sm text-foreground font-medium">
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
        <section className="py-12 md:py-20 px-6 bg-cream">
          <div className="max-w-4xl mx-auto">
            <motion.div {...fadeUp()} className="text-center mb-14">
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-[-0.01em] text-ink">Pays for itself by saving 1 missed job</h2>
              <p className="mt-3 text-muted-foreground max-w-2xl mx-auto">
                Stop losing money on missed calls, forgotten follow-ups, and wasted admin hours.
              </p>
            </motion.div>

            <div className="grid md:grid-cols-3 gap-6">
              {STATS.map((stat, i) => (
                <motion.div
                  key={i}
                  {...fadeUp(0.1 + i * 0.1)}
                  className="bg-card rounded-md p-8 border border-hair shadow-[0_2px_10px_-6px_rgba(14,31,26,0.08)] text-center flex flex-col items-center justify-center"
                >
                  <div className="font-display text-4xl font-semibold text-forest mb-3">{stat.value}</div>
                  <div className="text-sm font-semibold text-muted-foreground">{stat.label}</div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. Feature Grid ── */}
        <section className="py-12 md:py-20 px-6 bg-paper">
          <div className="max-w-5xl mx-auto">
            <motion.div {...fadeUp()} className="text-center mb-14">
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-[-0.01em] text-ink">Everything you need is included</h2>
              <p className="mt-3 text-muted-foreground">No add-ons, no hidden modules. You get the full platform from day one.</p>
            </motion.div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {FEATURES.map((f, i) => {
                const Icon = f.icon
                return (
                  <motion.div
                    key={f.title}
                    {...fadeUp(0.1 + i * 0.05)}
                    className="bg-card border border-hair p-5 rounded-md flex flex-col items-start gap-4 hover:shadow-md transition-shadow"
                  >
                    <div className="w-10 h-10 rounded-md bg-primary-subtle flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm mb-1" style={{ color: "var(--color-ink)" }}>{f.title}</h4>
                      <p className="text-xs text-muted-foreground leading-relaxed">{f.description}</p>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </div>
        </section>

        {/* ── 5. FAQ ── */}
        <section className="py-12 md:py-20 px-6 bg-cream">
          <div className="max-w-3xl mx-auto">
            <motion.div {...fadeUp()} className="text-center mb-10">
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-[-0.01em] text-ink">Pricing questions</h2>
            </motion.div>

            <motion.div {...fadeUp(0.1)}>
              <FaqSection />
            </motion.div>
          </div>
        </section>

        {/* ── 6. Contact Form ── */}
        <section id="contact-form" className="py-12 md:py-20 px-6 bg-paper scroll-mt-20">
          <div className="container mx-auto max-w-xl">
            <motion.div {...fadeUp()} className="text-center mb-10">
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-[-0.01em] text-ink">Still have questions?</h2>
              <p className="text-muted-foreground mt-2">Get in touch with the team.</p>
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
                        <h2 className="font-semibold" style={{ color: "var(--color-ink)" }}>
                          {callPlaced ? "Tracey is calling you now" : "Message sent"}
                        </h2>
                        {callPlaced && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Pick up - Tracey will be on the line in a few seconds.
                          </p>
                        )}
                        <p className="text-sm text-muted-foreground mt-1" hidden={callPlaced}>
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
                <Card className="rounded-md border border-hair shadow-sm bg-card">
                  <CardHeader className="px-8 pt-8 pb-0">
                    <CardTitle style={{ color: "var(--color-ink)" }}>Get in touch</CardTitle>
                    <CardDescription>Choose the team that best fits your question.</CardDescription>
                  </CardHeader>
                  <CardContent className="p-8">
                    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="department">Department</Label>
                        <Select value={department} onValueChange={setDepartment}>
                          <SelectTrigger id="department" className="bg-muted/20">
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
                            className="bg-muted/20"
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
                            className="bg-muted/20"
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
                          className="bg-muted/20"
                        />
                        <p className="text-xs text-muted-foreground">
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
                          className="bg-muted/20"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          name="message"
                          placeholder="Tell us how we can help..."
                          rows={4}
                          className="rounded-md border-border bg-muted/20 resize-none"
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
        <section className="relative overflow-hidden py-16 md:py-28 px-6 bg-forest">
          <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(70% 60% at 50% 120%, rgba(0,210,139,0.18) 0%, transparent 70%)" }} />
          <div aria-hidden className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
          <div className="relative mx-auto max-w-3xl text-center flex flex-col items-center gap-6">
            <motion.h2
              {...fadeUp()}
              className="font-display text-4xl md:text-5xl font-semibold tracking-[-0.01em] text-paper leading-[1.05] text-balance"
            >
              Give yourself an <span className="italic text-mint-500">early mark</span>
            </motion.h2>
            <motion.p {...fadeUp(0.04)} className="text-lg text-paper/65 leading-7 max-w-xl">
              No contracts. No complexity. Try Earlymark free.
            </motion.p>
            <motion.div {...fadeUp(0.12)} className="flex flex-col sm:flex-row gap-3">
              <Link href="/auth">
                <Button size="lg" variant="mint">
                  Get started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/#interview-assistant">
                <Button size="lg" variant="ghost" className="text-paper border border-white/25 hover:bg-white/10 hover:text-white">
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

