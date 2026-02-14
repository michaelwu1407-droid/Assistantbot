# PJ BUDDY — OUTSTANDING ISSUES REMEDIATION LOG

**Date**: 2026-02-13
**Purpose**: Granular implementation guide for AI coding agents to execute remaining HIGH and MEDIUM priority fixes.
**Scope**: Excludes LOW priority items (Photo Annotation J-7, Video Recording J-10, Payment Terminal J-12).

---

## ISSUE 1: MATERIAL DATABASE — NEEDS SEED DATA EXPANSION & ESTIMATOR WIRING (J-9)

**Priority**: HIGH
**Status**: 80% — Schema, actions, and MaterialPicker UI exist. Seed data is minimal (14 items). Estimator form not wired.

### Current State

| Layer | File | Lines | State |
|-------|------|-------|-------|
| Schema | `prisma/schema.prisma` | 272-285 | Material model: `id`, `name`, `description?`, `unit`, `price` (Decimal), `category?`, `workspaceId` |
| Seed | `prisma/seed.ts` | 196-220 | 14 items across 3 categories (Plumbing=6, Electrical=5, Labor=3) |
| Actions | `actions/material-actions.ts` | 19-54 | `searchMaterials(workspaceId, query)` — fuzzy search on name/desc/category. Works. |
| Actions | `actions/material-actions.ts` | 59-78 | `createMaterial(data)` — creates single material. Works but unused in UI. |
| UI | `components/tradie/material-picker.tsx` | 1-129 | Dialog-based command palette. Debounced search. Calls `searchMaterials`. Returns `{description, price}` via `onSelect`. |
| UI | `components/tradie/job-bottom-sheet.tsx` | 11 | `MaterialPicker` is imported but **never rendered** in the JSX. |

### Tasks

#### 1A. Expand seed data in `prisma/seed.ts`

**File**: `prisma/seed.ts`
**Location**: Lines 196-220 (inside the `createMany` data array)

Add materials for these trade categories. Each entry follows the pattern:
```ts
{ name: "...", unit: "m"|"hr"|"each"|"roll"|"pack", price: new Decimal("..."), category: "...", workspaceId: workspace.id }
```

**Add these categories with at minimum 5 items each:**

- **HVAC**: Refrigerant R410A (kg/$45), Copper coil 6mm (m/$8.50), Split system bracket (each/$35), Condensate pump (each/$85), Duct tape foil (roll/$12)
- **General/Hardware**: Silicone sealant (each/$8), Masking tape (roll/$4.50), Drill bit set (pack/$22), Wall anchors M6 (pack/$6), Cable ties 200mm (pack/$5)
- **Roofing**: Colorbond sheet 3m (each/$45), Ridge cap (m/$18), Roof screw kit (pack/$12), Flashing aluminium (m/$15), Gutter bracket (each/$4.50)

This brings the total from 14 to ~29 materials.

#### 1B. Render MaterialPicker inside the Billing tab of JobBottomSheet

