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

**Replace the entire block from `<div className="flex gap-2">` (line 176) through `Add Variation</Button>` (line 193) with this exact code — keep all attributes, no shorthand:**
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
<Button className="w-full bg-slate-800 hover:bg-slate-700 text-white border border-slate-700" onClick={handleAddVariation}>
    <Plus className="w-4 h-4 mr-2" /> Add Variation
</Button>
```

Also add `Search` to the lucide-react import on line 5:
```diff
- import { Phone, MessageSquare, Wrench, Camera, Navigation, Plus, Video, PenTool } from "lucide-react"
+ import { Phone, MessageSquare, Wrench, Camera, Navigation, Plus, Video, PenTool, Search } from "lucide-react"
```

#### 1C. Wire `createMaterial` to an "Add Custom Material" button

**File**: `components/tradie/material-picker.tsx`

**Step 1**: Add import at top of file (after line 21):
```tsx
import { searchMaterials, MaterialView, createMaterial } from "@/actions/material-actions"
```
(Change existing import on line 21 — add `createMaterial` to the destructure.)

**Step 2**: Replace line 97-98 (`<CommandEmpty>No materials found.</CommandEmpty>`) with:
```tsx
<CommandEmpty className="py-4 text-center">
    <p className="text-sm text-slate-500 mb-2">No materials found.</p>
    <Button
        variant="outline"
        size="sm"
        className="text-xs border-slate-700 text-slate-300 hover:text-[#ccff00]"
        onClick={async () => {
            if (!workspaceId || !search.trim()) return
            const result = await createMaterial({
                name: search.trim(),
                unit: "each",
                price: 0,
                workspaceId,
            })
            if (result.success) {
                const updated = await searchMaterials(workspaceId, search)
                setResults(updated)
            }
        }}
    >
        <Plus className="h-3 w-3 mr-1" /> Add &quot;{search}&quot; to database
    </Button>
</CommandEmpty>
```

**Step 3**: Add `Plus` to the lucide-react import on line 4 (currently only imports `Search`):
```diff
- import { Search } from "lucide-react"
+ import { Search, Plus } from "lucide-react"
```

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

import { useState, useEffect } from "react"
import { Mic, MicOff, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { useSpeechRecognition } from "@/hooks/use-speech-recognition"
import { logActivity } from "@/actions/activity-actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface VoiceNoteInputProps {
    dealId: string
}

export function VoiceNoteInput({ dealId }: VoiceNoteInputProps) {
    const { isListening, transcript, toggleListening } = useSpeechRecognition()
    const [note, setNote] = useState("")
    const router = useRouter()

    // Append transcript to note when speech recognition returns a result
    useEffect(() => {
        if (transcript) {
            setNote((prev) => prev ? `${prev} ${transcript}` : transcript)
        }
    }, [transcript])

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

**Replace the entire `syncOutlook` function body with:**
```ts
export async function syncOutlook(workspaceId: string, accessToken: string): Promise<EmailSyncResult> {
    try {
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)

        const res = await fetch(
            `https://graph.microsoft.com/v1.0/me/messages?$top=50&$orderby=receivedDateTime desc&$filter=receivedDateTime ge ${yesterday.toISOString()}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (!res.ok) return { success: false, synced: 0, activitiesCreated: 0, error: "Outlook API error" }
        const data = await res.json()
        const messages = data.value || []

        let synced = 0
        let activitiesCreated = 0

        for (const msg of messages) {
            const senderEmail = msg.from?.emailAddress?.address
            const subject = msg.subject || "No subject"

            if (!senderEmail) { synced++; continue }

            const contact = await db.contact.findFirst({
                where: { workspaceId, email: senderEmail }
            })

            if (contact) {
                await db.activity.create({
                    data: {
                        type: "EMAIL",
                        title: subject,
                        content: `Email from ${msg.from.emailAddress.name || senderEmail}`,
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

#### 7C. Add OAuth callback route

**Create new file**: `app/api/auth/google/callback/route.ts`

**Write this exact content:**
```ts
import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"

export async function GET(req: NextRequest) {
    const code = req.nextUrl.searchParams.get("code")
    const state = req.nextUrl.searchParams.get("state") // workspaceId passed as state

    if (!code || !state) {
        return NextResponse.redirect(new URL("/dashboard/settings?error=missing_code", req.url))
    }

    try {
        // Exchange authorization code for tokens
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: process.env.GOOGLE_CLIENT_ID || "",
                client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
                redirect_uri: `${process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000"}/api/auth/google/callback`,
                grant_type: "authorization_code",
            }),
        })

        if (!tokenRes.ok) {
            return NextResponse.redirect(new URL("/dashboard/settings?error=token_exchange_failed", req.url))
        }

        const tokens = await tokenRes.json()

        // Store tokens in workspace settings
        await db.workspace.update({
            where: { id: state },
            data: {
                settings: {
                    googleAccessToken: tokens.access_token,
                    googleRefreshToken: tokens.refresh_token,
                    googleTokenExpiry: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
                },
            },
        })

        return NextResponse.redirect(new URL("/dashboard/settings?success=google_connected", req.url))
    } catch (error) {
        console.error("OAuth callback error:", error)
        return NextResponse.redirect(new URL("/dashboard/settings?error=oauth_failed", req.url))
    }
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

**File**: `actions/calendar-actions.ts`
**Location**: Lines 64-80

