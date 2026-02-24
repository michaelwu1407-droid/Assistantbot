"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Send } from "lucide-react"
import { useIndustry } from "@/components/providers/industry-provider"
import { completeOnboarding } from "@/actions/workspace-actions"

type Message = {
    id: string
    role: "assistant" | "user"
    content: string
    type?: "text" | "choice" | "draft-card"
    choices?: { label: string; value: string; icon?: React.ElementType }[]
    draftCard?: DraftCardData
}

type DraftCardData = {
    kind: "pricing" | "hours" | "autonomy" | "onboarding"
    fields: DraftField[]
}

type DraftField = {
    key: string
    label: string
    type: "text" | "number" | "select" | "time" | "toggle"
    defaultValue: string | number | boolean
    placeholder?: string
    options?: { label: string; value: string }[]
    suffix?: string
}

// ─── Fuzzy Matching Helpers ────────────────────────────────────────
const TRADE_ALIASES: Record<string, string> = {
    sparkie: "Electrician",
    sparky: "Electrician",
    chippie: "Carpenter",
    chippy: "Carpenter",
    brickie: "Bricklayer",
    bricky: "Bricklayer",
    plumber: "Plumber",
    plumbo: "Plumber",
    tiler: "Tiler",
    painter: "Painter",
    roofer: "Roofer",
    hvac: "HVAC Technician",
    aircon: "HVAC Technician",
    "air con": "HVAC Technician",
    locksmith: "Locksmith",
    landscaper: "Landscaper",
    concreter: "Concreter",
    glazier: "Glazier",
    plasterer: "Plasterer",
    fencer: "Fencer",
    gutter: "Gutter Specialist",
    "pest control": "Pest Control",
    cleaner: "Cleaner",
    handyman: "Handyman",
}

function resolveTradeType(input: string): string {
    const lower = input.toLowerCase().trim()
    if (TRADE_ALIASES[lower]) return TRADE_ALIASES[lower]
    // Partial match
    for (const [alias, canonical] of Object.entries(TRADE_ALIASES)) {
        if (lower.includes(alias) || alias.includes(lower)) return canonical
    }
    // Return as-is with title case
    return input.charAt(0).toUpperCase() + input.slice(1)
}

// Common Australian city typos/abbreviations
const CITY_CORRECTIONS: Record<string, string> = {
    syndey: "Sydney, NSW",
    sydeny: "Sydney, NSW",
    syd: "Sydney, NSW",
    melb: "Melbourne, VIC",
    melbounre: "Melbourne, VIC",
    melborne: "Melbourne, VIC",
    brissy: "Brisbane, QLD",
    brisbne: "Brisbane, QLD",
    brisabne: "Brisbane, QLD",
    perht: "Perth, WA",
    adeliade: "Adelaide, SA",
    adelaid: "Adelaide, SA",
    canberrra: "Canberra, ACT",
    camberra: "Canberra, ACT",
    dariwn: "Darwin, NT",
    hoabrt: "Hobart, TAS",
    goldy: "Gold Coast, QLD",
    "gold coast": "Gold Coast, QLD",
    newie: "Newcastle, NSW",
    wollongong: "Wollongong, NSW",
    gong: "Wollongong, NSW",
}

