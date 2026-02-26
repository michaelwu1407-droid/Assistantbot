# ISSUE TRACKER

**Last Updated:** 2026-02-27 (Documentation Consolidation & Twilio Migration)

This document tracks the functional status of each page and feature, explicitly listing any unresolved issues. It also serves as an archive for all historically encountered and resolved issues.

## Application Pages & Features Matrix

| Route / Feature | Status | Unresolved Issues / TODOs |
|-----------------|--------|---------------------------|
| **`/dashboard`** | ✅ Functional | - FE-4 mobile responsive pass completed (stacking KPI row, responsive padding).<br>- Build interactive tutorial overlay (T-1) ✅ FIXED |
| **`/dashboard/agent`** | 📦 Archived | Real estate features sunsetted. |
| **`/dashboard/tradie`** | ✅ Functional | - FE-8 bottom sheet swipe polished (lower threshold, tighter spring, touch-action: none). |
| **`/dashboard/contacts`** | ✅ Functional | None |
| **`/dashboard/pipeline`** | ✅ Functional | None |
| **`/dashboard/map`** | ✅ Functional | - Route mode: "Start Route" button shows sequenced stops sidebar, dashed route line, per-stop Navigate buttons (opens Google Maps), Navigate Full Route (multi-waypoint), numbered markers, fly-to animation. |
| **`/dashboard/schedule`** | ✅ Functional | - **NEW**: Add Month/Week/Day view toggle functionality. |
| **`/dashboard/team`** | ✅ Functional | None |
| **`/dashboard/reports`** | ✅ Functional | - **NEW**: Verify tracked data accuracy and PDF generation functionality. |
| **`/dashboard/settings`** | ⚠️ Needs Overhaul | - **CRITICAL**: UI spacing issues (LHS content overlaps sidebar nav).<br>- **Profile/Knowledge Base**: Build business knowledge section for AI context.<br>- **Account Settings**: Remove duplicate email entry, fix "Delete Account" button placement.<br>- **Appearance/Display**: Consolidate useful items, fix default mode.<br>- **Billing/Invoicing**: Set up client payment integration.<br>- **Automations**: Verify functional rules and notifications.<br>- **Workspace**: Remove irrelevant fields, set working hours for agent. |
| **`/kiosk`** | 📦 Archived | Real estate features sunsetted. |
| **`/setup`** | ✅ Functional | None |
| **Chatbot Interface** | ⚠️ Needs Fixes | - **CRITICAL**: Fix "parts field" crash on basic queries ("What jobs do I have tomorrow?").<br>- **NEW**: Add voice-to-text microphone functionality.<br>- **NEW**: Implement conversation retrieval ("Show me my text history with Steven").<br>- **NEW**: Enhance task management ("Call John next Tuesday"). |
| **SMS Agent** | ✅ Functional | - `lib/ai/sms-agent.ts` now uses Gemini 2.0 Flash with full workspace context. |
| **Twilio Webhook** | ✅ Functional | - Core SMS routing works. AI responses use scaffolding SMS agent above. |
| **Vapi Webhook** | ✅ Functional | - Workspace resolution now uses strict `twilioPhoneNumber` matching on the dialed system number.<br>- Recording URL persisted in activity content (from `recordingUrl` or `artifact.recordingUrl`). |
| **Retell Webhook/SMS** | ⚠️ Partial | - Infrastructure is solid (signature verification, workspace routing, stage mapping).<br>- Requires Retell dashboard setup (Response Engine, Voice, Tools).<br>- Env vars not documented. User has API key & identity ID — setup deferred.<br>- **Feature Request**: Must configure Retell AI gracefully to handle multi-languages natively. |
| **Google Calendar Integration** | ❌ Scaffolding | - "Connect" button is a fake `setTimeout` mock — no OAuth. |
| **MYOB / Auth / Mail** | ✅ Functional | None |

## 🚨 Major Unresolved Features (From Sprint 19 Handover)

