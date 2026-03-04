"use client"

import { useState, useCallback, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { toast } from "sonner"
import {
  Loader2, Globe, User, Phone, Mail, Building2,
  Zap, FileEdit, Eye, ChevronRight, ChevronLeft,
  Plus, Trash2, CheckCircle2, MapPin, Clock, Shield,
  MessageSquare, Play, Square, Volume2, Sparkles, Info, Send,
  File as FileIcon,
} from "lucide-react"
import { scrapeWebsite, type ScrapeResult } from "@/actions/scraper-actions"
import { saveTraceyOnboarding, type TraceyOnboardingData } from "@/actions/tracey-onboarding"

// ─── Types ──────────────────────────────────────────────────────

type AgentMode = "EXECUTION" | "DRAFT" | "INFO_ONLY"

interface ServiceRow {
  serviceName: string
  callOutFee: number | undefined
  priceMin: number | undefined
  priceMax: number | undefined
  traceyNotes: string
}

// ─── Constants ──────────────────────────────────────────────────

const TRADE_TYPES = [
  "Plumber", "Electrician", "HVAC Technician", "Carpenter",
  "Locksmith", "Roofer", "Painter", "Tiler",
  "Landscaper", "Pest Control", "Cleaner", "Handyman", "Other",
]

const TRADE_TYPE_ALIASES: Record<string, string> = {
  plumbing: "Plumber", plumbers: "Plumber", plumber: "Plumber",
  electrical: "Electrician", electricians: "Electrician", electrician: "Electrician",
  hvac: "HVAC Technician", "air conditioning": "HVAC Technician", "aircon": "HVAC Technician",
  carpentry: "Carpenter", carpenters: "Carpenter", carpenter: "Carpenter",
  locksmith: "Locksmith", locksmiths: "Locksmith",
  roofing: "Roofer", roofers: "Roofer", roofer: "Roofer",
  painting: "Painter", painters: "Painter", painter: "Painter",
  tiling: "Tiler", tilers: "Tiler", tiler: "Tiler",
  landscaping: "Landscaper", landscapers: "Landscaper", landscaper: "Landscaper",
  "pest control": "Pest Control", "pest": "Pest Control",
  cleaning: "Cleaner", cleaners: "Cleaner", cleaner: "Cleaner",
  handyman: "Handyman", "handy man": "Handyman",
}

function matchTradeType(scraped: string): string {
  const lower = scraped.toLowerCase().trim()
  if (TRADE_TYPE_ALIASES[lower]) return TRADE_TYPE_ALIASES[lower]
  const exact = TRADE_TYPES.find((t) => t.toLowerCase() === lower)
  if (exact) return exact
  const partial = TRADE_TYPES.find((t) => lower.includes(t.toLowerCase()) || t.toLowerCase().includes(lower))
  return partial || scraped
}

function parseOperatingHours(raw: string): string {
  const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi
  const matches = [...raw.matchAll(timePattern)]
  if (matches.length >= 2) {
    const toTime = (m: RegExpMatchArray) => {
      let h = parseInt(m[1])
      const min = m[2] || "00"
      const ampm = (m[3] || "").toLowerCase()
      if (ampm === "pm" && h < 12) h += 12
      if (ampm === "am" && h === 12) h = 0
      return `${String(h).padStart(2, "0")}:${min}`
    }
    return `${toTime(matches[0])} - ${toTime(matches[1])}`
  }
  return raw
}

const TRACEY_VOICES = [
  { id: "a4a16c5e-5902-4732-b9b6-2a48efd2e11b", label: "Casual Tracey (Default)", description: "Casual, warm, Australian female" },
  { id: "8985388c-1332-4ce7-8d55-789628aa3df4", label: "Professional Tracey", description: "Polished, professional tone" },
  { id: "7d7d769c-5ab1-4dd5-bb17-ec8d4b69d03d", label: "Friendly Tracey", description: "Upbeat, approachable style" },
  { id: "ba0add52-783c-4ec0-8b9c-7a6b60f99d1c", label: "Confident Tracey", description: "Bold, assertive delivery" },
]

const VOICE_PREVIEW_TEXT = "G'day! I'm Tracey, your AI receptionist. How can I help you today?"

const MODE_DESCRIPTIONS: Record<AgentMode, { title: string; icon: typeof Zap; description: string; traceyLine: string }> = {
  EXECUTION: {
    title: "Execute",
    icon: Zap,
    description: "Full autonomy — Tracey contacts customers, quotes prices, and arranges bookings on your behalf.",
    traceyLine: "Leave it with me! I'll handle the customer from first call to booking confirmation. You just show up and do what you do best.",
  },
  DRAFT: {
    title: "Review & approve",
    icon: FileEdit,
    description: "Tracey chats with customers and drafts responses & deals for your approval before sending.",
    traceyLine: "I'll chat with the customer and get all the details, then send you a quick summary to approve before anything goes out.",
  },
  INFO_ONLY: {
    title: "Info only",
    icon: Eye,
    description: "Tracey only summarises enquiries and alerts you. No outbound customer contact.",
    traceyLine: "I'll keep my ears open and give you neat summaries of every enquiry — you handle the rest when you're ready.",
  },
}

// ─── Scenario Simulator Conversations ───────────────────────────

const SCENARIO_STEPS = ["Greeting", "Service Enquiry", "Booking/Price", "Goodbye"] as const

function getScenarioDialogue(mode: AgentMode): Record<typeof SCENARIO_STEPS[number], { customer: string; tracey: string }> {
  const dialogues: Record<AgentMode, Record<typeof SCENARIO_STEPS[number], { customer: string; tracey: string }>> = {
    EXECUTION: {
      Greeting: {
        customer: "Hi, I need a plumber urgently — my kitchen tap is leaking everywhere!",
        tracey: "G'day! Sorry to hear about the leak. Let me get that sorted for you right away. Can I grab your name and address?",
      },
      "Service Enquiry": {
        customer: "Yeah, it's Sarah at 42 Smith St, Parramatta. How much will it cost?",
        tracey: "Thanks Sarah! A tap repair is usually between $150-$250 depending on the issue. I'll book our plumber in for you.",
      },
      "Booking/Price": {
        customer: "That sounds fine. When can someone come?",
        tracey: "I've got a slot tomorrow at 10am. I'll lock that in for you and send a confirmation text. The call-out fee of $89 is waived if you go ahead with the repair.",
      },
      Goodbye: {
        customer: "Perfect, thanks!",
        tracey: "You're all set, Sarah! You'll get a text shortly. Have a great arvo!",
      },
    },
    DRAFT: {
      Greeting: {
        customer: "Hi, I need a plumber urgently — my kitchen tap is leaking everywhere!",
        tracey: "G'day! Sorry about the leak. Let me take your details and I'll get our plumber to confirm availability for you.",
      },
      "Service Enquiry": {
        customer: "Yeah, it's Sarah at 42 Smith St, Parramatta. How much will it cost?",
        tracey: "Thanks Sarah! I'll put together a draft quote for the tap repair and send it to the boss for approval. I'll get back to you shortly.",
      },
      "Booking/Price": {
        customer: "Okay, how long will that take?",
        tracey: "[Draft sent to you for review] Sarah needs a tap repair at 42 Smith St, Parramatta. Suggested: $150-$250 range, tomorrow 10am slot.",
      },
      Goodbye: {
        customer: "Thanks for letting me know.",
        tracey: "No worries Sarah! You'll hear from us as soon as the boss gives the thumbs up. Shouldn't be long!",
      },
    },
    INFO_ONLY: {
      Greeting: {
        customer: "Hi, I need a plumber urgently — my kitchen tap is leaking everywhere!",
        tracey: "G'day! I'll take down the details and pass them straight to our plumber.",
      },
      "Service Enquiry": {
        customer: "It's Sarah at 42 Smith St, Parramatta. Can you give me a quote?",
        tracey: "I've noted that down, Sarah. Our plumber will give you a call back with a quote and availability.",
      },
      "Booking/Price": {
        customer: "When will I hear back?",
        tracey: "I'll flag this as urgent and the plumber should be in touch within the hour.",
      },
      Goodbye: {
        customer: "Alright, thanks.",
        tracey: "[Alert sent to you] New urgent enquiry: Sarah, 42 Smith St Parramatta — leaking kitchen tap. Awaiting your callback.",
      },
    },
  }
  return dialogues[mode]
}

// ─── TraceyBubble ───────────────────────────────────────────────

function TraceyBubble({ text, animate = true }: { text: string; animate?: boolean }) {
  return (
    <motion.div
      initial={animate ? { opacity: 0, y: 10 } : false}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3 mb-4"
    >
      <div className="shrink-0 w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
        <Sparkles className="h-4 w-4 text-emerald-600" />
      </div>
      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg rounded-tl-none px-4 py-2.5 text-sm text-emerald-900 dark:text-emerald-100 max-w-md">
        {text}
      </div>
    </motion.div>
  )
}

// ─── Main Component ─────────────────────────────────────────────

const STEPS = [
  { label: "Contact Card", icon: User },
  { label: "Tracey Modes", icon: Zap },
  { label: "Business Review", icon: Building2 },
  { label: "Email Setup", icon: Mail },
  { label: "Services & Pricing", icon: MessageSquare },
  { label: "Try Tracey", icon: Play },
  { label: "Go Live", icon: Send },
]

export function TraceyOnboarding() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  // Step 1: Draft Contact Card
  const [ownerName, setOwnerName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [businessName, setBusinessName] = useState("")
  const [websiteUrl, setWebsiteUrl] = useState("")

  // Background scrape state
  const [scraping, setScraping] = useState(false)
  const [scrapeData, setScrapeData] = useState<ScrapeResult | null>(null)
  const scrapeTriggered = useRef(false)

  // Step 2: Autonomy Selector
  const [agentMode, setAgentMode] = useState<AgentMode>("EXECUTION")

  // Step 3: Scrape Review & Business Deep-Dive
  const [tradeType, setTradeType] = useState("")
  const [publicPhone, setPublicPhone] = useState("")
  const [publicEmail, setPublicEmail] = useState("")
  const [physicalAddress, setPhysicalAddress] = useState("")
  const [baseSuburb, setBaseSuburb] = useState("")
  const [serviceRadius, setServiceRadius] = useState(20)
  const [standardWorkHours, setStandardWorkHours] = useState("Mon-Fri, 07:00-15:30")
  const [emergencyService, setEmergencyService] = useState(false)
  const [emergencySurcharge, setEmergencySurcharge] = useState(350)
  const [emergencyHandling, setEmergencyHandling] = useState("")
  const [specialNotes, setSpecialNotes] = useState("")
  const [acceptsMultilingual, setAcceptsMultilingual] = useState(false)

  // Step 4: Services & Pricing
  const [globalCallOutFee, setGlobalCallOutFee] = useState<number | undefined>(undefined)
  const [services, setServices] = useState<ServiceRow[]>([
    { serviceName: "", callOutFee: undefined, priceMin: undefined, priceMax: undefined, traceyNotes: "" },
  ])

  // Step 5: Simulator
  const [simMode, setSimMode] = useState<AgentMode>("EXECUTION")
  const [simStep, setSimStep] = useState(0)
  const [selectedVoice, setSelectedVoice] = useState("a4a16c5e-5902-4732-b9b6-2a48efd2e11b")
  const [loadingVoiceId, setLoadingVoiceId] = useState<string | null>(null)
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const stopVoicePreview = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.src = ""
      audioRef.current = null
    }
    setPlayingVoiceId(null)
  }, [])

  const playVoicePreview = useCallback(async (voiceId: string) => {
    if (playingVoiceId === voiceId) {
      stopVoicePreview()
      return
    }
    stopVoicePreview()
    setLoadingVoiceId(voiceId)
    try {
      const res = await fetch("/api/voice-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId, text: VOICE_PREVIEW_TEXT }),
      })
      if (!res.ok) throw new Error("TTS failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => {
        setPlayingVoiceId(null)
        URL.revokeObjectURL(url)
      }
      audio.onerror = () => {
        setPlayingVoiceId(null)
        URL.revokeObjectURL(url)
        toast.error("Audio playback failed")
      }
      await audio.play()
      setPlayingVoiceId(voiceId)
    } catch {
      toast.error("Voice preview unavailable")
    } finally {
      setLoadingVoiceId(null)
    }
  }, [playingVoiceId, stopVoicePreview])

  // Step 6: Provisioning
  const [referralSource, setReferralSource] = useState("")
  const [provisionResult, setProvisionResult] = useState<{
    phoneNumber?: string
    leadsEmail?: string
    provisioningError?: string
  } | null>(null)
  const [eagerPhoneNumber, setEagerPhoneNumber] = useState<string | null>(null)
  const [eagerProvisioningLoading, setEagerProvisioningLoading] = useState(false)

  // Step 3 (Email): Inbox connection
  const [inboxConnectionType, setInboxConnectionType] = useState<"oauth" | "forward" | null>(null)
  const [preGenLeadsEmail, setPreGenLeadsEmail] = useState<string | null>(null)

  // Step 2: Document uploads
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ name: string; path: string; fileType?: string; fileSize?: number }>>([])
  const [uploadingFile, setUploadingFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // ── Background Scraping ──

  const triggerScrape = useCallback(async () => {
    if (!websiteUrl || scrapeTriggered.current) return
    const url = websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`
    scrapeTriggered.current = true
    setScraping(true)
    try {
      const result = await scrapeWebsite(url)
      if (result.success && result.data) {
        setScrapeData(result.data)
        // Pre-fill fields from scrape data
        if (result.data.businessName && !businessName) setBusinessName(result.data.businessName)
        if (result.data.tradeType && !tradeType) setTradeType(matchTradeType(result.data.tradeType))
        if (result.data.phone && !publicPhone) setPublicPhone(result.data.phone)
        if (result.data.email && !publicEmail) setPublicEmail(result.data.email)
        if (result.data.address && !physicalAddress) {
          setPhysicalAddress(result.data.address)
          // Auto-extract suburb from address if not already set
          if (!baseSuburb && result.data.address) {
            const suburbMatch = result.data.address.match(/([^,]+),?\s*(?:NSW|VIC|QLD|WA|SA|TAS|ACT|NT)?\s*\d{4}/i)
            if (suburbMatch) {
              setBaseSuburb(suburbMatch[1].trim())
            }
          }
        }
        if (result.data.operatingHours) setStandardWorkHours(parseOperatingHours(result.data.operatingHours))
        if (result.data.suburbs?.length && !baseSuburb) setBaseSuburb(result.data.suburbs[0])
        // Pre-fill services
        if (result.data.services?.length) {
          setServices(
            result.data.services.map((s) => ({
              serviceName: s.name,
              callOutFee: undefined,
              priceMin: s.priceRange ? parseFloat(s.priceRange.replace(/[^0-9.]/g, "")) || undefined : undefined,
              priceMax: undefined,
              traceyNotes: "",
            }))
          )
        }
      }
    } catch {
      // Scrape failed silently — user can still proceed
    } finally {
      setScraping(false)
    }
  }, [websiteUrl, businessName, tradeType, publicPhone, publicEmail, physicalAddress, baseSuburb])

  // Trigger scrape when website URL is entered and user moves to step 2
  useEffect(() => {
    if (step >= 1 && websiteUrl && !scrapeTriggered.current) {
      triggerScrape()
    }
  }, [step, websiteUrl, triggerScrape])

  // Pre-generate leads email when entering step 3 (Email Configuration)
  useEffect(() => {
    if (step === 3 && !preGenLeadsEmail) {
      // Dynamically import to avoid loading on other steps
      import("@/actions/settings-actions").then(({ getOrAllocateLeadCaptureEmail }) => {
        getOrAllocateLeadCaptureEmail()
          .then((email) => setPreGenLeadsEmail(email))
          .catch(() => setPreGenLeadsEmail(null))
      })
    }
  }, [step, preGenLeadsEmail])

  // Eagerly provision phone number when entering step 6 (Go Live)
  useEffect(() => {
    if (step === 6 && !eagerPhoneNumber && !eagerProvisioningLoading && businessName && phone) {
      setEagerProvisioningLoading(true)
      // Call the setup-comms API to provision phone number
      fetch("/api/workspace/setup-comms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.phoneNumber) {
            setEagerPhoneNumber(data.phoneNumber)
          }
        })
        .catch(() => {
          // Silent fail - provisioning will be retried on activate
        })
        .finally(() => setEagerProvisioningLoading(false))
    }
  }, [step, eagerPhoneNumber, eagerProvisioningLoading, businessName, phone])

  // ── Validation ──

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return ownerName.trim() !== "" && phone.trim() !== "" && email.trim() !== "" && businessName.trim() !== ""
      case 1: return true // always can advance from mode selector
      case 2: return tradeType !== "" && baseSuburb.trim() !== ""
      case 3: return true
      case 4: return true
      case 5: return true
      default: return false
    }
  }

  // ── Phone Format Helper ──

  const formatAuPhone = (value: string) => {
    const cleaned = value.replace(/\D/g, "")
    if (cleaned.length === 10 && cleaned.startsWith("04")) {
      return `${cleaned.slice(0, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7, 10)}`
    }
    return value
  }

  // ── Services CRUD ──

  const addService = () => {
    setServices((prev) => [
      ...prev,
      { serviceName: "", callOutFee: undefined, priceMin: undefined, priceMax: undefined, traceyNotes: "" },
    ])
  }

  const removeService = (index: number) => {
    if (services.length <= 1) return
    setServices((prev) => prev.filter((_, i) => i !== index))
  }

  const updateService = (index: number, field: keyof ServiceRow, value: string | number | undefined) => {
    setServices((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    )
  }

  // ── Document Upload ──

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setUploadingFile(file)
    }
  }

  const handleDocumentUpload = async () => {
    if (!uploadingFile) return
    
    setIsUploading(true)
    try {
      // Dynamically import to avoid loading on other steps
      const { getUploadUrl } = await import("@/actions/storage-actions")
      const tokenRes = await getUploadUrl(uploadingFile.name, "documents")
      
      if (!tokenRes.success || !tokenRes.signedUrl || !tokenRes.path) {
        throw new Error(tokenRes.error || "Failed to get upload URL")
      }

      // Upload to Supabase
      const uploadRes = await fetch(tokenRes.signedUrl, {
        method: "PUT",
        body: uploadingFile,
        headers: { "Content-Type": uploadingFile.type },
      })

      if (!uploadRes.ok) {
        throw new Error("Upload failed")
      }

      // Add to local state
      setUploadedDocs((prev) => [
        ...prev,
        {
          name: uploadingFile.name,
          path: tokenRes.path!,
          fileType: uploadingFile.type,
          fileSize: uploadingFile.size,
        },
      ])
      
      toast.success(`Uploaded ${uploadingFile.name}`)
      setUploadingFile(null)
    } catch (err) {
      toast.error("Upload failed: " + (err instanceof Error ? err.message : "Unknown error"))
    } finally {
      setIsUploading(false)
    }
  }

  const removeDocument = (index: number) => {
    setUploadedDocs((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Submit ──

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const data: TraceyOnboardingData = {
        ownerName,
        phone,
        email,
        businessName,
        websiteUrl: websiteUrl || "",
        agentMode,
        tradeType,
        publicPhone,
        publicEmail,
        physicalAddress,
        baseSuburb,
        serviceRadius,
        standardWorkHours,
        emergencyService,
        emergencySurcharge: emergencyService ? emergencySurcharge : undefined,
        emergencyHandling,
        specialNotes,
        globalCallOutFee,
        services: services.filter((s) => s.serviceName.trim()).map((s) => ({
          serviceName: s.serviceName,
          callOutFee: s.callOutFee,
          priceMin: s.priceMin,
          priceMax: s.priceMax,
          traceyNotes: s.traceyNotes,
        })),
        referralSource,
        acceptsMultilingual,
      }

      const result = await saveTraceyOnboarding(data)
      if (result.success) {
        setProvisionResult({
          phoneNumber: result.phoneNumber,
          leadsEmail: result.leadsEmail,
          provisioningError: result.provisioningError,
        })
        toast.success("Welcome aboard! Tracey is ready to go.")
      } else {
        toast.error(result.error || "Something went wrong")
        setSubmitting(false)
      }
    } catch {
      toast.error("An unexpected error occurred")
      setSubmitting(false)
    }
  }

  const goToDashboard = () => {
    router.push("/dashboard")
  }

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-start p-4 pt-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto h-14 w-14 rounded-xl flex items-center justify-center shadow-md overflow-hidden mb-3">
            <img src="/latest-logo.png" alt="Earlymark" className="h-14 w-14 object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Meet Tracey
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Your AI receptionist. Let&apos;s set her up.</p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center justify-between mb-6 px-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = i === step
            const isDone = i < step
            return (
              <div key={s.label} className="flex flex-col items-center gap-1 flex-1">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isActive
                      ? "bg-emerald-600 text-white scale-110 shadow-lg shadow-emerald-600/30"
                      : isDone
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300"
                        : "bg-slate-200 text-slate-400 dark:bg-slate-800"
                    }`}
                >
                  {isDone ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"}`}>
                  {s.label}
                </span>
              </div>
            )
          })}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            <Card className="shadow-lg border-slate-200 dark:border-slate-800">
              <CardContent className="p-6">
                {/* ──── STEP 1: Draft Contact Card ──── */}
                {step === 0 && (
                  <div className="space-y-5">
                    <TraceyBubble text="G'day! Let's get you set up. Fill in your details below and I'll start learning about your business." />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5"><User className="h-3.5 w-3.5" /> Your Name</Label>
                        <Input
                          placeholder="John Smith"
                          value={ownerName}
                          onChange={(e) => setOwnerName(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5"><Phone className="h-3.5 w-3.5" /> Phone</Label>
                        <Input
                          placeholder="04XX XXX XXX"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          onBlur={() => setPhone(formatAuPhone(phone))}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5"><Mail className="h-3.5 w-3.5" /> Email</Label>
                        <Input
                          type="email"
                          placeholder="you@business.com.au"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5" /> Business Name</Label>
                        <Input
                          placeholder="e.g. Smith's Plumbing"
                          value={businessName}
                          onChange={(e) => setBusinessName(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5" /> Website URL</Label>
                      <Input
                        placeholder="https://yoursite.com.au"
                        value={websiteUrl}
                        onChange={(e) => {
                          setWebsiteUrl(e.target.value)
                          scrapeTriggered.current = false // allow re-scrape on change
                        }}
                      />
                      <p className="text-xs text-slate-500">
                        Tracey will pre-fill your details using your website
                      </p>
                    </div>
                  </div>
                )}

                {/* ──── STEP 2: Autonomy Selector ──── */}
                {step === 1 && (
                  <div className="space-y-5">
                    {scraping && (
                      <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3">
                        <Globe className="h-4 w-4 animate-spin" />
                        Got it! I&apos;m scanning your site now to see how I can best represent your business.
                      </div>
                    )}

                    <TraceyBubble text="How much freedom do you want to give me? Pick a mode — you can always change it later in Settings." />

                    <div className="space-y-3">
                      {(Object.keys(MODE_DESCRIPTIONS) as AgentMode[]).map((mode) => {
                        const { title, icon: ModeIcon, description } = MODE_DESCRIPTIONS[mode]
                        const isSelected = agentMode === mode
                        return (
                          <button
                            key={mode}
                            onClick={() => setAgentMode(mode)}
                            className={`w-full text-left p-4 rounded-xl border-2 transition-all ${isSelected
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-md"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                              }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${isSelected ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"
                                }`}>
                                <ModeIcon className="h-5 w-5" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm">{title}</span>
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {/* Tracey Feedback for selected mode */}
                    <TraceyBubble text={MODE_DESCRIPTIONS[agentMode].traceyLine} />
                  </div>
                )}

                {/* ──── STEP 3: Scrape Review & Business Deep-Dive ──── */}
                {step === 2 && (
                  <div className="space-y-5">
                    {scraping ? (
                      <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Still scanning your website...
                      </div>
                    ) : scrapeData ? (
                      <TraceyBubble text="I found some details from your website! Have a look and adjust anything that's not right." />
                    ) : (
                      <TraceyBubble text="Tell me about your business so I know how to handle calls and enquiries." />
                    )}

                    {/* Business Identity */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Building2 className="h-4 w-4" /> Business Identity
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label>Trade Type</Label>
                          <Select value={tradeType} onValueChange={setTradeType}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select your trade" />
                            </SelectTrigger>
                            <SelectContent>
                              {TRADE_TYPES.map((t) => (
                                <SelectItem key={t} value={t}>{t}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1.5">
                          <Label>Public Phone</Label>
                          <Input
                            placeholder="Business phone number"
                            value={publicPhone}
                            onChange={(e) => setPublicPhone(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Public Email</Label>
                          <Input
                            placeholder="info@business.com.au"
                            value={publicEmail}
                            onChange={(e) => setPublicEmail(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label>Physical Address</Label>
                          <Input
                            placeholder="123 Trade St, Suburb"
                            value={physicalAddress}
                            onChange={(e) => setPhysicalAddress(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Location & Service Radius */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Location & Service Area
                      </h3>
                      <div className="space-y-1.5">
                        <Label>Base Suburb</Label>
                        <Input
                          placeholder="e.g. Parramatta, NSW"
                          value={baseSuburb}
                          onChange={(e) => setBaseSuburb(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Service Radius</Label>
                          <span className="text-sm font-medium text-emerald-600">{serviceRadius} km</span>
                        </div>
                        <Slider
                          value={[serviceRadius]}
                          onValueChange={(v) => setServiceRadius(v[0])}
                          min={5}
                          max={100}
                          step={5}
                        />
                      </div>
                    </div>

                    {/* Working Hours */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <Clock className="h-4 w-4" /> Working Hours
                      </h3>

                      {/* Days of week toggles */}
                      <div className="space-y-3">
                        <Label className="text-xs text-slate-500">Select working days</Label>
                        <div className="flex flex-wrap gap-2">
                          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => {
                            const isSelected = standardWorkHours.toLowerCase().includes(day.toLowerCase());
                            return (
                              <button
                                key={day}
                                type="button"
                                onClick={() => {
                                  const currentHours = standardWorkHours || "Mon-Fri, 08:00-17:00";
                                  setStandardWorkHours(currentHours);
                                }}
                                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${isSelected
                                    ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                    : "bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200"
                                  }`}
                              >
                                {day}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">Start Time</Label>
                          <Input
                            type="time"
                            value={standardWorkHours.split("-")[0]?.trim() || "08:00"}
                            onChange={(e) => {
                              const endTime = standardWorkHours.split("-")[1]?.trim() || "17:00";
                              setStandardWorkHours(`${e.target.value}-${endTime}`);
                            }}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-xs text-slate-500">End Time</Label>
                          <Input
                            type="time"
                            value={standardWorkHours.split("-")[1]?.trim() || "17:00"}
                            onChange={(e) => {
                              const startTime = standardWorkHours.split("-")[0]?.trim() || "08:00";
                              setStandardWorkHours(`${startTime}-${e.target.value}`);
                            }}
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between rounded-lg border p-4">
                        <div>
                          <p className="font-medium text-sm flex items-center gap-1.5">
                            <Shield className="h-4 w-4 text-amber-500" /> Emergency hours
                          </p>
                          <p className="text-xs text-slate-500">Allow Tracey to handle emergency callouts. She will notify you for approval and not accept without your permission.</p>
                        </div>
                        <Switch checked={emergencyService} onCheckedChange={setEmergencyService} />
                      </div>

                      {emergencyService && (
                        <div className="space-y-3 animate-in fade-in duration-300 pl-4 border-l-2 border-amber-300">
                          <div className="space-y-1.5">
                            <Label>Emergency Surcharge (AUD)</Label>
                            <Input
                              type="number"
                              value={emergencySurcharge}
                              onChange={(e) => setEmergencySurcharge(Number(e.target.value))}
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label>After-Hours Handling Logic</Label>
                            <Textarea
                              placeholder="e.g. 'Only accept burst pipes or gas leaks after hours. Everything else goes to voicemail.'"
                              value={emergencyHandling}
                              onChange={(e) => setEmergencyHandling(e.target.value)}
                              rows={2}
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Special Notes */}
                    <div className="space-y-1.5">
                      <Label>What else should Tracey know?</Label>
                      <Textarea
                        placeholder="Any unique business rules, preferences, or things Tracey should keep in mind..."
                        value={specialNotes}
                        onChange={(e) => setSpecialNotes(e.target.value)}
                        rows={3}
                      />
                    </div>

                    {/* Document Upload */}
                    <div className="space-y-3 border rounded-lg p-4 bg-slate-50 dark:bg-slate-900">
                      <Label className="flex items-center gap-2">
                        <FileIcon className="h-4 w-4 text-emerald-500" />
                        Upload Documents (optional)
                      </Label>
                      <p className="text-xs text-slate-500">
                        Upload price lists, insurance forms, or any documents Tracey should reference.
                      </p>
                      
                      {/* File upload input */}
                      <div className="flex gap-2">
                        <Input
                          type="file"
                          onChange={handleFileSelect}
                          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                          className="flex-1"
                        />
                        <Button
                          onClick={handleDocumentUpload}
                          disabled={!uploadingFile || isUploading}
                          size="sm"
                          className="gap-1.5"
                        >
                          {isUploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Plus className="h-4 w-4" />
                          )}
                          {isUploading ? "Uploading..." : "Upload"}
                        </Button>
                      </div>

                      {/* Uploaded files list */}
                      {uploadedDocs.length > 0 && (
                        <div className="space-y-2">
                          {uploadedDocs.map((doc, index) => (
                            <div
                              key={index}
                              className="flex items-center justify-between p-2 bg-white dark:bg-slate-950 rounded border"
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <FileIcon className="h-4 w-4 text-slate-400 shrink-0" />
                                <span className="text-sm truncate">{doc.name}</span>
                                {doc.fileSize && (
                                  <span className="text-xs text-slate-400">
                                    ({(doc.fileSize / 1024).toFixed(1)} KB)
                                  </span>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => removeDocument(index)}
                                className="h-6 w-6 text-slate-400 hover:text-red-500 shrink-0"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* ──── STEP 4: Email Configuration ──── */}
                {step === 3 && (
                  <div className="space-y-5">
                    <TraceyBubble text="Let's set up how Tracey will handle your emails. She can monitor your inbox and automatically respond to leads!" />

                    {/* Email Integration Info */}
                    <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4 space-y-4">
                      <h3 className="font-semibold text-sm flex items-center gap-2">
                        <Mail className="h-4 w-4 text-emerald-500" /> How Tracey Works With Your Inbox [{agentMode === "EXECUTION" ? "Execute" : agentMode === "DRAFT" ? "Review" : "Info Only"}]
                      </h3>
                      <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-400">
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>Tracey monitors and extracts from your inbox 24/7 new leads</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>She extracts details and creates deals automatically in the CRM</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                          <span>Tracey can auto-respond to leads</span>
                        </li>
                      </ul>
                    </div>

                    {/* Connection Options */}
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">Choose how to connect your inbox:</Label>
                      
                      {/* Option 1: Connect Seamlessly (OAuth) */}
                      <button
                        onClick={() => setInboxConnectionType("oauth")}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${inboxConnectionType === "oauth"
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-md"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${inboxConnectionType === "oauth" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
                            <Globe className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm">Connect Seamlessly</span>
                              <Badge variant="secondary" className="text-[10px]">Recommended</Badge>
                            </div>
                            <p className="text-xs text-slate-500 mt-0.5">Connect your Gmail or Outlook directly via OAuth for instant lead capture</p>
                          </div>
                        </div>
                      </button>

                      {/* Option 2: Auto-Forward */}
                      <button
                        onClick={() => setInboxConnectionType("forward")}
                        className={`w-full text-left p-4 rounded-xl border-2 transition-all ${inboxConnectionType === "forward"
                            ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 shadow-md"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                          }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${inboxConnectionType === "forward" ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}>
                            <Mail className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <span className="font-semibold text-sm">Auto-Forward</span>
                            <p className="text-xs text-slate-500 mt-0.5">
                              Set up a forwarding rule from your email to: <strong className="text-emerald-600">{preGenLeadsEmail || "Loading..."}</strong>
                            </p>
                          </div>
                        </div>
                      </button>
                    </div>

                    {inboxConnectionType === "oauth" && (
                      <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                          After onboarding, you&apos;ll be able to connect your Gmail or Outlook account directly. Tracey will monitor for new leads automatically.
                        </p>
                        <Button variant="outline" size="sm" className="gap-2" disabled>
                          <Globe className="h-4 w-4" />
                          Connect after onboarding
                        </Button>
                      </div>
                    )}

                    {inboxConnectionType === "forward" && preGenLeadsEmail && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg p-4">
                        <p className="text-xs text-emerald-800 dark:text-emerald-200 mb-2">
                          <strong>Your forwarding address:</strong>
                        </p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 bg-white dark:bg-slate-900 px-3 py-2 rounded text-sm font-mono text-emerald-700 dark:text-emerald-400 select-all">
                            {preGenLeadsEmail}
                          </code>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              navigator.clipboard.writeText(preGenLeadsEmail)
                              toast.success("Copied to clipboard")
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                        <p className="text-xs text-emerald-700 dark:text-emerald-400 mt-2">
                          Set up an auto-forward rule in your Gmail/Outlook to send leads to this address.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* ──── STEP 5: Automated Pricing & Instruction Table ──── */}
                {step === 4 && (
                  <div className="space-y-5">
                    <TraceyBubble text={`I${scrapeData?.services?.length ? "'ve pulled some services from your website. " : "'ll need to know your services so I can "}quote accurately and handle enquiries. Tweak, add, or delete anything below.`} />

                    {/* Global Call-Out Fee */}
                    <div className="flex items-center gap-4 p-4 rounded-lg border bg-slate-50 dark:bg-slate-900">
                      <div className="flex-1">
                        <Label className="text-sm font-medium">Call-out fee</Label>
                        <p className="text-xs text-slate-500">Applied to all services unless overridden per service.</p>
                      </div>
                      <Input
                        type="number"
                        value={globalCallOutFee || ""}
                        onChange={(e) => setGlobalCallOutFee(e.target.value ? Number(e.target.value) : undefined)}
                        placeholder="0"
                        className="w-28"
                      />
                    </div>

                    {/* Services Table */}
                    <div className="space-y-3">
                      <div className="hidden sm:grid sm:grid-cols-12 gap-2 px-1 text-xs font-semibold text-slate-500 uppercase">
                        <span className="col-span-3">Service</span>
                        <span className="col-span-2">Min ($)</span>
                        <span className="col-span-2">Max ($)</span>
                        <span className="col-span-4">
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger className="flex items-center gap-1 cursor-help">
                                Teach Tracey <Info className="h-3 w-3" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="max-w-xs text-xs">Add nuance for each service. E.g. &quot;For hot water systems, always ask if it&apos;s gas or electric first.&quot;</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </span>
                        <span className="col-span-1"></span>
                      </div>

                      {services.map((svc, i) => (
                        <div key={i} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 rounded-lg border bg-white dark:bg-slate-900">
                          <div className="sm:col-span-3">
                            <Label className="sm:hidden text-xs text-slate-500 mb-1">Service Name</Label>
                            <Input
                              placeholder="e.g. Tap Replacement"
                              value={svc.serviceName}
                              onChange={(e) => updateService(i, "serviceName", e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label className="sm:hidden text-xs text-slate-500 mb-1">Min ($)</Label>
                            <Input
                              type="number"
                              placeholder="$"
                              value={svc.priceMin ?? ""}
                              onChange={(e) => updateService(i, "priceMin", e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </div>
                          <div className="sm:col-span-2">
                            <Label className="sm:hidden text-xs text-slate-500 mb-1">Max ($)</Label>
                            <Input
                              type="number"
                              placeholder="$"
                              value={svc.priceMax ?? ""}
                              onChange={(e) => updateService(i, "priceMax", e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </div>
                          <div className="sm:col-span-4">
                            <Label className="sm:hidden text-xs text-slate-500 mb-1">Teach Tracey</Label>
                            <Input
                              placeholder="e.g. Ask if gas or electric"
                              value={svc.traceyNotes}
                              onChange={(e) => updateService(i, "traceyNotes", e.target.value)}
                            />
                          </div>
                          <div className="sm:col-span-1 flex items-center justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeService(i)}
                              className="text-slate-400 hover:text-red-500 h-8 w-8"
                              disabled={services.length <= 1}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      ))}

                      <Button variant="outline" size="sm" onClick={addService} className="gap-1.5">
                        <Plus className="h-3.5 w-3.5" /> Add Service
                      </Button>
                    </div>

                    {/* Multilingual Support */}
                    <div className="flex items-center justify-between rounded-lg border p-4 bg-slate-50 dark:bg-slate-900">
                      <div>
                        <p className="font-medium text-sm flex items-center gap-1.5">
                          <Globe className="h-4 w-4 text-emerald-500" /> Multilingual Jobs
                        </p>
                        <p className="text-xs text-slate-500">Can Tracey accept jobs from customers who speak languages other than English?</p>
                      </div>
                      <Switch checked={acceptsMultilingual} onCheckedChange={setAcceptsMultilingual} />
                    </div>
                  </div>
                )}

                {/* ──── STEP 6: Interactive Scenario Simulator ──── */}
                {step === 5 && (
                  <div className="space-y-5">
                    <TraceyBubble text="Here's a sneak peek at how I'll handle a real customer call. Switch between modes to see the difference!" />

                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="text-xs text-slate-400 flex items-center gap-1 cursor-help">
                            <Info className="h-3 w-3" /> You can change how I respond or teach me new things anytime in Settings.
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="max-w-xs text-xs">After onboarding, go to Settings &gt; AI Preferences to fine-tune Tracey&apos;s behaviour, voice, and rules.</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>

                    {/* Mode Switcher */}
                    <div className="flex gap-2 justify-center">
                      {(Object.keys(MODE_DESCRIPTIONS) as AgentMode[]).map((mode) => {
                        const { title, icon: ModeIcon } = MODE_DESCRIPTIONS[mode]
                        return (
                          <button
                            key={mode}
                            onClick={() => { setSimMode(mode); setSimStep(0) }}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${simMode === mode
                                ? "bg-emerald-600 text-white shadow"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400"
                              }`}
                          >
                            <ModeIcon className="h-3.5 w-3.5" />
                            {title}
                          </button>
                        )
                      })}
                    </div>

                    {/* Scenario Steps */}
                    <div className="flex gap-1 justify-center mb-2">
                      {SCENARIO_STEPS.map((label, i) => (
                        <button
                          key={label}
                          onClick={() => setSimStep(i)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-medium transition-all ${simStep === i
                              ? "bg-emerald-600 text-white"
                              : i < simStep
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                : "bg-slate-100 text-slate-400 dark:bg-slate-800"
                            }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {/* Conversation Display */}
                    <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-4 min-h-[200px]">
                      <AnimatePresence mode="wait">
                        <motion.div
                          key={`${simMode}-${simStep}`}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0 }}
                          className="space-y-3"
                        >
                          {/* Customer message */}
                          <div className="flex items-start gap-2 justify-end">
                            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg rounded-tr-none px-3 py-2 text-sm max-w-[80%]">
                              {getScenarioDialogue(simMode)[SCENARIO_STEPS[simStep]].customer}
                            </div>
                            <div className="shrink-0 w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                              <User className="h-3.5 w-3.5 text-blue-600" />
                            </div>
                          </div>

                          {/* Tracey response */}
                          <div className="flex items-start gap-2">
                            <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                              <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                            </div>
                            <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg rounded-tl-none px-3 py-2 text-sm max-w-[80%]">
                              {getScenarioDialogue(simMode)[SCENARIO_STEPS[simStep]].tracey}
                            </div>
                          </div>
                        </motion.div>
                      </AnimatePresence>
                    </div>

                    {/* Scenario Navigation */}
                    <div className="flex justify-between">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSimStep(Math.max(0, simStep - 1))}
                        disabled={simStep === 0}
                      >
                        <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSimStep(Math.min(SCENARIO_STEPS.length - 1, simStep + 1))}
                        disabled={simStep === SCENARIO_STEPS.length - 1}
                      >
                        Next <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    </div>

                    {/* Voice Selector */}
                    <div className="space-y-2 border-t pt-4">
                      <Label className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase">
                        <Volume2 className="h-3.5 w-3.5" /> Tracey&apos;s Voice
                      </Label>
                      <div className="grid grid-cols-2 gap-2">
                        {TRACEY_VOICES.map((voice) => (
                          <button
                            key={voice.id}
                            onClick={() => setSelectedVoice(voice.id)}
                            className={`p-3 rounded-lg border text-left transition-all ${selectedVoice === voice.id
                                ? "border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30"
                                : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                              }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium">{voice.label}</span>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                disabled={loadingVoiceId === voice.id}
                                onClick={(e) => { e.stopPropagation(); playVoicePreview(voice.id) }}
                              >
                                {loadingVoiceId === voice.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : playingVoiceId === voice.id ? (
                                  <Square className="h-3 w-3" />
                                ) : (
                                  <Play className="h-3 w-3" />
                                )}
                              </Button>
                            </div>
                            <p className="text-[10px] text-slate-500 mt-0.5">{voice.description}</p>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* ──── STEP 7: Provisioning & Closing ──── */}
                {step === 6 && (
                  <div className="space-y-5">
                    {!provisionResult ? (
                      <>
                        <TraceyBubble text="Almost there! One quick question before I go live..." />

                        <div className="space-y-1.5">
                          <Label>How did you hear about us?</Label>
                          <Select value={referralSource} onValueChange={setReferralSource}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="google">Google Search</SelectItem>
                              <SelectItem value="social">Social Media</SelectItem>
                              <SelectItem value="referral">Friend / Colleague</SelectItem>
                              <SelectItem value="hipages">HiPages</SelectItem>
                              <SelectItem value="airtasker">Airtasker</SelectItem>
                              <SelectItem value="tradies-forum">Tradies Forum</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4 space-y-3">
                          <h3 className="font-semibold text-sm">What happens when you activate:</h3>
                          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span>
                                {eagerProvisioningLoading ? (
                                  <span className="flex items-center gap-2">
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                    Provisioning your dedicated AU phone number...
                                  </span>
                                ) : eagerPhoneNumber ? (
                                  <span>
                                    Your dedicated AU phone number: <strong className="text-emerald-600 font-mono">{eagerPhoneNumber}</strong>
                                  </span>
                                ) : (
                                  "Tracey's dedicated AU phone number will be provisioned instantly"
                                )}
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span>Your leads email <strong>{preGenLeadsEmail || "will be generated"}</strong> will be activated</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span>A welcome SMS will be sent to <strong>{phone || "your mobile"}</strong></span>
                            </li>
                          </ul>
                        </div>

                        <Button
                          onClick={handleSubmit}
                          disabled={submitting}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-11"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Setting up your account...
                            </>
                          ) : (
                            <>
                              <Sparkles className="h-4 w-4" />
                              Activate Tracey
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      // Post-provisioning success screen
                      <div className="text-center space-y-5 py-4">
                        <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                          <CheckCircle2 className="h-8 w-8" />
                        </div>
                        <h3 className="text-xl font-bold">You&apos;re all set!</h3>
                        <TraceyBubble text="Welcome aboard! I'm live and ready to take calls. You'll get a text from me shortly to confirm the connection." animate={false} />

                        {provisionResult.leadsEmail && (
                          <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4 text-left">
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Your Leads Email</p>
                            <p className="font-mono text-emerald-600 text-sm select-all">{provisionResult.leadsEmail}</p>
                          </div>
                        )}

                        {provisionResult.phoneNumber && (
                          <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4 text-left">
                            <p className="text-xs font-semibold text-slate-500 uppercase mb-1">Tracey&apos;s Phone Number</p>
                            <p className="font-mono text-emerald-600 text-lg select-all">{provisionResult.phoneNumber}</p>
                          </div>
                        )}

                        {provisionResult.provisioningError && (
                          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-lg p-4 text-left">
                            <p className="text-xs font-semibold text-amber-600 uppercase mb-1">Phone Setup Note</p>
                            <p className="text-sm text-amber-700 dark:text-amber-400">
                              {provisionResult.provisioningError}. You can set this up later in Settings.
                            </p>
                          </div>
                        )}

                        <Button
                          onClick={goToDashboard}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-11"
                        >
                          Go to Dashboard <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}

                {/* ──── Navigation ──── */}
                {step < 6 && (
                  <div className="flex justify-between pt-6">
                    {step > 0 ? (
                      <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1.5">
                        <ChevronLeft className="h-4 w-4" /> Back
                      </Button>
                    ) : (
                      <div />
                    )}
                    <Button
                      onClick={() => setStep(step + 1)}
                      disabled={!canAdvance()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {step === 6 && !provisionResult && (
                  <div className="pt-2">
                    <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1.5">
                      <ChevronLeft className="h-4 w-4" /> Back
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