**Replace the entire `syncOutlookCalendar` function body with:**
```ts
export async function syncOutlookCalendar(workspaceId: string, accessToken: string) {
    try {
        const now = new Date().toISOString()
        const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days ahead

        const res = await fetch(
            `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${now}&endDateTime=${future}&$top=50`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        )
        if (!res.ok) return { success: false, synced: 0, error: "Outlook Calendar API error" }
        const data = await res.json()
        const events = data.value || []

        let synced = 0
        for (const event of events) {
            for (const attendee of (event.attendees || [])) {
                const email = attendee.emailAddress?.address
                if (!email) continue

                const contact = await db.contact.findFirst({
                    where: { workspaceId, email }
                })
                if (contact) {
                    const existing = await db.activity.findFirst({
                        where: { contactId: contact.id, title: event.subject, type: "MEETING" }
                    })
                    if (!existing) {
                        await db.activity.create({
                            data: {
                                type: "MEETING",
                                title: event.subject || "Calendar Event",
                                content: `${event.start?.dateTime} - ${event.end?.dateTime}`,
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

**Root cause**: `job-bottom-sheet.tsx` is actually consumed by `tradie-dashboard-client.tsx` which passes data from `getTradieJobs()` (in `tradie-actions.ts`), NOT from `getDeals()`. The `getTradieJobs()` return type has `{ id, title, clientName, address, status, value, scheduledAt, description }` — a completely different shape than `DealView`.

**Fix**: Replace the `DealView` import and type on lines 9 and 14 with a local interface that matches the actual data shape.

**Step 1**: Remove the DealView import on line 9:
```diff
- import { DealView } from "@/actions/deal-actions"
```

**Step 2**: Replace the `JobBottomSheetProps` interface (lines 13-19) with:
```ts
interface TradieJob {
    id: string
    title: string
    clientName: string
    address: string
    status: string
    value: number
    scheduledAt: Date
    description: string
}

interface JobBottomSheetProps {
    job: TradieJob
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    onAddVariation: (desc: string, price: number) => Promise<void>
    safetyCheckCompleted: boolean
}
```

**Step 3**: Update all property accesses in the JSX:
- Line 95: `job.contactPhone` → `""` (contact phone not available in this data shape; remove the `tel:` link or pass phone as a separate prop)
- Line 101: `job.contactPhone` → `""` (same)
- Line 141: `job.description` → `job.description` (now exists in `TradieJob`)
- Line 148: `job.contactName` → `job.clientName`
- Line 149: `job.contactPhone` → `""` (same)
- Line 249: `job.jobStatus || (job.status === 'WON' ? 'SCHEDULED' : job.status)` → `job.status`
- Line 250: `job.contactName || job.company || "Client"` → `job.clientName || "Client"`

**Exact replacements for line 249-250:**
```diff
- currentStatus={job.jobStatus || (job.status === 'WON' ? 'SCHEDULED' : job.status) as any}
- contactName={job.contactName || job.company || "Client"}
+ currentStatus={job.status as any}
+ contactName={job.clientName || "Client"}
```

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

**Step 1**: Delete lines 46-53 (the metadata parsing block):
```ts
// DELETE THESE LINES:
    // Parse Job Status from metadata (jobStatus field not in schema yet)
    const dealMeta = (deal.metadata as Record<string, any>) || {};
    const jobStatus = (dealMeta.jobStatus || "SCHEDULED") as "SCHEDULED" | "TRAVELING" | "ON_SITE" | "COMPLETED";

    // Format Date from metadata (scheduledAt field not in schema yet)
    const scheduledDate = dealMeta.scheduledAt
        ? format(new Date(dealMeta.scheduledAt), "EEE, d MMM h:mm a")
        : "Unscheduled";
```

**Step 2**: Replace with these two lines in the same location:
```ts
    const jobStatus = (deal.jobStatus || "SCHEDULED") as "SCHEDULED" | "TRAVELING" | "ON_SITE" | "COMPLETED";
    const scheduledDate = deal.scheduledAt ? format(deal.scheduledAt, "EEE, d MMM h:mm a") : "Unscheduled";
```

**Step 3**: Also fix line 143 which reads description from metadata:
```diff
-   {deal.metadata ? (deal.metadata as any).description : "No description provided."}
+   {(deal.metadata as any)?.description || "No description provided."}
```
(This is acceptable since `description` is legitimately in metadata — it's not a native Prisma column unlike `jobStatus` and `scheduledAt`.)

---

### ISSUE 14: Two duplicate `client-page.tsx` implementations for Tradie Dashboard

**Priority**: MEDIUM — Confusing; only one is used.

| File | Used By | Implementation |
|------|---------|----------------|
| `app/(dashboard)/tradie/client-page.tsx` | `app/(dashboard)/tradie/page.tsx` (line 2) | Uses `MapView` dynamic import, Drawer component, hardcoded "Good Morning Scott", hardcoded Pulse widget values ($4.2k/$850). This is the **OLD** implementation. |
| `components/tradie/tradie-dashboard-client.tsx` | **Nobody imports it** in the current route | Uses `JobMap`, `JobBottomSheet`, `Header`, `PulseWidget` (real components). This is the **NEW** implementation. |

**Problem**: The server page (`tradie/page.tsx`) imports the OLD client page, not the new dashboard client.

**Fix**: Replace the **entire content** of `app/(dashboard)/tradie/page.tsx` with:
```tsx
import { getTradieJobs, getNextJob, getTodaySchedule } from "@/actions/tradie-actions"
import { TradieDashboardClient } from "@/components/tradie/tradie-dashboard-client"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"