### **Dashboard & Kanban Improvements**
- **Activity Card**: Clicking should open popup with detailed entries
- **New Deal Button**: Default should be "Create New" instead of "Select"
- **Kanban Card Notes**: Reduce height, pin to bottom right, format as "*Date: Note*" with edit button
- **Quick Actions**: "Contact them" needs "Text" and "Email" buttons (currently only "Call")

### **Inbox Page**
- **Customer Section**: Create "Recent activity" box with vertical scroll
- **Correspondence History**: Secondary box with ALL correspondence (email, text, call) in chronological conversation format

### **Core Workflow Features**
- **Post-Job Workflow**: Send alert asking for resolution status and final invoiced amount
- **Invoice Adjustments**: Easy adjustment via chatbox OR kanban cards
- **Repair Glossary**: Build glossary for natural language job recognition (no estimated prices)
- **Smart Routing**: Optimize booking for jobs within 15km/7 days of existing jobs
- **Email Lead Interception**: Parse Hipages jobs from email inbox

### **Agent Operational Modes**
- **Execute Mode**: Total autonomy for booking/scheduling
- **Organise Mode**: Creates draft cards, waits for human confirmation
- **Filter Mode**: Receptionist only, no scheduling/pricing decisions
- **Pricing Rules**: Never agree on pricing upfront without confirmation (except user-set common tasks)

### **System-Wide Improvements**
- **Daily Notifications**: Start/end of day agenda notifications (toggleable in settings)
- **Search & Filtering**: Fast fuzzy search across entire application
- **Sidebar Navigation**: Remove minimize button completely
- **Maps Sidebar**: Move Maps icon above Contacts icon

---

## 🌐 Multilingual Support Implementation (From MULTILINGUAL_SETUP.md)

### **Environment Configuration Required**
- **RETELL-1 (API Setup):** 🔜 PENDING — Add Retell AI environment variables for multilingual support:
  - `RETELL_API_KEY` - Retell API key
  - `RETELL_AGENT_ID` - Agent ID for multilingual support
  - `RETELL_RESPONSE_ENGINE_ID` - Response engine for language detection
  - `RETELL_PRIMARY_VOICE_ID` - Default voice (e.g., `zh-CN-XiaoxiaoNeural`)
  - `RETELL_FALLBACK_VOICE_ID` - Fallback to English voice
  - Individual language voice IDs (Chinese, Spanish, French, German, etc.)

### **Retell AI Integration**
- **RETELL-2 (Agent Configuration):** 🔜 TODO — Configure multilingual agent in Retell Dashboard:
  - Create response engine with language detection
  - Add language-specific instructions for customer communication
  - Set up voice models for supported languages
  - Test language detection and response accuracy

### **AI System Integration**
- **RETELL-3 (Voice Selection Logic):** 🔜 TODO — Implement dynamic voice selection based on customer notes:
  - Parse customer notes for language preferences
  - Map language keywords to appropriate voice IDs
  - Integrate with call-making logic in `lib/comms-simple.ts`
  - Add fallback to English when language not supported

### **SMS Translation Support**
- **RETELL-4 (SMS Translation):** 🔜 TODO — Add translation capabilities for SMS communications:
  - Integrate translation service (Google Translate API)
  - Store customer language preferences
  - Auto-translate common SMS messages
  - Add language preference to SMS metadata

### **Testing & Quality Assurance**
- **RETELL-5 (Testing Suite):** 🔜 TODO — Create comprehensive testing for multilingual features:
  - Test customer creation with language notes
  - Verify AI calls use correct voice models
  - Test language detection accuracy
  - Validate SMS translation quality
  - Monitor call logs for language handling issues

---

## Unresolved UX/UI & Feature Audit (Pending)
*The following issues have been logged from a comprehensive user review on 2026-02-20 and are pending future development.*

### Pending Config Changes
- **TWILIO-1 (AU Number Swap):** 🔜 PENDING — Currently using US trial number `+12624390786` for Supabase Phone Auth OTP. Once the Australia Mobile Business Regulatory Bundle is approved by Twilio, swap to an AU `+61` number in **both** Supabase (Authentication → Providers → Phone) and the `.env` config. See Twilio Console for Account SID.
- **CHAT-6 (Conciseness):** 🔜 TODO — AI chatbot responses are too verbose. Update system prompt to enforce short, punchy replies. Tradies want quick answers, not essays.
- **CHAT-7 (Jobs not Meetings):** 🔜 TODO — Replace all references to "meetings" with "jobs" across AI system prompts, tool descriptions, and UI copy.