**File**: `components/tradie/job-bottom-sheet.tsx`
**Location**: Line 176-193 (the Billing tab's `<Input>` for "Item (e.g. 100mm PVC)")

**Current code** (lines 176-193):
```tsx
<div className="flex gap-2">
    <Input
        placeholder="Item (e.g. 100mm PVC)"
        className="bg-slate-950 border-slate-800 text-white focus:border-[#ccff00]/50"
        value={variationDesc}
        onChange={(e) => setVariationDesc(e.target.value)}
    />
    <Input
        placeholder="$"
        type="number"
        className="w-24 bg-slate-950 border-slate-800 text-white focus:border-[#ccff00]/50"
        value={variationPrice}
        onChange={(e) => setVariationPrice(e.target.value)}
    />
</div>
<Button className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700" onClick={handleAddVariation}>
    <Plus className="w-4 h-4 mr-2" /> Add Variation
</Button>
```

**Replace with**: Add a `<MaterialPicker>` between the inputs and the button:
```tsx
<div className="flex gap-2">
    <Input ... value={variationDesc} ... />
    <Input ... value={variationPrice} ... />
</div>
<MaterialPicker
    onSelect={(material) => {
        setVariationDesc(material.description)
        setVariationPrice(String(material.price))
    }}
    trigger={
        <Button variant="outline" size="sm" className="w-full mb-2 gap-2 bg-slate-900 border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-[#ccff00]">
            <Search className="h-4 w-4" /> Search Material Database
        </Button>
    }
/>
<Button ... onClick={handleAddVariation}>
    <Plus className="w-4 h-4 mr-2" /> Add Variation
</Button>
```

Also add `Search` to the lucide-react import on line 5:
```diff
- import { Phone, MessageSquare, Wrench, Camera, Navigation, Plus, Video, PenTool } from "lucide-react"
+ import { Phone, MessageSquare, Wrench, Camera, Navigation, Plus, Video, PenTool, Search } from "lucide-react"
```

#### 1C. Wire `createMaterial` to an "Add Custom Material" button (optional)

**File**: `components/tradie/material-picker.tsx`
**Location**: After line 98 (`<CommandEmpty>No materials found.</CommandEmpty>`)

Add an "Add to database" action inside `CommandEmpty`:
```tsx
<CommandEmpty>
    No materials found.
    <Button variant="link" size="sm" onClick={() => {/* open add-material dialog */}}>
        + Add "{search}" to database
    </Button>
</CommandEmpty>
```

This calls `createMaterial()` from `actions/material-actions.ts:59` with the current search query as the name.

---

## ISSUE 2: VOICE-TO-TEXT ON JOB DETAIL PAGES (J-8)

**Priority**: HIGH
**Status**: 50% — SpeechRecognition fully works in AssistantPane. Not wired to job detail or job diary.

### Current State

| Layer | File | Lines | State |
|-------|------|-------|-------|
| Working impl | `components/core/assistant-pane.tsx` | 54-103 | Full SpeechRecognition: init (57), config (60-62: `continuous:false`, `lang:"en-AU"`), result handler (67-70), error handler (71-80), toggle function (87-103) |
| Working UI | `components/core/assistant-pane.tsx` | 407-416 | Mic button: pulsing red ring when active, `Mic`/`MicOff` icon toggle |
| Missing | `components/tradie/job-detail-view.tsx` | — | No voice input anywhere on job detail |
| Missing | `components/tradie/job-bottom-sheet.tsx` | — | No voice input in bottom sheet diary tab |

### Tasks

#### 2A. Extract reusable voice hook from assistant-pane.tsx

**Create new file**: `hooks/use-speech-recognition.ts`

Extract the logic from `components/core/assistant-pane.tsx` lines 54-103 into a custom hook:

```ts
"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { toast } from "sonner"

export function useSpeechRecognition() {
    const [isListening, setIsListening] = useState(false)
    const [transcript, setTranscript] = useState("")
    const recognitionRef = useRef<any>(null)

    useEffect(() => {
        if (typeof window === "undefined") return
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
        if (!SpeechRecognition) return

        const recognition = new SpeechRecognition()
        recognition.continuous = false
        recognition.interimResults = false
        recognition.lang = "en-AU"

        recognition.onstart = () => setIsListening(true)
        recognition.onend = () => setIsListening(false)
        recognition.onresult = (event: any) => {
            const text = event.results[0][0].transcript
            setTranscript(text)
        }
        recognition.onerror = (event: any) => {
            setIsListening(false)
            if (event.error === "not-allowed") {
                toast.error("Microphone access denied. Check browser permissions.")
            }
        }

        recognitionRef.current = recognition
    }, [])

    const toggleListening = useCallback(() => {
        const recognition = recognitionRef.current
        if (!recognition) {
            toast.error("Speech recognition not supported in this browser.")
            return
        }
        if (isListening) {
            recognition.stop()
        } else {
            setTranscript("")
            recognition.start()
        }
    }, [isListening])

    return { isListening, transcript, toggleListening }
}
```

#### 2B. Add mic button to JobDetailView diary tab

**File**: `components/tradie/job-detail-view.tsx`
**Location**: Line 105-121 (the "diary" TabsContent)

**Current code** (lines 105-121):
```tsx
<TabsContent value="diary" className="mt-4 space-y-4">
    {/* Photos Grid */}
    <div className="grid grid-cols-2 gap-3">
        {job.photos.map(...)}
        {job.photos.length === 0 && (...)}
    </div>
</TabsContent>
```

**Add** a voice note section above the photo grid:
```tsx
<TabsContent value="diary" className="mt-4 space-y-4">
    {/* Voice Note */}
    <VoiceNoteInput dealId={job.id} />

    {/* Photos Grid */}
    <div className="grid grid-cols-2 gap-3">
        ...
    </div>
</TabsContent>
```

#### 2C. Create VoiceNoteInput component

**Create new file**: `components/tradie/voice-note-input.tsx`

```tsx
"use client"

import { useState } from "react"
import { Mic, MicOff, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { logActivity } from "@/actions/activity-actions"  // already exists
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface VoiceNoteInputProps {
    dealId: string
}

export function VoiceNoteInput({ dealId }: VoiceNoteInputProps) {
    const { isListening, transcript, toggleListening } = useSpeechRecognition()
    const [note, setNote] = useState("")
    const router = useRouter()

    // Append transcript when speech recognition returns
    // Use useEffect to watch transcript changes and append to note

    const handleSave = async () => {
        if (!note.trim()) return
        await logActivity({
            type: "NOTE",
            title: "Voice Note",
            description: "Transcribed voice note added to job diary",
            content: note,
            dealId,
        })
        toast.success("Note saved to job diary")
        setNote("")
        router.refresh()
    }

    return (
        <div className="bg-white rounded-lg border border-slate-200 p-3 space-y-2">
            <div className="flex items-center gap-2">
                <Button
                    variant={isListening ? "destructive" : "outline"}
                    size="sm"
                    onClick={toggleListening}
                    className={isListening ? "animate-pulse" : ""}
                >
                    {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </Button>
                <span className="text-xs text-slate-500">
                    {isListening ? "Listening..." : "Tap mic to dictate a note"}
                </span>
            </div>
            <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Type or dictate a job diary note..."
                className="min-h-[60px] text-sm"
            />
            <Button size="sm" onClick={handleSave} disabled={!note.trim()} className="w-full">
                <Send className="h-3 w-3 mr-2" /> Save to Diary
            </Button>
        </div>
    )
}
```

#### 2D. Refactor assistant-pane.tsx to use the shared hook

**File**: `components/core/assistant-pane.tsx`
**Location**: Lines 54-103

Replace the inline SpeechRecognition logic with:
```tsx
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"

// Inside the component:
const { isListening, transcript, toggleListening } = useSpeechRecognition()

// In a useEffect, append transcript to input:
useEffect(() => {
    if (transcript) {
        setInput((prev: string) => prev ? `${prev} ${transcript}` : transcript)
    }
}, [transcript])
```

Remove the old `recognitionRef`, `isListening` state, `toggleListening` function, and the `useEffect` that initializes SpeechRecognition (lines 54-103).

---

## ISSUE 3: GLOBAL SEARCH NOT ON TRADIE PAGES

**Priority**: MEDIUM
**Status**: 0% integration — Component exists, never rendered on tradie pages.

### Current State

| Layer | File | Lines | State |
|-------|------|-------|-------|
| Component | `components/core/search-command.tsx` | 26-140 | Cmd+K command palette. Searches contacts only. **Hardcoded** `"demo-workspace"` on line 46. |
| Alt component | `components/layout/global-search.tsx` | 27-159 | More advanced: searches Contacts AND Deals. Takes `workspaceId` prop. |
| Tradie header | `app/(dashboard)/tradie/client-page.tsx` | 68 | Has a `<Search>` icon button but it's **non-functional** (no `onClick`). |
| Dashboard header | `components/dashboard/header.tsx` | — | Uses `SearchCommand` in main dashboard but NOT in tradie layout. |

### Tasks

#### 3A. Wire GlobalSearch into tradie client page header

**File**: `app/(dashboard)/tradie/client-page.tsx`
**Location**: Around line 68 (the Search icon button in the header)

Add import at top of file:
```tsx
import { GlobalSearch } from "@/components/layout/global-search"
```

Add state:
```tsx
const [searchOpen, setSearchOpen] = useState(false)
```

Replace the non-functional Search icon button (~line 68) with:
```tsx
<Button variant="ghost" size="icon" onClick={() => setSearchOpen(true)}>
    <Search className="h-5 w-5" />
</Button>
<GlobalSearch workspaceId={workspaceId} open={searchOpen} onOpenChange={setSearchOpen} />
```

**Note**: `GlobalSearch` may need its `open`/`onOpenChange` props to be added if it currently only uses internal state. Check `components/layout/global-search.tsx` line 29 — if it uses internal `useState` for `open`, refactor to accept optional external control:
```tsx
interface GlobalSearchProps {
    workspaceId: string
    open?: boolean
    onOpenChange?: (open: boolean) => void
}
```

#### 3B. Fix hardcoded workspace ID in search-command.tsx

**File**: `components/core/search-command.tsx`
**Location**: Line 46

**Current**: `const contacts = await searchContacts("demo-workspace", query)`
**Replace with**: Use workspace from store or props:
```tsx
import { useShellStore } from "@/lib/store"
// inside component:
const workspaceId = useShellStore(s => s.workspaceId)
// then:
const contacts = await searchContacts(workspaceId || "", query)
```

#### 3C. Add Cmd+K keyboard listener to tradie pages

**File**: `app/(dashboard)/tradie/client-page.tsx`
**Location**: Inside the component, after state declarations

Add keyboard shortcut listener:
```tsx
useEffect(() => {
    const handler = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
            e.preventDefault()
            setSearchOpen(true)
        }
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
}, [])
```

---

## ISSUE 4: "NEXT JOB" CALCULATION (D-8)

**Priority**: MEDIUM
**Status**: 70% — Server action `getNextJob()` exists. Client uses `jobs[0]` instead.

### Current State

| Layer | File | Lines | State |
|-------|------|-------|-------|
| Server action | `actions/tradie-actions.ts` | 112-133 | `getNextJob(workspaceId)`: finds first deal where `scheduledAt > now` and `jobStatus NOT IN [COMPLETED, CANCELLED]`, ordered by `scheduledAt ASC`. Returns `{id, title, client, time, address}`. |
| Server page | `app/(dashboard)/tradie/page.tsx` | 11-16 | Fetches via `getTradieJobs(workspace.id)` and passes as `initialJobs`. Does NOT call `getNextJob`. |
| Client page | `app/(dashboard)/tradie/client-page.tsx` | 44 | `const currentJob = jobs[0]` — naive first-element pick, ignores time/location. |
| Dashboard client | `components/tradie/tradie-dashboard-client.tsx` | 30-63 | Uses `initialJob` prop (singular), shows "All Caught Up!" if null. |

### Tasks

#### 4A. Call `getNextJob` in the server page

**File**: `app/(dashboard)/tradie/page.tsx`
**Location**: Lines 11-16

**Current**:
```tsx
const jobs = await getTradieJobs(workspace.id)
return <TradiePage initialJobs={jobs} />
```

**Change to**:
```tsx
import { getTradieJobs, getNextJob, getTodaySchedule } from "@/actions/tradie-actions"

// Inside the async component:
const [jobs, nextJob, todayJobs] = await Promise.all([
    getTradieJobs(workspace.id),
    getNextJob(workspace.id),
    getTodaySchedule(workspace.id),
])

return <TradiePage initialJobs={jobs} nextJob={nextJob} todayJobs={todayJobs} />
```

#### 4B. Update client page to use `nextJob` prop

**File**: `app/(dashboard)/tradie/client-page.tsx`
**Location**: Line 25-34 (props interface) and line 44 (currentJob assignment)

Add to props interface:
```tsx
interface TradiePageProps {
    initialJobs: Job[]
    nextJob?: { id: string; title: string; client: string; time: Date | null; address: string | null } | null
    todayJobs?: any[]
}
```

Replace line 44:
```diff
- const currentJob = jobs[0]
+ const currentJob = nextJob ? jobs.find(j => j.id === nextJob.id) || jobs[0] : jobs[0]
```

#### 4C. (Future) Add proximity-based sorting

**File**: `actions/tradie-actions.ts`
**Location**: After line 133 (end of `getNextJob`)

If the user's current lat/lng is available (via browser geolocation passed as params), sort by distance:
```ts
export async function getNextJobByProximity(workspaceId: string, userLat: number, userLng: number) {
    const jobs = await getTodaySchedule(workspaceId)
    if (jobs.length === 0) return null

    // Haversine distance calculation
    const withDistance = jobs
        .filter(j => j.lat && j.lng)
        .map(j => ({
            ...j,
            distance: haversine(userLat, userLng, Number(j.lat), Number(j.lng))
        }))
        .sort((a, b) => a.distance - b.distance)

    return withDistance[0] || null
}
```

This is a future enhancement — the time-based `getNextJob` is sufficient for now.

---

## ISSUE 5: TODAY'S JOBS FILTER NOT INTEGRATED (D-9)

**Priority**: MEDIUM
**Status**: 50% — `getTodaySchedule()` server action exists and works. Not called from UI. Tradie page shows ALL jobs, not today's.

### Current State

| Layer | File | Lines | State |
|-------|------|-------|-------|
| Server action | `actions/tradie-actions.ts` | 74-106 | `getTodaySchedule(workspaceId)`: filters `scheduledAt` between start/end of today, excludes CANCELLED, returns `{id, title, time, client, address, status, lat, lng}` |
| Server page | `app/(dashboard)/tradie/page.tsx` | 14 | Calls `getTradieJobs()` (ALL jobs), does NOT call `getTodaySchedule()` |
| Client page | `app/(dashboard)/tradie/client-page.tsx` | 40-51 | Renders all `initialJobs` on map, no filtering |
| Dashboard client | `components/tradie/tradie-dashboard-client.tsx` | 89 | Map receives `todayJobs` prop but it's passed as `todayJobs={todayJobs}` from parent — depends on parent actually passing today-filtered data |

### Tasks

#### 5A. Pass today's jobs from server page (covered by 4A above)

Already addressed in Issue 4, Task 4A — add `getTodaySchedule` to the `Promise.all` call.

#### 5B. Filter map pins to today's jobs only

**File**: `components/tradie/tradie-dashboard-client.tsx`
**Location**: Line 89

**Current**:
```tsx
<JobMap deals={todayJobs.length > 0 ? todayJobs : (initialJob ? [initialJob] : [])} />
```

This already prefers `todayJobs` — verify the parent page passes this prop correctly after Task 4A.

#### 5C. Add "Today: X jobs" indicator in header

**File**: `components/tradie/tradie-dashboard-client.tsx`
**Location**: Line 67-77 (header overlay area)

Add after the Header component:
```tsx
<div className="absolute top-16 left-4 z-20 pointer-events-auto">
    <span className="text-xs font-bold uppercase tracking-widest text-slate-400 bg-slate-900/80 px-3 py-1 rounded-full border border-slate-800">
        Today: {todayJobs.length} job{todayJobs.length !== 1 ? 's' : ''}
    </span>
</div>
```

---

## ISSUE 6: AUTO-RETREAT CANVAS (M-6)

**Priority**: MEDIUM (LOW per original GAP, but included for completeness)
**Status**: 0% — No inactivity timer or auto-mode-switching logic exists.

### Current State

| Layer | File | Lines | State |
|-------|------|-------|-------|
| Shell | `components/layout/Shell.tsx` | 23-24 | `isBasicView = viewMode === "BASIC" && isDashboardRoot`. Simple boolean. |
| Shell | `components/layout/Shell.tsx` | 41-67 | BASIC view: full-width centered chat |
| Shell | `components/layout/Shell.tsx` | 68-102 | ADVANCED view: 75/25 split |
| Store | `lib/store.ts` | — | `viewMode` state: `"BASIC"` or `"ADVANCED"` with `setViewMode()` |

### Tasks

#### 6A. Add inactivity timer to Shell.tsx

**File**: `components/layout/Shell.tsx`
**Location**: Inside the component, after line 24 (after `isBasicView` declaration)

```tsx
const AUTO_RETREAT_MS = 30_000 // 30 seconds of canvas inactivity
const retreatTimerRef = useRef<NodeJS.Timeout | null>(null)

// Auto-retreat: when in ADVANCED mode and user hasn't interacted with canvas
useEffect(() => {
    if (viewMode !== "ADVANCED" || !isDashboardRoot) return

    const resetTimer = () => {
        if (retreatTimerRef.current) clearTimeout(retreatTimerRef.current)
        retreatTimerRef.current = setTimeout(() => {
            setViewMode("BASIC")
        }, AUTO_RETREAT_MS)
    }

    // Listen for interactions on the main canvas panel
    const canvas = document.getElementById("main-canvas")
    if (canvas) {
        canvas.addEventListener("mousemove", resetTimer)
        canvas.addEventListener("click", resetTimer)
        canvas.addEventListener("scroll", resetTimer)
        canvas.addEventListener("keydown", resetTimer)
    }

    resetTimer() // Start initial timer

    return () => {
        if (retreatTimerRef.current) clearTimeout(retreatTimerRef.current)
        if (canvas) {
            canvas.removeEventListener("mousemove", resetTimer)
            canvas.removeEventListener("click", resetTimer)
            canvas.removeEventListener("scroll", resetTimer)
            canvas.removeEventListener("keydown", resetTimer)
        }
    }
}, [viewMode, isDashboardRoot, setViewMode])
```

#### 6B. Add `id="main-canvas"` to the left panel

**File**: `components/layout/Shell.tsx`
**Location**: Line 78-82 (the left ResizablePanel in ADVANCED view)

Add an `id` attribute to the panel's child div so the event listener can find it:
```diff
  <ResizablePanel defaultSize={75} minSize={50}>
-     <main className="h-full overflow-y-auto">
+     <main id="main-canvas" className="h-full overflow-y-auto">
          {children}
      </main>
  </ResizablePanel>
```

#### 6C. Add visual countdown indicator (optional polish)

Show a subtle toast or fading bar 5 seconds before retreat:
```tsx
// Inside the resetTimer timeout callback, add a warning at 25s:
retreatTimerRef.current = setTimeout(() => {
    toast("Returning to chat mode...", { duration: 5000 })
    setTimeout(() => setViewMode("BASIC"), 5000)
}, AUTO_RETREAT_MS - 5000)
```

---

## ISSUE 7: EMAIL API STUBS (email-actions.ts)

**Priority**: MEDIUM
**Status**: 10% — OAuth URLs built, sync functions are stubs.

### Current State

| Function | File | Lines | State |
|----------|------|-------|-------|
| `syncGmail()` | `actions/email-actions.ts` | 40-66 | Stub. Returns `{ success: true, synced: 0, error: "Gmail sync not configured..." }` |
| `syncOutlook()` | `actions/email-actions.ts` | 77-92 | Stub. Returns `{ success: true, synced: 0, error: "Outlook sync not configured..." }` |
| `getGmailAuthUrl()` | `actions/email-actions.ts` | 98-108 | Partially implemented. Builds OAuth URL with scopes. |
| `getOutlookAuthUrl()` | `actions/email-actions.ts` | 113-120 | Partially implemented. Builds Azure OAuth URL. |
| `processEmailWebhook()` | `actions/email-actions.ts` | 126-166 | Implemented. Matches sender to contact, creates activity. |

### Tasks

#### 7A. Implement `syncGmail()` with Google API

**File**: `actions/email-actions.ts`
**Location**: Lines 40-66

**Required env vars**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

**Replace stub with**:
```ts
export async function syncGmail(workspaceId: string, accessToken: string): Promise<EmailSyncResult> {
    try {
        // 1. Fetch recent messages from Gmail API
        const listRes = await fetch(
            "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&q=newer_than:1d",
            { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (!listRes.ok) return { success: false, synced: 0, activitiesCreated: 0, error: "Gmail API error" }
        const listData = await listRes.json()
        const messageIds: string[] = (listData.messages || []).map((m: any) => m.id)

        let synced = 0
        let activitiesCreated = 0

        // 2. Fetch each message and match to contacts
        for (const msgId of messageIds) {
            const msgRes = await fetch(
                `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msgId}?format=metadata&metadataHeaders=From&metadataHeaders=Subject`,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            )
            if (!msgRes.ok) continue
            const msgData = await msgRes.json()

            const headers = msgData.payload?.headers || []
            const from = headers.find((h: any) => h.name === "From")?.value || ""
            const subject = headers.find((h: any) => h.name === "Subject")?.value || ""

            // Extract email from "Name <email>" format
            const emailMatch = from.match(/<(.+?)>/)
            const senderEmail = emailMatch ? emailMatch[1] : from

            // Match to contact
            const contact = await db.contact.findFirst({
                where: { workspaceId, email: senderEmail }
            })

            if (contact) {
                await db.activity.create({
                    data: {
                        type: "EMAIL",
                        title: subject || "No subject",
                        content: `Email from ${from}`,
                        contactId: contact.id,
                    }
                })
                activitiesCreated++
            }
            synced++
        }

        return { success: true, synced, activitiesCreated }
    } catch (error) {
        return { success: false, synced: 0, activitiesCreated: 0, error: String(error) }
    }
}
```