export const dynamic = "force-dynamic"

export default async function TradiePage() {
    const userId = await getAuthUserId()
    const workspace = await getOrCreateWorkspace(userId)

    const [jobs, nextJob, todayJobs] = await Promise.all([
        getTradieJobs(workspace.id),
        getNextJob(workspace.id),
        getTodaySchedule(workspace.id),
    ])

    // Map nextJob to the shape TradieDashboardClient expects for initialJob
    const initialJob = nextJob ? {
        id: nextJob.id,
        title: nextJob.title,
        address: nextJob.address,
    } : jobs[0] ? {
        id: jobs[0].id,
        title: jobs[0].title,
        address: jobs[0].address,
    } : undefined

    return (
        <TradieDashboardClient
            initialJob={initialJob}
            todayJobs={todayJobs}
            userName="Mate"
        />
    )
}
```

**Also**: Delete the old `app/(dashboard)/tradie/client-page.tsx` file since it's no longer imported anywhere.
Run: `rm app/(dashboard)/tradie/client-page.tsx`

---

### ISSUE 15: `tradie/page.tsx` — Unused imports

**Priority**: LOW — **RESOLVED by Issue 14 fix.** The entire `page.tsx` is being replaced. No separate action needed.

---

### ISSUE 16: `search-command.tsx` — Hardcoded `"demo-workspace"` (already in Issue 3B)

Confirmed at line 54. Already covered. No separate action needed.

---

### ISSUE 17: `MapView` prop shape — VERIFIED OK

**Priority**: RESOLVED — No fix needed.

After reading `components/map/map-view.tsx`, the `MapView` component expects `jobs: { id, title, clientName, address, status, lat?, lng? }[]`. The `getTradieJobs()` action returns `{ id, title, clientName, address, status, ... }` — the shapes match. The `lat`/`lng` fields are optional in `MapView` (it uses a deterministic offset fallback if missing). No action required.

**However**: Note that Issue 14 replaces the old `client-page.tsx` (which used `MapView`) with `tradie-dashboard-client.tsx` (which uses `JobMap` instead). So `MapView` will no longer be used on the tradie page at all. This is fine — `JobMap` is the correct component.

---

### ISSUE 18: Two `job-detail-view.tsx` files — Delete the unused one

**Priority**: MEDIUM

| File | Export | Used By |
|------|--------|---------|
| `components/jobs/job-detail-view.tsx` | `export default JobDetailView` | `app/(dashboard)/jobs/[id]/page.tsx:2` — **actively used** |
| `components/tradie/job-detail-view.tsx` | `export function JobDetailView` | `app/(dashboard)/tradie/jobs/[id]/page.tsx` — **NOT imported here** (that page renders its own inline JSX instead) |

**Fix**: Delete the unused tradie version since `tradie/jobs/[id]/page.tsx` renders its own JSX and doesn't import it.

**Run**: `rm components/tradie/job-detail-view.tsx`

The `components/jobs/job-detail-view.tsx` file remains as it is actively used by the dashboard job detail page.

---

### ISSUE 19: `estimator-form.tsx` — Wire to a route or the assistant

**Priority**: LOW
**File**: `components/tradie/estimator-form.tsx`

The `EstimatorForm` component is fully implemented (214 lines) with deal selection, line items, GST calculation, and quote generation via `generateQuote()`. But it's never rendered anywhere.

**Fix**: Add a route for it. Create `app/(dashboard)/tradie/estimator/page.tsx`:

```tsx
import { getDeals } from "@/actions/deal-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { EstimatorForm } from "@/components/tradie/estimator-form"

export const dynamic = "force-dynamic"