### Home Page
- **Home-1 (Activity Card):** ✅ FIXED — Activity card clicks now open a DealDetailModal instead of navigating away.
- **Home-2 (New Deal Button):** ✅ FIXED — Default mode reset to "create" tab after submission.
- **Home-3 (Kanban Card Notes):** ✅ FIXED — Reduced note bubble min-height, padding, and font size.
- **Home-4 (Note Logging):** ✅ FIXED — Note styling reduced alongside Home-3.
- **Home-5 (Contact Actions):** ✅ FIXED — Contact detail page now shows Call, Text, and Email buttons using actual phone/email data.

### Chatbox & AI Agent
- **Chat-1 (Basic Queries):** ✅ HARDENED — Deep message content validation added. Empty/malformed messages are filtered with proper fallbacks. Edge cases covered for arrays with empty objects.
- **Chat-2 (History & Actions):** ✅ FIXED — Added `sendSms` tool (sends SMS via Twilio or logs if not configured) and `getConversationHistory` tool (retrieves merged SMS/call/email history for a contact). Chatbot can now process "Text Steven I'm on my way" and "Show me my text history with Steven".
- **Chat-3 (Agent Knowledge Base):** ✅ FIXED — System prompt now injects business identity from Workspace (name, location, phone) and BusinessProfile (trade type, website, suburb, service radius, hours, emergency service). The AI uses this when communicating with customers.
- **Chat-4 (Notification Creation):** ✅ FIXED — Added `createNotification` tool that creates immediate or scheduled notifications + calendar tasks. Chatbot can process "Notify me 2 days before Wendy's repair job" or "Alert me Friday if John hasn't responded".
- **Chat-5 (Auth in API Route):** ✅ FIXED — Created `getWorkspaceSettingsById(workspaceId)` in settings-actions.ts. Chat route now uses workspaceId from request body directly, bypassing session auth dependency.
- **SMS-1 (SMS Agent AI):** ✅ FIXED — Rewired `lib/ai/sms-agent.ts` to use Gemini 2.0 Flash with workspace context (business name, agent mode, working hours, call-out fee, AI preferences, conversation history). Falls back gracefully if API key missing.

### Dashboard Pages
- **Inbox-1 (Conversation History):** ✅ FIXED — Inbox now has "Conversations" vs "System Activity" tabs. System events filtered by pattern matching. Action buttons use real contactPhone/contactEmail. Mobile responsive with back-navigation.
- **Schedule-1 (Calendar Views):** ✅ FIXED — Calendar rewritten with Month/Week/Day toggle views. Month days clickable to drill into day view, today highlighted.
- **Reports-1 (Data Accuracy):** Verify what data is driving the analytics, ensure the tracking is correct, and confirm proper setup for metrics.
- **Maps-1 (Sidebar Order):** ✅ FIXED — Map icon now sits above Contacts in sidebar nav.
- **Maps-2 (Job Plotting):** ✅ FIXED — `getTradieJobs()` was missing `lat`/`lng` in return. Added `deal.latitude`/`deal.longitude` and fixed address to prefer deal address over contact address.
- **Sidebar-1 (Minimize Button):** ✅ FIXED — Minimize button and collapsed sidebar state removed entirely.

