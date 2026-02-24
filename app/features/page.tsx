import Link from "next/link"
import { Navbar } from "@/components/layout/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Check, MessageSquare, Zap, Clock, Hammer, Smartphone, ArrowRight } from "lucide-react"

const FEATURE_CARDS = [
  {
    icon: Hammer,
    title: "🤖 AI Agent Communication",
    description: "Travis AI handles automated outreach using your business number",
    items: ["Automated calls & texts", "Job reminders & trip SMS", "24/7 availability"],
  },
  {
    icon: Smartphone,
    title: "📱 Manual Communication",
    description: "Direct customer contact using your personal phone number",
    items: ["Personal phone integration", "One-click call/text buttons", "Direct conversation control"],
  },
]

const FEATURE_LIST = [
  { icon: MessageSquare, title: "🤖 AI-Powered Automation", desc: "Travis AI handles appointment reminders, follow-ups, and customer outreach using your business phone number. Available 24/7 for your customers." },
  { icon: Zap, title: "📱 Personal Communication", desc: "Maintain direct relationships with one-click calling and texting from your personal number. Perfect for complex discussions and personal touch." },
  { icon: Clock, title: "⚡ Smart Reminders", desc: "Automated job reminders 24 hours before appointments and 'on my way' SMS when you start driving. Never miss a follow-up again." },
]

export default function FeaturesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pt-28 pb-20 px-6">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center flex flex-col gap-4 mb-16">
            <h1 className="text-4xl md:text-5xl font-bold tracking-[-0.03em] leading-[1.2] text-midnight">
              Features
            </h1>
            <p className="text-slate-body leading-relaxed max-w-2xl mx-auto">
              Harness the power of AI automation while maintaining personal touchpoints with your customers.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {FEATURE_CARDS.map((card) => {
              const Icon = card.icon
              return (
              <Card key={card.title} className="overflow-hidden border-0 shadow-none bg-transparent">
                <div className="h-56 bg-mint-50 rounded-[24px] flex items-center justify-center">
                  <Icon className="h-16 w-16 text-primary" />
                </div>
                <CardHeader className="px-0">
                  <CardTitle className="text-xl">{card.title}</CardTitle>
                  <CardDescription className="text-slate-body">{card.description}</CardDescription>
                </CardHeader>
                <CardContent className="px-0 flex flex-col gap-3">
                  {card.items.map((item) => (
                    <div key={item} className="flex items-center gap-3 text-slate-body">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {item}
                    </div>
                  ))}
                </CardContent>
              </Card>
              )
            })}
          </div>

          <div className="flex flex-col gap-8">
            {FEATURE_LIST.map((feature) => {
              const Icon = feature.icon
              return (
              <div
                key={feature.title}
                className="flex items-start gap-4 p-6 rounded-[24px] hover:bg-secondary/50 transition-colors"
              >
                <div className="h-10 w-10 rounded-xl bg-mint-50 flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex flex-col gap-1">
                  <h2 className="text-base font-semibold text-midnight">{feature.title}</h2>
                  <p className="text-sm text-slate-body leading-relaxed">{feature.desc}</p>
                </div>
              </div>
              )
            })}
          </div>

          <div className="mt-16 text-center">
            <Link href="/auth">
              <Button size="lg">
                Get started
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