export default async function EstimatorPage() {
    const userId = await getAuthUserId()
    const workspace = await getOrCreateWorkspace(userId)
    const deals = await getDeals(workspace.id)

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <EstimatorForm deals={deals} />
        </div>
    )
}
```

Then add a link to it from the tradie dashboard. In `components/tradie/tradie-dashboard-client.tsx`, add a navigation button that links to `/dashboard/tradie/estimator`.

---

## ISSUE 20: CHATBOT CANNOT PARSE NATURAL LANGUAGE JOB ENTRIES (TRADIE UX BLOCKER)

**Priority**: HIGH — This is a critical UX failure for the tradie module.
**Status**: ✅ FIXED

### Problem

The chatbot fails to parse simple, natural language job entries like:
> "sharon from 17 alexandria street redfern needs sink fixed quoted $200 for tmrw 2pm"

Instead of extracting the key details (client, address, work, price, schedule), it responds with a generic error message.

### Solution Implemented

**Files Modified:**
1. `actions/chat-actions.ts` — Added `create_job_natural` intent with regex pattern and AI parser support
2. `components/core/assistant-pane.tsx` — Added confirmation card UI for extracted job details

**Changes:**

#### 1. New Intent Type (chat-actions.ts:24-43)
Added `create_job_natural` to the `ParsedCommand` interface.

#### 2. Regex Pattern for Natural Language Parsing (chat-actions.ts:54-69)
```ts
const naturalJobMatch = msg.match(
  /^([a-z]+(?:\s+[a-z]+)?)\s+(?:from|at)\s+(.+?)\s+(?:needs?|wants?|requires?)\s+(.+?)\s+(?:quoted?|quote)\s+\$?(\d+(?:,\d{3})*(?:\.\d{2})?)\s*(?:for\s+)?(.*)$/i
);
```
Extracts: `clientName`, `address`, `workDescription`, `price`, `schedule`

#### 3. Intent Handler (chat-actions.ts:457-501)
Creates a confirmation draft showing all extracted details before creating the contact and deal.

#### 4. Confirmation UI Card (assistant-pane.tsx:329-388)
Shows an emerald-themed card with:
- Client name
- Full address
- Work description
- Quoted price
- Schedule
- "Cancel" and "Create Job" buttons

### Test Cases

✅ **Input**: "sharon from 17 alexandria street redfern needs sink fixed quoted $200 for tmrw 2pm"
**Output**: Extracts all 5 fields correctly and shows confirmation card

✅ **Input**: "john at 5 main st needs bathroom reno quote 5000 tomorrow"
**Output**: Works with "at" instead of "from", handles larger amounts

✅ **Input**: "mary 123 oak ave broken tap $150 today 3pm"
**Fallback**: Regex may not match; AI parser (Gemini) will catch it

### User Flow

1. User types natural language job entry
2. Chatbot extracts client, address, work, price, schedule
3. Shows confirmation card with all details
4. User clicks "Create Job" or "Cancel"
5. If confirmed, creates contact + deal with metadata

---

## ISSUE 21: DASHBOARD TAB — CARD LAYOUT BROKEN, KANBAN BOARD MISSING (UI BLOCKER)

**Priority**: CRITICAL — Main dashboard is unusable
**Status**: Dashboard widgets overflow, excessive white space, Kanban board not visible
**Affects**: `/dashboard` route in Advanced mode

### Current State

| Component | File | Lines | Issue |
|-----------|------|-------|-------|
| Dashboard Client | `app/dashboard/client-page.tsx` | 51-102 | Widget grid uses `max-h: 30vh` constraint but cards still overflow. Text like "$1,000" extends outside card boundaries. |
| Dashboard Client | `app/dashboard/client-page.tsx` | 107-109 | Kanban board is pushed off-screen by excessive widget height. User reports Kanban "disappeared". |
| Pipeline Pulse Card | `app/dashboard/client-page.tsx` | 54-67 | Hardcoded static values: "$124,500" and "+12% from last month". Not dynamic/responsive to window resize. |
| Active Deals Card | `app/dashboard/client-page.tsx` | 70-83 | Hardcoded "3 closing this week". |
| Recent Activity Card | `app/dashboard/client-page.tsx` | 85-100 | Card is "really long" with "so much blank space". Internal scrolling area doesn't constrain height properly. |

### Root Causes

1. **Text Overflow**: Cards use `text-xl md:text-2xl font-bold` with `truncate` but parent container doesn't enforce width constraints
2. **Fixed Height Issue**: `max-h: 30vh` on widget row (line 51) isn't respected by flex children
3. **Kanban Visibility**: Kanban board needs `min-h-[500px]` or similar to force visibility even when widgets are tall
4. **Responsive Breakpoints**: Current grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-3`) causes layout thrashing on resize
5. **Activity Feed Height**: Doesn't respect parent height constraint, creates excessive vertical space

### Tasks

#### 21A. Fix card text overflow with proper container constraints

**File**: `app/dashboard/client-page.tsx`
**Location**: Lines 54-83 (Pipeline Pulse and Active Deals cards)

**Replace lines 54-83** with this exact code (adds explicit width constraint and improves responsive text sizing):

```tsx
                    {/* Widget 1: Pipeline Pulse */}
                    <Card className="border-slate-200 shadow-sm flex flex-col overflow-hidden h-full min-w-0">
                        <CardHeader className="pb-2 shrink-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-emerald-500" />
                                Pipeline Pulse
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end min-h-0 min-w-0">
                            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 truncate w-full" title="$124,500">
                                $124,500
                            </div>
                            <p className="text-xs text-muted-foreground truncate w-full">+12% from last month</p>
                        </CardContent>
                    </Card>

                    {/* Widget 2: Active Deals */}
                    <Card className="border-slate-200 shadow-sm flex flex-col overflow-hidden h-full min-w-0">
                        <CardHeader className="pb-2 shrink-0">
                            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <DollarSign className="h-4 w-4 text-blue-500" />
                                Active Deals
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col justify-end min-h-0 min-w-0">
                            <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-900 truncate w-full">
                                {deals.length}
                            </div>
                            <p className="text-xs text-muted-foreground truncate w-full">3 closing this week</p>
                        </CardContent>
                    </Card>
```

**Key changes**:
- Added `min-w-0` to Card wrapper (allows flex child to shrink below content size)
- Changed text from `text-xl md:text-2xl` to `text-lg sm:text-xl lg:text-2xl` (smoother responsive scaling)
- Added explicit `w-full` to truncate divs (ensures truncation boundary is parent width)
- Added `min-w-0` to CardContent (prevents text from forcing parent expansion)

#### 21B. Fix Recent Activity card height constraint

**File**: `app/dashboard/client-page.tsx`
**Location**: Lines 85-100

**Replace the entire Recent Activity card block (lines 85-100)** with:

```tsx
                    {/* Widget 3: Recent Activity */}
                    <div className="border border-slate-200 shadow-sm rounded-xl bg-white overflow-hidden flex flex-col md:col-span-2 xl:col-span-1 h-full max-h-[300px] min-w-0">
                        <div className="p-3 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between shrink-0">
                            <div className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                <Activity className="h-4 w-4 text-amber-500" />
                                Recent Activity
                            </div>
                            <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded-full text-slate-600">{activities.length}</span>
                        </div>
                        {/* Internal scrollable area with strict height */}
                        <div className="flex-1 overflow-y-auto min-h-0">
                            <ActivityFeed activities={activities} className="border-0 shadow-none" compact />
                        </div>
                    </div>
```

**Key changes**:
- Added `max-h-[300px]` to outer container (hard cap on card height)
- Reduced padding from `p-4` to `p-3` in header (saves vertical space)
- Removed nested `absolute inset-0` wrapper (was causing height calculation issues)
- Simplified scroll container structure (direct `overflow-y-auto` on flex-1 child)

#### 21C. Enforce Kanban board visibility with minimum height

**File**: `app/dashboard/client-page.tsx`
**Location**: Line 107-109

**Replace lines 107-109** with:

```tsx
            {/* 3. Main Content Area: Kanban Board */}
            {/* flex-1 ensures it takes ALL remaining vertical space */}
            {/* min-h-[500px] forces visibility even if widgets are tall */}
            <div className="flex-1 w-full overflow-hidden min-h-[500px] border-t border-slate-100 pt-4">
                 <KanbanBoard deals={deals} />
            </div>
```

**Key change**:
- Changed `min-h-0` to `min-h-[500px]` — guarantees Kanban board is always visible and takes up significant space

#### 21D. Adjust top widget row height constraints

**File**: `app/dashboard/client-page.tsx`
**Location**: Line 51

**Replace line 51** with:

```tsx
            <div className="shrink-0 mb-4" style={{ maxHeight: 'min(350px, 25vh)', minHeight: '200px' }}>
```

**Key changes**:
- Changed from `maxHeight: '30vh', minHeight: '140px'` to `maxHeight: 'min(350px, 25vh)', minHeight: '200px'`
- Uses `min()` CSS function to cap at 350px OR 25% of viewport height, whichever is smaller
- Increased `minHeight` from 140px to 200px to prevent cards from collapsing too much
- This ensures widgets never take more than ~350px vertical space, leaving room for Kanban

---

## ISSUE 22: TRADIE MODE — MAP VIEW, SCHEDULE VIEW, ESTIMATOR VIEW RETURN 404 (NAVIGATION BLOCKER)

**Priority**: HIGH — Core tradie navigation is broken
**Status**: Routes exist but are missing required data props
**Affects**: `/dashboard/tradie/map`, `/dashboard/tradie/schedule`, `/dashboard/estimator`

### Current State

| Route | File Exists | Issue |
|-------|-------------|-------|
| `/dashboard/tradie/map` | ❌ NO | No `page.tsx` exists at this path. Sidebar links to it (sidebar.tsx:36). |
| `/dashboard/tradie/schedule` | ✅ YES | `app/(dashboard)/tradie/schedule/page.tsx` exists but `SchedulerView` component expects `initialJobs` prop (scheduler-view.tsx:35) and page doesn't pass it. |
| `/dashboard/estimator` | ✅ YES | `app/dashboard/estimator/page.tsx` exists. Need to verify if it works. |

### Root Causes

1. **Map route missing**: Sidebar.tsx:36 links to `/dashboard/tradie/map` but this route doesn't exist
2. **Schedule page incomplete**: `app/(dashboard)/tradie/schedule/page.tsx` renders `<SchedulerView />` but SchedulerView.tsx:35 accepts `initialJobs?: any[]` prop — without data, calendar shows empty
3. **Estimator route**: Sidebar.tsx:38 links to `/dashboard/estimator` (not `/dashboard/tradie/estimator`) — verify this works

### Tasks

#### 22A. Create missing `/dashboard/tradie/map` route

**Create new file**: `app/(dashboard)/tradie/map/page.tsx`

```tsx
import { getTradieJobs } from "@/actions/tradie-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import dynamic from "next/dynamic"

export const dynamic = "force-dynamic"

// Dynamically import to avoid SSR issues with Leaflet
const MapView = dynamic(() => import("@/components/map/map-view"), {
    ssr: false,
    loading: () => (
        <div className="h-full w-full bg-slate-900 flex items-center justify-center text-slate-500">
            Loading Map...
        </div>
    ),
})

export default async function TradieMapPage() {
    const userId = await getAuthUserId()
    const workspace = await getOrCreateWorkspace(userId)
    const jobs = await getTradieJobs(workspace.id)

    return (
        <div className="h-[calc(100vh-4rem)] w-full">
            <MapView jobs={jobs} />
        </div>
    )
}
```

#### 22B. Fix Schedule page to pass jobs data

**File**: `app/(dashboard)/tradie/schedule/page.tsx`
**Location**: Lines 1-9

**Replace the entire file** with:

```tsx
import { getTradieJobs } from "@/actions/tradie-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import SchedulerView from "@/components/scheduler/scheduler-view"

export const dynamic = "force-dynamic"

export default async function SchedulerPage() {
    const userId = await getAuthUserId()
    const workspace = await getOrCreateWorkspace(userId)
    const jobs = await getTradieJobs(workspace.id)

    return (
        <div className="h-[calc(100vh-4rem)]">
            <SchedulerView initialJobs={jobs} />
        </div>
    )
}
```