### Settings Page
- **Settings-1 (Layout):** ✅ FIXED — Increased left padding on settings container (`pl-6`/`md:pl-10`/`lg:pl-14`) to clear the sidebar nav.
- **Settings-2 (Email Modification):** ✅ FIXED — Account form now has editable email field with Supabase `updateUser({ email })`. Sends confirmation to both old and new addresses.
- **Settings-3 (Bio & Links):** ✅ FIXED — Removed unused `bio` and `urls` from ProfileForm interface and page props. Fields were already absent from UI.
- **Settings-4 (Advanced Mode):** Build out the Advanced Mode toggles and features.
- **Settings-5 (Account Deletion):** ✅ FIXED — Replaced large red card with small right-aligned text link. Confirmation dialog now requires selecting a reason from dropdown (6 options + "Other") before delete is enabled.
- **Settings-6 (Billing Integration):** Set up a billing/invoicing integration section for users to collect payments (likely 3rd party Stripe/MYOB).
- **Settings-7 (Appearance):** ✅ REDESIGNED — All three themes (Light, Dark, Premium) kept with redesigned preview cards, proper CSS variables for Premium (deep indigo), and ThemeProvider unlocked to support theme switching.
- **Settings-8 (Notifications):** Make the notifications hub robust. Verify it catches AI-generated alerts.
- **Settings-9 (Workspace Fields):** ✅ FIXED — Relabeled "Workspace Name" to "Business Name" (used by AI agent) and "Location" to "Service Area" (used for geolocation routing) with clarifying descriptions.
- **Settings-10 (Automations):** Verify the Automations engine works (e.g., AI prompting "if I make $100 this week, let me know" should generate a functional rule).
- **Settings-11 (Integrations):** Ensure the Integrations page is fully functional.

### General Workflows
- **Gen-1 (Post-Job Alert):** Once a job is marked 'Completed', trigger an alert/survey to check in on how the job went (e.g., "Was it resolved?", "How much was invoiced?"). Build a logical CRM logging flow for these outstanding details.

---

## Issue Archive (Resolved Issues)
*This section retains the history of previously encountered issues, their status, and how they were resolved to establish a learning base for future AI agents.*

### Chatbot / NLP
- **CB-01 ($ sign regex):** ✅ FIXED - Shorthand regex blocked `$` symbol in prices. Fixed with input normalization.
- **CB-02 (200$ price):** ✅ FIXED - Added `$` stripping normalization.
- **CB-03 (ymrw day lost):** ✅ FIXED - Extracted from `workDesc` to `schedule`.
- **CB-04 (Draft price/address):** ✅ FIXED - Fixed capture groups.
- **CB-06 (History not loading):** ✅ FIXED - Replaced with imported `getChatHistory`.
- **CB-07 (Clear history crashes):** ✅ FIXED - Replaced client DB call with server action.
- **CB-10 (422/500 errors):** ✅ FIXED - Made `processChat` DB-resilient.
- **CB-13/18 (Draft card data/editable):** ✅ FIXED - Added formatting/categorization and converted to editable `JobDraftCard`.
- **FE-2 (Basic Mode Chat UI):** ✅ FIXED - Replaced bare dashboard with full-page, clean ChatGPT-styled frosted container.

### Architecture & Workflows
- **INFRA-01/04 (Vercel Fixes & Tests):** ✅ FIXED - Verified env vars config on Vercel and introduced Vitest for chat-utils test suite.
- **Twilio Orchestration:** ✅ FIXED - Rebuilt `Workspace` DB with `twilioSubaccountId`, wired `Workspace Onboarding` to auto-provision isolated subaccounts. Webhooks now strictly route by matching incoming `To` integers.
- **BE-2 (Vendor Report):** ✅ FIXED - Wired real feedback averages mapped from `BuyerFeedback` table to replace static UI integers. 
- **J-11 (Signature Pad):** ✅ FIXED - Added canvas signature capture into Job Completion payload.
- **API-01/02/03 (Gmail, Outlook, MYOB):** ✅ FIXED - Replaced stubs with full production-grade fetching, token storage, and matching algorithms.

