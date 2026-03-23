# Assistantbot — Application Features Documentation

> Comprehensive reference for all user-facing features, flows, and configuration options.

---

## Table of Contents

1. [Authentication & Onboarding](#1-authentication--onboarding)
2. [Dashboard & Navigation](#2-dashboard--navigation)
3. [CRM: Contacts, Deals & Pipeline](#3-crm-contacts-deals--pipeline)
4. [Tracey AI Assistant](#4-tracey-ai-assistant)
5. [Modals & Overlays](#5-modals--overlays)
6. [Scheduling, Calendar & Maps](#6-scheduling-calendar--maps)
7. [Quoting & Invoicing](#7-quoting--invoicing)
8. [Communications: SMS, Email & Calls](#8-communications-sms-email--calls)
9. [Analytics & Reporting](#9-analytics--reporting)
10. [Role-Based Access Control (RBAC)](#10-role-based-access-control-rbac)
11. [Global Search (Cmd+K)](#11-global-search-cmdk)
12. [Settings & Configuration](#12-settings--configuration)
13. [Billing & Subscriptions](#13-billing--subscriptions)

---

## 1. Authentication & Onboarding

### 1.1 Authentication Methods

The app supports three sign-in methods, managed through a unified auth component.

| Method | Key Files |
|--------|-----------|
| Email/Password | `components/auth/unified-auth.tsx` |
| Phone (OTP) | `components/auth/phone-verification.tsx` |
| Google OAuth | `components/auth/google-signup.tsx` |

**Email/Password Flow**

1. Enter email address.
2. System checks if the account exists → routes to sign-in or sign-up.
3. Sign-up requires: email, password (6+ chars), confirm password. Name defaults to the email prefix.
4. An email confirmation link is sent; a resend button is available.
5. Sign-in requires: email and password.

**Phone (OTP) Flow**

1. Enter Australian mobile number (`04xx xxx xxx` or `+61` format).
2. A 6-digit OTP is sent via SMS.
3. Enter the OTP to verify. Resend is available after a 60-second cooldown.

**Google OAuth Flow**

- Triggers a custom endpoint (`/api/auth/google-signin`) that redirects to Google's consent screen.
- On success, user metadata (email, name) is stored automatically.

**Forgot Password**

- Page: `app/(auth)/forgot-password/page.tsx`
- Enter email to receive a password-reset link.

### 1.2 Post-Authentication Routing

File: `app/auth/next/page.tsx`

After authentication the user is routed based on their state:

| Condition | Destination |
|-----------|-------------|
| Active subscription + onboarding complete | `/dashboard` |
| Active subscription + onboarding incomplete | `/setup` |
| No active subscription | `/billing` (paywall) |

### 1.3 Onboarding Wizard

Files: `app/setup/page.tsx`, `components/onboarding/tracey-onboarding.tsx`, `actions/tracey-onboarding.ts`

A multi-step wizard that configures the workspace:

**Step 1 — Business Information**
- Business name
- Trade type (Plumber, Electrician, HVAC, Carpenter, Locksmith, Roofer, Painter, Tiler, Landscaper, Pest Control, Cleaner, Handyman)
- Physical address (with autocomplete)
- Website URL (used for scraping)
- Operating hours (Mon–Sun, start/end times)
- Phone number

**Step 2 — Services Configuration**
- Service name
- Call-out fee
- Min/Max pricing range
- Service notes

**Step 3 — Lead Capture Email**
- Forwarding address reservation
- Auto-forward rules for Gmail/Outlook
- DNS and Resend verification status
- End-to-end email receiving confirmation

**Step 4 — Agent Mode Selection**
- **EXECUTION** — Full autonomy; the AI acts on behalf of the user.
- **DRAFT** — Drafts are shown for user approval before execution.
- **INFO_ONLY** — AI provides information only; no automatic actions.

**Step 5 — Behavioral Preferences**
- AI learning rules (free-text list)
- Auto-update pricing from confirmed jobs toggle
- Working hours for notifications

A dashboard onboarding modal (`components/dashboard/onboarding-modal.tsx`) is also shown if setup was skipped.

---

## 2. Dashboard & Navigation

### 2.1 Main Layout

File: `components/layout/dashboard-layout.tsx`

- Responsive sidebar (collapsible on mobile via hamburger menu).
- Header with global search trigger (`Cmd+K`), notification bell, and user avatar.
- Breadcrumb navigation.

### 2.2 Sidebar Navigation Items

| Label | Route | Icon | Access |
|-------|-------|------|--------|
| Dashboard | `/dashboard` | LayoutDashboard | All |
| Pipeline | `/dashboard/pipeline` | Kanban | All |
| Contacts | `/dashboard/contacts` | Users | Manager+ |
| Calendar | `/dashboard/calendar` | Calendar | All |
| Inbox | `/dashboard/inbox` | Inbox | Manager+ |
| Map | `/dashboard/map` | Map | All |
| Analytics | `/dashboard/analytics` | BarChart | Manager+ |
| Settings | `/dashboard/settings/*` | Settings | Varies |

### 2.3 Dashboard Home

File: `app/dashboard/page.tsx`

Widgets and summary cards:

- **Stats cards** — Jobs today, revenue this week, pending quotes, active deals.
- **Activity feed** — Recent workspace activity (limit 50 items).
- **Upcoming jobs** — Next scheduled jobs with time/address.
- **Quick actions** — New deal, new contact, new quote shortcuts.
- **Stale deal alerts** — Deals inactive for 7+ or 14+ days.

---

## 3. CRM: Contacts, Deals & Pipeline

### 3.1 Contacts

Files: `app/dashboard/contacts/page.tsx`, `components/crm/contact-detail.tsx`

**Contact Fields:**
- Name (required)
- Email
- Phone
- Contact type: `PERSON` or `BUSINESS`
- Company name (if BUSINESS)
- Address
- Notes
- Tags

**Contact List Features:**
- Searchable/filterable list
- Bulk actions
- Contact detail side panel
- Associated deals list
- Communication history (calls, SMS, emails)

### 3.2 Deals & Pipeline (Kanban)

Files: `app/dashboard/pipeline/page.tsx`, `components/crm/pipeline-kanban.tsx`

**Pipeline Stages:**
Deals flow through configurable Kanban columns representing stages (e.g., New Lead → Quoted → Scheduled → In Progress → Completed → Lost).

**Deal Fields:**
- Title / job description (required)
- Value ($)
- Contact (linked)
- Address (with autocomplete)
- Scheduled date/time
- Stage
- Assigned team member
- Description / notes
- Priority

**Kanban Features:**
- Drag-and-drop between stages
- Stage column counts and totals
- Deal cards show: title, contact name, value, scheduled date, staleness indicator
- Staleness badges:
  - 7+ days inactive → "Stale Deal" (amber)
  - 14+ days inactive → "Rotting Deal" (red)
- Click card → Deal detail modal
- Automation actions on stale deals

### 3.3 Deal Detail View

File: `components/crm/deal-detail-modal.tsx`

A large modal (max-width 7xl, 90vh height) with three tabs:

| Tab | Contents |
|-----|----------|
| Activities | Timeline of all deal activities |
| Jobs | Linked jobs with status and scheduling |
| Notes | Free-text notes attached to the deal |

Additional features:
- Edit deal fields inline
- Stage change controls
- Contact information display
- Associated deals for the same contact

---

## 4. Tracey AI Assistant

### 4.1 Chat Interface

Files: `components/chatbot/chat-interface.tsx`, `components/chatbot/deferred-chat-interface.tsx`

A conversational AI assistant embedded in the dashboard.

**Quick Action Buttons:**
- Schedule a job (Calendar icon)
- Create a quote (FileText icon)
- Follow up call (Phone icon)
- Move a deal (Sparkles icon)

**Chat Capabilities:**
- Natural language job creation and scheduling
- Contact lookup and creation
- Deal management (move stages, update values)
- Quote generation
- Daily digest generation (morning agenda / evening wrap-up)
- Undo last action
- Message persistence to database

### 4.2 Job Draft Cards

When Tracey parses a job request, it produces an editable draft card:

| Field | Required | Notes |
|-------|----------|-------|
| First name | Yes | |
| Last name | No | |
| Work description | Yes | |
| Price | No | Numeric |
| Schedule | Yes (if scheduling) | Human-readable date/time |
| Address | No | |
| Phone | No | |
| Email | No | |
| Notes | No | Language prefs, special instructions |
| Customer type | No | PERSON or BUSINESS |
| Assigned to | Yes (if scheduled) | Team member dropdown |
| Category | Read-only | e.g., "General" |
| Warnings | Read-only | Validation warnings array |

**Draft Actions:**
- Edit all fields inline
- Confirm → creates the job (requires: first name, work description, assignee if scheduled)
- Cancel → discards the draft

### 4.3 Agent Modes

File: `lib/agent-mode.ts`

| Mode | Behavior |
|------|----------|
| EXECUTION | Full autonomy — executes actions automatically |
| DRAFT | Review & approve — drafts shown for confirmation |
| INFO_ONLY | Information only — no automatic actions |

Configured in Settings → AI Assistant → Autonomy Mode.

### 4.4 Voice Agent

Files: `livekit-agent/customer-agent.ts`, `lib/voice-agent-auth.ts`, `lib/voice-agent-runtime.ts`

- Inbound call handling via LiveKit
- Phone number provisioning per workspace
- Real-time transcription
- Customer contact policy enforcement
- Response policy enforcement for customer-facing channels

### 4.5 Knowledge Base & Learning

Files: `app/dashboard/settings/knowledge/page.tsx`, `app/dashboard/settings/agent/page.tsx`

- Behavioral rules list (add/remove free-text rules)
- Auto-update glossary toggle
- Auto-create pricing suggestions from confirmed jobs
- AI preferences text area

---

## 5. Modals & Overlays

### 5.1 New Deal Modal

File: `components/modals/new-deal-modal.tsx`

**Fields:**
- Job description (required)
- Value ($ optional)
- Address (with autocomplete)
- Scheduled date/time (optional)
- Stage selector
- Assignee (when scheduled)

**Contact Selection (tabbed):**
- Tab 1: Select existing contact (search)
- Tab 2: Create new contact — Name (required), Email, Phone, Type (PERSON/BUSINESS), Company name

### 5.2 Job Completion Modal

File: `components/crm/job-completion-modal.tsx`

Shown when marking a job as complete.

**Sections:**

1. **Job Summary** (read-only) — Client name, job value, address, description.
2. **Work Quality** — Job quality rating (1–5 stars), client satisfaction rating (1–5 stars). Labels: Poor, Fair, Good, Very Good, Excellent.
3. **Issues & Notes** — Add/remove issues list, additional notes textarea.
4. **Next Steps** — Textarea for follow-up actions (invoice, materials, etc.).
5. **Follow-up Actions** (checkboxes):
   - Request Payment
   - Request Review
   - Send Photos to Client

**Buttons:** Cancel, Submit Review (disabled until both ratings are provided).

### 5.3 Loss Reason Modal

File: `components/crm/loss-reason-modal.tsx`

Shown when marking a deal as lost.

**Quick-select reasons:**
- Price too high
- Lost to competitor
- Client changed mind
- Timeline issues
- Budget constraints
- Went with different provider
- Project cancelled
- Other

- Custom reason textarea for details.
- **Buttons:** Cancel, Mark as Lost (destructive style).

### 5.4 Stale Job Reconciliation Modal

File: `components/crm/stale-job-reconciliation-modal.tsx`

For updating overdue/past-due scheduled jobs.

**Fields:**
- Deal info display (title, customer, address, scheduled date)
- Actual outcome dropdown (required):
  - COMPLETED (green)
  - RESCHEDULED (blue)
  - NO_SHOW (orange)
  - CANCELLED (red)
- Notes textarea (optional)

**Buttons:** Cancel, Update Job.

### 5.5 Kanban Automation Modal

File: `components/crm/kanban-automation-modal.tsx`

Triggered from stale deal cards on the Kanban board.

**Available Actions:**

| Action | Icon Color | Description |
|--------|-----------|-------------|
| Send Follow-up | Blue | Pre-filled message template |
| Schedule Call | Green | Requires follow-up date/time |
| Send Nudge | Amber | Market activity nudge message |
| Escalate | Red | Flag for manager review |
| Move Stage | Purple | Select target stage |

**Action Configuration:**
- Message textarea with character count
- Follow-up date/time picker (for follow-up and schedule-call)
- Target stage dropdown (for move-stage)
- Execute Action button

### 5.6 Stale Deal Follow-up Modal

File: `components/crm/stale-deal-follow-up-modal.tsx`

**Features:**
- Deal summary with staleness badge and last activity date
- Contact info (email/phone)
- Channel selector: Email, SMS, Phone Call
- Message templates:
  - Gentle Nudge
  - Value Focused
  - Urgent Follow-up
  - New Information
- Custom message textarea
- Send Follow-up button

### 5.7 Activity Modal

File: `components/modals/activity-modal.tsx`

- Recent activity feed (up to 50 items)
- Compact view toggle
- Full-height modal dialog

---

## 6. Scheduling, Calendar & Maps

### 6.1 Calendar

File: `app/dashboard/calendar/page.tsx`

- Day, week, and month views
- Scheduled jobs displayed with time, contact, and address
- Click to open deal detail
- Drag to reschedule (where supported)
- Team member filtering

### 6.2 Map View

File: `app/dashboard/map/page.tsx`

- Job locations plotted on a map
- Route optimization display
- Job clustering for dense areas
- Click marker → job detail

---

## 7. Quoting & Invoicing

### 7.1 Quotes

- AI-assisted quote generation via Tracey chat
- Service-based line items with pricing from onboarding configuration
- Quote preview and send (email/SMS)

### 7.2 Invoicing

- Invoice generation from completed jobs
- Payment request follow-up actions (from job completion modal)

---

## 8. Communications: SMS, Email & Calls

### 8.1 SMS

Files: `lib/ai/sms-agent.ts`, `lib/sms.ts`, `components/sms/message-action-sheet.tsx`

- Template-based messaging
- Message preview before sending
- Channel selection (SMS/Email)
- Contact information display
- Trigger events (e.g., `AFTER_JOB_COMPLETED`)

### 8.2 SMS Templates

File: `app/dashboard/settings/sms-templates/`

- Create, edit, and delete templates
- Trigger event configuration (when to auto-send)
- Message preview with variable interpolation

### 8.3 Email

- Lead capture via forwarding address (configured during onboarding)
- Auto-forward rules for Gmail and Outlook
- DNS/Resend verification
- Inbound email parsing and deal creation

### 8.4 Calls

File: `app/dashboard/settings/call-settings/page.tsx`

- Inbound call handling configuration
- Voice agent settings
- Outbound call settings
- Call transcription and logging

### 8.5 Inbox

File: `app/dashboard/inbox/`

- Unified inbox for SMS, email, and call transcripts
- Threaded conversations per contact
- Manager+ access only

---

## 9. Analytics & Reporting

File: `app/dashboard/analytics/`

- Revenue metrics and trends
- Job completion rates
- Deal conversion funnel
- Team performance
- Manager+ access only

---

## 10. Role-Based Access Control (RBAC)

Files: `lib/rbac.ts`, `lib/workspace-access.ts`

### 10.1 Roles

| Role | Level | Description |
|------|-------|-------------|
| OWNER | Highest | Full access to all features and settings |
| MANAGER | Mid | Can manage deals, contacts, approve completions, escalate |
| TEAM_MEMBER | Lowest | Limited to assigned work and basic views |

### 10.2 Access Functions

| Function | Purpose |
|----------|---------|
| `getCurrentUserRole()` | Returns user role; defaults to TEAM_MEMBER (falls back to OWNER on error) |
| `isManagerOrAbove()` | Returns `true` for OWNER or MANAGER |
| `requireCurrentWorkspaceAccess()` | Enforces workspace membership; returns user with workspaceId and role |
| `requireContactInCurrentWorkspace(contactId)` | Workspace-scoped contact access check |
| `requireDealInCurrentWorkspace(dealId)` | Workspace-scoped deal access check |

### 10.3 Route Restrictions

**TEAM_MEMBER is blocked from:**

| Category | Routes |
|----------|--------|
| Pages | `/dashboard/inbox`, `/dashboard/contacts`, `/dashboard/analytics` |
| Settings | `/dashboard/settings/billing`, `/dashboard/settings/integrations` |

---

## 11. Global Search (Cmd+K)

File: `components/layout/global-search.tsx`

**Trigger:** `Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux)

**Behavior:**
- Debounced search (300ms)
- Minimum 2 characters
- Loading state indicator

**Result Types:**

| Type | Icon | Displayed Fields |
|------|------|-----------------|
| Contacts | User | Name, subtitle |
| Deals | FileText | Title, value/stage |
| Tasks | Calendar | Task title |
| Activity | History | Activity description |
| Calls | PhoneCall | Call details |

**UI:** Command palette dialog with grouped results. Variants: `default` (compact) and `bar` (wide).

---

## 12. Settings & Configuration

### 12.1 Account Settings

File: `app/dashboard/settings/account/page.tsx`
- User profile management
- Email preferences
- Password management

### 12.2 My Business Settings

File: `app/dashboard/settings/my-business/page.tsx`
- Business name, address, contact info
- Trade type and services

### 12.3 AI Assistant / Agent Settings

File: `app/dashboard/settings/agent/page.tsx`

| Setting | Type | Details |
|---------|------|---------|
| Autonomy Mode | Radio group | Execution / Review & Approve / Info Only |
| Working Hours | Time inputs | Start (HH:MM) and End (HH:MM) |
| Agenda Notification | Time | Default 07:30 |
| Wrap-up Notification | Time | Default 17:30 |
| Auto-update Glossary | Toggle | Learn from confirmed jobs |
| Behavioral Rules | List | Add/remove free-text rules |
| AI Preferences | Textarea | Free-text preferences |

### 12.4 Knowledge Base

File: `app/dashboard/settings/knowledge/page.tsx`
- Service pricing and descriptions
- Learning rules

### 12.5 Call Settings

File: `app/dashboard/settings/call-settings/page.tsx`
- Inbound/outbound call configuration
- Voice agent setup

### 12.6 SMS Templates

File: `app/dashboard/settings/sms-templates/`
- Template CRUD
- Trigger event mapping

### 12.7 Integrations

File: `app/dashboard/settings/integrations/`
- Third-party service connections
- Manager+ access only

### 12.8 Billing

File: `app/dashboard/settings/billing/`
- Subscription management
- Owner/Manager access only

---

## 13. Billing & Subscriptions

Files: `app/billing/page.tsx`, `app/billing/success/page.tsx`, `components/billing/upgrade-button.tsx`

**Paywall Features Advertised:**
- AI Agent (calls, SMS, scheduling)
- Smart CRM with Pipeline & Contacts
- Automated Quoting & Invoicing
- Real-time Map & Route Optimization
- Reports, Analytics & Team Management

**Flow:**
1. User lands on `/billing` paywall.
2. Clicks upgrade → redirected to Stripe Checkout.
3. On success → `/billing/success` verifies the session, provisions the workspace, and redirects to `/setup` or `/dashboard`.

**Tracked Data:**
- Subscription status (active/inactive)
- Current period end date
- Phone number provisioning request flag