**Key changes**:
- Added server data fetching (userId, workspace, jobs)
- Passed `initialJobs={jobs}` prop to SchedulerView

#### 22C. Verify Estimator route works (or create if missing)

**Check if file exists**: `app/dashboard/estimator/page.tsx`

**If file doesn't exist, create**: `app/dashboard/estimator/page.tsx`

```tsx
import { getDeals } from "@/actions/deal-actions"
import { getOrCreateWorkspace } from "@/actions/workspace-actions"
import { getAuthUserId } from "@/lib/auth"
import { EstimatorForm } from "@/components/tradie/estimator-form"

export const dynamic = "force-dynamic"

export default async function EstimatorPage() {
    const userId = await getAuthUserId()
    const workspace = await getOrCreateWorkspace(userId)
    const deals = await getDeals(workspace.id)

    return (
        <div className="min-h-screen bg-slate-50 p-4">
            <EstimatorForm deals={deals} />
        </div>
    )
}
```

**If file exists**, read it and verify it:
1. Fetches deals/jobs data from the server
2. Passes data to EstimatorForm component
3. If missing, add the fetching logic above

---

## ISSUE 23: ADVANCED MODE DASHBOARD — RECENT ACTIVITY UNREADABLE, CLICKING ITEMS BREAKS PAGE (UX BLOCKER)

**Priority**: HIGH — Users cannot interact with recent activity
**Status**: Activity feed items are clickable but navigation fails
**Affects**: `/dashboard` in Advanced mode, Recent Activity widget

### Current State

| Component | File | Lines | Issue |
|-----------|------|-------|-------|
| ActivityFeed | `components/crm/activity-feed.tsx` | 102-105 | onClick handler redirects to `/dashboard/deals/${dealId}` or `/dashboard/contacts/${contactId}` using `window.location.href` |
| Deal detail route | `app/dashboard/deals/[id]/page.tsx` | 1-136 | **Route exists** but uses invalid Prisma query (line 21: `include: { contacts: { take: 1 } }`) — Deal model has `contact` relation (singular), not `contacts` (plural). Will crash at runtime. |
| Contact detail route | `app/dashboard/contacts/[id]/page.tsx` | ❓ | **Unknown** if this route exists. Need to check. |

### Root Causes

1. **Deal detail page Prisma error**: Line 21 of `app/dashboard/deals/[id]/page.tsx` uses `contacts: { take: 1 }` but schema defines `contact Contact @relation("DealContact")` (singular). This causes a Prisma error.
2. **Navigation method**: ActivityFeed uses `window.location.href` (line 103-104) which triggers full page reload instead of client-side navigation.
3. **Activity content unclear**: User reports "can't really see what the recent activity mentions" — likely due to truncated text in compact mode.

### Tasks

#### 23A. Fix Deal detail page Prisma query

**File**: `app/dashboard/deals/[id]/page.tsx`
**Location**: Line 19-22

**Replace lines 19-22** with:

```tsx
    const deal = await db.deal.findUnique({
        where: { id },
        include: { contact: true }
    })
```

**Then update line 30** from:
```tsx
    const contact = deal.contacts[0]
```

**To**:
```tsx
    const contact = deal.contact
```

**Key changes**:
- Changed `contacts: { take: 1 }` to `contact: true` (matches schema)
- Changed `deal.contacts[0]` to `deal.contact` (no array indexing needed)
- Removed `as any` casts since TypeScript now has correct types

#### 23B. Create missing Contact detail page (if it doesn't exist)

**Check if exists**: `app/dashboard/contacts/[id]/page.tsx`

**If it doesn't exist, create**: `app/dashboard/contacts/[id]/page.tsx`

```tsx
import { db } from "@/lib/db"
import { notFound } from "next/navigation"
import { ActivityFeed } from "@/components/crm/activity-feed"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronLeft, Edit, Mail, Phone } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface PageProps {
    params: Promise<{ id: string }>
}

export default async function ContactDetailPage({ params }: PageProps) {
    const { id } = await params

    const contact = await db.contact.findUnique({
        where: { id },
        include: { deals: { take: 5, orderBy: { createdAt: 'desc' } } }
    })

    if (!contact) {
        notFound()
    }

    return (
        <div className="flex flex-col h-[calc(100vh-4rem)] p-4 md:p-8 space-y-6 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard" className="h-10 w-10 inline-flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-900 transition-colors">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">{contact.name}</h1>
                        <div className="flex items-center gap-2 mt-1">
                            {contact.email && (
                                <a href={`mailto:${contact.email}`} className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {contact.email}
                                </a>
                            )}
                            {contact.phone && (
                                <a href={`tel:${contact.phone}`} className="text-sm text-slate-500 hover:text-blue-600 flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    {contact.phone}
                                </a>
                            )}
                        </div>
                    </div>
                </div>
                <Button variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                </Button>
            </div>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-0">
                {/* Left: Deals */}
                <div className="space-y-4 overflow-y-auto pr-2">
                    <h3 className="font-semibold text-slate-900">Associated Deals ({contact.deals.length})</h3>
                    {contact.deals.length === 0 ? (
                        <p className="text-slate-500 text-sm">No deals yet.</p>
                    ) : (
                        <div className="space-y-2">
                            {contact.deals.map(deal => (
                                <Link
                                    key={deal.id}
                                    href={`/dashboard/deals/${deal.id}`}
                                    className="block p-4 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-colors"
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-slate-900">{deal.title}</p>
                                            <p className="text-xs text-slate-500">{deal.company || 'No company'}</p>
                                        </div>
                                        <Badge variant="outline">{deal.stage}</Badge>
                                    </div>
                                    <p className="text-sm text-emerald-600 font-medium mt-2">
                                        ${Number(deal.value).toLocaleString()}
                                    </p>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                {/* Right: Activity */}
                <div className="h-full overflow-hidden border border-slate-200 rounded-xl bg-white flex flex-col">
                    <div className="p-4 border-b border-slate-100 font-semibold text-slate-900 bg-slate-50/50">
                        Activity History
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <ActivityFeed contactId={contact.id} />
                    </div>
                </div>
            </div>
        </div>
    )
}
```