#### 7B. Implement `syncOutlook()` with Microsoft Graph

**File**: `actions/email-actions.ts`
**Location**: Lines 77-92

Same pattern as 7A but using Microsoft Graph endpoint:
- Endpoint: `https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime desc&$filter=receivedDateTime ge {date}`
- Auth header: `Bearer {accessToken}`
- Match `from.emailAddress.address` to contacts

#### 7C. Add OAuth callback route

**Create new file**: `app/api/auth/google/callback/route.ts`

Handle the OAuth callback, exchange code for tokens, store in user/workspace settings:
```ts
import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code")
    // Exchange code for access_token + refresh_token
    // Store tokens in workspace settings (encrypted)
    // Redirect back to /dashboard/settings
}
```

---

## ISSUE 8: CALENDAR API STUBS (calendar-actions.ts)

**Priority**: MEDIUM
**Status**: 10% — Event structure defined, sync functions are stubs.

### Current State

| Function | File | Lines | State |
|----------|------|-------|-------|
| `syncGoogleCalendar()` | `actions/calendar-actions.ts` | 37-57 | Stub. Returns `{ synced: 0, error: "..." }` |
| `syncOutlookCalendar()` | `actions/calendar-actions.ts` | 64-80 | Stub. Returns `{ synced: 0, error: "..." }` |
| `createCalendarEvent()` | `actions/calendar-actions.ts` | 86-131 | Builds event payload but has `// TODO: Actually create the event via API` at line 125. |
| `processCalendarWebhook()` | `actions/calendar-actions.ts` | 137-178 | Implemented. Matches attendees, creates MEETING activities. |

