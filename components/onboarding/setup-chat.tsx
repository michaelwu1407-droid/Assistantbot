"use client"

import { useState, useRef, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { Send, Plus } from "lucide-react"
import { useIndustry } from "@/components/providers/industry-provider"
import { completeOnboarding } from "@/actions/workspace-actions"
import { getOrAllocateLeadCaptureEmail } from "@/actions/settings-actions"

type Message = {
    id: string
    role: "assistant" | "user"
    content: string
    type?: "text" | "choice" | "draft-card"
    choices?: { label: string; value: string; icon?: React.ElementType }[]
    draftCard?: DraftCardData
}

type DraftCardData = {
    kind: "pricing" | "hours" | "autonomy" | "onboarding" | "onboarding_hours" | "onboarding_pricing" | "onboarding_business_contact" | "onboarding_bouncer"
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

type PricingServiceRow = {
    service: string
    minFee: string
    maxFee: string
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
    const [draftValues, setDraftValues] = useState<Record<string, unknown>>({})
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
        emergencyHoursStart?: string
        emergencyHoursEnd?: string
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
        pricingServices?: { service: string; minFee?: number; maxFee?: number }[]
        disableAiQuoting?: boolean
        leadCaptureMode?: "connect_inbox" | "manual_forward"
        leadCaptureEmail?: string
        callForwardingEnabled?: boolean
        exclusionCriteria?: string
    }>({ autoUpdateGlossary: true })

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

    const handleChoice = async (choice: { label: string; value: string }) => {
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
                                { key: "emergencyHoursStart", label: "Emergency hours start (optional)", type: "time", defaultValue: "" },
                                { key: "emergencyHoursEnd", label: "Emergency hours end (optional)", type: "time", defaultValue: "" },
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
            if (choice.value === "later") {
                setOnboardingData(prev => ({ ...prev, emergencyBypass: false, autoUpdateGlossary: true }))
                setOnboardingStep(8)
                setTimeout(() => {
                    setIsTyping(false)
                    setMessages(prev => [
                        ...prev,
                        {
                            id: crypto.randomUUID(),
                            role: "assistant",
                            content: "No stress - you can set up lead capture later in Settings. For urgent/after-hours leads, Travis will notify you in-app so you can review details and contact the lead yourself.",
                            type: "text",
                        },
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

            setOnboardingStep(5)
            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "By connecting Travis to your email, he can monitor leads and auto-reach out to lock down jobs. Want to connect your inbox now?",
                        type: "choice",
                        choices: [
                            { label: "Yes, connect inbox", value: "connect_inbox" },
                            { label: "No, I will forward emails", value: "manual_forward" },
                        ]
                    }
                ])
            }, 400)
            return
        }

        if (onboardingStep === 5) {
            if (choice.value === "connect_inbox") {
                let leadCaptureEmail = ""
                try {
                    leadCaptureEmail = await getOrAllocateLeadCaptureEmail()
                } catch {
                    leadCaptureEmail = "lead-capture@inbound.earlymark.ai"
                }
                setOnboardingData(prev => ({ ...prev, autoCallLeads: true, leadCaptureMode: "connect_inbox", leadCaptureEmail }))
                setOnboardingData(prev => ({ ...prev, emergencyBypass: false, autoUpdateGlossary: true }))
                setOnboardingStep(8)
                setTimeout(() => {
                    setIsTyping(false)
                    setMessages(prev => [
                        ...prev,
                        {
                            id: crypto.randomUUID(),
                            role: "assistant",
                            content: `Perfect. We'll finish setup, then take you to Integrations to connect Gmail/Outlook. Your lead-capture address is ${leadCaptureEmail}. For urgent/after-hours leads, Travis will notify you in-app so you can decide and contact the lead yourself.`, 
                            type: "text",
                        },
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

            let leadCaptureEmail = ""
            try {
                leadCaptureEmail = await getOrAllocateLeadCaptureEmail()
            } catch {
                leadCaptureEmail = "lead-capture@inbound.earlymark.ai"
            }
            setOnboardingData(prev => ({ ...prev, autoCallLeads: true, leadCaptureMode: "manual_forward", leadCaptureEmail }))
            setOnboardingData(prev => ({ ...prev, emergencyBypass: false, autoUpdateGlossary: true }))
            setOnboardingStep(8)
            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: `No worries. Forward lead emails to ${leadCaptureEmail} and Travis will lock down leads automatically. For urgent/after-hours leads, he will notify you in-app so you can review details and contact the lead yourself.`,
                        type: "text",
                    },
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
            runCompleteOnboarding({ ...onboardingData, digestPreference: choice.value as "immediate" | "daily" | "weekly" })
            return
        }

        setTimeout(() => {
            processStep(choice.value)
        }, 300)
    }

    const handleDraftConfirm = (values: Record<string, unknown>, kind?: DraftCardData["kind"]) => {
        setDraftValues(prev => ({ ...prev, ...values }))

        if (kind === "onboarding") {
            const tradeTypeVal = resolveTradeType(String(values.tradeType || "").trim())
            const businessNameVal = String(values.businessName || "").trim()
            const locationVal = resolveLocation(String(values.location || "").trim())
            const phoneVal = formatPhone(String(values.phone || "").trim())
            const phoneDigits = phoneVal.replace(/\D/g, "")
            const publicPhone = String(values.publicPhone || "").trim()
            const publicEmail = String(values.publicEmail || "").trim()
            const publicAddress = String(values.publicAddress || "").trim()

            if (!phoneVal || phoneDigits.length < 8) {
                const warnMsg: Message = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: "Please add a valid personal mobile number. This is required for verification and urgent app alerts.",
                    type: "text",
                }
                setMessages(prev => [...prev, warnMsg])
                setIsTyping(false)
                return
            }

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
                    const label = k === "tradeType"
                        ? "Trade"
                        : k === "businessName"
                            ? "Business"
                            : k === "location"
                                ? "Location"
                                : k === "phone"
                                    ? "Mobile"
                                    : k === "publicPhone"
                                        ? "Public phone"
                                        : k === "publicEmail"
                                        ? "Public email"
                                        : k === "publicAddress"
                                            ? "Public address"
                                            : k
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
                callForwardingEnabled: Boolean(values.callForwardingEnabled),
                industryType: "TRADES",
                businessContact: (publicPhone || publicEmail)
                    ? { phone: publicPhone || undefined, email: publicEmail || undefined, address: publicAddress || locationVal || undefined }
                    : { address: publicAddress || locationVal || undefined },
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
            const emergencyStart = String(values.emergencyHoursStart ?? "").trim()
            const emergencyEnd = String(values.emergencyHoursEnd ?? "").trim()
            const agenda = String(values.agendaNotifyTime ?? "07:30").trim()
            const wrapup = String(values.wrapupNotifyTime ?? "17:30").trim()
            setOnboardingData(prev => ({ ...prev, workingHoursStart: start, workingHoursEnd: end, emergencyHoursStart: emergencyStart || undefined, emergencyHoursEnd: emergencyEnd || undefined, agendaNotifyTime: agenda, wrapupNotifyTime: wrapup }))
            setOnboardingStep(3)
            const emergencySummary = emergencyStart && emergencyEnd ? `, emergency ${emergencyStart}-${emergencyEnd}` : ", no emergency hours"
            const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: `✅ Hours: ${start} – ${end}${emergencySummary}` }
            setMessages(prev => [...prev, userMsg])
            setIsTyping(true)
            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "Set your call-out fee and common service price ranges.",
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
                                { key: "callOutFee", label: "Call-out fee ($)", type: "number", defaultValue: "", placeholder: "", suffix: "$" },
                            ]
                        }
                    }
                ])
            }, 400)
            return
        }

        if (kind === "onboarding_pricing") {
            const disableAiQuoting = Boolean(values.disableAiQuoting)
            const callOutFeeRaw = values.callOutFee
            const callOutFee = disableAiQuoting
                ? 0
                : (callOutFeeRaw === "" || callOutFeeRaw == null ? 0 : Number(callOutFeeRaw) || 0)
            const pricingMode: "BOOK_ONLY" | "CALL_OUT" | "STANDARD" = disableAiQuoting ? "BOOK_ONLY" : "STANDARD"
            const rawServices = Array.isArray(values.pricingServices) ? values.pricingServices as PricingServiceRow[] : []
            const pricingServices = disableAiQuoting
                ? []
                : rawServices
                    .map((row) => ({
                        service: String(row.service || "").trim(),
                        minFee: row.minFee ? Number(row.minFee) : undefined,
                        maxFee: row.maxFee ? Number(row.maxFee) : undefined,
                    }))
                    .filter((row) => row.service || row.minFee !== undefined || row.maxFee !== undefined)
            setOnboardingData(prev => ({ ...prev, callOutFee, pricingMode, pricingServices, disableAiQuoting }))
            // Go to bouncer/exclusion step before lead sources
            setOnboardingStep(3)  // Will be handled by bouncer card below
            const userMsg: Message = {
                id: crypto.randomUUID(),
                role: "user",
                content: disableAiQuoting
                    ? "✅ Travis will skip pricing quotes"
                    : `✅ Call-out $${callOutFee}${pricingServices.length ? `, ${pricingServices.length} service rate${pricingServices.length > 1 ? "s" : ""}` : ""}`
            }
            setMessages(prev => [...prev, userMsg])
            setIsTyping(true)
            setTimeout(() => {
                setIsTyping(false)
                setMessages(prev => [
                    ...prev,
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: "Any jobs Travis should strictly turn away? These are hard 'No-Go' rules — Travis will politely decline anything that matches. Leave blank to accept all leads.",
                        type: "text"
                    },
                    {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        type: "draft-card",
                        content: "",
                        draftCard: {
                            kind: "onboarding_bouncer",
                            fields: [
                                { key: "exclusionCriteria", label: "Strict Exclusion Rules (The Bouncer)", type: "text", defaultValue: "", placeholder: "No 2-story roofs, no asbestos, no jobs in CBD, no emergency calls after 10pm" },
                            ]
                        }
                    }
                ])
            }, 400)
            return
        }

        if (kind === "onboarding_bouncer") {
            const exclusionCriteria = String(values.exclusionCriteria ?? "").trim()
            setOnboardingData(prev => ({ ...prev, exclusionCriteria: exclusionCriteria || undefined }))
            setOnboardingStep(4)
            const userMsg: Message = {
                id: crypto.randomUUID(),
                role: "user",
                content: exclusionCriteria ? `✅ No-go rules: ${exclusionCriteria}` : "✅ No exclusions — accept all leads"
            }
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
                            { label: "Google Ads", value: "google_ads" },
                            { label: "Hipages", value: "hipages" },
                            { label: "Airtasker", value: "airtasker" },
                            { label: "Oneflare", value: "oneflare" },
                            { label: "ServiceSeeking", value: "serviceseeking" },
                            { label: "I'll set up later", value: "later" },
                        ]
                    }
                ])
            }, 400)
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
            ownerName: userName,
            businessName: businessNameVal,
            industryType: "TRADES",
            location: locationVal,
            tradeType: tradeTypeVal,
            ownerPhone: phoneVal,
            callForwardingEnabled: finalData.callForwardingEnabled,
            agentMode: finalData.agentMode,
            workingHoursStart: finalData.workingHoursStart,
            workingHoursEnd: finalData.workingHoursEnd,
            emergencyHoursStart: finalData.emergencyHoursStart,
            emergencyHoursEnd: finalData.emergencyHoursEnd,
            agendaNotifyTime: finalData.agendaNotifyTime,
            wrapupNotifyTime: finalData.wrapupNotifyTime,
            callOutFee: finalData.callOutFee,
            pricingMode: finalData.pricingMode,
            leadSources: finalData.leadSources,
            autoCallLeads: finalData.autoCallLeads,
            emergencyBypass: finalData.emergencyBypass,
            autoUpdateGlossary: true,
            digestPreference: finalData.digestPreference,
            businessContact: finalData.businessContact,
            pricingServices: finalData.pricingServices,
            disableAiQuoting: finalData.disableAiQuoting,
            exclusionCriteria: finalData.exclusionCriteria,
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
            const nextRoute = finalData.leadCaptureMode === "connect_inbox"
                ? "/dashboard/settings/integrations?onboarding=connect_inbox"
                : "/dashboard?tutorial=true"
            setTimeout(() => router.push(nextRoute), 2000)
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
            const fallbackRoute = finalData.leadCaptureMode === "connect_inbox"
                ? "/dashboard/settings/integrations?onboarding=connect_inbox"
                : "/dashboard?tutorial=true"
            setTimeout(() => router.push(fallbackRoute), 1500)
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
                                { key: "callForwardingEnabled", label: "Forward calls to Travis", type: "toggle", defaultValue: true },
                                { key: "publicPhone", label: "Public phone (optional)", type: "text", defaultValue: "", placeholder: "Shown by Travis to customers" },
                                { key: "publicEmail", label: "Public email (optional)", type: "text", defaultValue: "", placeholder: "Shown by Travis to customers" },
                                { key: "publicAddress", label: "Business address (optional)", type: "text", defaultValue: "", placeholder: "Shown by Travis to customers" },
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
        <div className="flex flex-col h-[min(64dvh,620px)] min-h-[460px] w-full max-w-2xl mx-auto glass-card rounded-2xl shadow-xl border border-border/50 overflow-hidden">
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
function DraftCardUI({ data, onConfirm }: { data: DraftCardData; onConfirm: (values: Record<string, unknown>, kind?: DraftCardData["kind"]) => void }) {
    const [values, setValues] = useState<Record<string, unknown>>(() => {
        const init: Record<string, unknown> = {}
        data.fields.forEach(f => {
            init[f.key] = f.defaultValue
        })
        return init
    })
    const [pricingRows, setPricingRows] = useState<PricingServiceRow[]>([
        { service: "", minFee: "", maxFee: "" },
        { service: "", minFee: "", maxFee: "" },
        { service: "", minFee: "", maxFee: "" },
    ])
    const [disableAiQuoting, setDisableAiQuoting] = useState(false)

    const updateValue = (key: string, value: unknown) => {
        setValues(prev => ({ ...prev, [key]: value }))
    }

    const addPricingRow = () => {
        setPricingRows(prev => [...prev, { service: "", minFee: "", maxFee: "" }])
    }

    const updatePricingRow = (index: number, key: keyof PricingServiceRow, value: string) => {
        setPricingRows(prev => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)))
    }

    const handleToggleDisableAiQuoting = (checked: boolean) => {
        setDisableAiQuoting(checked)
        if (checked) {
            updateValue("callOutFee", "")
            setPricingRows(prev => prev.map(() => ({ service: "", minFee: "", maxFee: "" })))
        }
    }

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 rounded-xl border border-border shadow-lg p-5 space-y-4 max-w-xl"
        >
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
                {data.kind === "pricing" && "Pricing Setup"}
                {data.kind === "hours" && "Working Hours"}
                {data.kind === "autonomy" && "AI Autonomy Level"}
                {data.kind === "onboarding" && "Your details"}
                {data.kind === "onboarding_hours" && "Working hours"}
                {data.kind === "onboarding_pricing" && "Call-out and pricing"}
                {data.kind === "onboarding_bouncer" && "The Bouncer"}
                {data.kind === "onboarding_business_contact" && "Public contact (optional)"}
            </h3>

            {data.kind === "onboarding_pricing" ? (
                <>
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Call out fee</label>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">$</span>
                            <Input
                                type="number"
                                value={String(values.callOutFee ?? "")}
                                onChange={(e) => updateValue("callOutFee", e.target.value)}
                                placeholder=""
                                className="h-9 text-sm"
                                disabled={disableAiQuoting}
                            />
                        </div>
                    </div>

                    <div className="rounded-md border border-border/60 p-3 space-y-3">
                        <p className="text-xs text-muted-foreground">
                            Input your most common services and fee range (can always add more later)
                        </p>

                        <div className={disableAiQuoting ? "opacity-50 pointer-events-none" : ""}>
                            <div className="grid grid-cols-12 gap-2 text-[11px] font-medium text-muted-foreground mb-1">
                                <span className="col-span-6">Service</span>
                                <span className="col-span-3">From ($)</span>
                                <span className="col-span-3">To ($)</span>
                            </div>
                            <div className="space-y-2">
                                {pricingRows.map((row, index) => (
                                    <div key={`pricing-row-${index}`} className="grid grid-cols-12 gap-2">
                                        <Input
                                            type="text"
                                            value={row.service}
                                            onChange={(e) => updatePricingRow(index, "service", e.target.value)}
                                            placeholder="e.g. Tap repair"
                                            className="h-9 text-sm col-span-6"
                                        />
                                        <Input
                                            type="number"
                                            value={row.minFee}
                                            onChange={(e) => updatePricingRow(index, "minFee", e.target.value)}
                                            placeholder="80"
                                            className="h-9 text-sm col-span-3"
                                        />
                                        <Input
                                            type="number"
                                            value={row.maxFee}
                                            onChange={(e) => updatePricingRow(index, "maxFee", e.target.value)}
                                            placeholder="140"
                                            className="h-9 text-sm col-span-3"
                                        />
                                    </div>
                                ))}
                            </div>
                            <Button type="button" variant="ghost" size="sm" className="mt-2 px-2 justify-start" onClick={addPricingRow}>
                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                Add service row
                            </Button>
                        </div>
                    </div>

                    <label className="flex items-start gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={disableAiQuoting}
                            onChange={(e) => handleToggleDisableAiQuoting(e.target.checked)}
                            className="mt-0.5 h-4 w-4 accent-primary"
                        />
                        <span className="text-xs text-muted-foreground">
                            Don't let Travis quote these prices and focus on booking times only.
                        </span>
                    </label>
                </>
            ) : (
                <>
                    {data.fields.map((field) => (
                        <div key={field.key} className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                            {field.type === "number" && (
                                <div className="flex items-center gap-2">
                                    {field.suffix === "$" && <span className="text-sm text-muted-foreground">$</span>}
                                    <Input
                                        type="number"
                                        value={String(values[field.key] ?? "")}
                                        onChange={(e) => updateValue(field.key, e.target.value === "" ? "" : parseFloat(e.target.value))}
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
                                    value={String(values[field.key] ?? "")}
                                    onChange={(e) => updateValue(field.key, e.target.value)}
                                    placeholder={field.placeholder}
                                    className="h-9 text-sm"
                                />
                            )}
                            {field.type === "time" && (
                                <Input
                                    type="time"
                                    value={String(values[field.key] ?? "")}
                                    onChange={(e) => updateValue(field.key, e.target.value)}
                                    className="h-9 text-sm"
                                />
                            )}
                            {field.type === "select" && (
                                <select
                                    value={String(values[field.key] ?? "")}
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
                                        onClick={() => updateValue(field.key, !Boolean(values[field.key]))}
                                        className={`w-10 h-5 rounded-full transition-colors ${values[field.key] ? "bg-primary" : "bg-muted"}`}
                                    >
                                        <div className={`w-4 h-4 rounded-full bg-white shadow transition-transform ${values[field.key] ? "translate-x-5" : "translate-x-0.5"}`} />
                                    </button>
                                    <span className="text-xs text-muted-foreground">{values[field.key] ? "Yes" : "No"}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </>
            )}

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
                    onClick={() => onConfirm(data.kind === "onboarding_pricing" ? { ...values, disableAiQuoting, pricingServices: pricingRows } : values, data.kind)}
                    disabled={data.kind === "onboarding" && !String(values.phone ?? "").trim()}
                >
                    Confirm
                </Button>
            </div>
        </motion.div>
    )
}



