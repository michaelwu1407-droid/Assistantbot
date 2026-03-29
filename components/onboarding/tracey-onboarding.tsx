"use client"

import Image from "next/image"
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
  MessageSquare, Sparkles, Info, Send,
  File as FileIcon,
} from "lucide-react"
import { scrapeWebsite, type ScrapeResult } from "@/actions/scraper-actions"
import {
  saveTraceyOnboarding,
  saveBusinessProfileForProvisioning,
  getProvisioningIntentForOnboarding,
  type TraceyOnboardingData,
} from "@/actions/tracey-onboarding"
import { getLeadCaptureEmailReadiness } from "@/actions/settings-actions"
import { getAuthUser } from "@/lib/auth-client"
import { createInvite } from "@/actions/invite-actions"
import { WeeklyHoursEditor } from "@/components/ui/weekly-hours-editor"
import { AddressAutocomplete } from "@/components/ui/address-autocomplete"
import {
  createDefaultWeeklyHours,
  normalizeWeeklyHours,
  summarizeWeeklyHours,
  weeklyHoursAreUniform,
  type WeeklyHours,
} from "@/lib/working-hours"
import { buildLeadCaptureEmailPreview } from "@/lib/lead-capture-email"

// ─── Types ──────────────────────────────────────────────────────

type AgentMode = "EXECUTION" | "DRAFT" | "INFO_ONLY"

interface ServiceRow {
  serviceName: string
  callOutFee: number | undefined
  priceMin: number | undefined
  priceMax: number | undefined
  traceyNotes: string
}

type ProvisioningStatus =
  | "idle"
  | "requested"
  | "not_requested"
  | "provisioning"
  | "already_provisioned"
  | "provisioned"
  | "blocked_duplicate"
  | "failed"

function looksLikePhoneValue(value?: string | null) {
  if (!value) return false
  const digits = value.replace(/\D/g, "")
  return digits.length >= 8
}

type LeadCaptureEmailReadiness = Awaited<ReturnType<typeof getLeadCaptureEmailReadiness>>

function formatSydneyDate(value: string | null | undefined) {
  if (!value) return null
  return new Date(value).toLocaleString("en-AU", {
    timeZone: "Australia/Sydney",
    dateStyle: "medium",
    timeStyle: "short",
  })
}

function getLeadCaptureStatusCopy(readiness: LeadCaptureEmailReadiness | null | undefined) {
  if (!readiness) {
    return {
      tone: "ready" as const,
      title: "Your forwarding address:",
      helper: "Set up an auto-forward rule in your Gmail/Outlook to send leads to this address.",
      checklist: "will be activated",
    }
  }

  if (!readiness.ready) {
    return {
      tone: "blocked" as const,
      title: "Reserved forwarding address (not live yet):",
      helper: `Inbound email is not active for ${readiness.domain}.`,
      checklist: "is reserved, but inbound mail is not live yet.",
    }
  }

  if (!readiness.receivingConfirmed) {
    return {
      tone: "verified" as const,
      title: "Verified forwarding address:",
      helper: `DNS and Resend are verified. Forward your first live lead email here to confirm end-to-end receiving.`,
      checklist: "is verified and ready for your first live forwarded lead email.",
    }
  }

  return {
    tone: "ready" as const,
    title: "Your forwarding address:",
    helper: formatSydneyDate(readiness.lastInboundEmailSuccessAt)
      ? `Recent inbound email confirms this route is live. Last success: ${formatSydneyDate(readiness.lastInboundEmailSuccessAt)}.`
      : "Recent inbound email confirms this route is live.",
    checklist: "is live and receiving inbound email.",
  }
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

function resolveScrapedPhysicalAddress(data: {
  address?: string
  suburbs?: string[]
  rawSummary?: string
}) {
  const strictAddressPattern =
    /\b\d{1,6}[A-Za-z]?\s+[A-Za-z0-9.'-]+(?:\s+[A-Za-z0-9.'-]+){0,4}\s+(?:Street|St|Road|Rd|Avenue|Ave|Drive|Dr|Lane|Ln|Boulevard|Blvd|Court|Ct|Crescent|Cres|Place|Pl|Way|Terrace|Tce|Parade|Pde)\b/i
  const auStatePostcodePattern = /\b(?:NSW|VIC|QLD|WA|SA|TAS|ACT|NT)\s*\d{4}\b/i

  const candidateAddress = data.address?.trim()
  if (candidateAddress && strictAddressPattern.test(candidateAddress) && auStatePostcodePattern.test(candidateAddress)) {
    return candidateAddress
  }

  // Do not auto-fill from broad suburb/raw-summary hints because they can be unrelated
  // to the business's actual physical address (especially service-area websites).
  return ""
}

function matchTradeType(scraped: string): string {
  const lower = scraped.toLowerCase().trim()
  if (TRADE_TYPE_ALIASES[lower]) return TRADE_TYPE_ALIASES[lower]
  const exact = TRADE_TYPES.find((t) => t.toLowerCase() === lower)
  if (exact) return exact
  const partial = TRADE_TYPES.find((t) => lower.includes(t.toLowerCase()) || t.toLowerCase().includes(lower))
  return partial || scraped
}