### Tasks

#### 8A. Implement `syncGoogleCalendar()`

**File**: `actions/calendar-actions.ts`
**Location**: Lines 37-57

**Replace stub with**:
```ts
export async function syncGoogleCalendar(workspaceId: string, accessToken: string) {
    try {
        const now = new Date().toISOString()
        const res = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now}&maxResults=50&singleEvents=true&orderBy=startTime`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (!res.ok) return { success: false, synced: 0, error: "Google Calendar API error" }
        const data = await res.json()
        const events = data.items || []

        let synced = 0
        for (const event of events) {
            // Match attendees to contacts
            for (const attendee of (event.attendees || [])) {
                const contact = await db.contact.findFirst({
                    where: { workspaceId, email: attendee.email }
                })
                if (contact) {
                    // Upsert: avoid duplicate activities for same event
                    const existing = await db.activity.findFirst({
                        where: { contactId: contact.id, title: event.summary, type: "MEETING" }
                    })
                    if (!existing) {
                        await db.activity.create({
                            data: {
                                type: "MEETING",
                                title: event.summary || "Calendar Event",
                                content: `${event.start?.dateTime || event.start?.date} - ${event.end?.dateTime || event.end?.date}`,
                                contactId: contact.id,
                            }
                        })
                    }
                }
            }
            synced++
        }
        return { success: true, synced }
    } catch (error) {
        return { success: false, synced: 0, error: String(error) }
    }
}
```

#### 8B. Implement `createCalendarEvent()` API call

**File**: `actions/calendar-actions.ts`
**Location**: Line 125 (the TODO comment)

**Replace the TODO block with**:
```ts
// Create via Google Calendar API
if (provider === 'google') {
    const res = await fetch(
        "https://www.googleapis.com/calendar/v3/calendars/primary/events",
        {
            method: "POST",
            headers: {
                Authorization: `Bearer ${accessToken}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                summary: event.title,
                description: event.description,
                start: { dateTime: event.startTime },
                end: { dateTime: event.endTime },
                attendees: event.attendees?.map(email => ({ email })),
            })
        }
    )
    if (!res.ok) return { success: false, error: "Failed to create Google Calendar event" }
}
```

#### 8C. Implement `syncOutlookCalendar()`

Same pattern as 8A using Microsoft Graph:
- Endpoint: `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime={now}&endDateTime={future}&$top=50`
- Match `attendees[].emailAddress.address` to contacts

---

## ISSUE 9: `job-actions.ts` DUPLICATE FUNCTIONS

**Priority**: MEDIUM (code hygiene)
**Status**: Two separate files define overlapping `updateJobStatus` and `completeSafetyCheck` functions.

### Current State

| Function | File 1 | File 2 | Conflict |
|----------|--------|--------|----------|
| `updateJobStatus` | `actions/job-actions.ts:11` | `actions/tradie-actions.ts:219` | Both exist. `job-actions.ts` imports `JobStatus` from Prisma; `tradie-actions.ts` uses string union. Different side effects. |
| `completeSafetyCheck` | `actions/job-actions.ts:63` | `actions/tradie-actions.ts:269` | Both exist. Slightly different implementations. |
| `sendTravelSMS` | `actions/job-actions.ts:42` | `actions/tradie-actions.ts:184` (as `sendOnMyWaySMS`) | Same purpose, different names. |

### Tasks

#### 9A. Consolidate into `tradie-actions.ts` as the single source of truth

**File**: `actions/job-actions.ts`

This file should be deleted or reduced to re-exports. The `tradie-actions.ts` versions are more complete (they include notification triggers, activity logging, and revalidation).

**Steps**:
1. Search all imports of `job-actions` across the codebase:
   - `components/tradie/job-status-bar.tsx:6` imports `updateJobStatus` from `@/actions/job-actions`
2. Update those imports to point to `tradie-actions`:
   ```diff
   - import { updateJobStatus } from "@/actions/job-actions"
   + import { updateJobStatus } from "@/actions/tradie-actions"
   ```
3. Verify `JobStatusBar` calls match the `tradie-actions` function signature (they do — both take `(dealId: string, status: JobStatus)`).
4. Delete `actions/job-actions.ts` or convert it to re-exports:
   ```ts
   export { updateJobStatus, completeSafetyCheck } from "./tradie-actions"
   ```

---

## EXECUTION ORDER (RECOMMENDED)

| Order | Issue | Effort | Impact |
|-------|-------|--------|--------|
| 1 | **Issue 9**: Consolidate duplicate actions | 15 min | Prevents runtime conflicts |
| 2 | **Issue 1B**: Wire MaterialPicker to billing tab | 15 min | Completes J-9 UI |
| 3 | **Issue 1A**: Expand seed data | 20 min | Fills material database |
| 4 | **Issue 2A-2D**: Voice-to-text hook + job detail | 30 min | Completes J-8 |
| 5 | **Issue 4A-4B**: Next Job server action wiring | 15 min | Completes D-8 |
| 6 | **Issue 5A-5C**: Today's jobs filter + indicator | 15 min | Completes D-9 |
| 7 | **Issue 3A-3C**: Global search on tradie pages | 20 min | UX improvement |
| 8 | **Issue 6A-6C**: Auto-retreat canvas | 25 min | Completes M-6 |
| 9 | **Issue 7-8**: Email/Calendar API stubs | 60 min | Requires OAuth setup |

---

## FILES MODIFIED/CREATED SUMMARY

### Modified
- `components/tradie/job-bottom-sheet.tsx` — Add MaterialPicker render + Search import
- `components/tradie/job-detail-view.tsx` — Add VoiceNoteInput to diary tab
- `components/core/assistant-pane.tsx` — Refactor to use shared speech hook
- `components/core/search-command.tsx` — Fix hardcoded workspace ID
- `components/layout/Shell.tsx` — Add auto-retreat timer + main-canvas ID
- `app/(dashboard)/tradie/page.tsx` — Call getNextJob + getTodaySchedule
- `app/(dashboard)/tradie/client-page.tsx` — Use nextJob prop, wire GlobalSearch, add Cmd+K
- `components/tradie/tradie-dashboard-client.tsx` — Add "Today: X jobs" indicator
- `actions/email-actions.ts` — Implement Gmail/Outlook sync
- `actions/calendar-actions.ts` — Implement Calendar sync + event creation
- `actions/job-actions.ts` — Convert to re-exports from tradie-actions
- `components/tradie/job-status-bar.tsx` — Update import path
- `prisma/seed.ts` — Expand material seed data

### Created
- `hooks/use-speech-recognition.ts` — Reusable SpeechRecognition hook
- `components/tradie/voice-note-input.tsx` — Voice dictation for job diary
- `app/api/auth/google/callback/route.ts` — OAuth callback handler (for Issue 7)

---

## ADDITIONAL ISSUES FOUND (Repo-wide scan — 2026-02-14)

The following issues were identified by a full repo audit including `npx tsc --noEmit` type-check (8 errors), manual code review of all actions/components/pages, and cross-referencing imports against the Prisma schema.

---

### ISSUE 10: 8 TypeScript Compile Errors (BUILD BLOCKER)

**Priority**: CRITICAL — Build will fail.
**`npx tsc --noEmit` output (after `npm install`):**

#### 10A. Missing `safetyCheckCompleted` prop — `app/(dashboard)/tradie/jobs/[id]/page.tsx:185`

**Error**: `TS2741: Property 'safetyCheckCompleted' is missing in type '{ dealId: string; currentStatus: ...; contactName: string; }' but required in type 'JobStatusBarProps'.`

**File**: `app/(dashboard)/tradie/jobs/[id]/page.tsx`
**Line 185**:
```tsx
<JobStatusBar
    dealId={deal.id}
    currentStatus={jobStatus}
    contactName={contact.name}
/>
```

**Fix**: Add the missing prop:
```tsx
<JobStatusBar
    dealId={deal.id}
    currentStatus={jobStatus}
    contactName={contact.name}
    safetyCheckCompleted={deal.safetyCheckCompleted}
/>
```

#### 10B. `DealView` type mismatch in `job-bottom-sheet.tsx` (7 errors)

**File**: `components/tradie/job-bottom-sheet.tsx`
**Lines**: 95, 101, 141, 149, 249

The component declares `job: DealView` (from `deal-actions.ts`), but accesses properties that don't exist on `DealView`:
- `job.contactPhone` (lines 95, 101, 149) — `DealView` has `contactName` but NOT `contactPhone`
- `job.description` (line 141) — `DealView` does NOT have `description`
- `job.jobStatus` (line 249) — `DealView` does NOT have `jobStatus`
- `job.status` (line 249) — `DealView` does NOT have `status` (it has `stage`)

**Fix options**:
1. **Extend `DealView`** in `actions/deal-actions.ts` to include `contactPhone`, `description`, `jobStatus`:
   ```ts
   export interface DealView {
     // ...existing fields...
     contactPhone?: string | null;
     description?: string;
     jobStatus?: string;
   }
   ```
   And update `getDeals()` to populate these fields.

2. **OR** Define a local `JobViewProps` interface in `job-bottom-sheet.tsx` instead of reusing `DealView`.

---

### ISSUE 11: `digest.ts` — Invalid Prisma Relation `contacts` (RUNTIME CRASH)

**Priority**: HIGH — Will throw at runtime whenever the morning digest runs.
**File**: `lib/digest.ts`
**Line 44**:
```ts
include: {
    contacts: { take: 1 },  // ← WRONG: Prisma schema has `contact` (singular), not `contacts`
```

The `Deal` model has a singular `contact Contact` relation (via `contactId`), not a `contacts` array.

**Fix**:
```ts
include: {
    contact: true,
```

Then update references on lines 59-60:
```diff
- const contactName = deal.contacts?.[0]?.name ?? 'Unknown';
- const contactId = deal.contacts?.[0]?.id;
+ const contactName = deal.contact?.name ?? 'Unknown';
+ const contactId = deal.contact?.id;
```

The `as any` cast on line 50 was masking this schema mismatch.

---

### ISSUE 12: `material-actions.ts` — Type mismatch with `fuzzySearch` (6 TS errors)

**Priority**: MEDIUM — Compiles with errors; `searchMaterials()` will crash if query is non-empty.
**File**: `actions/material-actions.ts`
**Lines**: 47-52

The `searchable` array adds a `material` property (line 41), but `SearchableItem` interface in `lib/search.ts:62` only declares `{ id, searchableFields }`. The `fuzzySearch()` return type loses the `material` property because `T extends SearchableItem` — TypeScript sees `r.item.material` as nonexistent.

**Fix**: Use a properly typed wrapper:
```ts
interface MaterialSearchItem extends SearchableItem {
    material: typeof materials[number]
}

const searchable: MaterialSearchItem[] = materials.map(m => ({
    id: m.id,
    searchableFields: [m.name, m.description || "", m.category || ""],
    material: m
}));

const results = fuzzySearch(searchable, query);
```

This makes `r.item.material` type-safe.

---

### ISSUE 13: `tradie/jobs/[id]/page.tsx` — Redundant data path, ignores schema fields

**Priority**: MEDIUM — The page reads `jobStatus` from `deal.metadata` JSON (line 47-48) instead of using the native `deal.jobStatus` column. Same for `scheduledAt` (line 51-52).

**File**: `app/(dashboard)/tradie/jobs/[id]/page.tsx`
**Lines 47-53**:
```ts
const dealMeta = (deal.metadata as Record<string, any>) || {};
const jobStatus = (dealMeta.jobStatus || "SCHEDULED") ...
const scheduledDate = dealMeta.scheduledAt ? format(...) : "Unscheduled";
```

**Fix**: Use the actual Prisma fields:
```ts
const jobStatus = (deal.jobStatus || "SCHEDULED") as "SCHEDULED" | "TRAVELING" | "ON_SITE" | "COMPLETED";
const scheduledDate = deal.scheduledAt
    ? format(deal.scheduledAt, "EEE, d MMM h:mm a")
    : "Unscheduled";
```

---

### ISSUE 14: Two duplicate `client-page.tsx` implementations for Tradie Dashboard

**Priority**: MEDIUM — Confusing; only one is used.

| File | Used By | Implementation |
|------|---------|----------------|
| `app/(dashboard)/tradie/client-page.tsx` | `app/(dashboard)/tradie/page.tsx` (line 2) | Uses `MapView` dynamic import, Drawer component, hardcoded "Good Morning Scott", hardcoded Pulse widget values ($4.2k/$850). This is the **OLD** implementation. |
| `components/tradie/tradie-dashboard-client.tsx` | **Nobody imports it** in the current route | Uses `JobMap`, `JobBottomSheet`, `Header`, `PulseWidget` (real components). This is the **NEW** implementation. |

**Problem**: The server page (`tradie/page.tsx`) imports the OLD client page, not the new dashboard client.

**Fix**: Update `app/(dashboard)/tradie/page.tsx` to use the new component:
```diff
- import TradieDashboard from "./client-page"
+ import { TradieDashboardClient } from "@/components/tradie/tradie-dashboard-client"
```

And pass the correct props (`initialJob`, `todayJobs`, `userName`, `financialStats`).

---

### ISSUE 15: `tradie/page.tsx` — Unused imports

**Priority**: LOW
**File**: `app/(dashboard)/tradie/page.tsx`
**Lines 4-5**:
```ts
import { JobBottomSheet } from "@/components/tradie/job-bottom-sheet";
import { PulseWidget } from "@/components/dashboard/pulse-widget";
```
These are imported but never used in the server component (they're used inside the client component).

---

### ISSUE 16: `search-command.tsx` — Hardcoded `"demo-workspace"` (already in Issue 3B)

Confirmed at line 54. Already covered.

---

### ISSUE 17: Missing `MapView` component alignment

**Priority**: MEDIUM
**File**: `app/(dashboard)/tradie/client-page.tsx:20`
**Import**: `components/map/map-view.tsx`

The `MapView` component receives `jobs` prop:
```tsx
<MapView jobs={jobs} />
```

Need to verify `MapView` accepts `jobs` prop with the shape from `getTradieJobs()`. If it expects a different interface (e.g., `deals` with `latitude`/`longitude`), this will render an empty map.

---

### ISSUE 18: Two `job-detail-view.tsx` files in different directories

**Priority**: MEDIUM — Confusing; both export different components with different capabilities.

| File | Export | Used By |
|------|--------|---------|
| `components/jobs/job-detail-view.tsx` | `export default JobDetailView` | `app/(dashboard)/jobs/[id]/page.tsx:2` — imports from `@/components/jobs/job-detail-view` |
| `components/tradie/job-detail-view.tsx` | `export function JobDetailView` | **Nobody currently imports it** from this path |

The `components/jobs/` version imports `InvoiceGenerator` from `@/components/invoicing/invoice-generator` (exists) and `updateJobStatus` from `@/actions/tradie-actions` (works).

The `components/tradie/` version is more complete (has `CameraFAB`, `JobStatusBar` with safety check, photo grid) but is unused.

**Fix**: Either:
1. Wire `app/(dashboard)/jobs/[id]/page.tsx` to use the tradie version, OR
2. Delete the unused one to prevent confusion.

---

### ISSUE 19: `estimator-form.tsx` — Exists but never rendered

**Priority**: LOW
**File**: `components/tradie/estimator-form.tsx`

This component exists but is never imported or rendered anywhere. Related to Issue 1 (Material Database) — the estimator was planned but never wired.

---

## UPDATED EXECUTION ORDER

| Order | Issue | Severity | Effort |
|-------|-------|----------|--------|
| 1 | **Issue 10**: Fix 8 TypeScript compile errors | CRITICAL | 15 min |
| 2 | **Issue 11**: Fix `digest.ts` invalid Prisma relation | HIGH | 5 min |
| 3 | **Issue 14**: Switch tradie page to use new dashboard client | MEDIUM | 15 min |
| 4 | **Issue 13**: Use native Prisma fields instead of metadata | MEDIUM | 10 min |
| 5 | **Issue 9**: Consolidate duplicate actions | MEDIUM | 15 min |
| 6 | **Issue 12**: Fix material-actions type mismatch | MEDIUM | 10 min |
| 7-15 | Issues 1-8 from original log | MEDIUM | 3-4 hours |
