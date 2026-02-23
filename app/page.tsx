import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Check, ArrowRight, Hammer, Smartphone, BarChart3, Users, MessageSquare, Zap, Shield, Clock, Mail, Phone } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-6 relative overflow-hidden">
        {/* Subtle Mint Glow Background */}
        <div className="absolute inset-0 -z-10 ott-glow" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] -z-10 rounded-full bg-primary/5 blur-3xl" />

        <div className="container mx-auto max-w-4xl text-center flex flex-col items-center gap-8">
          <div className="ott-badge-mint">
            Your AI-Powered Business Assistant
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-[-0.04em] leading-[1.1] text-midnight text-balance">
            Manage faster with the most intuitive CRM
          </h1>
          <p className="text-lg text-slate-body max-w-2xl leading-relaxed">
            Pj Buddy isn&apos;t just a CRM. It&apos;s a chatbot-first assistant that manages your trades or real estate business while you work. Automate tasks and maximise opportunities.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Link href="/auth">
              <Button variant="outline" size="lg">
                Contact Sales
              </Button>
            </Link>
            <Link href="/auth">
              <Button size="lg">
                Get Started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="pb-20 px-6">
        <div className="container mx-auto max-w-5xl">
          <div className="ott-card-elevated overflow-hidden p-2">
            <div className="rounded-[20px] bg-[#F8FAFC] p-6 flex flex-col gap-4">
              {/* Mock Dashboard Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
                    <span className="text-white font-bold text-xs italic">Pj</span>
                  </div>
                  <span className="text-sm font-semibold text-midnight">Dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 px-4 rounded-full bg-primary text-white text-xs font-semibold flex items-center">Download</div>
                </div>
              </div>
              {/* Mock KPI Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: "Total Leads", value: "1,098", change: "+16.2%" },
                  { label: "Active Deals", value: "$4,304", change: "+12.8%" },
                  { label: "Work Hours", value: "120.8 Hrs", change: "+8.1%" },
                  { label: "Close Rate", value: "50.1%", change: "+3.2%" },
                ].map((kpi) => (
                  <div key={kpi.label} className="bg-white rounded-2xl p-4 border border-border/40">
                    <p className="text-xs text-muted-foreground font-medium">{kpi.label}</p>
                    <p className="text-xl font-bold text-midnight mt-1">{kpi.value}</p>
                    <span className="text-xs font-semibold text-primary">{kpi.change}</span>
                  </div>
                ))}
              </div>
              {/* Mock Chart Area */}
              <div className="flex gap-3">
                <div className="flex-1 bg-white rounded-2xl p-4 border border-border/40 min-h-[120px] flex items-end gap-2">
                  {[60, 45, 80, 70, 90, 55, 75, 85, 65, 70].map((h, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full rounded-lg bg-primary/80" style={{ height: `${h}px` }} />
                    </div>
                  ))}
                </div>
                <div className="w-[200px] bg-white rounded-2xl p-4 border border-border/40 hidden md:flex flex-col items-center justify-center gap-2">
                  <div className="h-20 w-20 rounded-full border-[6px] border-primary border-r-blue-500 border-b-secondary" />
                  <p className="text-xs text-muted-foreground">Role Efficiency</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-12">
            <div className="max-w-md flex flex-col gap-4">
              <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.2] text-midnight text-balance">
                Retain customers.
              </h2>
              <p className="text-slate-body leading-relaxed">
                Use one central platform to help your team be more productive. Consolidate your tech stack or integrate with your favourite tools.
              </p>
              <div className="flex gap-8 pt-4">
                <div>
                  <p className="text-4xl font-bold text-primary">95</p>
                  <p className="text-sm text-muted-foreground">Trusted Vendors</p>
                </div>
                <div>
                  <p className="text-4xl font-bold text-primary">98%</p>
                  <p className="text-sm text-muted-foreground">Customers Satisfied</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 max-w-md w-full">
              {[
                { name: "Google", desc: "Senior Web Developer" },
                { name: "Spotify", desc: "Junior Data Scientist" },
                { name: "Airbnb", desc: "Search Engine Optimisation" },
                { name: "Instagram", desc: "Senior Android Developer" },
                { name: "Pinterest", desc: "CRM Designer" },
                { name: "Stripe", desc: "Search Engine Optimisation" },
              ].map((company) => (
                <div key={company.name} className="flex items-center gap-3 p-3 rounded-2xl hover:bg-secondary transition-colors">
                  <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center">
                    <span className="text-xs font-bold text-midnight">{company.name.charAt(0)}</span>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-midnight">{company.name}</p>
                    <p className="text-xs text-muted-foreground">{company.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="product" className="py-20 px-6 bg-background">
        <div className="container mx-auto max-w-6xl flex flex-col gap-16">
          <div className="text-center flex flex-col gap-4 max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.2] text-midnight">
              Find out what we offer
            </h2>
            <p className="text-slate-body leading-relaxed">
              Let AI do the heavy lifting so your team can spend more time selling.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="overflow-hidden border-0 shadow-none bg-transparent hover:translate-y-0 hover:shadow-none">
              <div className="h-56 bg-mint-50 rounded-[24px] flex items-center justify-center">
                <Hammer className="h-16 w-16 text-primary" />
              </div>
              <CardHeader className="px-0">
                <CardTitle className="text-xl">Tradie Mode</CardTitle>
                <CardDescription className="text-slate-body">For Plumbers, Electricians, and Technicians</CardDescription>
              </CardHeader>
              <CardContent className="px-0 flex flex-col gap-3">
                <div className="flex items-center gap-3 text-slate-body"><Check className="h-4 w-4 text-primary shrink-0" /> Map-based job routing</div>
                <div className="flex items-center gap-3 text-slate-body"><Check className="h-4 w-4 text-primary shrink-0" /> Quick Invoicing</div>
                <div className="flex items-center gap-3 text-slate-body"><Check className="h-4 w-4 text-primary shrink-0" /> Material Logging</div>
              </CardContent>
            </Card>

            <Card className="overflow-hidden border-0 shadow-none bg-transparent hover:translate-y-0 hover:shadow-none">
              <div className="h-56 bg-blue-50 rounded-[24px] flex items-center justify-center">
                <Smartphone className="h-16 w-16 text-blue-500" />
              </div>
              <CardHeader className="px-0">
                <CardTitle className="text-xl">Agent Mode</CardTitle>
                <CardDescription className="text-slate-body">For Real Estate Agents and Property Managers</CardDescription>
              </CardHeader>
              <CardContent className="px-0 flex flex-col gap-3">
                <div className="flex items-center gap-3 text-slate-body"><Check className="h-4 w-4 text-primary shrink-0" /> Open House Kiosk</div>
                <div className="flex items-center gap-3 text-slate-body"><Check className="h-4 w-4 text-primary shrink-0" /> Speed-to-lead Dialing</div>
                <div className="flex items-center gap-3 text-slate-body"><Check className="h-4 w-4 text-primary shrink-0" /> Buyer Matchmaking</div>
              </CardContent>
            </Card>
          </div>

          {/* Feature Details */}
          <div className="flex flex-col gap-8">
            {[
              { icon: MessageSquare, title: "Maximise engagement with every contact", desc: "Efficiently reach contacts at every stage of your pipeline with the right message using powerful features like personalised sequences." },
              { icon: Zap, title: "Customise in minutes to fit your sales cycle", desc: "Easily tailor your CRM to suit you, without any development help. Edit deal stages, add as many columns as you like." },
              { icon: Clock, title: "Save valuable time with one-click automations", desc: "Close more deals by automating repetitive work. Automatically assign leads to reps, set reminders for upcoming activities, and more." },
            ].map((feature) => (
              <div key={feature.title} className="flex items-start gap-4 p-6 rounded-[24px] hover:bg-secondary/50 transition-colors">
                <div className="h-10 w-10 rounded-xl bg-mint-50 flex items-center justify-center shrink-0">
                  <feature.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="text-base font-semibold text-midnight">{feature.title}</h3>
                  <p className="text-sm text-slate-body leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-6 relative">
        <div className="absolute inset-0 -z-10 ott-glow opacity-50" />
        <div className="container mx-auto max-w-4xl flex flex-col gap-16">
          <div className="text-center flex flex-col gap-4">
            <h2 className="text-4xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.2] text-midnight">
              Simple, transparent pricing
            </h2>
            <p className="text-slate-body">Start for free, upgrade when you grow.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-stretch">
            <Card className="flex flex-col">
              <CardHeader className="flex-1">
                <CardTitle className="text-xl">Free Tier</CardTitle>
                <CardDescription>Perfect for solopreneurs</CardDescription>
                <div className="pt-4">
                  <span className="text-5xl font-extrabold text-midnight">$0</span>
                  <span className="text-muted-foreground ml-1">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-slate-body"><Check className="h-4 w-4 text-primary shrink-0" /> Up to 500 Contacts</div>
                <div className="flex items-center gap-3 text-slate-body"><Check className="h-4 w-4 text-primary shrink-0" /> 1 Module Access</div>
                <div className="flex items-center gap-3 text-slate-body"><Check className="h-4 w-4 text-primary shrink-0" /> Basic Reporting</div>
              </CardContent>
              <CardFooter>
                <Link href="/auth" className="w-full">
                  <Button className="w-full" variant="outline">Get Started</Button>
                </Link>
              </CardFooter>
            </Card>

            <Card className="flex flex-col border-primary/50 relative">
              <div className="absolute -top-3 left-6">
                <span className="ott-badge-mint text-xs">Most Popular</span>
              </div>
              <CardHeader className="flex-1">
                <CardTitle className="text-xl">Pro Tier</CardTitle>
                <CardDescription>For growing teams</CardDescription>
                <div className="pt-4">
                  <span className="text-5xl font-extrabold text-midnight">$29</span>
                  <span className="text-muted-foreground ml-1">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-center gap-3 text-slate-body"><Check className="h-4 w-4 text-primary shrink-0" /> Unlimited Contacts</div>
                <div className="flex items-center gap-3 text-slate-body"><Check className="h-4 w-4 text-primary shrink-0" /> All Modules Included</div>
                <div className="flex items-center gap-3 text-slate-body"><Check className="h-4 w-4 text-primary shrink-0" /> Priority Support</div>
                <div className="flex items-center gap-3 text-slate-body"><Check className="h-4 w-4 text-primary shrink-0" /> Advanced Analytics</div>
              </CardContent>
              <CardFooter>
                <Link href="/auth" className="w-full">
                  <Button className="w-full" variant="mint">Get Pro</Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA / Contact Section */}
      <section id="contact" className="py-20 px-6 bg-midnight text-white">
        <div className="container mx-auto max-w-4xl text-center flex flex-col items-center gap-8">
          <h2 className="text-4xl md:text-5xl font-extrabold tracking-[-0.03em] leading-[1.2] text-white text-balance">
            Need Help? We're Here for You!
          </h2>
          <p className="text-white/60 max-w-2xl leading-relaxed">
            Get support from our team via multiple channels. We're committed to helping you succeed with Pj Buddy.
          </p>
          
          {/* Contact Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-3xl">
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Live Chat</h3>
              <p className="text-white/60 text-sm mb-4">
                Get instant help from our AI assistant 24/7
              </p>
              <Link href="/auth">
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white hover:text-midnight w-full">
                  Start Chat
                </Button>
              </Link>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Email Support</h3>
              <p className="text-white/60 text-sm mb-2">
                support@pjbuddy.com
              </p>
              <p className="text-white/60 text-sm mb-4">
                Response within 24 hours
              </p>
              <a href="mailto:support@pjbuddy.com">
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white hover:text-midnight w-full">
                  Send Email
                </Button>
              </a>
            </div>
            
            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
              <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center mx-auto mb-4">
                <Phone className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Phone Support</h3>
              <p className="text-white/60 text-sm mb-2">
                1300 PJ BUDDY
              </p>
              <p className="text-white/60 text-sm mb-4">
                Mon-Fri 9am-5pm AEST
              </p>
              <a href="tel:13007528339">
                <Button variant="outline" size="sm" className="border-white/20 text-white hover:bg-white hover:text-midnight w-full">
                  Call Now
                </Button>
              </a>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
            <Link href="/auth">
              <Button variant="outline" size="lg" className="border-white/20 text-white hover:bg-white hover:text-midnight bg-transparent">
                Contact Sales
              </Button>
            </Link>
            <Link href="/auth">
              <Button variant="mint" size="lg">
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-6 bg-midnight border-t border-white/10">
        <div className="container mx-auto max-w-6xl flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-white/40">
            {"2025 Pj Buddy. All Rights Reserved."}
          </p>
          <div className="flex items-center gap-6">
            {["Home", "Product", "Pricing", "Contact"].map((link) => (
              <a key={link} href={`#${link.toLowerCase()}`} className="text-sm text-white/40 hover:text-white/80 transition-colors">
                {link}
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  )
}