function parseOperatingHoursStructured(raw: string): { days: string[]; start: string; end: string } {
  const ALL_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
  const DAY_MAP: Record<string, string> = {
    mon: "Mon", monday: "Mon", tue: "Tue", tuesday: "Tue",
    wed: "Wed", wednesday: "Wed", thu: "Thu", thursday: "Thu",
    fri: "Fri", friday: "Fri", sat: "Sat", saturday: "Sat",
    sun: "Sun", sunday: "Sun",
  }

  // Extract days
  let days: string[] = []
  const lower = raw.toLowerCase()
  // Check for range like "mon-fri" or "monday-friday"
  const rangeMatch = lower.match(/(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)\s*[-–to]+\s*(mon(?:day)?|tue(?:sday)?|wed(?:nesday)?|thu(?:rsday)?|fri(?:day)?|sat(?:urday)?|sun(?:day)?)/i)
  if (rangeMatch) {
    const startDay = DAY_MAP[rangeMatch[1].toLowerCase()]
    const endDay = DAY_MAP[rangeMatch[2].toLowerCase()]
    if (startDay && endDay) {
      const si = ALL_DAYS.indexOf(startDay)
      const ei = ALL_DAYS.indexOf(endDay)
      if (si >= 0 && ei >= 0) {
        for (let i = si; i <= ei; i++) days.push(ALL_DAYS[i])
      }
    }
  }
  // Check for individual day mentions
  if (days.length === 0) {
    for (const [key, val] of Object.entries(DAY_MAP)) {
      if (lower.includes(key) && !days.includes(val)) days.push(val)
    }
    // Sort by standard order
    days.sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b))
  }
  if (days.length === 0) days = ["Mon", "Tue", "Wed", "Thu", "Fri"]

  // Extract times
  const timePattern = /(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/gi
  const matches = [...raw.matchAll(timePattern)]
  let start = "08:00"
  let end = "17:00"
  if (matches.length >= 2) {
    const toTime = (m: RegExpMatchArray) => {
      let h = parseInt(m[1])
      const min = m[2] || "00"
      const ampm = (m[3] || "").toLowerCase()
      if (ampm === "pm" && h < 12) h += 12
      if (ampm === "am" && h === 12) h = 0
      return `${String(h).padStart(2, "0")}:${min}`
    }
    start = toTime(matches[0])
    end = toTime(matches[1])
  }

  return { days, start, end }
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

interface ScenarioContext {
  businessName: string
  tradeType: string
  serviceName: string
  priceRange: string
  callOutFee: string
}

function getScenarioDialogue(
  mode: AgentMode,
  ctx: ScenarioContext
): Record<typeof SCENARIO_STEPS[number], { customer: string; tracey: string }> {
  const biz = ctx.businessName || "our team"
  const trade = ctx.tradeType?.toLowerCase() || "tradie"
  const svc = ctx.serviceName || "repair"
  const price = ctx.priceRange || "$150-$250"
  const fee = ctx.callOutFee || "$89"

  const dialogues: Record<AgentMode, Record<typeof SCENARIO_STEPS[number], { customer: string; tracey: string }>> = {
    EXECUTION: {
      Greeting: {
        customer: `Hi, I need a ${trade} urgently — can someone help me today?`,
        tracey: `G'day! You've reached ${biz}. Sorry to hear you need urgent help. Let me get that sorted for you right away. Can I grab your name and address?`,
      },
      "Service Enquiry": {
        customer: `Yeah, it's Sarah at 42 Smith St, Parramatta. How much will a ${svc} cost?`,
        tracey: `Thanks Sarah! A ${svc} is usually between ${price} depending on the issue. I'll book our ${trade} in for you.`,
      },
      "Booking/Price": {
        customer: "That sounds fine. When can someone come?",
        tracey: `I've got a slot tomorrow at 10am. I'll lock that in for you and send a confirmation text. The call-out fee of ${fee} is waived if you go ahead with the ${svc}.`,
      },
      Goodbye: {
        customer: "Perfect, thanks!",
        tracey: "You're all set, Sarah! You'll get a text shortly. Have a great arvo!",
      },
    },
    DRAFT: {
      Greeting: {
        customer: `Hi, I need a ${trade} urgently — can someone help me today?`,
        tracey: `G'day! You've reached ${biz}. Let me take your details and I'll get our ${trade} to confirm availability for you.`,
      },
      "Service Enquiry": {
        customer: `Yeah, it's Sarah at 42 Smith St, Parramatta. How much will a ${svc} cost?`,
        tracey: `Thanks Sarah! I'll put together a draft quote for the ${svc} and send it to the boss for approval. I'll get back to you shortly.`,
      },
      "Booking/Price": {
        customer: "Okay, how long will that take?",
        tracey: `[Draft sent to you for review] Sarah needs a ${svc} at 42 Smith St, Parramatta. Suggested: ${price} range, tomorrow 10am slot.`,
      },
      Goodbye: {
        customer: "Thanks for letting me know.",
        tracey: "No worries Sarah! You'll hear from us as soon as the boss gives the thumbs up. Shouldn't be long!",
      },
    },
    INFO_ONLY: {
      Greeting: {
        customer: `Hi, I need a ${trade} urgently — can someone help me today?`,
        tracey: `G'day! You've reached ${biz}. I'll take down the details and pass them straight to our ${trade}.`,
      },
      "Service Enquiry": {
        customer: `It's Sarah at 42 Smith St, Parramatta. Can you give me a quote for a ${svc}?`,
        tracey: `I've noted that down, Sarah. Our ${trade} will give you a call back with a quote and availability.`,
      },
      "Booking/Price": {
        customer: "When will I hear back?",
        tracey: `I'll flag this as urgent and the ${trade} should be in touch within the hour.`,
      },
      Goodbye: {
        customer: "Alright, thanks.",
        tracey: `[Alert sent to you] New urgent enquiry: Sarah, 42 Smith St Parramatta — needs ${svc}. Awaiting your callback.`,
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
      <div className="bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-300 dark:border-emerald-700 rounded-lg rounded-tl-none px-4 py-2.5 text-sm text-emerald-900 dark:text-emerald-100 max-w-md">
        {text}
      </div>
    </motion.div>
  )
}

// ─── Main Component ─────────────────────────────────────────────

const STEPS = [
  { label: "Your details", icon: User },
  { label: "Tracey modes", icon: Zap },
  { label: "Your business", icon: Building2 },
  { label: "Email setup", icon: Mail },
  { label: "Your Services", icon: MessageSquare },
  { label: "Go live", icon: Send },
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
  const [, setScraping] = useState(false)
  const [scrapeData, setScrapeData] = useState<ScrapeResult | null>(null)
  const scrapeTriggered = useRef(false)

  // Step 2: Autonomy Selector
  const [agentMode, setAgentMode] = useState<AgentMode>("EXECUTION")

  // Step 3: Business identity and operating rules
  const [tradeType, setTradeType] = useState("")
  const [publicPhone, setPublicPhone] = useState("")
  const [publicEmail, setPublicEmail] = useState("")
  const [googleReviewUrl, setGoogleReviewUrl] = useState("")
  const [physicalAddress, setPhysicalAddress] = useState("")
  const [serviceRadius, setServiceRadius] = useState(20)
  const [weeklyHours, setWeeklyHours] = useState<WeeklyHours>(createDefaultWeeklyHours())
  const [uniformWorkingHours, setUniformWorkingHours] = useState(true)
  const [emergencyService, setEmergencyService] = useState(false)
  const [emergencySurcharge, setEmergencySurcharge] = useState(350)
  const [emergencyStartTime, setEmergencyStartTime] = useState("17:00")
  const [emergencyEndTime, setEmergencyEndTime] = useState("07:00")
  const [emergencyHandling, setEmergencyHandling] = useState("")
  const [specialNotes, setSpecialNotes] = useState("")
  const [acceptsMultilingual, setAcceptsMultilingual] = useState(false)

  // Step 4: Services & Pricing
  const [globalCallOutFee, setGlobalCallOutFee] = useState<number | undefined>(undefined)
  const [services, setServices] = useState<ServiceRow[]>([
    { serviceName: "", callOutFee: undefined, priceMin: undefined, priceMax: undefined, traceyNotes: "" },
  ])

  // Step 5: Simulator
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
  const [provisioningStatus, setProvisioningStatus] = useState<ProvisioningStatus>("idle")
  const [resolvedPhoneNumber, setResolvedPhoneNumber] = useState<string | null>(null)
  const [provisioningError, setProvisioningError] = useState<string | null>(null)
  const [provisionPhoneNumberRequested, setProvisionPhoneNumberRequested] = useState<boolean | null>(null)
  const provisioningInitRef = useRef(false)

  // Step 3 (Email): Inbox connection
  const [inboxConnectionType, setInboxConnectionType] = useState<"oauth" | "forward" | null>(null)
  const [preGenLeadsEmail, setPreGenLeadsEmail] = useState<string | null>(null)
  const [leadCaptureEmailReadiness, setLeadCaptureEmailReadiness] = useState<LeadCaptureEmailReadiness | null>(null)
  const leadCaptureStatusCopy = getLeadCaptureStatusCopy(leadCaptureEmailReadiness)

  // Optional team invites on the last step
  const [inviteRole, setInviteRole] = useState<"TEAM_MEMBER" | "MANAGER">("TEAM_MEMBER")
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteError, setInviteError] = useState("")
  const [creatingInvite, setCreatingInvite] = useState(false)
  const [generatedInviteLink, setGeneratedInviteLink] = useState("")

  // Step 2: Document uploads
  const [uploadedDocs, setUploadedDocs] = useState<Array<{ name: string; path: string; fileType?: string; fileSize?: number }>>([])
  const [uploadingFile, setUploadingFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  const canActivateTracey =
    provisionPhoneNumberRequested === false ||
    (provisionPhoneNumberRequested === true &&
      ((provisioningStatus === "already_provisioned" || provisioningStatus === "provisioned") &&
        Boolean(resolvedPhoneNumber)))

  const activationBlockedReason =
    provisionPhoneNumberRequested === null
      ? "Still checking your billing settings. Wait a few seconds and try again."
      : provisionPhoneNumberRequested === false
        ? ""
        : provisioningStatus === "blocked_duplicate"
          ? "Provisioning is blocked for this phone during beta. Use a different owner phone or contact support."
          : provisioningStatus === "requested"
            ? "Provisioning is waiting for payment confirmation."
            : provisioningStatus === "provisioning"
              ? "Still setting up your number. Please wait a moment and try again."
              : provisioningStatus === "failed"
                ? 'Number provisioning failed. Use "Retry number setup" below or contact support.'
                : "Your dedicated number is not ready yet. Wait for provisioning to finish or retry below."

  const provisioningStatusMessage =
    provisioningStatus === "provisioning"
      ? "Setting up your dedicated AU mobile number..."
      : provisioningStatus === "requested"
        ? "Provisioning is queued until Stripe payment completes."
        : provisioningStatus === "not_requested"
          ? "This workspace was paid without mobile-number provisioning enabled in billing."
          : provisioningStatus === "blocked_duplicate"
            ? "Provisioning is blocked during beta because this owner phone is already linked to another provisioned workspace."
            : provisioningStatus === "failed"
              ? "Number provisioning failed. Retry below before activation."
              : "We are getting your Earlymark number ready now."

  useEffect(() => {
    let active = true

    ;(async () => {
      try {
        const authUser = await getAuthUser()
        if (!active || !authUser) return

        if (authUser.name && !looksLikePhoneValue(authUser.name)) {
          setOwnerName((current) => current || authUser.name)
        }
        if (authUser.email) {
          setEmail((current) => current || authUser.email || "")
        }
        const [readiness, provisioningIntent] = await Promise.all([
          getLeadCaptureEmailReadiness(),
          getProvisioningIntentForOnboarding(),
        ])
        if (active) {
          setLeadCaptureEmailReadiness(readiness)
          if (provisioningIntent.success) {
            setProvisionPhoneNumberRequested(provisioningIntent.provisionPhoneNumberRequested)
            if (!provisioningIntent.provisionPhoneNumberRequested) {
              setProvisioningStatus("not_requested")
              setResolvedPhoneNumber(null)
              setProvisioningError(null)
            }
          }
        }
      } catch {
        // Silent fallback: onboarding still works without client-side auth prefill.
      }
    })()

    return () => {
      active = false
    }
  }, [])

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
        if (result.data.googleReviewUrl && !googleReviewUrl) setGoogleReviewUrl(result.data.googleReviewUrl)
        const scrapedPhysicalAddress = resolveScrapedPhysicalAddress(result.data)
        if (scrapedPhysicalAddress && !physicalAddress) {
          setPhysicalAddress(scrapedPhysicalAddress)
          // Try to resolve structured components from the scraped text using Google Places,
          // so scraped addresses behave like typed+selected ones for provisioning.
          const googleWindow = window as typeof window & { google?: typeof google }
          if (typeof window !== "undefined" && googleWindow.google?.maps?.places) {
            try {
              const service = new googleWindow.google.maps.places.AutocompleteService()
              service.getPlacePredictions(
                {
                  input: scrapedPhysicalAddress,
                  componentRestrictions: { country: "au" },
                  types: ["address"],
                },
                (
                  predictions: google.maps.places.AutocompletePrediction[] | null,
                  status: google.maps.places.PlacesServiceStatus,
                ) => {
                  if (
                    status !== googleWindow.google.maps.places.PlacesServiceStatus.OK ||
                    !predictions?.length
                  ) {
                    return
                  }
                  const top = predictions[0]
                  if (!top?.place_id) return
                  const placesService = new googleWindow.google.maps.places.PlacesService(
                    document.createElement("div"),
                  )
                  placesService.getDetails(
                    {
                      placeId: top.place_id,
                      fields: ["address_components", "formatted_address", "name", "geometry", "place_id"],
                    },
                    (
                      details: google.maps.places.PlaceResult | null,
                      detailStatus: google.maps.places.PlacesServiceStatus,
                    ) => {
                      if (
                        detailStatus !== googleWindow.google.maps.places.PlacesServiceStatus.OK ||
                        !details
                      ) {
                        return
                      }
                      const components = details.address_components ?? []
                      const get = (type: string) =>
                        components.find((c: google.maps.GeocoderAddressComponent) => c.types?.includes(type))
                      const streetNumber = get("street_number")?.long_name
                      const route = get("route")?.long_name
                      const locality =
                        get("locality")?.long_name ||
                        get("postal_town")?.long_name ||
                        get("sublocality")?.long_name ||
                        get("sublocality_level_1")?.long_name
                      const region = get("administrative_area_level_1")?.short_name
                      const postalCode = get("postal_code")?.long_name
                      const streetLine =
                        streetNumber && route
                          ? `${streetNumber} ${route}`
                          : details.name ?? details.formatted_address ?? scrapedPhysicalAddress
                      const resolvedAddress =
                        streetLine && locality && region && postalCode
                          ? `${streetLine}, ${locality} ${region} ${postalCode}`
                          : scrapedPhysicalAddress
                      setPhysicalAddress(resolvedAddress)
                    },
                  )
                },
              )
            } catch {
              // Best-effort only; scraped text still set above.
            }
          }
        }
        if (result.data.weeklyHours) {
          const nextWeeklyHours = normalizeWeeklyHours(result.data.weeklyHours)
          setWeeklyHours(nextWeeklyHours)
          setUniformWorkingHours(weeklyHoursAreUniform(nextWeeklyHours))
        }
        if (result.data.emergencyAvailable) {
          setEmergencyService(true)
          if (result.data.emergencyHours) setEmergencyHandling(result.data.emergencyHours)
        }
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
  }, [websiteUrl, businessName, tradeType, publicPhone, publicEmail, googleReviewUrl, physicalAddress])

  // Trigger scrape when website URL is entered and user moves to step 2
  useEffect(() => {
    if (step >= 1 && websiteUrl && !scrapeTriggered.current) {
      triggerScrape()
    }
  }, [step, websiteUrl, triggerScrape])

  // Generate the canonical inbound lead-capture address preview client-side.
  useEffect(() => {
    if (businessName.trim()) {
      setPreGenLeadsEmail(buildLeadCaptureEmailPreview(businessName, leadCaptureEmailReadiness?.domain))
      return
    }

    setPreGenLeadsEmail(null)
  }, [businessName, leadCaptureEmailReadiness])

  const resolveProvisioning = useCallback(async () => {
    if (provisionPhoneNumberRequested === false) {
      setProvisioningStatus("not_requested")
      setProvisioningError(null)
      setResolvedPhoneNumber(null)
      return
    }

    if (!businessName.trim() || !phone.trim()) {
      setProvisioningStatus("failed")
      setProvisioningError("Business name and owner phone are required before provisioning.")
      setResolvedPhoneNumber(null)
      return
    }

    setProvisioningStatus("provisioning")
    setProvisioningError(null)

    try {
      // Persist profile data so the provisioning API can read the address from the DB
      const preSave = await saveBusinessProfileForProvisioning({
        businessName,
        physicalAddress,
        ownerName,
        phone,
      })
      if (!preSave.success) {
        setProvisioningStatus("failed")
        setProvisioningError(preSave.error || "Could not save business profile before provisioning.")
        setResolvedPhoneNumber(null)
        return
      }

      const res = await fetch("/api/workspace/setup-comms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, ownerPhone: phone }),
      })

      const data = await res.json().catch(() => ({}))
      const backendStatus = (data?.provisioningStatus ?? "failed") as ProvisioningStatus
      const provisionedNumber = data?.phoneNumber ?? data?.result?.phoneNumber ?? null

      if (!res.ok) {
        setResolvedPhoneNumber(null)
        setProvisioningStatus(backendStatus)
        setProvisioningError(data?.error || "We could not provision your Earlymark number. Please try again.")
        return
      }

      setResolvedPhoneNumber(provisionedNumber)
      setProvisioningStatus(backendStatus)
      setProvisioningError(provisionedNumber ? null : data?.error || null)
    } catch (error) {
      setResolvedPhoneNumber(null)
      setProvisioningStatus("failed")
      setProvisioningError(
        error instanceof Error ? error.message : "We could not provision your Earlymark number. Please try again."
      )
    }
  }, [businessName, phone, physicalAddress, ownerName, provisionPhoneNumberRequested])

  useEffect(() => {
    if (step !== 5) {
      provisioningInitRef.current = false
      return
    }
    if (provisionPhoneNumberRequested === null) return
    if (provisioningInitRef.current) return
    provisioningInitRef.current = true

    if (provisionPhoneNumberRequested === false) {
      setProvisioningStatus("not_requested")
      setProvisioningError(null)
      setResolvedPhoneNumber(null)
      return
    }

    void resolveProvisioning()
  }, [step, provisionPhoneNumberRequested, resolveProvisioning])

  // ── Validation ──

  const canAdvance = (): boolean => {
    switch (step) {
      case 0: return ownerName.trim() !== "" && phone.trim() !== "" && email.trim() !== ""
      case 1: return true // always can advance from mode selector
      case 2: return businessName.trim() !== "" && tradeType !== "" && physicalAddress.trim() !== ""
      case 3: return true
      case 4: return true
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

  const handleCreateInvite = async () => {
    if (!inviteEmail.trim()) {
      setInviteError("Enter a team member email first.")
      return
    }

    setCreatingInvite(true)
    setInviteError("")

    try {
      const result = await createInvite({
        role: inviteRole,
        email: inviteEmail.trim(),
      })

      if (!result.success || !result.token) {
        setInviteError(result.error || "Could not create the invite.")
        return
      }

      const origin = typeof window !== "undefined" ? window.location.origin : ""
      setGeneratedInviteLink(`${origin}/invite/join?token=${result.token}`)
      toast.success(`Invite sent to ${inviteEmail.trim()}`)
      setInviteEmail("")
    } catch (error) {
      setInviteError(error instanceof Error ? error.message : "Could not create the invite.")
    } finally {
      setCreatingInvite(false)
    }
  }

  // ── Submit ──

  const handleSubmit = async () => {
    const resolvedWeeklyHours = normalizeWeeklyHours(weeklyHours, createDefaultWeeklyHours())
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
        googleReviewUrl,
        physicalAddress,
        serviceRadius,
        standardWorkHours: summarizeWeeklyHours(resolvedWeeklyHours),
        weeklyHours: resolvedWeeklyHours,
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
        const finalPhoneNumber = result.phoneNumber || resolvedPhoneNumber || undefined
        setProvisionResult({
          phoneNumber: finalPhoneNumber,
          leadsEmail: result.leadsEmail,
          provisioningError: result.provisioningError,
        })
        if (result.leadsEmail) {
          setPreGenLeadsEmail(result.leadsEmail)
        }
        if (finalPhoneNumber) {
          setResolvedPhoneNumber(finalPhoneNumber)
        }
        toast.success("Welcome aboard! Tracey is ready to go.")
      } else {
        toast.error(result.error || "Something went wrong")
      }
    } catch {
      toast.error("An unexpected error occurred")
    } finally {
      setSubmitting(false)
    }
  }

  const goToDashboard = () => {
    router.push("/crm/dashboard")
  }

  // ─── Render ────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-start p-4 pt-8">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="mx-auto h-14 w-14 rounded-xl flex items-center justify-center shadow-md overflow-hidden mb-3">
            <Image src="/latest-logo.png" alt="Earlymark" width={56} height={56} className="h-14 w-14 object-contain" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Meet Tracey
          </h1>
          <p className="text-slate-500 mt-1 text-sm">Your AI receptionist. Let&apos;s set her up.</p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-start justify-between mb-6 px-1">
          {STEPS.map((s, i) => {
            const Icon = s.icon
            const isActive = i === step
            const isDone = i < step
            const canJumpToStep = i <= step
            return (
              <div key={s.label} className="contents">
                <button
                  type="button"
                  onClick={() => {
                    if (!canJumpToStep) return
                    setStep(i)
                  }}
                  disabled={!canJumpToStep}
                  className={`flex flex-col items-center gap-1 flex-1 text-center ${canJumpToStep ? "cursor-pointer" : "cursor-not-allowed"}`}
                >
                  <div className="h-9 flex items-center justify-center">
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
                  </div>
                  <span className={`text-[10px] font-medium ${isActive ? "text-emerald-700 dark:text-emerald-400" : "text-slate-400"}`}>
                    {s.label}
                  </span>
                </button>
                {i < STEPS.length - 1 && (
                  <div className="flex items-center h-9">
                    <svg 
                      className={`h-4 w-4 flex-shrink-0 ${i < step ? "text-emerald-400" : "text-slate-300"}`}
                      viewBox="0 0 24 24" 
                      fill="currentColor"
                    >
                      <polygon points="0,0 24,12 0,24" />
                    </svg>
                  </div>
                )}
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
                    <TraceyBubble text="G'day! Let's get you set up. Fill in your details below and we'll get Tracey ready for your business." />

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
                          Add your website to pre-fill the next step.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* ──── STEP 2: Autonomy Selector ──── */}
                {step === 1 && (
                  <div className="space-y-5">

                    <TraceyBubble text="How much freedom do you want to give me? Pick a mode — you can always change it later in Settings." />

                    <div className="flex gap-3 flex-col sm:flex-row">
                      {(Object.keys(MODE_DESCRIPTIONS) as AgentMode[]).map((mode) => {
                        const { title, icon: ModeIcon, description } = MODE_DESCRIPTIONS[mode]
                        const isSelected = agentMode === mode
                        return (
                          <button
                            key={mode}
                            onClick={() => setAgentMode(mode)}
                            className={`flex-1 text-left p-4 rounded-xl border-2 transition-all ${isSelected
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

                    <div className="border-t pt-4 space-y-4">
                      <TraceyBubble text="Here's a sneak peek at how I'll handle a real customer call in your selected mode." />

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

                      <div className="rounded-xl border bg-white dark:bg-slate-900 p-4 space-y-4 min-h-[200px]">
                        <AnimatePresence mode="wait">
                          <motion.div
                            key={`${agentMode}-${simStep}-mode-step`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0 }}
                            className="space-y-3"
                          >
                            <div className="flex items-start gap-2 justify-end">
                              <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg rounded-tr-none px-3 py-2 text-sm max-w-[80%]">
                                {getScenarioDialogue(agentMode, {
                                  businessName,
                                  tradeType,
                                  serviceName: services.find((s) => s.serviceName.trim())?.serviceName || "",
                                  priceRange: (() => {
                                    const s = services.find((sv) => sv.priceMin || sv.priceMax)
                                    return s ? `$${s.priceMin || "??"}-$${s.priceMax || s.priceMin ? (s.priceMin || 0) * 1.5 : "??"}` : ""
                                  })(),
                                  callOutFee: globalCallOutFee ? `$${globalCallOutFee}` : "",
                                })[SCENARIO_STEPS[simStep]].customer}
                              </div>
                              <div className="shrink-0 w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                                <User className="h-3.5 w-3.5 text-blue-600" />
                              </div>
                            </div>

                            <div className="flex items-start gap-2">
                              <div className="shrink-0 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                                <Sparkles className="h-3.5 w-3.5 text-emerald-600" />
                              </div>
                              <div className="bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg rounded-tl-none px-3 py-2 text-sm max-w-[80%]">
                                {getScenarioDialogue(agentMode, {
                                  businessName,
                                  tradeType,
                                  serviceName: services.find((s) => s.serviceName.trim())?.serviceName || "",
                                  priceRange: (() => {
                                    const s = services.find((sv) => sv.priceMin || sv.priceMax)
                                    return s ? `$${s.priceMin || "??"}-$${s.priceMax || s.priceMin ? (s.priceMin || 0) * 1.5 : "??"}` : ""
                                  })(),
                                  callOutFee: globalCallOutFee ? `$${globalCallOutFee}` : "",
                                })[SCENARIO_STEPS[simStep]].tracey}
                              </div>
                            </div>
                          </motion.div>
                        </AnimatePresence>
                      </div>
                    </div>
                  </div>
                )}

                {/* ──── STEP 3: Business Identity & Operating Rules ──── */}
                {step === 2 && (
                  <div className="space-y-5">
                    {scrapeData ? (
                      <TraceyBubble text="Have a look through these business details and adjust anything that&apos;s not right." />
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
                          <Label>Business Name</Label>
                          <Input
                            placeholder="e.g. Smith's Plumbing"
                            value={businessName}
                            onChange={(e) => setBusinessName(e.target.value)}
                          />
                        </div>
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
                        <div className="space-y-1.5 sm:col-span-2">
                          <Label>Google review link (optional)</Label>
                          <Input
                            placeholder="https://g.page/r/your-business/review"
                            value={googleReviewUrl}
                            onChange={(e) => setGoogleReviewUrl(e.target.value)}
                          />
                          <p className="text-xs text-slate-500">
                            Optional. If your website already links to Google reviews, we&apos;ll try to pre-fill this. Customers still go through the Earlymark feedback form first. This only adds a public review step for strong feedback.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Location & Service Radius */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                        <MapPin className="h-4 w-4" /> Location & Service Area
                      </h3>
                      <div className="space-y-1.5">
                        <Label>Physical Address</Label>
                        <AddressAutocomplete
                          placeholder="123 Trade St, Parramatta NSW 2150"
                          value={physicalAddress}
                          onChange={(next) => setPhysicalAddress(next)}
                          onPlaceSelect={(place) => setPhysicalAddress(place.address)}
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

                      <WeeklyHoursEditor
                        value={weeklyHours}
                        onChange={setWeeklyHours}
                        uniform={uniformWorkingHours}
                        onUniformChange={setUniformWorkingHours}
                      />

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
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-slate-500">Emergency Start</Label>
                              <Input
                                type="time"
                                value={emergencyStartTime}
                                onChange={(e) => setEmergencyStartTime(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-slate-500">Emergency End</Label>
                              <Input
                                type="time"
                                value={emergencyEndTime}
                                onChange={(e) => setEmergencyEndTime(e.target.value)}
                              />
                            </div>
                          </div>
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
                        <Mail className="h-4 w-4 text-emerald-500" /> How Tracey Works With Your Inbox [{agentMode === "EXECUTION" ? "Execute" : agentMode === "DRAFT" ? "Review & approve" : "Info only"}]
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
                            <p className="text-xs text-slate-500 mt-0.5">Connect your Gmail or Outlook directly for instant lead capture</p>
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
                            {leadCaptureEmailReadiness && !leadCaptureEmailReadiness.ready && (
                              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                                Inbound email is not live yet. Do not forward leads until DNS is fixed.
                              </p>
                            )}
                            {leadCaptureEmailReadiness?.ready && !leadCaptureEmailReadiness.receivingConfirmed && (
                              <p className="mt-1 text-xs text-amber-700 dark:text-amber-300">
                                DNS and Resend are verified. Your first forwarded lead email will confirm live receiving.
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    </div>

                    {inboxConnectionType === "oauth" && (
                      <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4 space-y-3">
                        <p className="text-sm text-slate-600 dark:text-slate-400">
                          Connect your email account so Tracey can start monitoring for new leads immediately.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={async () => {
                              try {
                                const res = await fetch("/api/auth/email-provider?provider=gmail")
                                const data = await res.json()
                                if (data.authUrl) window.open(data.authUrl, "_blank", "width=600,height=700")
                                else toast.error("Failed to start Gmail connection")
                              } catch { toast.error("Failed to connect Gmail") }
                            }}
                          >
                            <Mail className="h-4 w-4" />
                            Connect Gmail
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="gap-2"
                            onClick={async () => {
                              try {
                                const res = await fetch("/api/auth/email-provider?provider=outlook")
                                const data = await res.json()
                                if (data.authUrl) window.open(data.authUrl, "_blank", "width=600,height=700")
                                else toast.error("Failed to start Outlook connection")
                              } catch { toast.error("Failed to connect Outlook") }
                            }}
                          >
                            <Mail className="h-4 w-4" />
                            Connect Outlook
                          </Button>
                        </div>
                      </div>
                    )}

                    {inboxConnectionType === "forward" && preGenLeadsEmail && (
                      <div className={`${leadCaptureStatusCopy.tone === "blocked" ? "bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-800" : leadCaptureStatusCopy.tone === "verified" ? "bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800" : "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800"} border rounded-lg p-4`}>
                        <p className={`text-xs mb-2 ${leadCaptureStatusCopy.tone === "blocked" ? "text-red-800 dark:text-red-200" : leadCaptureStatusCopy.tone === "verified" ? "text-amber-800 dark:text-amber-200" : "text-emerald-800 dark:text-emerald-200"}`}>
                          <strong>{leadCaptureStatusCopy.title}</strong>
                        </p>
                        <div className="flex items-center gap-2">
                          <code className={`flex-1 bg-white dark:bg-slate-900 px-3 py-2 rounded text-sm font-mono select-all ${leadCaptureStatusCopy.tone === "blocked" ? "text-red-700 dark:text-red-300" : leadCaptureStatusCopy.tone === "verified" ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-400"}`}>
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
                        {leadCaptureStatusCopy.tone === "blocked" ? (
                          <div className="mt-2 text-xs text-red-700 dark:text-red-300">
                            <p>{leadCaptureStatusCopy.helper}</p>
                            {(leadCaptureEmailReadiness?.issues || []).slice(0, 2).map((issue) => (
                              <p key={issue}>{issue}</p>
                            ))}
                          </div>
                        ) : (
                          <p className={`text-xs mt-2 ${leadCaptureStatusCopy.tone === "verified" ? "text-amber-700 dark:text-amber-300" : "text-emerald-700 dark:text-emerald-400"}`}>
                            {leadCaptureStatusCopy.helper}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ──── STEP 5: Automated Pricing & Instruction Table ──── */}
                {step === 4 && (
                  <div className="space-y-5">
                    <TraceyBubble text={`I${scrapeData?.services?.length ? "'ve pre-filled a few services for you. " : "'ll need your services here so I can "}quote accurately and handle enquiries. Tweak, add, or delete anything below.`} />

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
                      <div className="hidden sm:grid sm:grid-cols-[minmax(0,1.55fr)_96px_96px_minmax(0,1.75fr)_40px] gap-2 px-1 text-xs font-semibold text-slate-500 uppercase">
                        <span>Service</span>
                        <span>Min ($)</span>
                        <span>Max ($)</span>
                        <span>
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
                        <span></span>
                      </div>

                      {services.map((svc, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-1 gap-2 rounded-[18px] border bg-white p-3 dark:bg-slate-900 sm:grid-cols-[minmax(0,1.55fr)_96px_96px_minmax(0,1.75fr)_40px]"
                        >
                          <div>
                            <Label className="sm:hidden text-xs text-slate-500 mb-1">Service Name</Label>
                            <Input
                              placeholder="e.g. Tap Replacement"
                              value={svc.serviceName}
                              onChange={(e) => updateService(i, "serviceName", e.target.value)}
                              className="min-w-0"
                            />
                          </div>
                          <div>
                            <Label className="sm:hidden text-xs text-slate-500 mb-1">Min ($)</Label>
                            <Input
                              type="number"
                              placeholder="$"
                              value={svc.priceMin ?? ""}
                              onChange={(e) => updateService(i, "priceMin", e.target.value ? Number(e.target.value) : undefined)}
                              className="min-w-0"
                            />
                          </div>
                          <div>
                            <Label className="sm:hidden text-xs text-slate-500 mb-1">Max ($)</Label>
                            <Input
                              type="number"
                              placeholder="$"
                              value={svc.priceMax ?? ""}
                              onChange={(e) => updateService(i, "priceMax", e.target.value ? Number(e.target.value) : undefined)}
                              className="min-w-0"
                            />
                          </div>
                          <div>
                            <Label className="sm:hidden text-xs text-slate-500 mb-1">Teach Tracey</Label>
                            <Textarea
                              placeholder="e.g. Ask if gas or electric"
                              value={svc.traceyNotes}
                              onChange={(e) => updateService(i, "traceyNotes", e.target.value)}
                              rows={2}
                              className="min-h-[60px] resize-none"
                            />
                          </div>
                          <div className="flex items-start justify-end pt-1">
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

                {/* ──── STEP 6: Provisioning & Closing ──── */}
                {step === 5 && (
                  <div className="space-y-5">
                    {!provisionResult ? (
                      <>
                        <TraceyBubble text="Almost there. I need your dedicated number ready before you can activate Tracey." />

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
                          <h3 className="font-semibold text-sm">Your activation checklist</h3>
                          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span>
                                {resolvedPhoneNumber ? (
                                  <span>
                                    Your dedicated AU phone number: <strong className="text-emerald-600 font-mono">{resolvedPhoneNumber}</strong>
                                  </span>
                                ) : (
                                  <span className={provisioningStatus === "failed" || provisioningStatus === "blocked_duplicate" ? "text-red-600 dark:text-red-400" : provisioningStatus === "not_requested" ? "text-amber-600 dark:text-amber-400" : "text-slate-600 dark:text-slate-300"}>
                                    {provisioningStatus === "provisioning" ? (
                                      <span className="flex items-center gap-2">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        {provisioningStatusMessage}
                                      </span>
                                    ) : (
                                      provisioningStatusMessage
                                    )}
                                  </span>
                                )}
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                              <span className={leadCaptureStatusCopy.tone === "verified" ? "text-amber-700 dark:text-amber-300" : ""}>
                                Leads email <strong>{preGenLeadsEmail || "will be generated"}</strong> {leadCaptureStatusCopy.checklist}
                              </span>
                            </li>
                            <li className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{provisioningStatus === "not_requested" ? "You can add a dedicated number later from billing or settings." : <>A welcome SMS will be sent to <strong>{phone || "your mobile"}</strong></>}</span>
                            </li>
                          </ul>
                          {provisioningError && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">
                              {provisioningError}
                            </div>
                          )}
                          {provisioningStatus === "failed" && provisionPhoneNumberRequested !== false && (
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                void resolveProvisioning()
                              }}
                              className="gap-2"
                            >
                              <Loader2 className="h-4 w-4" />
                              Retry number setup
                            </Button>
                          )}
                        </div>

                        <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-4 space-y-4">
                          <div>
                            <h3 className="font-semibold text-sm">Invite your team</h3>
                            <p className="text-xs text-slate-500 mt-1">
                              Optional. Invite managers or team members now, or skip and do it later from the dashboard.
                            </p>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px] gap-3">
                            <div className="space-y-1.5">
                              <Label>Team member email</Label>
                              <Input
                                placeholder="team@example.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label>Role</Label>
                              <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as "TEAM_MEMBER" | "MANAGER")}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="TEAM_MEMBER">Team Member</SelectItem>
                                  <SelectItem value="MANAGER">Manager</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          <div className="flex flex-col gap-3 sm:flex-row">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={handleCreateInvite}
                              disabled={creatingInvite || !inviteEmail.trim()}
                              className="gap-2"
                            >
                              {creatingInvite ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                              Send invite
                            </Button>
                            {generatedInviteLink && (
                              <Button
                                type="button"
                                variant="ghost"
                                onClick={() => {
                                  navigator.clipboard.writeText(generatedInviteLink)
                                  toast.success("Invite link copied")
                                }}
                              >
                                Copy invite link
                              </Button>
                            )}
                          </div>
                          {inviteError && (
                            <p className="text-sm text-red-600 dark:text-red-400">{inviteError}</p>
                          )}
                        </div>

                        <Button
                          type="button"
                          onClick={() => {
                            if (submitting) {
                              toast.info("Still processing, please wait...")
                              return
                            }
                            if (!canActivateTracey) {
                              toast.error(activationBlockedReason)
                              return
                            }
                            void handleSubmit()
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white gap-2 h-11"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Setting up your account...
                            </>
                          ) : provisionPhoneNumberRequested === null ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Checking billing settings...
                            </>
                          ) : !canActivateTracey ? (
                            <>
                              <Loader2 className={`h-4 w-4 ${provisioningStatus === "provisioning" ? "animate-spin" : ""}`} />
                              {provisioningStatus === "blocked_duplicate"
                                  ? "Provisioning blocked"
                                  : provisioningStatus === "requested"
                                    ? "Waiting for payment confirmation"
                                    : "Waiting for your number"}
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
                        <TraceyBubble text={provisionResult.phoneNumber ? "Welcome aboard! I'm live and ready to take calls. You'll get a text from me shortly to confirm the connection." : "Welcome aboard! Your onboarding is complete. You can provision a dedicated number later from billing or settings."} animate={false} />

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
                              {provisionResult.provisioningError}
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
                {step < 5 && (
                  <div className="flex justify-between pt-6">
                    {step > 0 ? (
                      <Button variant="outline" onClick={() => setStep(step - 1)} className="gap-1.5">
                        <ChevronLeft className="h-4 w-4" /> Back
                      </Button>
                    ) : (
                      <div />
                    )}
                    <Button
                      onClick={() => {
                        if (!canAdvance()) return
                        setStep(step + 1)
                      }}
                      disabled={!canAdvance()}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                {step === 5 && !provisionResult && (
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
