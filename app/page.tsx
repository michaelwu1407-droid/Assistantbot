import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Check, ArrowRight, Zap, Hammer, Smartphone } from "lucide-react"
import Link from "next/link"

export default function Home() {
  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero Section */}
      <section className="pt-32 pb-24 px-6 relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-100 via-white to-white" />
        <div className="container mx-auto max-w-5xl text-center space-y-8">
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900">
            The Assistant that <br />
            <span className="text-blue-600">runs your business.</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            Pj Buddy isn't just a CRM. It's a chatbot-first assistant that manages your trades or real estate business while you work.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link href="/login">
              <Button size="lg" className="h-12 px-8 text-lg">
                Get Started for Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
            <Link href="#product">
              <Button size="lg" variant="outline" className="h-12 px-8 text-lg">
                Learn More
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Product Section */}
      <section id="product" className="py-24 bg-slate-50 px-6">
        <div className="container mx-auto max-w-6xl space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-slate-900">One Core, Multiple Modes</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Built on a universal CRM Hub, Pj Buddy adapts its interface to your specific job role.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-48 bg-blue-600/10 flex items-center justify-center">
                <Hammer className="h-16 w-16 text-blue-600" />
              </div>
              <CardHeader>
                <CardTitle>Tradie Mode</CardTitle>
                <CardDescription>For Plumbers, Electricians, and Technicians</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <li className="flex items-center gap-2 text-slate-600"><Check className="h-4 w-4 text-green-500" /> Map-based job routing</li>
                <li className="flex items-center gap-2 text-slate-600"><Check className="h-4 w-4 text-green-500" /> Quick Invoicing</li>
                <li className="flex items-center gap-2 text-slate-600"><Check className="h-4 w-4 text-green-500" /> Material Logging</li>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg overflow-hidden">
              <div className="h-48 bg-emerald-600/10 flex items-center justify-center">
                <Smartphone className="h-16 w-16 text-emerald-600" />
              </div>
              <CardHeader>
                <CardTitle>Agent Mode</CardTitle>
                <CardDescription>For Real Estate Agents and Property Managers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <li className="flex items-center gap-2 text-slate-600"><Check className="h-4 w-4 text-green-500" /> Open House Kiosk</li>
                <li className="flex items-center gap-2 text-slate-600"><Check className="h-4 w-4 text-green-500" /> Speed-to-lead Dialing</li>
                <li className="flex items-center gap-2 text-slate-600"><Check className="h-4 w-4 text-green-500" /> Buyer Matchmaking</li>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-24 px-6">
        <div className="container mx-auto max-w-4xl space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-3xl font-bold text-slate-900">Simple, Transparent Pricing</h2>
            <p className="text-slate-600">Start for free, upgrade when you grow.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            <Card className="relative">
              <CardHeader>
                <CardTitle className="text-xl">Free Tier</CardTitle>
                <CardDescription>Perfect for solopreneurs</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold text-slate-900">$0</span>
                  <span className="text-slate-500">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <li className="flex items-center gap-2 text-slate-600"><Check className="h-4 w-4 text-green-500" /> Up to 500 Contacts</li>
                <li className="flex items-center gap-2 text-slate-600"><Check className="h-4 w-4 text-green-500" /> 1 Module Access</li>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant="outline">Get Started</Button>
              </CardFooter>
            </Card>

            <Card className="relative border-blue-600 shadow-xl scale-105">
              <div className="absolute top-0 right-0 bg-blue-600 text-white text-xs px-3 py-1 rounded-bl-lg rounded-tr-lg font-bold">
                POPULAR
              </div>
              <CardHeader>
                <CardTitle className="text-xl">Pro Tier</CardTitle>
                <CardDescription>For growing teams</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold text-slate-900">$29</span>
                  <span className="text-slate-500">/mo</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <li className="flex items-center gap-2 text-slate-600"><Check className="h-4 w-4 text-green-500" /> Unlimited Contacts</li>
                <li className="flex items-center gap-2 text-slate-600"><Check className="h-4 w-4 text-green-500" /> All Modules Included</li>
                <li className="flex items-center gap-2 text-slate-600"><Check className="h-4 w-4 text-green-500" /> Priority Support</li>
              </CardContent>
              <CardFooter>
                <Link href="/login" className="w-full">
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">Get Pro</Button>
                </Link>
              </CardFooter>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-24 bg-slate-900 text-slate-50 px-6">
        <div className="container mx-auto max-w-2xl text-center space-y-6">
          <h2 className="text-3xl font-bold">Ready to streamline your workflow?</h2>
          <p className="text-slate-400">Join thousands of SMEs using Pj Buddy today.</p>
          <div className="flex justify-center gap-4">
            <Link href="/login">
              <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-slate-900">
                Contact Sales
              </Button>
            </Link>
          </div>
          <div className="pt-12 text-sm text-slate-500">
            © 2026 Pj Buddy Inc. All rights reserved.
          </div>
        </div>
      </section>
    </div>
  )
}