### Auth & UI Fixes
- **AUTH-01/02 (Infinite Redirect loops):** ✅ FIXED - Eliminated demo user hardcoding and centralized auth checks in Middleware to push explicitly to `/dashboard`.
- **UI-12/13/20 (React Crashes):** ✅ FIXED - Wrapped suspense boundaries, downgraded resizable-panels dynamically to `2.1.7`, replaced missing `Images` import with `lucide-react`. 
- **TRADE-01..10 (Tradie specific bugs):** ✅ FIXED - Repaired Travel workflow calculations, voice-to-text hook, Schedule grid alignment, and Map marker popups.
- **FE-10 / SET-01 (Settings Refine):** ✅ FIXED - GitHub OAuth button was verified to already be entirely removed from code. Wired up Supabase `updateUser` for the newly built password change interface.
- **J-8 (Chatbot Voice Control):** ✅ FIXED - Tied the `@/hooks/use-speech-recognition` to a new pulsing Mic button attached to the primary chat interface to allow hands-free communication.

### Chatbot & SMS Agent (Sprint 19)
- **BE-4 (Gemini SDK Chatbot):** ✅ FIXED — `/api/chat` route now uses `@ai-sdk/google` with `gemini-2.0-flash-lite`, 13 tool functions (listDeals, moveDeal, createDeal, createJobNatural, proposeReschedule, updateInvoiceAmount, updateAiPreferences, logActivity, createTask, searchContacts, createContact), streaming via `createUIMessageStreamResponse`, and `convertToModelMessages` for history.
- **Chat-1 (Parts Field Crash):** ✅ HARDENED — Added deep content validation that checks array internals (not just length), identifies tool-call/tool-result parts, and falls back to raw content extraction. Added secondary empty-fallback stream if all messages are filtered.
- **Chat-5 (Auth in API Route):** ✅ FIXED — Created `getWorkspaceSettingsById(workspaceId)` in `actions/settings-actions.ts` that queries workspace directly by ID without session auth. Chat route switched from `getWorkspaceSettings()` to `getWorkspaceSettingsById()`.
- **SMS-1 (SMS Agent AI):** ✅ FIXED — Rewrote `lib/ai/sms-agent.ts` from keyword-matching to Gemini 2.0 Flash. Now fetches workspace context (name, agentMode, hours, callOutFee, aiPreferences), loads recent conversation history from ChatMessage table, and generates context-aware SMS replies. Falls back gracefully if API key missing.
- **CLEANUP-1 (Dead Code):** ✅ FIXED — Legacy `processChat()` and ~750 lines of regex intent parsing helpers removed from `chat-actions.ts`. UI confirmed to use `/api/chat` route exclusively.

### Self-Learning AI & Webhooks (Sprint 18)
- **AI-01 (Behavioral Memory):** ✅ FIXED - Replaced static system prompts with a dynamically updatable `aiPreferences` setting that correctly saves and injects user behavioral constraints.
- **AI-02 (Pricing Feedback Loop):** ✅ FIXED - Engineered an autonomous background loop that captures finalized `invoicedAmount` edits on Kanban Deals to seamlessly update and average the `RepairItem` pricing glossary dictionaries.
- **AI-03 (Agent Modes / Constraints):** ✅ FIXED - Strictly enforced the new `callOutFee` value in `Settings`, actively constraining the AI to quote base-rates until confirming a job schedule.
- **INT-01 (Hipages Email Parses):** ✅ FIXED - Spun up a `/api/webhooks/email` REST endpoint intercepting Hipages/external payloads, correctly parsing unstructured raw strings via Gemini, and gracefully routing parsed Leads into the Kanban backlog.

### Deprecated / Archived Features
- **FE-3 / FE-9 (Stale Deal Colors & 75/25 Split):** 📦 ARCHIVED - The UI has pivoted to a fluid layout rendering these specific aesthetic requirements obsolete.
- **J-3 / J-5 (Safety Check Modal):** 📦 ARCHIVED - Deprecated from the start-travel workflow to reduce friction.
- **AG-2 / BE-3 / BE-5 / KIOSK (Real Estate Modules):** 📦 ARCHIVED - Project pivoted to focus entirely on Tradie workflows; the commission calculators, open house kiosks, and Vendor Report PDF generators are no longer priorities.
- **SH-1 (Industry-Aware Pipeline Headers):** 📦 ARCHIVED - Redundant, since the application is now strictly hardcoded to the Tradie pipeline terminology (New Request -> Quote -> Scheduled -> Invoice -> Completed).
