# Earlymark Application Features Documentation

> **Comprehensive reference for every feature, UI element, user flow, validation rule, and interaction in the Earlymark platform.**
>
> Earlymark is an AI-powered CRM and business assistant for trades and services businesses. The AI assistant is named **Tracey**.
>
> Product-truth note: this file documents intended behavior. For current proof status on high-risk promises, cross-check `FEATURE_VERIFICATION.md` and the internal ops table at `/admin/customer-usage?tab=ops#feature-promises`.
>
> ### Product Personas
> 1. **The Tradie (User):** Logs into the dashboard to manage jobs. Uses the Internal Chatbot (Gemini) for data mutation and navigation.
> 2. **Tracey Voice/SMS Agent:** The digital receptionist. Powered by LiveKit & Twilio. QUALIFIES leads and books jobs into the CRM.
> 3. **The End Customer:** Communicates via Phone/SMS with Tracey. Assumes they are talking to a human staff member.

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [Billing & Subscription](#2-billing--subscription)
3. [Onboarding](#3-onboarding)
4. [Dashboard Home & Layout Shell](#4-dashboard-home--layout-shell)
5. [Sidebar Navigation](#5-sidebar-navigation)
6. [CRM Pipeline / Kanban Board](#6-crm-pipeline--kanban-board)
7. [Deal Detail Modal](#7-deal-detail-modal)
8. [Contacts Page](#8-contacts-page)
9. [Calendar & Schedule](#9-calendar--schedule)
10. [Map Page](#10-map-page)
11. [Inbox](#11-inbox)
12. [Chat Interface & AI Assistant (Tracey)](#12-chat-interface--ai-assistant-tracey)
13. [Quoting & Invoicing](#13-quoting--invoicing)
14. [Analytics & Reports](#14-analytics--reports)
15. [Team Management](#15-team-management)
16. [Settings](#16-settings)
17. [Role-Based Access Control (RBAC)](#17-role-based-access-control-rbac)
18. [Notifications](#18-notifications)
19. [Global Search](#19-global-search)

---

## 1. Authentication

### File Locations

| File | Purpose |
|------|---------|
| `components/auth/unified-auth.tsx` | Primary auth component |
| `components/auth/auth-selector.tsx` | Tabbed sign-in/sign-up alternative |
| `components/auth/google-signup.tsx` | Google OAuth sign-up |
| `components/auth/phone-verification.tsx` | Reusable phone verification |
| `app/(auth)/forgot-password/page.tsx` | Password reset flow |
| `app/auth/next/page.tsx` | Post-auth routing logic |

### Visual Design

- **Logo:** `/latest-logo.png?v=20250305` (48x48px)
- **Heading:** "Welcome to Earlymark"
- **Subheading:** "The AI assistant & CRM for you"
- **Back button** (top-left) returns to `/`
- **Background effects:** `ott-glow` + `primary/8` blur gradient

### Connection Error State

- Amber warning banner if Supabase is unreachable
- Message: "We couldn't reach the login service."
- Helper text explains Supabase free-tier pause with link to dashboard

### Three Authentication Methods

#### Method 1: Google OAuth

- **Button text:** "Continue with Google"
- **Loading state:** "Connecting..."
- Uses custom OAuth flow via `/api/auth/google-signin`
- Animated pulse overlay when selected

#### Method 2: Phone (Australian OTP)

- **Button text:** "Continue with Phone"
- **Format:** Australian numbers (`04xx` format or `+61`)
- **Placeholder:** `04xx xxx xxx`
- **Helper text:** "Australian mobile (04xx) or +61 format"

**Phone OTP Flow:**

1. **Send Code:**
   - Success message: "Verification code sent! Check your phone."
   - Resend button disabled for 60 seconds: "Resend code in {n}s"
   - Button states: "Send Code" / "Sending Code..."

2. **Verify Code:**
   - Label: "Verification Code"
   - Placeholder: "Enter 6-digit code"
   - Input: centered, tracking-widest, max 6 digits, numeric only
   - Button text: "Sign In"

**Phone Formatting (`formatPhoneE164()`):**
- `+61xxx` kept as-is
- `0xxx` becomes `+61xxx`
- `61xxx` becomes `+61xxx`
- Otherwise prepends `+61`

#### Method 3: Email

- **Button text:** "Continue with Email"

**Step 1 — Email Entry:**
- Label: "Email" / Placeholder: `you@example.com`
- Button: "Continue" / "Checking..."

**Step 2a — Sign In:**
- Label: "Password" / Placeholder: "Enter your password"
- Toggle: "New here? Create account"
- Button: "Sign In" / "Signing in..."
- Back link: "Use different email"

**Step 2b — Sign Up:**
- Label: "Set Password" / Placeholder: "Create a password"
- Confirm Password field with "Retype password" placeholder
- Toggle: "Already have an account? Sign in"
- Button: "Create Account" / "Creating account..."

### Validation & Error Messages

| Condition | Message |
|-----------|---------|
| Empty email | "Please enter an email address." |
| Password < 6 chars | "Password must be at least 6 characters." |
| Passwords don't match | "Passwords do not match." |
| Invalid credentials | "Invalid email or password. Please try again." |
| Email not confirmed | "Email not confirmed. Check your inbox or resend confirmation." |
| Account exists (sign up) | "Unable to create account with that email. Try signing in instead." |

### Email Confirmation Flow

- Success: "Account created. Check your email to verify. You will be signed in automatically after confirmation."
- "Resend Confirmation Email" button appears when `needsConfirmation` is true
- Resend success: "Confirmation email sent! Check your inbox."

### Message Styling

- **Success (green):** `bg-mint-50 text-primary border-primary/20`
- **Error (red):** `bg-red-50 text-red-600 border-red-100`

### Password Reset (`/forgot-password`)

- **Title:** "Reset Password"
- **Description:** "Enter your email address and we'll send you a password reset link"
- **Field:** Email input (required)
- **Button:** "Send Reset Link" / "Sending..."
- Success: "Check your email for the password reset link!"

### Legal Footer

- "By continuing, you agree to our Terms and Privacy Policy"
- Links to `/terms` and `/privacy`
- "© 2026 Earlymark AI. All rights reserved."

### Post-Auth Routing (`/auth/next`)

1. Gets authenticated user ID (redirects to `/auth` if none)
2. Gets or creates workspace
3. Routes based on status:
   - No subscription → `/billing` (paywall)
   - Subscription + not onboarded → `/setup`
   - Subscription + onboarded → `/dashboard`

---

## 2. Billing & Subscription

### File Locations

| File | Purpose |
|------|---------|
| `app/billing/page.tsx` | Payment/subscription paywall |
| `app/billing/success/page.tsx` | Stripe checkout completion handler |
| `components/billing/upgrade-button.tsx` | Pricing & checkout trigger |
| `components/billing/manage-subscription-button.tsx` | Stripe portal link |
| `actions/billing-actions.ts` | Server actions for Stripe |
| `app/dashboard/settings/billing/page.tsx` | Settings billing page |

### Billing Paywall Page (`/billing`)

**Access Control:** Requires authenticated user. If already subscribed, redirects to `/setup` or `/dashboard`.

**Visual Design:**
- Logo: 56x56px, rounded-xl, shadow
- Heading: "Activate your assistant" (with Sparkles icon)
- Subheading: "Sign up today to get yourself an early mark"
- Background: `ott-glow` + gradient blur

**Features Checklist (CheckCircle2 icons):**
1. "AI Agent — handles calls, SMS & scheduling"
2. "Smart CRM with Pipeline & Contacts"
3. "Automated Quoting & Invoicing"
4. "Real-time Map & Route Optimization"
5. "Reports, Analytics & Team Management"

**Footer:** "Secure payments powered by Stripe - Cancel anytime"

### Upgrade Button Component

**Billing Period Toggle:**
- Two buttons: "Monthly" | "Yearly"
- Selected: white bg + shadow; Unselected: muted text
- Yearly badge: "Best value" (emerald bg, top-right)

**Pricing:**
- Monthly: `$149 / month` (primary color)
- Yearly: `$1,490 / year` (midnight color)

**Helper Text:**
- Monthly: "Billed monthly. Cancel anytime."
- Yearly: "Billed yearly. Stripe promo codes are supported at checkout."

**Phone Provisioning Toggle:**
- Title: "Provision mobile business number"
- Helper: "Temporary beta option. Turn this on before payment if you want Earlymark to provision your dedicated AU mobile number after Stripe succeeds."
- ON: "Your paid workspace will be eligible for AU mobile-number provisioning after Stripe succeeds."
- OFF: "You can still pay and complete onboarding without a Twilio number."

**Checkout Button:** "Continue to Stripe checkout" — large, full width, spinner on loading

### Stripe Checkout Flow

- Hosted Stripe checkout with promo code support
- Success URL: `/billing/success?session_id={id}`
- Cancel URL: `/billing`

### Checkout Success (`/billing/success`)

1. Receives `session_id` from Stripe redirect
2. Verifies session with Stripe API
3. On success: updates workspace subscription, sets Stripe IDs, triggers phone provisioning
4. Redirects to `/auth/next`

### Settings Billing Page

- Current plan label (from `stripePriceId`)
- Billing cadence (monthly/yearly) or "No paid subscription"
- Status with animated pulsing green dot + "Active"
- "Manage Subscription" button opens Stripe customer portal

**RBAC:** Only OWNER/MANAGER can access Billing. Team members redirected to `/dashboard/settings`.

### Infrastructure & Sub-Allocation Strategy

| Layer | Strategy |
|-------|----------|
| **Master Account** | Michael owns the master Twilio and LiveKit accounts. |
| **Sub-Allocation** | Unique Australian (+61) Mobile Number provisioned per `workspaceId` on subscription. |
| **Billing** | Flat monthly/yearly fee covers raw API overhead (pennies). |

---

## 3. Onboarding

### File Locations

| File | Purpose |
|------|---------|
| `app/setup/page.tsx` | Entry point (auth + onboarding check) |
| `components/onboarding/tracey-onboarding.tsx` | 6-step onboarding wizard |
| `actions/tracey-onboarding.ts` | Server-side save action |

### Entry Point (`/setup`)

- Checks authentication (redirects to `/auth` if not)
- Checks if already onboarded (redirects to `/dashboard` if yes)

### Step 0: Contact Card

**Tracey Message:** "G'day! Let's get you set up. Fill in your details below and we'll get Tracey ready for your business."

**Fields (2x2 grid):**

| Field | Icon | Placeholder | Required |
|-------|------|-------------|----------|
| Your Name | User | "John Smith" | Yes |
| Phone | Phone | "04XX XXX XXX" | Yes |
| Email | Mail | "you@business.com.au" | Yes |
| Website URL | Globe | "https://yoursite.com.au" | No |

- Phone formatting on blur via `formatAuPhone()`
- Website URL helper: "Add your website to pre-fill the next step."
- Website triggers background scrape for auto-populating business details

### Step 1: Autonomy Selector

**Tracey Message:** "How much freedom do you want to give me? Pick a mode — you can always change it later in Settings."

**Three Modes:**

| Mode | Icon | Description | Tracey Line |
|------|------|-------------|-------------|
| EXECUTION | Zap | "Tracey handles everything independently" | "I'll take full responsibility for your calls" |
| DRAFT | Copy | "Tracey suggests responses you review and approve" | "I'll prepare responses for your approval" |
| INFO_ONLY | Info | "Tracey collects info, you always respond" | "I'll gather information and hand off to you" |

- Selected state: emerald-500 border, emerald-50 bg, emerald-600 icon
- Interactive dialogue preview showing how Tracey handles customer calls
- Preview tabs: "Greeting", "Service Enquiry", "Booking/Price", "Goodbye"
- Customer message (blue, right) and Tracey response (emerald, left)

### Step 2: Business Identity & Operating Rules

**Tracey Message:** "Have a look through these business details and adjust anything that's not right." (if scraped) or "Tell me about your business so I know how to handle calls and enquiries." (if not scraped)

**Section 1: Business Identity**
- Business Name (required, placeholder: "e.g. Smith's Plumbing")
- Trade Type (required, dropdown from `TRADE_TYPES`)
- Public Phone (optional)
- Public Email (optional)

**Section 2: Location & Service Area**
- Physical Address (required, Google Places autocomplete, placeholder: "123 Trade St, Parramatta NSW 2150")
- Service Radius (Slider: 5-100 km, step 5, default 20 km, label shows "{radius} km")

**Section 3: Working Hours**
- Weekly Hours Editor (Mon-Sun open/closed toggle, start/end times, uniform toggle)
- Emergency Hours Toggle: "Allow Tracey to handle emergency callouts. She will notify you for approval."
- If emergency enabled: start time, end time, surcharge (AUD), handling logic textarea

**Section 4: Special Notes**
- "What else should Tracey know?" textarea (rows: 3)

**Section 5: Document Upload**
- Accepts: `.pdf`, `.doc`, `.docx`, `.jpg`, `.jpeg`, `.png`
- Upload button with spinner during upload
- Uploaded files list with filename, size (KB), delete button

### Step 3: Email Configuration

**Tracey Message:** "Let's set up how Tracey will handle your emails."

**Info Box (emerald):**
- "Tracey monitors and extracts from your inbox 24/7 new leads"
- "She extracts details and creates deals automatically in the CRM"
- "Tracey can auto-respond to leads"

**Option 1: Connect Seamlessly (OAuth) — Recommended**
- "Connect Gmail" and "Connect Outlook" buttons
- Opens OAuth flow in new window (600x700)

**Option 2: Auto-Forward**
- Shows forwarding email in monospace code block
- Copy button with clipboard toast
- Status indicators:
  - Red: "Inbound email is not live yet. Do not forward leads until DNS is fixed."
  - Amber: "DNS and Resend are verified. Your first forwarded lead email will confirm live receiving."
  - Green: "Recent inbound email confirms this route is live."

### Step 4: Automated Pricing & Services

**Tracey Message:** "I've pre-filled a few services for you. Tweak, add, or delete anything below." (if scraped)

**Global Call-Out Fee:** Number input, placeholder "0", width 7rem. Helper: "Applied to all services unless overridden."

**Services Table (per row):**

| Column | Placeholder | Required |
|--------|-------------|----------|
| Service Name | "e.g. Tap Replacement" | Yes (if row has data) |
| Min ($) | "$" | No |
| Max ($) | "$" | No |
| Teach Tracey | "e.g. Ask if gas or electric" | No |

- Delete button per row (disabled if only 1 service remains)
- "Add Service" button (Plus icon, outline)
- Validation: min price ≤ max price, at least 1 service

**Multilingual Jobs Toggle:** "Can Tracey accept jobs from customers who speak languages other than English?"
- Captured during onboarding as a business preference (`acceptsMultilingual`)
- Current live voice runtime already performs automatic language detection and replies in the caller's language on phone calls
- Current implementation does not appear to gate the voice runtime on this toggle; treat it as captured preference data, not a hard runtime switch

### Step 5: Provisioning & Activation

**Referral Source Dropdown:** Google Search, Social Media, Friend/Colleague, HiPages, Airtasker, Tradies Forum, Other

**Activation Checklist:**
1. **Dedicated AU Phone Number** — provisioning spinner, success with number, or failure with retry
2. **Leads Email** — email address with verification status
3. **Welcome SMS** — "A welcome SMS will be sent to {phone}"

**Team Invite (Optional):**
- Email input + Role dropdown (Team Member / Manager)
- "Send invite" button + "Copy invite link" button

**Activate Button:** "Activate Tracey" (emerald-600). Loading states: "Setting up your account...", "Checking billing settings...", etc. Disabled if `!canActivateTracey`.

**Post-Provisioning Success:**
- Large checkmark badge (emerald)
- Heading: "You're all set!"
- Leads email and Tracey's phone number in monospace emerald text
- "Go to Dashboard" button

### Navigation Between Steps

- Steps 0-4: "Back" (ChevronLeft) and "Next" (ChevronRight)
- Next disabled if current step validation fails
- Step 5: "Back" + "Activate Tracey"

### Server-Side Save Action

**Zod Validation Schema:**
- `ownerName`: required string
- `phone`: required, E.164 format, Australian validation
- `email`: required, valid email
- `businessName`: required string
- `agentMode`: "EXECUTION" | "DRAFT" | "INFO_ONLY"
- `tradeType`: required string
- `physicalAddress`: required string
- `serviceRadius`: 1-200, default 20
- `services`: array of `{serviceName, callOutFee, priceMin, priceMax, traceyNotes}`

**Processing Pipeline:**
1. Parse & validate inputs
2. Get authenticated user
3. Create/get workspace
4. Ensure workspace user (OWNER role)
5. Transactional writes: User, Workspace, BusinessProfile, ServiceItems, BusinessKnowledge, RepairItems, PricingSettings
6. Best-effort side effects: allocate leads email, Twilio provisioning, welcome SMS
7. Mark workspace/user as onboarded

---

## 4. Dashboard Home & Layout Shell

### File Locations

| File | Purpose |
|------|---------|
| `app/dashboard/page.tsx` | Server component — auth, data loading |
| `components/layout/Shell.tsx` | Client component — main layout manager |
| `components/dashboard/dashboard-client.tsx` | Client component — dashboard content |
| `components/dashboard/header.tsx` | Dashboard header bar |
| `components/dashboard/dashboard-kpi-cards.tsx` | KPI metric cards |
| `components/dashboard/onboarding-modal.tsx` | First-visit welcome modal |

### Authentication & Data Loading (`page.tsx`)

- Checks authentication via `getAuthUser()` — redirects to `/auth` if not authenticated
- `export const dynamic = 'force-dynamic'` (always fresh data)
- Fetches workspace with `getOrCreateWorkspace(userId)`
- In development: automatically seeds demo deals with `ensureDashboardDemoDeals(workspace.id)`
- Loads deals with `getDeals(workspace.id)` and team members with `getTeamMembers()`
- Resolves display name from auth provider name, DB user name, or email fallback

**Error State (database unavailable):**
- Amber warning banner: "Database connection unavailable"
- Message: "CRM features (deals, contacts, kanban) need a database connection. The chatbot is still available in the sidebar."
- Styling: `border-amber-200 bg-amber-50 p-5 text-center`

### Shell Layout (`Shell.tsx`)

The Shell supports **three view modes** managed by `useShellStore`:

| Mode | Description |
|------|-------------|
| BASIC | Chat-only fullscreen mode |
| ADVANCED | Full dashboard with resizable assistant panel |
| TUTORIAL | Guided onboarding with overlay |

#### BASIC View (Chat-Only)

- Appears when `viewMode === "BASIC"` or during tutorial steps 1-2
- Entire viewport becomes centered chat container
- Background gradient: `from-slate-950/80 via-background to-primary/10` (dark mode)
- Container: `max-w-4xl h-full md:h-[82dvh]` with rounded corners (desktop)
- Glass morphism: `bg-white/40 dark:bg-zinc-950/40 backdrop-blur-2xl`
- Border: `border border-white/20 dark:border-white/5`

**Basic View Header:**
- Left: Earlymark logo (8x8) + "Ask Tracey" text
- Right: Segmented control — **Chat** (active) and **Advanced** (dimmed) buttons

#### ADVANCED View (Full Dashboard)

**Desktop Layout:** `ResizablePanelGroup` with horizontal orientation

```
Sidebar (45px) | Main Canvas (default 72%) | Resize Handle (2px) | Assistant Panel (default 28%)
```

**Panel Sizing:**
- Main Canvas: `defaultSize={72}`, `minSize={30}`
- Resize Handle: 2px width, `bg-border/50`, `hover:bg-primary/50`
- Assistant Panel: `defaultSize={28}`, `minSize={28}`, `maxSize={65}`, collapsible
- Click/drag handle to collapse/expand (5px threshold distinguishes click vs drag)

**Responsive Breakpoints:**

| Breakpoint | Behavior |
|------------|----------|
| Mobile (< 768px) | Sidebar hidden, drawer navigation. Main canvas full width. Assistant as floating FAB + bottom sheet. |
| Desktop (≥ 768px) | Sidebar visible (45px). Resizable panels. Chat panel default expanded on `/dashboard`, collapsed elsewhere. |

**Mobile Floating Action Buttons:**
- Chat FAB: `fixed bottom-5 right-5 z-[10000]`, `h-12 w-12`, primary bg, bounce animation, opens `h-[85dvh]` bottom sheet
- Hamburger FAB: `fixed bottom-5 left-5 z-[10000]`, `h-12 w-12`, primary bg, triggers mobile sidebar drawer

**Desktop Chat Collapse FAB:**
- Appears when assistant panel is collapsed
- `fixed bottom-5 right-5 z-[10000]`, `h-11 w-11`, primary bg, bounce animation

**Scroll Behavior:** Scrolls to top on route change (except Basic view)

**Tutorial Integration:**
- `TutorialOverlay` always mounted, manages own visibility
- Step 4 (chat mode) automatically expands chat panel
- Steps 1-2 force BASIC mode
- Completion calls `completeTutorial(workspaceId)`

**Hydration:** Uses `mounted` state; `ResizablePanelGroup` only renders after mount

### Dashboard Client (`dashboard-client.tsx`)

**Container:** `dashboard-stitch h-full flex flex-col overflow-hidden bg-transparent`, `text-[15px] leading-snug`

**Sticky Header Bar:**
- `sticky top-0 z-20 shrink-0`, `border-b border-border/10`
- Background: `bg-[var(--main-canvas)]/95 backdrop-blur`, height `h-12`
- Contains Header with `userName`, `userId`, `workspaceId`, `userRole`, `onOpenActivity`, `headerActions`

**Pipeline Header Actions (right of header):**

1. **New Deal Button:**
   - ID: `new-deal-btn`, size `h-9`, `text-xs font-bold`
   - Icon: Plus (h-3.5 w-3.5) + dynamic label:
     - TRADES: "New Job"
     - REAL_ESTATE: "New Listing"
     - Other: "New Deal"
   - Shadow: `sunlight-shadow`
   - Opens `NewDealModal`

2. **Filter Dropdown** (only if team members exist):
   - Icon: Filter (h-3 w-3), size `h-9`
   - Background: `bg-muted rounded-lg border-none`, hover `bg-muted/80`
   - Options: "All" + each team member name/email
   - Disabled tooltip: "Invite team in Settings to filter by person"
   - TEAM_MEMBER role auto-filtered to themselves on load

**KPI Cards Section:**
- Negative margins `-mx-6 px-6`, padding `pt-5 pb-0`, background `bg-muted/35`
- Grid: `grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4`

**Divider:** 1px line with `pt-5 pb-2.5`

**Kanban Board Section:**
- `flex min-h-0 flex-1 flex-col overflow-hidden`
- When assistant expanded: `min-w-[1200px]` forces horizontal scroll

**Initialization:** Calls `ensureDailyNotifications(workspace.id)` on mount

### KPI Cards (`dashboard-kpi-cards.tsx`)

**Card Frame:** `flex min-h-[5.75rem] rounded-lg border-l-[5px] shadow-sm`, inner `p-3`
- Label: `text-[10px] font-bold uppercase tracking-widest`
- Metric: `text-xl font-extrabold leading-none tracking-tight tabular-nums`

| Card | Label | Value | Border Color | Background |
|------|-------|-------|-------------|------------|
| Monthly Revenue | "{Month} Revenue" | `${revenue.toLocaleString()}` | `border-l-sky-700` | `bg-sky-50` |
| Jobs Won With Tracey | "Jobs Won With Tracey ({Month})" | `${travisWonRevenue.toLocaleString()}` | `border-l-emerald-700` | `bg-emerald-50` |
| Upcoming Jobs | "Upcoming Jobs ({Month})" | `{upcomingCount}` | `border-l-slate-600` | `bg-slate-100` |
| Follow-up | "Follow-up" + dropdown | `{followUpCount}` | `border-l-red-700` | `bg-red-50` |

**Calculations:**
- Monthly Revenue: Sum of deals with `stage === "completed"` in current month
- Jobs Won With Tracey: Revenue from completed deals where `metadata.source` exists
- Upcoming Jobs: Deals with `stage === "scheduled"`, `scheduledAt` in current month from today onwards
- Follow-up: Deals where `lastActivityDate` is X days old AND stage not "completed"/"lost"

**Follow-up Dropdown:**
- Select component: `h-7`, `text-xs font-semibold`
- Options: 1, 2, 3, 4, 6, 8 weeks
- Default: 2 weeks

### Header (`header.tsx`)

**Container:** `glass-panel` effect, `h-12`, `px-4 md:px-6`

**Left Section:**
- Mobile menu button (< 768px): hamburger icon
- Global search bar (hidden < 768px): `variant="bar"`, `flex-1 min-w-0`
- Mobile search icon button (< 768px): triggers search dialog

**Center Section:** Optional `headerActions` prop (New Deal + Filter buttons on dashboard)

**Right Section:**
- **Weather pill** (if geolocation available, fallback: Sydney):
  - Temperature: `9°` in primary color bold, `h-9` pill shape, `primary/5` bg
  - Icons by condition: CloudRain (primary), CloudSnow (slate-300), CloudLightning (amber-400), Cloud (slate-400), Sun (amber-500)
- **Activity button:** Activity icon, opens activity modal
- **Notifications button:** Bell icon, red dot for unread, opens popover
- **Vertical divider:** `h-6 w-px bg-border/20`
- **User identity:** First name + role label ("Owner"/"Manager"/"Team Member") + avatar (`w-8 h-8`, primary bg, first letter)

### Onboarding Modal (`onboarding-modal.tsx`)

**Trigger:** Checks `localStorage` key `pj-buddy-onboarding-complete`. Shows only once.

**Dialog:** `sm:max-w-[425px]`, centered

**Content:**
- Icon: Sparkles in emerald circle (`bg-emerald-100`, `h-12 w-12`)
- Title: "Welcome to Earlymark!" (text-xl)
- Subtitle: "Your all-in-one assistant for Tradies and Real Estate Agents."

**Getting Started:**
1. "Switch between **Tradie** and **Agent** modes."
2. "Use **Ctrl+K** to jump anywhere fast."
3. "Check your **Settings** to customize your profile."

**Button:** "Let's Go!" — emerald-600, sets localStorage, closes modal

---

## 5. Sidebar Navigation

### File Locations

| File | Purpose |
|------|---------|
| `components/core/sidebar.tsx` | Desktop sidebar |
| `components/layout/mobile-sidebar.tsx` | Mobile sidebar sheet |

### Desktop Sidebar (`sidebar.tsx`)

**Container:** Width `45px` (constant `SIDEBAR_WIDTH`), `border-r border-neutral-200`, white bg, `py-5`, full height

**Navigation Items:**

| Label | Icon | Href | Manager Only |
|-------|------|------|---|
| Dashboard | LayoutDashboard | `/dashboard` | No |
| Inbox | Inbox | `/dashboard/inbox` | Yes |
| Schedule | CalendarDays | `/dashboard/schedule` | No |
| Map | Map | `/dashboard/map` | No |
| Contacts | Users | `/dashboard/contacts` | Yes |
| Analytics | BarChart2 | `/dashboard/analytics` | Yes |
| Team | UsersRound | `/dashboard/team` | No |

**Nav Item Styling:**
- Each: `h-10 w-full flex justify-center rounded-lg`, `duration-150`
- Hover animation: `scale 1.05`, tap: `scale 0.95` (framer-motion)
- Active: `bg-primary-subtle`, `text-primary`
- Inactive: `text-neutral-400`, hover `text-neutral-700 bg-neutral-100`

**Logo/Chat Toggle (Top):**
- 9x9px container, image `/latest-logo.png`, rounded corners
- Tooltip: "Ask Tracey"
- Click switches to BASIC (chat) mode

**Bottom Actions:**
- Separator: `border-t border-neutral-200`
- Settings: gear icon → `/dashboard/settings`
- Sign Out: `text-neutral-400 hover:text-red-500 hover:bg-red-50`, LogOut icon, tooltip "Sign Out"

**Tooltips:** All items, `side="right"`, delay 0ms, `text-xs`

### Mobile Sidebar (`mobile-sidebar.tsx`)

- Triggered by hamburger FAB (bottom-left on mobile)
- Sheet: `side="left"`, `w-[200px]`, `border-r border-border`
- Renders full `Sidebar` component inside
- Auto-closes on route change

---

## 6. CRM Pipeline / Kanban Board

### File Locations

| File | Purpose |
|------|---------|
| `components/crm/kanban-board.tsx` | Main kanban board component |
| `components/crm/deal-card.tsx` | Individual deal card |
| `app/dashboard/deals/page.tsx` | Standalone pipeline page |

### Pipeline Page (`/dashboard/deals`)

- **Title:** "Pipeline"
- **Header info:** "{count} jobs worth ${total}"
- **Back button:** "Back to Dashboard" (outline)

### Kanban Board Columns (6 + Deleted)

| Column ID | Display Title | Color Class | Plus Button |
|-----------|--------------|-------------|-------------|
| `new_request` | New request | `bg-status-new` (light blue) | Yes |
| `quote_sent` | Quote sent | `bg-status-quote` (purple) | Yes |
| `scheduled` | Scheduled | `bg-status-scheduled` (teal) | Yes |
| `ready_to_invoice` | Awaiting payment | `bg-status-awaiting` (orange) | Yes |
| `completed` | Completed | `bg-status-complete` (emerald) | Yes |
| `deleted` | Deleted | `bg-neutral-400` (gray) | No |

- Legacy "pipeline" stage merges into "Quote sent" column
- Pending approval deals appear IN the Completed column with amber dashed border

**Column Header:**
- 3px colored bar at top: `h-[3px] w-full rounded-full`
- Title: `text-[11px] font-bold uppercase leading-none tracking-wide sm:tracking-wider`
- Count badge: `rounded-full px-1.5 py-0.5 text-[9px] font-bold tabular-nums`
- Plus icon (right): opens new deal modal

**Desktop Layout:** `md:grid md:grid-cols-6 md:gap-2`, fixed headers above scrollable cards
**Mobile Layout:** Columns stack vertically, headers inline

### Drag & Drop Behavior

**Single Card Drag:**
- Activation: 6px distance (mouse), 250ms delay + 8px tolerance (touch)
- Overlay: 105% scale, 2deg rotation, shadow-2xl
- Dragging card: opacity-30 + grayscale
- Collision: `closestCorners` algorithm

**Bulk Drag (Multi-Select):**
- Stacked visual preview with offset cards peeking behind
- Max 8 visible cards in stack, "+N" badge for hidden
- Each card offset 9px up-left, scaled down 0.028 per step

**Stage Transition Rules:**

| Target Column | Requirements |
|--------------|--------------|
| Scheduled | Team member assigned (`assignedToId`) AND scheduled date (`scheduledAt`) |
| Awaiting payment | Scheduled date set |
| Completed | Scheduled date set |

- Unmet requirements: toast error, card reverts to original position
- Order within column persisted via `persistKanbanColumnOrder(columnId, orderedIds)`

### Role-Based Board Filtering

- **Team Members:** Default view is "My Jobs" (automatically filtered to deals where `assignedToId === currentUser.id`).
- **Managers / Owners:** Default view is "All Jobs".
- **Toggle:** All users can toggle the "My Jobs" filter at the top of the header.

### Bulk Actions & Selection Mode

- **Activation:** Long-press (hold) any card for 500ms or click the "Select" icon in the header.
- **Selection:** Cards display a checkbox in the top-left corner.
- **Actions Bar (bottom):**
  - **Move:** Batch move to specific stage.
  - **Assign:** Batch assign to a team member.
  - **Delete:** Batch move to Deleted column.
  - **Status:** Batch mark as Won/Lost.

### The Triage Engine ("The Bouncer")

- **Function:** Automatically screens incoming leads/messages against "No-go" rules.
- **Hard No-Go:** AI declines the job immediately and provides a reason (e.g., "We don't do asbestos removal").
- **Soft Flag:** If a rule is breached but not fatal, the card is created with an **Orange Badge** and a warning note (e.g., "Sub-threshold value: $120").

### Stale Deal Monitoring (CRM Health)

Visual indicators for deal cards based on inactivity:

| Warning Level | Condition | Visual Indicator |
|---------------|-----------|------------------|
| **Stale** | No activity for 7+ days | Yellow highlighted glow / "Stale" label |
| **Rotting** | No activity for 14+ days | Red pulse highlight / "Urgent Follow-up" label |

### Deal Card (`deal-card.tsx`)

**Card Content (top to bottom):**

1. **Contact Row:** User icon + contact name (truncated with hover scroll) + scheduled date (top-right, "MMM d" or "-")
2. **Address Row** (if present): MapPin icon + address text
3. **Job Title Row:** Briefcase icon + deal title + unread pulse dot (if `hasUnreadMessages`)
4. **Assignment Row** (if team members exist): User icon + dropdown or text showing assigned member

**Approval Buttons (if `stage === "pending_approval"` and user is manager):**
- "Approve" (green primary): calls `approveCompletion(deal.id)`, toast "Job approved and marked completed"
- "Reject & send back" (amber outline): opens dialog with optional reason, toast "Completion rejected."

**Status Banner (bottom overlay):**

| Status | Badge Color | Condition |
|--------|------------|-----------|
| Draft | Indigo-400 (65% opacity), dashed border | `isDraft === true` |
| Pending approval | Amber-400 (65% opacity), dashed border | `stage === "PENDING_COMPLETION"` |
| Urgent | Red-400 | `health.status === "ROTTING"` (14+ days) |
| Follow up | Amber-400 | `health.status === "STALE"` (7+ days) |
| Rejected | Red-400 | `metadata.completionRejectedAt` exists |

**Overdue Severity (top border color):**

| Severity | Days | Color |
|----------|------|-------|
| Critical | 7+ days | Red (`#ef4444`) |
| Warning | 3-6 days | Orange (`#f97316`) |
| Mild | 0-2 days | Amber (`#f59e0b`) |

- Tooltip: "Scheduled in the past (X days ago). Click to reconcile..."

**Price & Assignee Row:**
- Left: DollarSign icon + value (prefers `invoicedAmount`, falls back to `value`, "$1,000" format)
- Right: Assignee badge (circular, initials, `primary/10` bg) or "-"
- Delete button: Trash icon, moves to Deleted column

**Card State Styling:**
- Draft: indigo dashed border on white/indigo bg
- Pending Approval: amber dashed border on amber bg
- Dragging: opacity-30, grayscale
- Drag Overlay: scale 105%, rotate 2deg, shadow-2xl, ring
- Selection Mode: wiggle animation (`kanban-card-wiggle` keyframes)

### Selection Mode & Bulk Actions

**Entry:** Long-press (450ms) on card or Shift+click

**Selection Toolbar (above kanban board):**
- Left: "{N} job(s) selected" or "Tap cards to select"
- Right:
  - Trash button (destructive, h-8 w-8): opens bulk delete dialog
  - Cancel button (ghost): exits selection mode

**Bulk Delete Dialog:**
- Title: "Move {N} job(s) to Deleted?"
- Description: "Selected jobs will go to the Deleted column. They are removed permanently after 30 days."
- Buttons: "Back" / "Move to Deleted" (destructive)

### Assignment Modal

**Trigger:** Dragging unassigned deal to Scheduled column

- Header: UserPlus icon + "Assign team member"
- Description: "A team member must be assigned before a job can be in Scheduled."
- If team members: dropdown of members
- If no team members: "Add team members in Settings → Team first."
- Buttons: "Cancel" / "Assign & move to Scheduled" (loading: "Saving…")

### Empty Column States

- New request: "Add your first deal"
- Other columns: "Add Card"
- Dashed border button, clicking opens New Deal modal

---

## 7. Deal Detail Modal

### File Locations

| File | Purpose |
|------|---------|
| `components/crm/deal-detail-modal.tsx` | Main detail modal |
| `components/crm/job-completion-modal.tsx` | Job completion review |
| `components/crm/loss-reason-modal.tsx` | Mark deal as lost |
| `components/crm/stale-job-reconciliation-modal.tsx` | Overdue reconciliation |
| `components/crm/kanban-automation-modal.tsx` | Follow-up automation |
| `components/crm/stale-deal-follow-up-modal.tsx` | Stale deal follow-up |

### Deal Detail Modal (`deal-detail-modal.tsx`)

**Size:** max-width 7xl (56rem), height 90vh

**Header:**
- Title: Deal title + " | " + contact name (bold)
- Second line: Source + "•" + value (emerald-600)
- **Stage Dropdown** (right): colored button with ChevronDown, validates before changing
  - Options: New request, Quote sent, Scheduled, Awaiting payment, Completed, Lost, Deleted
- **Edit Button** (right): pencil icon, outline

**Status Bars (conditional, top to bottom):**

1. **Overdue Warning Bar:** Red/orange/amber bg, white text, AlertTriangle, "Reconcile" button, dismiss X
2. **Draft Confirmation Bar:** Indigo-50 bg, pulsing dot, "Draft Job: The AI Agent organized this request. Please confirm to officially book it." + "Confirm Booking" button
3. **Pending Approval Bar:** Amber-50 bg, pulsing dot, "Pending approval..." + "Approve" (emerald) / "Reject & send back" (amber) buttons with inline rejection reason input
4. **Rejection Notice Bar:** Red-50 bg, "Completion was rejected." + reason

**Main Content (3 columns desktop, 1 mobile):**

**Left Column:**

*Contact Details Card:*
- Phone: clickable tel: link
- Email: mailto: link
- Company: text
- Address: MapPin icon
- Empty: "Add phone, email, or address via Edit."

*Current Job Card:*
- Job title
- **Final Invoice Amount:** emerald-50 box, "$1,000" or "Not set", "Set" button opens inline input
- Quoted Value
- Scheduled date (formatted "MMM d, yyyy h:mm a")
- Created date

**Right Column:**

*Customer & Job History Card:*
- "Contact them" button (right of header)
- **3 Tabs:** Communications, Jobs, Notes

**Communications Tab:**
- Activity feed (compact mode)
- Quick message input at bottom: "Send a quick update..."
- Enter sends SMS via `sendSMS()` action

**Jobs Tab:**
- List of other jobs for contact
- Each: title (bold), "$Value", stage label + updated date
- Empty: "No other jobs with this customer."

**Notes Tab:** `DealNotes` component

**Photos Section:** Horizontal scrollable gallery (24x24px thumbnails)

### Job Completion Modal (`job-completion-modal.tsx`)

**Header:** CheckCircle (green) + "Job Completion Review"

**Sections:**

1. **Job Summary:** Client name, value (emerald-600), address, description
2. **Work Quality:**
   - Job Quality Rating: 5-star system (Poor/Fair/Good/Very Good/Excellent)
   - Client Satisfaction: 5-star system
3. **Issues & Notes:**
   - Issues: repeatable list in red-50 boxes with "Remove", input + "Add"
   - Additional Notes: textarea (rows: 3)
4. **Next Steps:** textarea (rows: 2)
5. **Follow-up Actions:** Checkboxes for Request Payment (DollarSign), Request Review (Star), Send Photos (Camera)

**Footer:** "Cancel" (outline) / "Submit Review" (primary, spinner: "Submitting...")

### Loss Reason Modal (`loss-reason-modal.tsx`)

**Header:** XCircle (red) + "Mark Deal as Lost"

**Deal Summary Box:** title + contact name on gray bg

**Common Reasons (2-column grid):**
- "Price too high", "Lost to competitor", "Client changed mind", "Timeline issues", "Budget constraints", "Went with different provider", "Project cancelled", "Other"
- Clicking fills the reason field

**Detailed Reason Textarea:** Optional, rows: 3

**Footer:** "Cancel" / "Mark as Lost" (destructive, disabled until reason filled)

### Stale Job Reconciliation Modal

**Header:** AlertTriangle (amber) + "Reconcile Overdue Job"

**Outcome Dropdown (required):**
- COMPLETED (CheckCircle, green)
- RESCHEDULED (Clock, blue)
- NO_SHOW (UserX, orange)
- CANCELLED (X, red)

**Notes:** Optional textarea (rows: 3)

**Footer:** "Cancel" / "Update Job" (disabled until outcome selected)

### Kanban Automation Modal

**Header:** Zap (amber) + "Kanban Automation"

**Staleness Badge:** Rotting (red, 14+ days), Stale (amber, 7+ days), Recent (blue)

**Action Cards (click to select):**
1. Send Follow-up (MessageSquare, blue)
2. Schedule Call (Calendar, green)
3. Send Nudge (Zap, amber)
4. Escalate (AlertTriangle, red)
5. Move Stage (Target, purple)

**After selection:** Message textarea (pre-filled), follow-up date input, or target stage dropdown

### Stale Deal Follow-up Modal

**Header:** AlertTriangle (amber) + "Stale Deal Follow-up"

**Follow-up Channel Dropdown:** Email, SMS, Phone Call (default: Email)

**Message Template Dropdown:**
1. Gentle Nudge — casual check-in
2. Value Focused — highlights market conditions
3. Urgent Follow-up — time-sensitive
4. New Information — new market data

**Message Textarea:** Editable, pre-filled from template, character count

### Toast Messages

**Success:**
- "Stage updated", "Job approved and marked completed", "Invoice amount updated", "Job confirmed", "Message sent", "Assigned to {name}", "Moved to {column}", "Follow-up sent via {channel}"

**Error:**
- "Assign a team member before moving to Scheduled.", "Set a scheduled date before moving the job to this stage.", "No contact to edit", "Failed to update invoice amount"

---

## 8. Contacts Page

### File Locations

| File | Purpose |
|------|---------|
| `app/dashboard/contacts/page.tsx` | Contacts list page |
| `components/crm/contacts-table.tsx` | Contacts data table |
| `components/crm/contact-detail-modal.tsx` | Contact detail view |

### Contacts List Page

**RBAC:** Manager/Owner only. Team members redirected to `/dashboard`.

**Header:**
- Title: "Contacts"
- "New Contact" button (primary, Plus icon)
- Search input with filter

**Contacts Table:**
- Columns: Name, Email, Phone, Company, Source, Created, Actions
- Sortable columns
- Row click opens contact detail modal
- Pagination support
- Empty state: "No contacts found."

### Contact Detail Modal

- Contact info: name, email, phone, company, address
- Associated deals list
- Activity history
- Edit/delete capabilities

---

## 9. Calendar & Schedule

### File Locations

| File | Purpose |
|------|---------|
| `app/dashboard/calendar/page.tsx` | Calendar page (today view) |
| `components/scheduler/calendar-grid.tsx` | Daily time grid |
| `components/scheduler/draggable-job-card.tsx` | Draggable job card |
| `app/dashboard/schedule/page.tsx` | Full schedule page |
| `app/dashboard/schedule/schedule-calendar.tsx` | Multi-view schedule |

### Calendar Page (`/dashboard/calendar`)

**Header:**
- Title: "Schedule"
- Subtitle: "Manage your job schedule and confirmations"
- Status legend: Green dot "Confirmed", Amber dot "Pending", Gray dot "No Confirmation"

**Data:** Displays today's scheduled jobs only via `getTodaySchedule()`

**Layout:** Full-height card with atmospheric glow (mint-colored radial gradient)

### Calendar Grid (`CalendarGrid`)

**Time Range:** 6 AM to 8 PM (15 hours)

**Grid Structure:**
- 60px fixed time column + equal-width date columns
- 100px minimum height per hour slot
- Sticky header (z-30), sticky time column (z-10)

**Header Row:** Uppercase 3-letter day + large date number. Blue highlight for today (`bg-blue-50 text-blue-700`).

**Time Labels:** 12-hour format with AM/PM, white bg, 100px min height

**Time Slot Cells:**
- Default: white bg
- Drag over: `bg-blue-50`
- Today: very light blue
- Small time indicator top-right (visible on hover)
- Contains `DraggableJobCard` components

### Draggable Job Card

**Left Border (4px) by Status:**

| Status | Color |
|--------|-------|
| COMPLETED/WON | green-500 |
| IN_PROGRESS/ON_SITE/TRAVELING | blue-500 |
| CANCELLED/LOST | red-500 |
| SCHEDULED/PENDING/default | slate-400 |

**Background by Status:** green-50, blue-50, red-50, or white

**Card Elements:**
1. GripVertical icon (drag handle)
2. Job title (xs, semibold, truncate) + status icon (CheckCircle2/Clock/AlertCircle)
3. Client name (10px, muted)
4. Duration badge ("2h") + Status text (uppercase, 9px)

**Interactions:**
- Hover: shadow-md
- Dragging: opacity-50
- Overlay: shadow-xl, opacity-90, scale-105, rotate-2, cursor-grabbing
- Click: navigates to job detail (blocked during drag)

### Schedule Page (`/dashboard/schedule`)

**Data:** All non-deleted deals. Team members see only their assigned deals.

**Header:** "Schedule" (text-xl, midnight)

### Schedule Calendar (`ScheduleCalendar`)

**Three View Modes:**

#### Month View

- 7-column grid (Sun-Sat)
- Day cells: 100px min height
- Today: primary bg circle on date number
- Outside-month days: `bg-slate-50/40`, `text-slate-400`
- Jobs shown as deal chips

#### Week View

- 7 columns, one per day
- Day header: 3-letter day name + large date number (primary for today)
- Content area: `min-h-400px`, deal chips
- Today column: `bg-primary/5`

#### Day View (Resource Gantt)

- Grid: 180px team column + 15 hour columns (92px min each)
- Hours: 6 AM - 8 PM, 12-hour format
- Team member rows (sticky left): name (semibold) + role
- Hour cells: 96px min height, droppable
- **Unassigned Row:** at bottom, `bg-slate-100/60`

**Deal Chip (Draggable):**
- Time badge: primary text if assigned, slate if unassigned
- Status dot (emerald if assigned)
- Title + address/contact name
- Click opens deal detail modal

**Header Controls:**
- Navigation: left/right chevrons + "Today" button + date/range label
- Team filter dropdown: "All Members" + individual members
- View mode buttons: month/week/day (bg-neutral-100 container, active: white + shadow)

**Mobile List View (< 768px):**
- Replaces grid with scrollable list
- Job items: date badge, time badge, assignee name, title, address
- Empty: "No jobs scheduled for this {view}."

**Drag & Drop:**
- Preserves time when dropping on date cell
- Updates `assignedTo` when dropping on team member row
- Success toast on update

**Keyboard:** Arrow left/right navigates between periods

---

## 10. Map Page

### File Locations

| File | Purpose |
|------|---------|
| `app/dashboard/map/page.tsx` | Map page (server) |
| `components/map/map-page-client.tsx` | Map client wrapper |
| `components/map/google-map-view.tsx` | Google Maps view |
| `components/map/map-view.tsx` | Leaflet fallback view |

### Map Page (`/dashboard/map`)

**Top Data Strip:**
- Calendar icon (primary) + "{count} job(s) today" or "No jobs scheduled for today"
- White/80 bg, border-bottom

**Data Processing:** Fetches scheduled deals with addresses, maps to `{id, title, clientName, address, status, value, scheduledAt, lat, lng}`

**Empty State:**
- "No scheduled jobs to map yet"
- "The map appears once jobs have both a scheduled time and an address."
- Buttons: "Open dashboard" (dark bg) + "Go to schedule" (outline)

**Fallback:** If Google Maps unavailable, switches to Leaflet with amber banner: "Google Maps was unavailable, so the app switched to the backup map view."

### Google Map View (`google-map-view.tsx`)

**Layout:** Two-column (sidebar + map)

#### Left Sidebar (Expandable/Collapsible)

**Collapsed (w-12):** MapPin icon + "Jobs" label + ChevronRight

**Expanded (w-80):**

**Header:**
- "Today's Jobs" + job count
- **Route Mode Button:**
  - Normal: blue border/bg/text, "Enable Route Mode"
  - Active: slate-900 bg, white text, "Exit Route Mode"

**Jobs List (Non-Route Mode):**
- Each job: colored dot + client name + job title + status badge + address + time
- Selected job: blue-50 bg + action buttons:
  1. "View Job" (blue-600)
  2. "Message" (indigo-600)
  3. "Open in Google Maps" (slate-100)
  4. "Navigate Again" (emerald-500, if started)

**Empty State:** "No jobs scheduled for today. Upcoming booked jobs still appear on the map."

**Route Mode — Active Target Card:**
- Pulsing blue dot + "ACTIVE TARGET" label
- Client name (large bold), job title, address, time
- "Navigate to Job" (blue) + "Complete & Next" (emerald, if started)

**Route Mode — All Done:**
- CheckCircle2 (emerald) + "All Done!"
- "You've completed all scheduled jobs for today."

**Route Mode — Up Next Section:**
- Numbered remaining jobs (opacity-60)

#### Right: Google Map

**Map Configuration:**
- Default center: Melbourne, Australia (-37.8136, 144.9631)
- Default zoom: 12
- Hidden: mapTypeControl, streetViewControl, POI/transit labels

**Markers:**
- Today's jobs: blue pin (zIndex 2)
- Upcoming jobs: gray circle symbol (#64748B, zIndex 1)
- User position: blue circle (#4285F4, zIndex 10, white 3px stroke)

**InfoWindow (on marker click):**
- Client name, job title, address, scheduled time
- Buttons: "Start Job" (blue), "Message" (indigo), "Finish" (emerald, route mode only)

**Map Controls:**
- **Locate Button** (top-right): "My Location" / "Locating..." with spinner
- **Layers Button** (bottom-left): checkboxes for "Today's jobs" / "Upcoming jobs"
- Auto-bounds: fits all markers + user position, max zoom 14, 50px padding
- Selection: pans to job at zoom 15

### Leaflet Map View (Fallback)

- Identical sidebar to Google Maps version
- CartoDB Light tile layer
- Custom SVG marker icons:
  - Active/Selected: blue (#2563EB), 36px
  - Started: green (#059669), 28px
  - Default today: teal (#0D9488), 28px
  - Upcoming: gray dashed outline (#64748B), 28px
- User position: blue CircleMarker (#4285F4, 7px radius)
- Fly animation: 0.8s to selected job at zoom 15

---

## 11. Inbox

### File Locations

| File | Purpose |
|------|---------|
| `app/dashboard/inbox/page.tsx` | Inbox page (server) |
| `components/crm/inbox-view.tsx` | Inbox two-column view |

### Inbox Page

**RBAC:** Manager/Owner only. Team members redirected to `/dashboard`.

**Data:**
- Activities (up to 80): types CALL, EMAIL, NOTE, TASK, MEETING
- Contacts segmented: "Existing" (active deal stages) vs "Lead" (all others)

### Inbox View (`inbox-view.tsx`)

**Layout:** Two-column responsive glass card

#### Left Panel: Contact List

**Width:** Desktop w-80 (320px), mobile full width (hidden when contact selected)

**Header (p-3):**
- Title: "Contacts"
- **Contact Type Filter:** "All" / "Prospect" / "Existing" (SlidersHorizontal icon)
- **Date Filter:** "Latest" / "Oldest" / "Custom time period" (ArrowDownAZ icon)

**Search Bar:**
- Placeholder: "Search contacts..."
- Focus: shows top 5 filtered contacts dropdown with avatar + name

**Contact Row:**
- Selected: `bg-primary/10`, 4px `border-l-primary`
- Unselected: transparent border, hover `bg-white/5`
- Avatar (h-9 w-9, primary/10 bg, first letter)
- Content: contact name + time of latest activity
- Preview: channel icon + "{title} — {content}" (truncated 52 chars)
- No interactions: "No activity yet"

#### Right Panel: Contact Detail

**Header Bar (h-14):**
- Back button (mobile only)
- Avatar + name + phone/email
- Action buttons (all outline, h-8):
  - Call (Phone icon, blue-500): tel: link
  - Email (Mail icon, orange-500): mailto: link
  - Text (MessageSquare icon, green-500): sms: link
  - Open (ExternalLink icon): contact/deal page

**Tab Toggle:**
- "Conversations" (non-system interactions)
- "System Activity" (stage changes, deal creation, etc.)

**Interactions List (p-4, space-y-3):**

| Channel | Icon Container | Icon Color |
|---------|---------------|------------|
| Call | bg-blue-100 | blue-600 |
| Email | bg-amber-100 | amber-700 |
| SMS | bg-teal-100 | teal-600 |
| System | bg-slate-100 | slate-500 |
| Note | bg-emerald-100 | emerald-700 |

- Outbound messages: reversed layout, `bg-primary/10` bubble, rounded-br-sm
- Each: title + timestamp + content text

**Message Input (bottom):**

**Mode Toggle:**
- "Ask Tracey" (active: bg-primary, Sparkles icon): AI handles communication
- "Direct Message" (active: bg-background, MessageSquare icon): sends direct SMS

### Device vs Platform Number Isolation

- **AI Agent (Tracey):** Strictly uses the **Provisioned Twilio Number**. All logs saved to CRM.
- **Manual Click-to-Call/Text:**
  - Buttons (`tel:` or `sms:`) open the **user's native mobile app**.
  - These use the **User's Personal Number**.
  - AI NEVER uses the user's personal number.

---

**Input Field:**
- Ask Tracey: "Tell Tracey what to do with {contactName}..."
- Direct Message: "Text {contactName} directly..."
- Disabled if direct mode + no phone

**Send Button:** Send icon, disabled if empty/sending/no-phone

**Helper Text:**
- Direct without phone: "No phone number on file — add one to send direct messages." (red-400)
- Direct with phone: character count (red at >160 chars)
- Ask Tracey: "Tracey will handle communication with this customer on your behalf."

**No Contact Selected:** Search icon + "Select a contact to view their details"

### Custom Date Filter Dialog

- Start date + end date inputs
- "Cancel" / "Apply" buttons
- Filters to contacts with interactions in date range

### Tutorial Mode

- Adds fake "John Smith" contact with demo interactions
- Direct SMS disabled for tutorial contact with toast warning

---

## 12. Chat Interface & AI Assistant (Tracey)

### File Locations

| File | Purpose |
|------|---------|
| `components/chatbot/chat-interface.tsx` | Main chat UI (959 lines) |
| `components/chatbot/deferred-chat-interface.tsx` | Dynamic import wrapper |
| `app/api/chat/route.ts` | Chat API route (716 lines) |
| `lib/ai/tools.ts` | AI tool definitions (617 lines) |
| `lib/ai/sms-agent.ts` | SMS-specific AI agent |
| `actions/chat-actions.ts` | Chat server actions (2481 lines) |
| `components/sms/message-action-sheet.tsx` | SMS preview/send sheet |
| `hooks/use-speech-recognition.ts` | Voice input hook |
| `lib/digest.ts` | Daily digest generation |

### Message Types & Display

**User Messages:**
- Right-aligned bubble, green bg (`#00D28B`), white text
- Rounded corners, subtle shadow
- Timestamp below (Clock icon, locale time HH:MM)
- Whitespace preserved

**AI Assistant Messages:**
- Left-aligned bubble, white/slate bg (dark: slate-900/80)
- Border: `border-slate-200/50 dark:border-slate-800/50`
- Backdrop blur, leading-relaxed, whitespace-pre-line
- Timestamp below

**Loading Indicator:**
- Shown when `status === 'streaming' || status === 'submitted'`
- Loader2 icon (animated spin, 4x3.5)
- Text: "Thinking..." (muted foreground)

### Digest Messages (Special Interactive)

**Morning Briefing:** Starts with "☀️ Morning Briefing"
- **Checklist:** Checks for Missing Address, No Customer Phone, Unassigned Jobs, Unconfirmed Today's Jobs, Missing Deposits.
- emerald-50/70 bg, emerald-200 border
- Loading: "Loading…" in emerald-700

**Evening Wrap-Up:** Starts with "🌙 Evening Wrap-Up"
- slate-50/80 bg, slate-300 border
- Loading: "Loading…" in slate-600

**Digest Modal (on click):**
- Max-height 80vh, scrollable
- Title: "{type} — {date}"
- Summary: "Pipeline value: ${total} · Top actions: {top 3}"
- Sections:
  - Urgent & Rotting Jobs (amber header, red items)
  - Follow Ups & Today's Tasks (emerald header, amber items)
  - Overdue Tasks (slate header, white items)
  - Next Steps (contextual by agent mode):
    - **EXECUTION:** AI takes independent action (books/quotes/chases) without prompt.
    - **REVIEW & APPROVE (DRAFT):** AI prepares drafts for user review (thumbs up/down).
    - **INFO_ONLY:** AI gathers intelligence but leaves all outbound work to the user.

### Job Draft Card (Inline in Messages)

**Container:** emerald-200 border, emerald-50/50 bg

**Header:** "New job — review & confirm" with animated pulse dot + category badge

**Warning Banner** (if warnings): amber bg, ⚠️ icon per warning

**Input Fields:**
- First & Last Name (2-column grid, first required)
- Job Type / Work Description (required)
- Price & Schedule (2-column)
- Assignee (dropdown, conditional on schedule)
- Address (optional)
- Phone & Email (2-column)
- Notes: "Notes (language preferences, etc.)" with amber hint
- Type selector: "Person" / "Business"

**Footer Buttons:**
- Cancel: white bg, X icon
- Create Job: emerald-600 bg, Check icon, disabled until required fields filled

**Post-Confirmation States:**
- Confirmed: green badge + Check + "Job created"
- Cancelled: slate badge + X + "Cancelled"
- Multi-job: sends "Next" to trigger next draft

### Quick Actions (Shown on Welcome)

Visible only when `messages.length <= 1` and not loading.

**Container:** `grid-cols-2` gap-2, "Quick actions" label above

**Contextual by Route:**
- `/deals`: "Schedule job", "Create quote", "Move deal"
- `/contacts`: "Call prep", "Draft email"
- `/assets`: "Analyse assets"
- Fallback: "Schedule a job", "Create a quote", "Follow up call", "Move a deal"

**Button Styling:** pill shape, primary icon, neutral-700 text, hover: border-primary + text-primary

### Message Input Area

**Container:** Fixed bottom, gradient bg, z-20

**Textarea:**
- ID: `chat-input`
- Min height: 44px, max height: 120px
- Placeholder: "Type your message..."
- Auto-expand via scrollHeight
- Enter (no Shift): submit. Shift+Enter: newline.

**Send Button (8x8):**
- With text: `bg-[#00D28B]`, hover 90%, white text, shadow
- Empty: `bg-slate-100`, `text-slate-400`
- Icon: Send (3.5x3.5)

**Voice Input Button (8x8):**
- Listening: `bg-red-500`, animate-pulse, red shadow
- Not listening: white bg, slate border
- Icon: Mic (4x4)

### Speech Recognition

- Browser API: SpeechRecognition / webkitSpeechRecognition
- Language: `en-AU` (Australian English)
- Continuous: false, interimResults: false
- Appends transcript to input with space
- Error "not-allowed": toast "Microphone access denied. Check browser permissions."

### Chat History

- Fetches last 20 messages from DB on mount: `getChatHistory(workspaceId, limit=20)`
- Session storage persistence: `chatMessages:{workspaceId}`
- Falls back to DB if session storage unavailable
- Smooth scroll to bottom on new messages

### Tool Call Handling

**Job Draft Output:** Renders `JobDraftCard` with edit/confirm/cancel

**Confirmation Card Output:** Shows summary text + "Confirm" (emerald) / "Cancel" (outline)

**Generic Message Output:**
- Success: emerald-50 border, Check icon, "Undo" button
- Error: amber-50 border
- Undo calls `runUndoLastAction(workspaceId)`

### Chat API Route (`/api/chat`)

**Pre-Processing Pipeline (parallelized):**
1. Job extraction (1400ms timeout)
2. Agent context building (includes pricing if query mentions price/quote)
3. Memory fetch (400ms timeout, only if message > 2 words)

**Multi-Job Detection:**
- "Next" keyword triggers multi-job progression
- Single job: shows draft card immediately
- Multiple jobs: first draft shown, state stored for "Next"

**Sticky Support Ticket Context:**
- Detects previous ticket creation (TICKET_ID marker)
- Next message becomes addendum via `appendTicketNote`

**Model:** `gemini-2.0-flash-lite`, max 512 tokens, 2-5 adaptive steps

**System Prompt Includes:**
- Knowledge base, working hours, agent script, preferences, pricing rules
- Bouncer (no-go leads), attachments, memory context, CRM selection context
- Customer contact enforcement, pricing integrity, messaging rules
- Role guards, multi-job handling, job draft formatting

**Context:** Last 8 non-system messages, empty content filtered

**Telemetry:** preprocessing_ms, tool_calls_ms, model_ms, total_ms, ttft_ms (Server-Timing header)

### Chat Server Actions (`chat-actions.ts`)

**Key Functions:**

| Function | Purpose |
|----------|---------|
| `confirmJobDraft(workspaceId, draft)` | Confirm AI-created job draft |
| `saveAssistantMessage(workspaceId, content)` | Persist assistant message to DB |
| `getDailyDigest(workspaceId, kind)` | Generate morning/evening digest |
| `getChatHistory(workspaceId, limit)` | Fetch last N messages |
| `runUndoLastAction(workspaceId)` | Undo most recent AI activity |

**Tool Actions (LLM):**
- `runMoveDeal`: Move job to stage
- `runCreateJobNatural`: Create job from natural language
- `runSendSms`, `runSendEmail`, `runMakeCall`: Contact customer (fuzzy matching)
- `runSearchContacts`, `runCreateContact`: Contact management
- `runCreateTask`: Create reminders
- `runLogActivity`: Record calls, notes, meetings
- `handleSupportRequest`: Create support tickets

### AI Tool Definitions (`tools.ts`)

**Core Tools (always):** listDeals, searchContacts, contactSupport, showConfirmationCard, showJobDraftForConfirmation, updateAiPreferences, addAgentFlag, undoLastAction

**Intent-Specific Tools:**
- **pricing:** pricingLookup, pricingCalculator, createDraftInvoice, updateInvoiceAmount
- **scheduling:** getSchedule, getAvailability, createJobNatural, proposeReschedule, getTodaySummary
- **communication:** sendSms, sendEmail, makeCall, getConversationHistory, createNotification
- **reporting:** getFinancialReport, getTodaySummary, searchJobHistory, recordManualRevenue
- **contact_lookup:** getClientContext, createContact, updateContactFields
- **invoice:** all invoice-related tools

**Customer Contact Enforcement:**
- EXECUTION: immediate action
- DRAFT: requires approval
- INFO_ONLY: blocked

### SMS Agent (`sms-agent.ts`)

**SMS-Specific Tools:** getAvailability, getSchedule, createJobNatural, createDeal, getClientContext, searchContacts, createContact, logActivity, addAgentFlag

**Response Length Guidance:**
- ≤ 30 chars setting: "Keep replies to 1 sentence."
- ≤ 70 chars setting: "Keep replies to 1-2 sentences."
- > 70 chars setting: "Keep replies to 1-3 sentences."

**Fallback:** "Thanks for your message! Someone will get back to you shortly."

### SMS Message Action Sheet

**Sheet:** Bottom-aligned, rounded-t-2xl, max 70vh

**Header:** MessageSquare (emerald-600) + "Send {trigger_label} message"

**Preview:**
- Channel badge: "Sending via SMS/Email to {contact}"
- Message bubble: slate-100 bg, rounded-2xl
- Inactive template warning: amber bg, "This template is currently disabled."

**Footer:** "Cancel" (outline) / "Send Email/SMS" (emerald-600)

### SMS Templates

**Default Templates:**
- JOB_COMPLETE: "Hi [Name], thanks for today! A review helps us heaps: [Link]..."
- ON_MY_WAY: "Hi [Name], I'm Tracey, AI assistant for [Company]. Your tradie is about 20 minutes away."
- LATE: "Hi [Name], ... Quick heads up: we're running about 15 minutes late."
- BOOKING_REMINDER_24H: "Hi [Name], ... Friendly reminder about your appointment tomorrow. Reply YES to confirm."

**Variables:** `[Name]`, `[Company]`, `[Link]`

### Daily Digest

**Digest Item Types:**
- `rotting_deal`: No activity 7+ days (priority 1)
- `stale_deal`: No activity 3-7 days (priority 2)
- `follow_up`: Requires follow-up
- `overdue_task`: Past due date

**Generation:** Filters active deals (excludes WON/LOST/ARCHIVED), calculates health, collects overdue tasks, sums pipeline value

---

## 13. Quoting & Invoicing

### File Locations

| File | Purpose |
|------|---------|
| `components/tradie/estimator-form.tsx` | Quote/estimate form |
| `components/tradie/material-picker.tsx` | Material database picker |
| `components/tradie/job-billing-tab.tsx` | Invoice management UI |
| `components/tradie/job-completion-modal.tsx` | Job completion with invoicing |
| `components/invoicing/invoice-generator.tsx` | Invoice preview/print |
| `actions/tradie-actions.ts` | Business logic |
| `actions/accounting-actions.ts` | Xero integration |

### Quote Form (`estimator-form.tsx`)

**Fields:**
- Deal Selection (required dropdown)
- Line Items (required, minimum 1):
  - Description (text)
  - Price ($, number, 2 decimals)
  - Add/remove per item
- "Add from Database" button opens Material Picker

**Totals (auto-calculated):**
- Subtotal: sum of all prices
- GST (10%): subtotal × 0.1
- Total: subtotal + GST

### Quote Generation (`generateQuote`)

1. Validates items (min 1, description + price required)
2. Calculates subtotal, tax (10% GST), total
3. Creates Invoice record: status `DRAFT`, number `INV-{timestamp}`
4. Updates Deal: `stage="INVOICED"`, `value=total`
5. Stores line items in deal metadata

### Invoice Statuses & Transitions

| Status | Can Do | Cannot Do |
|--------|--------|-----------|
| DRAFT | Edit line items, Issue, Email, Void | Mark Paid |
| ISSUED | Mark Paid, Reverse to Draft, Email, Void | Edit line items |
| PAID | Reverse to Issued | Edit, Email, Void |
| VOID | Read-only | Everything |

### Invoice Actions

| Action | Effect |
|--------|--------|
| `issueInvoice(id)` | DRAFT → ISSUED, sets issuedAt |
| `markInvoicePaid(id)` | ISSUED → PAID, sets paidAt, deal → WON |
| `voidInvoice(id)` | DRAFT/ISSUED → VOID |
| `reverseInvoiceStatus(id, target)` | PAID → ISSUED, or ISSUED → DRAFT |
| `updateInvoiceLineItems(id, items)` | Edit DRAFT only |
| `emailInvoice(id)` | Send HTML email via Resend |

### Job Billing Tab (`job-billing-tab.tsx`)

- Lists all invoices for a deal
- Quick create variation/invoice section
- Status badges: DRAFT (slate), ISSUED (blue), PAID (emerald), VOID (red strikethrough)
- Inline line item editor for DRAFT
- Xero sync status indicator (Cloud/CloudOff icon)

### Invoice Generator (`invoice-generator.tsx`)

- Modal with large preview iframe
- HTML rendering with workspace branding
- "Print" button (iframe → `window.print()`)
- "Email Client" button (Resend API)

### Invoice PDF Generation (`generateQuotePDF`)

HTML template includes: invoice number, status, dates, deal title, contact details, formatted line items, subtotal/GST/total, workspace name

### Email Sending

- Resend API (`RESEND_API_KEY`)
- From: `{workspace name} <noreply@earlymark.ai>`
- Subject: "Quote/Invoice {number} from {workspace}"
- Records EMAIL activity

### Job Completion Modal (`job-completion-modal.tsx`)

**Phase 1: Invoice Verification**

- **Labour Hours:** number input (step 0.25), editable hourly rate (default $85/hr)
- **Materials:** list with add/remove, Material Picker integration
- **Invoice Total:** sum of labor + materials (large emerald text)

**Phase 2: Payment & Notes**

- **Payment Status:** "Paid on Site" (blue) vs "Invoice Later" (amber)
- **Field Notes:** optional textarea
- **File Uploads:** multiple files, remove buttons
- **Customer Signature:** SignaturePad (HTML5 canvas), preview, "Clear & Re-sign"

**Phase 3: Completion Actions**

1. **"Confirm & Generate Invoice":**
   - Captures signature, finalizes payment/notes
   - Generates invoice, moves deal to COMPLETED/WON
   - Pushes Xero draft (non-blocking)
   - Triggers "Send Review Request?" dialog

2. **"Save for Later":**
   - Records signature/payment/notes
   - Moves to READY_TO_INVOICE
   - No invoice generated

### Invoice Sign-Off / Completion Wizard

When a job is marked for completion, the following multi-step wizard is triggered:

1. **Labour & Materials Review:**
   - Adjust labour hours and hourly rates (total updates live).
   - Material Picker: Add items from the pricing glossary/database.
2. **Field Notes & Photos:**
   - Capture final job notes.
   - Upload \"Before\" and \"After\" photos.
3. **Payment Status:** Toggle between \"Paid on Site\" or \"Invoice Later\".
4. **On-Site Sign-Off:** Touch-friendly signature pad for customer confirmation.
5. **Completion Action:**
   - **Save for Later:** Moves deal to `PENDING_COMPLETION` (Amber dashed border). No invoice created.
   - **Confirm & Generate:** Generates PDF, moves deal to `COMPLETED/WON`, pushes draft to Xero.
6. **Review Prompt:** Optional checkbox to send an automated Review Request SMS.

### Xero Integration (Stub)

- `getInvoiceSyncStatus(invoiceId)` — currently returns `synced: false`
- `createXeroDraftInvoice(dealId)` — pushes draft to Xero, fails gracefully

---

## 14. Analytics & Reports

### File Locations

| File | Purpose |
|------|---------|
| `app/dashboard/analytics/page.tsx` | Analytics page |
| `actions/analytics-actions.ts` | Data fetching actions |

### RBAC

Team members BLOCKED (redirected to `/dashboard`). Managers/Owners: full access.

### Time Range Filter

Options: Last 7 days, Last 30 days (default), Last 90 days, Last year

### Metrics Displayed

- **Completed Revenue:** total with growth % vs last month
- **Customers:** new this month, average satisfaction rating
- **Jobs Won with Tracey:** AI-sourced jobs count
- **Pipeline Count:** "New request" + "Quote sent" stages
- **Conversion Rate:** completed / total deals × 100
- **Avg Completion Time:** days between creation and WON stage

### Charts & Visualizations

1. **Revenue Trend Chart:** SVG line chart, interactive data points, click month to drill down
2. **Rating Distribution Bell Curve:** customer satisfaction scores 1-10
3. **Latest Feedback Cards:** top 10 reviews (score, comment, contact, deal, date), scrollable max-h-72
4. **Monthly Satisfaction Trend:** 6-month grid of averages
5. **Team Performance Bar Chart:** per-member jobs completed + revenue, sorted by revenue desc

### Monthly Revenue Drill-Down

Includes: totalRevenue, dealCount, avgDealValue, largestDeal, breakdown by source, individual deal list

### Revenue Calculation Logic

- Prefers `invoicedAmount` when available, falls back to deal `value`
- Only counts "WON" stage deals within selected time range
- Growth: `(current - previous) / previous × 100`

### Export

- Print to PDF (Printer icon, `window.print()`)
- CSS print media queries hide UI controls

---

## 15. Team Management

### File Location

| File | Purpose |
|------|---------|
| `app/dashboard/team/page.tsx` | Team page |
| `actions/invite-actions.ts` | Team invite server actions |

### Members List

- Avatar (initials) + Name + Email
- Role badge: Owner (purple), Manager (blue), Team Member (gray)
- Owner/current user: role locked
- Others: role dropdown (TEAM_MEMBER ↔ MANAGER)
- Remove button (red trash) — except Owner/current user

### Member Operations

| Action | Description |
|--------|-------------|
| `updateMemberRole(id, role)` | Change role dynamically |
| `removeMember(id)` | Remove from workspace (confirmation alert) |

### Invite Management

**Invite Dialog:**
- Role selection: TEAM_MEMBER or MANAGER
- Email input (required for email invite)
- Two modes: "Send Invitation" (requires email) or "Generate Invite Link"

**Success State:**
- Shows generated link + copy button
- "Anyone who opens this link will join as [Role]"
- Expiry: 7 days

**Pending Invites List:**
- Email or "Open invite link"
- Expiry date + role badge
- Revoke button

---

## 16. Settings

### File Location

`app/dashboard/settings/layout.tsx` — Settings layout with sidebar navigation

### Settings Navigation

| Section | Path | Manager Only |
|---------|------|--------------|
| Account | `/dashboard/settings` | No |
| My Business | `/dashboard/settings/my-business` | No |
| Automated Calling & Texting | `/dashboard/settings/call-settings` | No |
| AI Assistant | `/dashboard/settings/agent` | No |
| Integrations | `/dashboard/settings/integrations` | Yes |
| Notifications | `/dashboard/settings/notifications` | No |
| Billing | `/dashboard/settings/billing` | Yes |
| Display | `/dashboard/settings/display` | No |
| Data & Privacy | `/dashboard/settings/privacy` | No |
| Help | `/dashboard/settings/help` | No |

Search/filter on desktop, hidden on mobile.

### 16.1 Account Settings

**User Profile:** Username, Email (read-only), ViewMode (BASIC/ADVANCED)

**Personal Phone & Call Forwarding:** CallForwardingCard component

**Security:**
- Current password, new password, confirm new password
- New email input (sends confirmation to both addresses)
- Delete account with reason dropdown:
  - Not useful, Too expensive, Switching, Missing features, Too complex, Other

### 16.2 My Business

**Business Details:**
- Business Name (text)
- Specialty/Trade Type (dropdown: Plumber, Electrician, Carpenter, HVAC Technician, Painter, Roofer, Handyman)
- Location/Service Area (text)

**Working Hours:**
- Start/end time (defaults: 08:00-17:00)
- Morning agenda notify (07:30), evening wrap-up (17:30)
- Emergency callout toggle + emergency hours

**Contact Information:**
- Phone (placeholder: "+61 400 000 000")
- Email (placeholder: "hello@yourbusiness.com")
- Address (textarea)

**Service Areas:**
- Radius slider: 5-100 km, step 5
- Specific suburbs: add/remove badges

**Pricing:**
- Call-out fee (number, step 5)
- Service pricing table: service name, min fee, max fee, comment
- Refusal rules: services AI won't quote (red badges)

**AI Attachment Library:**
- Document name + file upload (PDF, Word, JPG, PNG)
- AI instructions/description textarea

### 16.3 AI Assistant

**Autonomy Mode (radio):**
- EXECUTION: "Tracey can do automatically"
- DRAFT: "Review & approve" (default)
- INFO_ONLY: "Info only"

**Learning:**
- Auto-create pricing suggestions toggle (default: true)
- Behavioral rules/preferences: text input + add button, displayed as removable chips

**WhatsApp Assistant (Beta):**
- WhatsApp number display
- "Connect via WhatsApp" button (green, external link)
- Access model: internal only. Admins/managers/team members can message the assistant from the personal mobile number saved on their Earlymark user account
- Authentication: inbound WhatsApp sender number must match a `User.phone` / saved personal mobile
- End customers are not authorized for this WhatsApp assistant channel
- Delivery path: Twilio WhatsApp webhook -> phone lookup -> spam filter -> headless CRM AI agent -> WhatsApp reply

**Multilingual Voice Calls:**
- Live voice agent uses Deepgram with `language: "multi"` and `detectLanguage: true`
- On each caller turn, Tracey updates reply TTS language from the detected speech language
- Prompts explicitly instruct Tracey to reply in the same language as the caller and stay there unless the caller switches back
- This applies to normal customer calls and Earlymark demo/sales calls

### 16.4 Automated Calling & Texting

**AI Agent Business Number:** Display + copy button

**Handling Hours:** WeeklyHoursEditor with texting/calling windows (defaults: 08:00-20:00)

**Emergency Routing:** "Allow urgent calls to bypass AI" toggle

**Transcription:** Record calls toggle (default: true)

**Agent Behaviour:** Personality (Professional/Friendly), response length (10-100%, default 50)

**SMS Templates:**

| Event | Description |
|-------|-------------|
| JOB_COMPLETE | "Sent after you mark a job as done" |
| ON_MY_WAY | "Sent when you start traveling" |
| LATE | "Quick heads-up when stuck in traffic" |
| BOOKING_REMINDER_24H | "Sent 24 hours before scheduled job" |

Per template: enable/disable toggle (auto-saves), send timing dropdown, message textarea, auto-appended signature

**Voice Settings:**
- Enable voice agent toggle
- Language: en-AU, en-US, en-GB (default: en-AU)
- Voice type: female/male/neutral (default: female)
- Speed: 0.8 Slow, 1.0 Normal, 1.2 Fast (default: 1.0)
- Business-hours greeting, opening message, closing message, after-hours message
- Transcribe voicemails toggle (default: true)
- Auto-respond to messages toggle (default: true)

### 16.5 Integrations (Manager/Owner Only)

**Instant Lead Capture:**
- Gmail connect (red) + Outlook connect (blue) buttons
- Connected accounts list with status dot, email, provider badge, disconnect button

**Google Calendar:** Connect/disconnect, last sync timestamp, read/write permissions

**Xero Accounting:** Connect/disconnect, invoices + contacts read/write

**Payment Processors (Coming Soon):**
- Stripe: "Accept credit cards and Apple/Google Pay"
- MYOB PayBy: "Receive payments directly to MYOB account"

### 16.6 Notifications

**Email Notifications:**
- Deal updates, New contacts, Weekly summary (toggles)

**In-App Notifications:**
- Task reminders: "Fires at agenda and wrap-up times from My business"
- Stale deal alerts: "Generated by stale-job detection workflow"
- Send test notification button

### 16.7 Billing (Manager/Owner Only)

See [Section 2: Billing & Subscription](#2-billing--subscription)

### 16.8 Display

**Theme (radio with visual previews):**
- Light: "Clean and bright" (bg: #F8FAFC)
- Dark: "Easy on the eyes" (bg: #020617)
- Premium: "Deep indigo vibes" (bg: #0C0A1D)

**Language & Region:**
- Language: English only
- Date format: DD/MM/YYYY (default), MM/DD/YYYY, YYYY-MM-DD
- Currency: AUD (default), USD, NZD

**Accessibility:**
- Text size: Small (90%), Default (100%), Large (110%), Extra Large (120%)
- Persists in localStorage as `ui-font-scale`

**Mobile:** Install PWA button

### 16.9 Data & Privacy

- "View terms" / "View privacy policy" buttons
- "We do not sell your data"
- Data policy (DRAFT): processing, retention, access restrictions

### 16.10 Help

- **Guided Tutorial:** Restart button (emerald) → `resetTutorial()` + navigate to `/dashboard`
- **Support:** Link to ticket creation page
- **Contact:** support@earlymark.ai, 1300 EARLYMARK (Mon-Fri 9am-5pm AEST)
- **System Status:** "Internal voice and platform monitoring is active"
- **Tracey Handbook** (collapsible): Onboarding, AI modes, Calls/texts/lead capture, Scheduling/routing, Pricing/refusal rules

### 16.11 Support (`/dashboard/settings/support`)

**Support Options:**
- Email Support: support@earlymark.ai (24hr response)
- Phone Support: 1300 EARLYMARK (Mon-Fri 9am-5pm AEST)
- AI Assistant: in-app chat (24/7)

**Support Request Form:**
- Subject (required), Priority (Low/Medium/High/Urgent), Message (textarea, 6 rows, required)
- Success: "Support request sent! We'll get back to you within 24 hours."

**Common Issues:** AI agent number not working, Need to change number, SMS not sending

### 16.12 Phone Settings

**Current Number:** Status badge + checklist (Twilio Account, Voice Agent, Setup Complete)

**Update Number:** Two-step verification — send code, then enter 6-digit code

**AI Receptionist & Call Forwarding:**
- USSD buttons (tel: links):
  - Enable 100% AI Receptionist (green)
  - Backup AI Receptionist (blue)
  - Turn Off AI (gray outline)

### 16.13 Automations (Workflow Rules)

**Display:** "X Active Rules" + "New Rule" button

**Create Rule Dialog:**
- Rule Name (placeholder: "e.g. New Lead Alert")
- Trigger: New Lead Created, Deal is Stale (7 days), Deal Reaches Stage, Task Overdue
- Action: Send Browser Notification, Create Follow-up Task
- Action details text input

**Automation Card:** Trigger icon + name + last fired badge + enable/disable toggle

### 16.14 Workspace Settings

**Workspace Details:** Business Name (required, min 2), Specialty (dropdown), Location

**Pipeline Health:**
- Days until Follow up (1-365, default 7)
- Days until Urgent (1-365, default 14)
- Validation: urgentDays ≥ followUpDays

### Save & Cancel Behavior

All settings use: individual save buttons per section, toast notifications, loading states ("Saving..."), optimistic UI updates, form state via useState, immediate toggles where applicable

---

## 17. Role-Based Access Control (RBAC)

### File Locations

| File | Purpose |
|------|---------|
| `lib/rbac.ts` | Role checks and permission functions |
| `lib/workspace-access.ts` | Workspace-level access validation |

### User Roles

| Role | Description |
|------|-------------|
| OWNER | Workspace creator. Full access to all features, billing, and team management. |
| MANAGER | Can invite/remove members (except owner) and **confirm data changes** (revenue/manual corrections). |
| TEAM_MEMBER | Can manage assigned jobs; blocked from billing/integrations. Kanban defaults to \"My Jobs\". |

### Invitations & Access

- **Expiry:** Invite links (Manager or Team Member) expire strictly after **7 days**.
- **Data Correction Locks:**
  - If a user attempts to update shared financial data via chat (e.g., \"Record $500 cash revenue\"), the AI triggers a **Confirmation Flow**.
  - **Managers/Owners** see a \"Confirm\" prompt.
  - **Team Members** receive a message: \"Only a manager or owner can confirm this data update.\"

### Permission Functions

- `getCurrentUserRole()` — returns user role from DB (defaults to "OWNER" if lookup fails)
- `isManagerOrAbove()` — returns `OWNER || MANAGER`

### Access Restrictions for TEAM_MEMBER

**Restricted Routes:**
- `/dashboard/inbox`
- `/dashboard/contacts`
- `/dashboard/analytics`

**Restricted Settings:**
- `/dashboard/settings/billing`
- `/dashboard/settings/integrations`

**Restricted Sidebar Items:** Inbox, Contacts, Analytics

**CRM Restrictions:** Auto-filtered to own assigned deals in kanban board and schedule

### Workspace Access Validation

- `requireCurrentWorkspaceAccess()` — ensures user has workspace + role, returns actor `{userId, workspaceId, role}`
- `requireContactInCurrentWorkspace(contactId)` — validates contact belongs to workspace
- `requireDealInCurrentWorkspace(dealId)` — validates deal belongs to workspace

### Access Control Summary

| Feature | All Users | Team Member | Manager | Owner |
|---------|-----------|-------------|---------|-------|
| Account Settings | Yes | Yes | Yes | Yes |
| My Business | Yes | Yes | Yes | Yes |
| Call Settings | Yes | Yes | Yes | Yes |
| AI Assistant | Yes | Yes | Yes | Yes |
| Integrations | No | No | Yes | Yes |
| Notifications | Yes | Yes | Yes | Yes |
| Billing | No | No | Yes | Yes |
| Display | Yes | Yes | Yes | Yes |
| Data & Privacy | Yes | Yes | Yes | Yes |
| Help | Yes | Yes | Yes | Yes |
| Analytics | No | No | Yes | Yes |
| Inbox | No | No | Yes | Yes |
| Contacts | No | No | Yes | Yes |
| Dashboard | Yes | Yes | Yes | Yes |
| Schedule | Yes | Yes | Yes | Yes |
| Map | Yes | Yes | Yes | Yes |
| Team | Yes | Yes | Yes | Yes |

---

## 18. Notifications

### File Locations

| File | Purpose |
|------|---------|
| `components/dashboard/notifications-btn.tsx` | Notification bell button |
| `components/dashboard/notification-feed.tsx` | Notification feed/popover |

### Notifications Button

- Bell icon, `variant="ghost" size="icon"`
- Unread badge: `h-2 w-2 rounded-full bg-red-500 ring-2 ring-white` (top-right)

### Notifications Popover

- Position: `absolute right-0 mt-2 w-80 z-50`
- White bg, rounded, shadow, slate-200 border
- Animation: `fade-in zoom-in-95 duration-100 origin-top-right`

**Header:** "Notifications" + "Mark all read" (if unread > 0, primary text, xs font)

**Content:** max-h-[300px], scrollable

**Loading:** "Loading..." centered

**Empty:** Bell icon (large, low opacity) + "No new notifications"

### Notification Item

**Icon (left):**
- AI/System: Sparkles icon in primary/20 circle
- ERROR: red dot
- WARNING: amber dot
- SUCCESS: emerald dot
- Other: primary dot
- Read: 50% opacity

**Content:**
- Title: `text-sm font-medium text-slate-900` (dimmed if read)
- Message: `text-xs text-slate-500`
- Timestamp: `text-[10px] text-slate-400` (HH:MM)

**Action Buttons (if actionType exists and unread):**

| Action | Color | Icon |
|--------|-------|------|
| CONFIRM_JOB | green-600 | CheckCircle2 |
| CALL_CLIENT | primary | Phone |
| SEND_INVOICE | emerald-600 | FileText |
| APPROVE_COMPLETION | amber-600 | ClipboardCheck |

- Clicking marks as read and navigates if link exists
- Size: `px-2.5 py-1 rounded-lg text-xs font-semibold`

**Mark Read Button** (for unread without actionType): Check icon, h-4 w-4, hover primary

**Polling:** Every 60 seconds

---

## 19. Global Search

### File Location

| File | Purpose |
|------|---------|
| `components/layout/global-search.tsx` | Global search command palette |

### Search Trigger

- **Keyboard shortcut:** `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux)
- **Button (header):** outline, `h-9`, "Search..." text + `⌘K` shortcut display
- Two variants: `default` (compact palette) and `bar` (wider, used in dashboard header)

### Search Dialog

- Command palette style, `overflow-hidden p-0 shadow-lg`
- **Placeholder:** "Search contacts, deals, tasks, activity, calls..."
- **Debounce:** 300ms
- **Minimum:** 2 characters

### Search States

| State | Display |
|-------|---------|
| Loading | "Searching..." |
| Too short (< 2 chars) | "Type at least 2 characters to search" |
| No results | "No results found for '{query}'" |

### Result Groups

| Group | Icon | Format |
|-------|------|--------|
| Contacts | User | `{title}` + `({subtitle})` |
| Deals | FileText | `{title}` + right-aligned `{subtitle}` |
| Tasks | Calendar | `{title}` |
| Activity | History | `{title}` + right-aligned `{subtitle}` |
| Calls | PhoneCall | `{title}` + right-aligned `{subtitle}` |

### Result Click

- Navigates to `result.url` via `router.push()`
- Closes dialog

---

## Key Integrations Summary

| Service | Purpose |
|---------|---------|
| **Supabase** | Authentication (email, phone OTP, Google OAuth) |
| **Stripe** | Billing, checkout, customer portal |
| **Twilio** | Phone provisioning, SMS sending, voice agent |
| **Resend** | Email sending (invoices, notifications) |
| **Google Maps API** | Map visualization, Places autocomplete |
| **Leaflet/CartoDB** | Fallback map when Google unavailable |
| **Xero** | Accounting sync (draft invoices) |
| **Google Calendar** | Job scheduling sync |
| **Gemini** | AI model for chat (`gemini-2.0-flash-lite`) |

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router, Server Components) |
| Language | TypeScript |
| UI Library | React with Tailwind CSS |
| Components | shadcn/ui, Radix UI primitives |
| Animation | Framer Motion |
| Drag & Drop | dnd-kit |
| State | Zustand (`useShellStore`), React useState |
| Database | PostgreSQL via Prisma ORM |
| Auth | Supabase Auth |
| Payments | Stripe |
| Telephony | Twilio |
| Email | Resend |
| Maps | Google Maps API + Leaflet fallback |
| AI | Google Gemini (gemini-2.0-flash-lite) |
| Themes | next-themes |

---

[//]: # (AGENT RULE: Any AI agent modifying structural components, features, or core app logic in the repository MUST update the relevant section of this document directly to maintain a synchronized single source of truth. Technical history is tracked in docs/agent_change_log.md.)

---
