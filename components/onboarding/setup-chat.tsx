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
    kind: "pricing" | "hours" | "autonomy" | "onboarding" | "onboarding_hours" | "onboarding_pricing" | "onboarding_business_contact"
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

// ─── Input Cleanup Helpers ─────────────────────────────────────────
function formatPhone(phone: string): string {
    const cleaned = phone.replace(/\D/g, "")
    // Australian mobile format 04XX XXX XXX
    if (cleaned.length === 10 && cleaned.startsWith("04")) {
        return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)}`
    }
    return phone // Return as-is if it doesn't match standard 10 digit
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
    const [onboardingStep, setOnboardingStep] = useState(0)
    const [onboardingData, setOnboardingData] = useState<{
        businessName?: string
        location?: string
        tradeType?: string
        phone?: string
        industryType?: "TRADES"
        agentMode?: "EXECUTE" | "ORGANIZE" | "FILTER"
        workingHoursStart?: string
        workingHoursEnd?: string
        agendaNotifyTime?: string
        wrapupNotifyTime?: string
        callOutFee?: number
        pricingMode?: "BOOK_ONLY" | "CALL_OUT" | "STANDARD"
        leadSources?: string[]
        autoCallLeads?: boolean
        emergencyBypass?: boolean
        autoUpdateGlossary?: boolean
        digestPreference?: "immediate" | "daily" | "weekly"
        businessContact?: { phone?: string; email?: string; address?: string }
    }>({})

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        // Only scroll when new messages are added or typing state changes, not on every render
        if (messages.length > 0 || isTyping) {
            scrollToBottom()
        }
    }, [messages.length, isTyping])

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
        }, 300)
    }

    const handleChoice = (choice: { label: string; value: string }) => {
        const userMsg: Message = {
            id: crypto.randomUUID(),
            role: "user",
            content: choice.label,
        }
        setMessages(prev => [...prev, userMsg])
        setIsTyping(true)

        if (onboardingStep === 1) {
            setOnboardingData(prev => ({ ...prev, agentMode: choice.value as "EXECUTE" | "ORGANIZE" | "FILTER" }))
            setOnboardingStep(2)
            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "What are your typical working hours? (Travis will only schedule within this window.)",
                        type: "text"
                    },
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        type: "draft-card",
                        content: "",
                        draftCard: {
                            kind: "onboarding_hours",
                            fields: [
                                { key: "workingHoursStart", label: "Start", type: "time", defaultValue: "08:00" },
                                { key: "workingHoursEnd", label: "End", type: "time", defaultValue: "17:00" },
                                { key: "agendaNotifyTime", label: "Morning agenda notify", type: "time", defaultValue: "07:30" },
                                { key: "wrapupNotifyTime", label: "Evening wrap-up notify", type: "time", defaultValue: "17:30" },
                            ]
                        }
                    }
                ])
            }, 400)
            return
        }

        if (onboardingStep === 4) {
            const leadSources = choice.value === "later" ? [] : [choice.value]
            setOnboardingData(prev => ({ ...prev, leadSources }))
            setOnboardingStep(5)
            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "When a new lead comes in (e.g. from Hipages), should Travis call them immediately to lock in the job?",
                        type: "choice",
                        choices: [{ label: "Yes, call new leads straight away", value: "yes" }, { label: "No, I'll follow up myself", value: "no" }]
                    }
                ])
            }, 400)
            return
        }

        if (onboardingStep === 5) {
            setOnboardingData(prev => ({ ...prev, autoCallLeads: choice.value === "yes" }))
            setOnboardingStep(6)
            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "Should urgent or after-hours calls bypass the AI and ring you directly?",
                        type: "choice",
                        choices: [{ label: "Yes, ring me for urgent calls", value: "yes" }, { label: "No, let Travis handle them", value: "no" }]
                    }
                ])
            }, 400)
            return
        }

        if (onboardingStep === 6) {
            setOnboardingData(prev => ({ ...prev, emergencyBypass: choice.value === "yes" }))
            setOnboardingStep(7)
            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "Let Travis learn from your conversations to improve quotes and behaviour over time?",
                        type: "choice",
                        choices: [{ label: "Yes, auto-learn", value: "yes" }, { label: "No, keep it fixed", value: "no" }]
                    }
                ])
            }, 400)
            return
        }

        if (onboardingStep === 7) {
            setOnboardingData(prev => ({ ...prev, autoUpdateGlossary: choice.value === "yes" }))
            setOnboardingStep(8)
            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "How do you want your notification digest?",
                        type: "choice",
                        choices: [
                            { label: "Immediate (as they happen)", value: "immediate" },
                            { label: "Daily digest", value: "daily" },
                            { label: "Weekly summary", value: "weekly" },
                        ]
                    }
                ])
            }, 400)
            return
        }

        if (onboardingStep === 8) {
            setOnboardingData(prev => ({ ...prev, digestPreference: choice.value as "immediate" | "daily" | "weekly" }))
            setOnboardingStep(9)
            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "Optional: Add a public phone or email for customers (so Travis can give it out). You can skip and add this later in Settings.",
                        type: "draft-card",
                        draftCard: {
                            kind: "onboarding_business_contact",
                            fields: [
                                { key: "publicPhone", label: "Public phone", type: "text", defaultValue: "", placeholder: "e.g. +61 400 000 000" },
                                { key: "publicEmail", label: "Public email", type: "text", defaultValue: "", placeholder: "hello@yourbusiness.com" },
                            ]
                        }
                    }
                ])
            }, 400)
            return
        }

        setTimeout(() => {
            processStep(choice.value)
        }, 300)
    }

    const handleDraftConfirm = (values: Record<string, string | number | boolean>, kind?: DraftCardData["kind"]) => {
        setDraftValues(prev => ({ ...prev, ...values }))

        if (kind === "onboarding") {
            const tradeTypeVal = resolveTradeType(String(values.tradeType || "").trim())
            const businessNameVal = String(values.businessName || "").trim()
            const locationVal = resolveLocation(String(values.location || "").trim())
            const phoneVal = formatPhone(String(values.phone || "").trim())

            const cleanedValues = {
                ...values,
                tradeType: tradeTypeVal,
                businessName: businessNameVal,
                location: locationVal,
                phone: phoneVal
            }
            const summary = Object.entries(cleanedValues)
                .filter(([k, v]) => v !== "" && v !== undefined && k !== "company" && k !== "name")
                .map(([k, v]) => {
                    const label = k === "tradeType" ? "Trade" : k === "businessName" ? "Business" : k === "location" ? "Location" : k === "phone" ? "Mobile" : k
                    return `${label}: ${v}`
                })
                .join(", ")

            const userMsg: Message = {
                id: crypto.randomUUID(),
                role: "user",
                content: summary ? `✅ Confirmed: ${summary}` : "✅ Done",
            }
            setMessages(prev => [...prev, userMsg])
            setIsTyping(true)
            setTradeType(tradeTypeVal)
            setBusinessName(businessNameVal)
            setLocation(locationVal)
            setIndustry("TRADES")
            setOnboardingData(prev => ({
                ...prev,
                businessName: businessNameVal || `${userName}'s Workspace`,
                location: locationVal,
                tradeType: tradeTypeVal,
                phone: phoneVal,
                industryType: "TRADES",
            }))
            setOnboardingStep(1)
            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "Great! A few more settings so Travis can work the way you want.",
                        type: "text"
                    },
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "How should Travis handle incoming requests from clients?",
                        type: "choice",
                        choices: [
                            { label: "Execute (full autonomy)", value: "EXECUTE" },
                            { label: "Organize (propose, you approve)", value: "ORGANIZE" },
                            { label: "Filter (info only)", value: "FILTER" },
                        ]
                    }
                ])
            }, 600)
            return
        }

        if (kind === "onboarding_hours") {
            const start = String(values.workingHoursStart ?? "08:00").trim()
            const end = String(values.workingHoursEnd ?? "17:00").trim()
            const agenda = String(values.agendaNotifyTime ?? "07:30").trim()
            const wrapup = String(values.wrapupNotifyTime ?? "17:30").trim()
            setOnboardingData(prev => ({ ...prev, workingHoursStart: start, workingHoursEnd: end, agendaNotifyTime: agenda, wrapupNotifyTime: wrapup }))
            setOnboardingStep(3)
            const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: `✅ Hours: ${start} – ${end}` }
            setMessages(prev => [...prev, userMsg])
            setIsTyping(true)
            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "What's your call-out fee (in $)? And how do you charge?",
                        type: "text"
                    },
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        type: "draft-card",
                        content: "",
                        draftCard: {
                            kind: "onboarding_pricing",
                            fields: [
                                { key: "callOutFee", label: "Call-out fee ($)", type: "number", defaultValue: 89, placeholder: "89", suffix: "$" },
                                { key: "pricingMode", label: "Pricing mode", type: "select", defaultValue: "STANDARD", options: [
                                    { label: "Book only (no call-out)", value: "BOOK_ONLY" },
                                    { label: "Call-out + job", value: "CALL_OUT" },
                                    { label: "Standard (quote per job)", value: "STANDARD" },
                                ]},
                            ]
                        }
                    }
                ])
            }, 400)
            return
        }

        if (kind === "onboarding_pricing") {
            const callOutFee = Number(values.callOutFee) || 89
            const pricingMode = (values.pricingMode as "BOOK_ONLY" | "CALL_OUT" | "STANDARD") || "STANDARD"
            setOnboardingData(prev => ({ ...prev, callOutFee, pricingMode }))
            setOnboardingStep(4)
            const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: `✅ Call-out $${callOutFee}, ${pricingMode}` }
            setMessages(prev => [...prev, userMsg])
            setIsTyping(true)
            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "Where do your leads usually come from? (We'll set up email capture for these.)",
                        type: "choice",
                        choices: [
                            { label: "Hipages", value: "hipages" },
                            { label: "Airtasker", value: "airtasker" },
                            { label: "Oneflare", value: "oneflare" },
                            { label: "ServiceSeeking", value: "serviceseeking" },
                            { label: "Google Ads / other", value: "google_other" },
                            { label: "I'll set up later", value: "later" },
                        ]
                    }
                ])
            }, 400)
            return
        }

        if (kind === "onboarding_business_contact") {
            const phone = String(values.publicPhone ?? "").trim()
            const email = String(values.publicEmail ?? "").trim()
            setOnboardingData(prev => ({
                ...prev,
                businessContact: (phone || email) ? { phone: phone || undefined, email: email || undefined } : undefined
            }))
            runCompleteOnboarding({
                ...onboardingData,
                businessContact: (phone || email) ? { phone: phone || undefined, email: email || undefined } : onboardingData.businessContact
            })
            return
        }

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
        setTimeout(() => {
            processStep("DRAFT_CONFIRMED")
        }, 300)
    }

    const runCompleteOnboarding = (finalData: typeof onboardingData) => {
        const businessNameVal = finalData.businessName || userName + "'s Workspace"
        const locationVal = finalData.location || ""
        const tradeTypeVal = finalData.tradeType || "General"
        const phoneVal = finalData.phone || ""
        setMessages(prev => [
            ...prev,
            {
                id: crypto.randomUUID(),
                role: "assistant",
                content: `Setting up ${businessNameVal} and your AI phone number…`,
                type: "text"
            }
        ])
        completeOnboarding({
            businessName: businessNameVal,
            industryType: "TRADES",
            location: locationVal,
            tradeType: tradeTypeVal,
            ownerPhone: phoneVal,
            agentMode: finalData.agentMode,
            workingHoursStart: finalData.workingHoursStart,
            workingHoursEnd: finalData.workingHoursEnd,
            agendaNotifyTime: finalData.agendaNotifyTime,
            wrapupNotifyTime: finalData.wrapupNotifyTime,
            callOutFee: finalData.callOutFee,
            pricingMode: finalData.pricingMode,
            leadSources: finalData.leadSources,
            autoCallLeads: finalData.autoCallLeads,
            emergencyBypass: finalData.emergencyBypass,
            autoUpdateGlossary: finalData.autoUpdateGlossary,
            digestPreference: finalData.digestPreference,
            businessContact: finalData.businessContact,
        }).then((result) => {
                    const phoneNumber = result?.phoneNumber
                    const provisioningError = result?.provisioningError
                    let finalMessage = `All set! 🎉 You're the team manager — invite your team from the Team page and they'll see the jobs you assign to them. I'll show you around in a quick walkthrough.`
                    if (phoneNumber) {
                        finalMessage = `All set! 🎉 Your business number is ${phoneNumber} — use it for SMS and calls.${phoneVal ? " We've sent it to your mobile too." : ""} You're the team manager; invite your team from the Team page. I'll show you around in a quick walkthrough.`
                    } else if (provisioningError) {
                        finalMessage = `All set! 🎉 We couldn't set up your phone number right now. You can add it later in Settings → Phone. You're the team manager; invite your team from the Team page. I'll show you around in a quick walkthrough.`
                    }
                    setMessages(prev => [
                        ...prev,
                        {
                            id: crypto.randomUUID(),
                            role: "assistant",
                            content: finalMessage,
                            type: "text"
                        }
                    ])
                    setTimeout(() => router.push("/dashboard?tutorial=true"), 2000)
                }).catch(() => {
                    setMessages(prev => [
                        ...prev,
                        {
                            id: crypto.randomUUID(),
                            role: "assistant",
                            content: "All set! 🎉 You're the team manager — invite your team from the Team page. I'll show you around in a quick walkthrough.",
                            type: "text"
                        }
                    ])
                    setTimeout(() => router.push("/dashboard?tutorial=true"), 1500)
                })
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
            }, 600)
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
                {data.kind === "onboarding_hours" && "🕐 Working hours"}
                {data.kind === "onboarding_pricing" && "💰 Call-out & pricing"}
                {data.kind === "onboarding_business_contact" && "📞 Public contact (optional)"}
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

            <div className="flex gap-2">
                {data.kind === "onboarding_business_contact" && (
                    <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => onConfirm({ publicPhone: "", publicEmail: "" }, data.kind)}
                    >
                        Skip
                    </Button>
                )}
                <Button
                    type="button"
                    size="sm"
                    className={data.kind === "onboarding_business_contact" ? "flex-1" : "w-full"}
                    onClick={() => onConfirm(values, data.kind)}
                    disabled={data.kind === "onboarding" && !String(values.phone ?? "").trim()}
                >
                    ✅ Confirm
                </Button>
            </div>
        </motion.div>
    )
}