#### 23C. Improve ActivityFeed readability in compact mode

**File**: `components/crm/activity-feed.tsx`
**Location**: Lines 110-124

**Replace the activity item content block (lines 110-124)** with:

```tsx
                                <div className="flex-1 space-y-0.5 min-w-0">
                                    <div className="flex justify-between items-start gap-2">
                                        <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2 pr-1">
                                            {activity.title}
                                        </p>
                                        <span className="text-[9px] text-muted-foreground whitespace-nowrap flex-shrink-0">
                                            {activity.time}
                                        </span>
                                    </div>
                                    {activity.description && (
                                        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                            {activity.description}
                                        </p>
                                    )}
                                </div>
```

**Key changes**:
- Changed title from `truncate` to `line-clamp-2` (shows 2 lines instead of cutting off at 1)
- Changed description from `text-[10px]` to `text-[11px]` (slightly more readable)
- Changed description from `line-clamp-1` to `line-clamp-2` (shows 2 lines)
- Added `leading-relaxed` to description for better line spacing
- Added `gap-2` to flex container for spacing between title and time

---

## ISSUE 24: SETTINGS SUBPAGES SAY "COMING SOON" — NEED FULL IMPLEMENTATION (FEATURE GAP)

**Priority**: MEDIUM — Settings are non-functional
**Status**: Settings navigation exists but all subpages show placeholder content
**Affects**: `/dashboard/settings/*` routes

### Current State

**Need to investigate:**
1. What settings routes exist (e.g., `/dashboard/settings/profile`, `/dashboard/settings/workspace`, etc.)
2. What the current placeholder content shows
3. What settings should be available for this app

### Expected Settings Pages (Based on App Type)

For a CRM/Tradie/Agent app, typical settings include:

1. **Profile Settings** (`/dashboard/settings/profile`)
   - User name, email, phone
   - Profile photo upload
   - Password change
   - Notification preferences

2. **Workspace Settings** (`/dashboard/settings/workspace`)
   - Workspace name
   - Industry type (already in schema: `industryType: String`)
   - Time zone
   - Business hours
   - Currency settings

3. **Integration Settings** (`/dashboard/settings/integrations`)
   - Email sync (Gmail/Outlook OAuth — already stubbed in email-actions.ts)
   - Calendar sync (Google/Outlook — already stubbed in calendar-actions.ts)
   - Messaging integrations (Twilio for SMS — already in use)
   - Webhook URLs

4. **Team Settings** (`/dashboard/settings/team`) — Future
   - Invite team members
   - Manage roles/permissions
   - User list

5. **Billing Settings** (`/dashboard/settings/billing`) — Future
   - Subscription plan
   - Payment method
   - Invoice history

### Tasks

#### 24A. Discover existing settings routes and structure

**Action for AI agent:**

1. Run: `find app -type f -path "*/settings/*" -name "*.tsx" | head -20`
2. Read the main settings layout file (likely `app/dashboard/settings/layout.tsx` or `app/(dashboard)/settings/layout.tsx`)
3. Read the main settings page (likely `app/dashboard/settings/page.tsx`)
4. List all subpages found

#### 24B. Implement Profile Settings page

**Create/Update**: `app/dashboard/settings/profile/page.tsx`

**Implement a form with:**
- User name field (editable)
- Email field (read-only, from auth)
- Phone field (optional)
- Profile photo upload (use existing photo upload logic from job-bottom-sheet.tsx or similar)
- Save button that calls a new server action `updateUserProfile(userId, data)`

**Server action to create**: `actions/user-actions.ts`

```ts
"use server"

import { db } from "@/lib/db"
import { getAuthUserId } from "@/lib/auth"
import { revalidatePath } from "next/cache"

export async function updateUserProfile(data: {
    name?: string
    phone?: string
    avatar?: string
}) {
    const userId = await getAuthUserId()

    await db.user.update({
        where: { id: userId },
        data: {
            name: data.name,
            // Note: User table in schema doesn't have phone/avatar fields yet
            // Will need to add these fields to schema first
        }
    })

    revalidatePath("/dashboard/settings/profile")
    return { success: true }
}
```

**Note**: Check if User model in `prisma/schema.prisma` has `phone` and `avatar` fields. If not, add them:
```prisma
model User {
    id    String @id @default(cuid())
    email String @unique
    name  String
    phone String? // ADD THIS
    avatar String? // ADD THIS
    createdAt DateTime @default(now())
    // ... rest of fields
}
```