function resolveLocation(input: string): string {
    const lower = input.toLowerCase().trim()
    if (CITY_CORRECTIONS[lower]) return CITY_CORRECTIONS[lower]
    // Partial match
    for (const [typo, correct] of Object.entries(CITY_CORRECTIONS)) {
        if (lower.includes(typo) || typo.includes(lower)) return correct
    }
    // Return as-is with proper casing
    return input
        .split(/\s+/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
}

export function SetupChat() {
    const router = useRouter()
    const { setIndustry } = useIndustry()
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: "Hi! I'm Travis, your AI assistant here to give you an early mark. What's your first name?",
            type: "text"
        }
    ])
    const [inputValue, setInputValue] = useState("")
    const [step, setStep] = useState(0)
    const [isTyping, setIsTyping] = useState(false)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const [userName, setUserName] = useState("")
    const [businessName, setBusinessName] = useState("")
    const [industryType, setIndustryType] = useState<"TRADES" | "REAL_ESTATE">("TRADES")
    const [location, setLocation] = useState("")
    const [tradeType, setTradeType] = useState("")
    const [draftValues, setDraftValues] = useState<Record<string, string | number | boolean>>({})

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [messages, isTyping])

    const handleSend = async () => {
        if (!inputValue.trim()) return

        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: inputValue,
        }
        setMessages(prev => [...prev, userMsg])
        setInputValue("")
        setIsTyping(true)

        // Process next step
        setTimeout(() => {
            processStep(inputValue)
        }, 1000)
    }

    const handleChoice = (choice: { label: string; value: string }) => {
        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: choice.label,
        }
        setMessages(prev => [...prev, userMsg])
        setIsTyping(true)

        setTimeout(() => {
            processStep(choice.value)
        }, 1000)
    }

    const handleDraftConfirm = (values: Record<string, string | number | boolean>, kind?: DraftCardData["kind"]) => {
        setDraftValues(prev => ({ ...prev, ...values }))
        const summary = Object.entries(values)
            .filter(([, v]) => v !== "" && v !== undefined)
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ")
        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: summary ? `✅ Confirmed: ${summary}` : "✅ Done",
        }
        setMessages(prev => [...prev, userMsg])
        setIsTyping(true)

        if (kind === "onboarding") {
            const tradeTypeVal = String(values.tradeType || "").trim()
            const businessNameVal = String(values.businessName || "").trim()
            const locationVal = String(values.location || "").trim()
            const phoneVal = String(values.phone || "").trim()
            const phone = (phoneVal || "").trim()
            setTradeType(resolveTradeType(tradeTypeVal))
            setBusinessName(businessNameVal)
            setLocation(resolveLocation(locationVal))
            setIndustry("TRADES")
            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: `All set! 🎉 Setting up ${businessNameVal || `${userName}'s Workspace`} now — I'll show you around in a quick walkthrough.`,
                        type: "text"
                    }
                ])
                completeOnboarding({
                    businessName: businessNameVal || `${userName}'s Workspace`,
                    industryType: "TRADES",
                    location: resolveLocation(locationVal),
                    tradeType: resolveTradeType(tradeTypeVal),
                    ownerPhone: phone,
                }).then(() => {
                    setTimeout(() => router.push("/dashboard?tutorial=true"), 2500)
                }).catch(() => {
                    setTimeout(() => router.push("/dashboard?tutorial=true"), 2500)
                })
            }, 1500)
            return
        }

        setTimeout(() => {
            processStep("DRAFT_CONFIRMED")
        }, 1000)
    }

    const processStep = (validInput: string) => {
        // Step 0: First name → show onboarding form
        if (step === 0) {
            setUserName(validInput)
            setStep(1)
            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: `Nice to meet you, ${validInput}! 👋 Fill in the form below so I can get to know you better and set up your workspace.`,
                        type: "text"
                    },
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        type: "draft-card",
                        content: "",
                        draftCard: {
                            kind: "onboarding",
                            fields: [
                                { key: "tradeType", label: "Trade type", type: "text", defaultValue: "", placeholder: "e.g. Plumber, Electrician, Carpenter, HVAC, Painter, Roofer" },
                                { key: "businessName", label: "Business name", type: "text", defaultValue: "", placeholder: "Your business name" },
                                { key: "location", label: "Location", type: "text", defaultValue: "", placeholder: "e.g. Sydney, Melbourne, Brisbane" },
                                { key: "phone", label: "Mobile", type: "text", defaultValue: "", placeholder: "Your mobile number" },
                            ]
                        }
                    }
                ])
            }, 1200)
        }
    }

    const isLastMsgChoice = messages.length > 0 && messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].type === "choice"
    const isLastMsgDraft = messages.length > 0 && messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].type === "draft-card"
    const inputDisabled = isTyping || isLastMsgChoice || isLastMsgDraft

    return (
        <div className="flex flex-col h-[600px] w-full max-w-2xl mx-auto glass-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-muted/10 custom-scrollbar">
                <AnimatePresence>
                    {messages.map((msg) => {
                        if (msg.type === "draft-card") return null
                        return (
                        <motion.div
                            key={msg.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >
                            <div
                                className={`max-w-[80%] rounded-2xl px-5 py-3 shadow-sm ${msg.role === "user"
                                    ? "bg-primary text-primary-foreground rounded-br-md"
                                    : "glass-card text-foreground rounded-bl-md border border-border/50"
                                    }`}
                            >
                                <p className="text-sm md:text-base leading-relaxed">{msg.content}</p>
                            </div>
                        </motion.div>
                        )
                    })}
                    {isTyping && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex justify-start"
                        >
                            <div className="glass-card rounded-2xl px-4 py-3 shadow-sm flex items-center gap-1 border border-border/50">
                                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce"></span>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Choices */}
                {messages.length > 0 && messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].type === "choice" && !isTyping && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-3 mt-4"
                    >
                        {messages[messages.length - 1].choices?.map((choice) => (
                            <Button
                                key={choice.value}
                                variant="outline"
                                className="h-auto py-3 px-6 flex flex-col items-center gap-2 glass-card hover:border-primary/50 hover:bg-primary/5 transition-all text-foreground"
                                onClick={() => handleChoice(choice)}
                            >
                                {choice.icon && <choice.icon className="h-6 w-6 text-muted-foreground group-hover:text-primary transition-colors" />}
                                <span className="font-medium">{choice.label}</span>
                            </Button>
                        ))}
                    </motion.div>
                )}

                {/* Draft Cards */}
                {messages.length > 0 && messages[messages.length - 1].role === "assistant" && messages[messages.length - 1].type === "draft-card" && !isTyping && (
                    <DraftCardUI
                        data={messages[messages.length - 1].draftCard!}
                        onConfirm={(values) => handleDraftConfirm(values, messages[messages.length - 1].draftCard?.kind)}
                    />
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-background/50 border-t border-border/50 backdrop-blur-sm">
                <form
                    onSubmit={(e) => {
                        e.preventDefault()
                        handleSend()
                    }}
                    className="flex items-center gap-2"
                >
                    <Input
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        placeholder="Type your answer..."
                        className="flex-1 bg-background/50 border-border/50 focus-visible:ring-primary/20 focus-visible:border-primary/50 transition-all"
                        disabled={inputDisabled}
                    />
                    <Button
                        type="submit"
                        size="icon"
                        disabled={!inputValue.trim() || inputDisabled}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all"
                    >
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    )
}

// ─── Draft Card Component ────────────────────────────────────────
function DraftCardUI({ data, onConfirm }: { data: DraftCardData; onConfirm: (values: Record<string, string | number | boolean>, kind?: DraftCardData["kind"]) => void }) {
    const [values, setValues] = useState<Record<string, string | number | boolean>>(() => {
        const init: Record<string, string | number | boolean> = {}
        data.fields.forEach(f => {
            init[f.key] = f.defaultValue
        })
        return init
    })

    const updateValue = (key: string, value: string | number | boolean) => {
        setValues(prev => ({ ...prev, [key]: value }))
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-lg p-5 space-y-4 max-w-sm"
        >
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                {data.kind === "pricing" && "💰 Pricing Setup"}
                {data.kind === "hours" && "🕐 Working Hours"}
                {data.kind === "autonomy" && "🤖 AI Autonomy Level"}
                {data.kind === "onboarding" && "Your details"}
            </h3>

            {data.fields.map((field) => (
                <div key={field.key} className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                    {field.type === "number" && (
                        <div className="flex items-center gap-2">
                            {field.suffix === "$" && <span className="text-sm text-muted-foreground">$</span>}
                            <Input
                                type="number"
                                value={values[field.key] as number}
                                onChange={(e) => updateValue(field.key, parseFloat(e.target.value) || 0)}
                                placeholder={field.placeholder}
                                className="h-9 text-sm"
                            />
                            {field.suffix && field.suffix !== "$" && (
                                <span className="text-xs text-muted-foreground">{field.suffix}</span>
                            )}
                        </div>
                    )}
                    {field.type === "text" && (
                        <Input
                            type="text"
                            value={values[field.key] as string}
                            onChange={(e) => updateValue(field.key, e.target.value)}
                            placeholder={field.placeholder}
                            className="h-9 text-sm"
                        />
                    )}
                    {field.type === "time" && (
                        <Input
                            type="time"
                            value={values[field.key] as string}
                            onChange={(e) => updateValue(field.key, e.target.value)}
                            className="h-9 text-sm"
                        />
                    )}
                    {field.type === "select" && (
                        <select
                            value={values[field.key] as string}
                            onChange={(e) => updateValue(field.key, e.target.value)}
                            className="w-full h-9 text-sm rounded-md border border-border bg-background px-3"
                        >
                            {field.options?.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    )}
                    {field.type === "toggle" && (
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => updateValue(field.key, !(values[field.key] as boolean))}
                                className={`w-10 h-5 rounded-full transition-colors ${values[field.key] ? "bg-primary" : "bg-muted"}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${values[field.key] ? "translate-x-5" : "translate-x-0.5"}`} />
                            </button>
                            <span className="text-xs text-muted-foreground">{values[field.key] ? "Yes" : "No"}</span>
                        </div>
                    )}
                </div>
            ))}

            <Button
                size="sm"
                className="w-full"
                onClick={() => onConfirm(values, data.kind)}
                disabled={data.kind === "onboarding" && !String(values.phone ?? "").trim()}
            >
                ✅ Confirm
            </Button>
        </motion.div>
    )
}