Then run `npx prisma db push` to update database.

#### 24C. Implement Workspace Settings page

**Create/Update**: `app/dashboard/settings/workspace/page.tsx`

**Implement a form with:**
- Workspace name (from workspace.name)
- Industry type dropdown (TRADIE, AGENT, SALES, GENERAL)
- Time zone selector
- Business hours (start/end time)
- Currency (AUD, USD, etc.)
- Save button calling `updateWorkspaceSettings(workspaceId, data)`

**Check schema** for workspace fields. Current Workspace model has:
- `name: String`
- `industryType: String`
- `onboardingComplete: Boolean`
- `settings: Json?`

Store time zone, business hours, currency in the `settings` JSON field.

**Server action** in `actions/workspace-actions.ts`:

```ts
export async function updateWorkspaceSettings(workspaceId: string, data: {
    name?: string
    industryType?: string
    settings?: {
        timezone?: string
        businessHours?: { start: string, end: string }
        currency?: string
    }
}) {
    await db.workspace.update({
        where: { id: workspaceId },
        data: {
            name: data.name,
            industryType: data.industryType,
            settings: data.settings ? { ...data.settings } : undefined
        }
    })

    revalidatePath("/dashboard/settings/workspace")
    return { success: true }
}
```

#### 24D. Implement Integrations Settings page

**Create/Update**: `app/dashboard/settings/integrations/page.tsx`

**Implement connection cards for:**

1. **Gmail Integration**
   - Show connection status (connected/not connected)
   - If not connected: Button that calls `getGmailAuthUrl()` and redirects
   - If connected: Show connected email, "Disconnect" button, "Sync Now" button

2. **Outlook Integration**
   - Same as Gmail but using `getOutlookAuthUrl()`

3. **Google Calendar**
   - Connection status
   - Connect/Disconnect buttons

4. **Twilio SMS**
   - Show if Twilio credentials are configured (check env vars)
   - Field to enter Twilio phone number
   - Test SMS button

**Use existing server actions**:
- `getGmailAuthUrl()` from `actions/email-actions.ts`
- `getOutlookAuthUrl()` from `actions/email-actions.ts`
- `syncGmail()` and `syncOutlook()` for manual sync buttons

**UI Structure** (example for Gmail):

```tsx
<Card>
    <CardHeader>
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
                <Mail className="h-5 w-5" />
                <div>
                    <h3 className="font-semibold">Gmail</h3>
                    <p className="text-xs text-slate-500">Sync emails to contacts</p>
                </div>
            </div>
            {isConnected ? (
                <Badge className="bg-green-100 text-green-800">Connected</Badge>
            ) : (
                <Badge variant="outline">Not Connected</Badge>
            )}
        </div>
    </CardHeader>
    <CardContent>
        {isConnected ? (
            <div className="space-y-2">
                <p className="text-sm text-slate-600">Syncing: user@gmail.com</p>
                <div className="flex gap-2">
                    <Button size="sm" onClick={handleSyncNow}>Sync Now</Button>
                    <Button size="sm" variant="outline" onClick={handleDisconnect}>Disconnect</Button>
                </div>
            </div>
        ) : (
            <Button onClick={handleConnect}>Connect Gmail</Button>
        )}
    </CardContent>
</Card>
```

#### 24E. Add Settings navigation sidebar

**File**: Likely exists as part of settings layout

**Ensure sidebar includes these links:**
- Profile
- Workspace
- Integrations
- Team (placeholder, "Coming Soon")
- Billing (placeholder, "Coming Soon")

**Example sidebar component**:

```tsx
const settingsNavItems = [
    { label: "Profile", href: "/dashboard/settings/profile", icon: User },
    { label: "Workspace", href: "/dashboard/settings/workspace", icon: Building },
    { label: "Integrations", href: "/dashboard/settings/integrations", icon: Zap },
    { label: "Team", href: "/dashboard/settings/team", icon: Users, disabled: true },
    { label: "Billing", href: "/dashboard/settings/billing", icon: CreditCard, disabled: true },
]
```

---

## UPDATED EXECUTION ORDER

| Order | Issue | Severity | Effort |
|-------|-------|----------|--------|
| 1 | **Issue 10**: Fix 8 TypeScript compile errors | CRITICAL | 15 min |
| 2 | **Issue 21**: Dashboard card layout broken, Kanban missing | CRITICAL | 20 min |
| 3 | **Issue 11**: Fix `digest.ts` invalid Prisma relation | HIGH | 5 min |
| 4 | **Issue 23**: Advanced dashboard activity feed broken navigation | HIGH | 20 min |
| 5 | **Issue 22**: Tradie Map/Schedule/Estimator 404 errors | HIGH | 25 min |
| 6 | **Issue 20**: Natural language job parsing | HIGH | ✅ DONE |
| 7 | **Issue 24**: Settings pages implementation | MEDIUM | 2-3 hours |
| 8 | **Issue 14**: Switch tradie page to use new dashboard client | MEDIUM | 15 min |
| 9 | **Issue 13**: Use native Prisma fields instead of metadata | MEDIUM | 10 min |
| 10 | **Issue 9**: Consolidate duplicate actions | MEDIUM | 15 min |
| 11 | **Issue 12**: Fix material-actions type mismatch | MEDIUM | 10 min |
| 12-20 | Issues 1-8 from original log | MEDIUM | 3-4 hours |
