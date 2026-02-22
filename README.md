# Pj Buddy - Architecture & Features Manifesto

Welcome to Pj Buddy! This document serves as the master onboarding guide, outlining our core vision, the technological backbone of the platform, the primary features we offer, and how users interact with the system.

## 1. Core Identity & Vision
Pj Buddy is an AI-first CRM and workflow management tool purpose-built exclusively for **Tradies** (Tradespeople and local service businesses). 
Our goal is to eliminate administrative overhead by providing a conversational, intelligent platform where jobs can be quoted, scheduled, and invoiced entirely through natural language (voice and text) alongside a powerful but simplified Kanban dashboard. 

*(Note: While the platform previously explored Real Estate Agent modules, those features remain available but are not actively developed. The primary focus is on Tradies).*

## 2. Tech Stack & Telephony
Pj Buddy is built on a modern, high-performance edge tech stack:

- **Framework:** Next.js 16.1.6 (App Router format for server-side rendering and API routes).
- **Language:** TypeScript across the entire stack.
- **Styling (The "Ottorize" Design System):** Tailwind CSS + shadcn/ui. The UI explicitly uses a premium "Glassmorphism" aesthetic with `.ott-card` utilities, corner-layout metrics, soft drop-shadows, and a clean light/dark mode switch.
- **Database & Auth:** Supabase (PostgreSQL database, Row Level Security, and Authentication) - **NOT** Clerk as documented elsewhere.
- **ORM:** Prisma (for type-safe database queries and schema management).
- **AI & NLP:** Vercel AI SDK (`@ai-sdk/react`) integrated with **Google Gemini 2.0 Flash Lite**. Includes deep integration for intent mapping, memory updating, and functional tool-calling.
- **Voice / Telephony:** Native integration with Twilio subaccounts per tenant, routing voice calls into **Retell AI**, dumping live transcripts dynamically back to the Inbox.

## 3. Generative Artificial Intelligence
Rather than clicking through forms, Tradies use the "Chat-First" interface as the primary navigation engine:
- **Natural Language Parsing**: Uses a comprehensive Gemini tool array. The chatbot autonomously maps "Remind me next Friday" to calendar tasks, or handles queries like "Show me my text history with Steven" by running a fuzzy history retrieve.
- **Microphone Integration**: Supports raw voice-to-text dictation dynamically fed directly into the Chat payload.
- **Self-Learning Guardrails**: The AI checks `Workspace Settings` and dynamically injects "Business Identity" and "Call Out Fee" limits to prevent over-quoting without first securing an appointment. 

---

## 4. Platform Page Map

### 1. `/dashboard` (The Hub / Kanban Pipeline)
The landing interface operating on a Drag-and-Drop Pipeline.
- **Top KPI Cards**: Corner-layout metrics tracking 3 data points: Daily Revenue targets (calculated from Deals marked as 'Completed'), Scheduled Jobs (count of Deals mapped to today's date), and Follow-up queues (count of 'Stale' deals).
- **Kanban Board**: Drag-and-drop Deal cards across stages: `New request` ➔ `Quote sent` ➔ `Scheduled` ➔ `Pipeline` ➔ `Ready to be invoiced` ➔ `Completed` ➔ `Deleted jobs`. 
- **Card-Level Mechanics**: Deal cards feature a persistent timestamped "Notes" log, direct click-to-edit fields for finalizing invoiced amounts, and dynamic background color-coding that turns cards amber or red when they sit idle in the pipeline past 7 days (stale logic).
- **Automated Mechanics**: Moving cards autonomously triggers system logic using the Automations Engine. Example: dropping a card from `Quote sent` to `Scheduled` fires off a system trigger requesting a date/time pairing for the calendar and can queue an automated execution like "Send confirmation SMS".
- **Activity Feed**: Real-time chronological ticker displaying all stage movements across your Workspace.
- **Global Search (Cmd+K)**: Fuzzy-searching dynamically spanning across Deal Titles, Contact Names, and internal Tasks.

### 2. `/dashboard/inbox` (Unified Log)
Replaces standard CRMs with a clean, email-style chronological feed. 
- **Dual Tab System**: Users toggle between "Conversations" (historical text) and "System Activity" (pipeline movements).
- **Multi-Channel Logging**: It fetches Activities and collates incoming Twilio SMS messages, Phone Calls (displaying AI Call Summaries + full transcripts via Vapi/Retell), parsed emails, and manual CRM notes into a unified chronological log specifically matched to each Contact's phone number or email string.
- **Quick CRM Reply**: Includes integrated "Call", "Text", and "Email" shortcut buttons immediately pulling the user into an outgoing communication flow using the platform's Twilio backend.

### 3. `/dashboard/schedule` 
A robust visual management view replacing list formats. 
- **Dynamic Calendar Logic**: Includes a full layout with buttons to toggle down to Month, Week, and Day specific views. The grid permanently highlights "Today".
- **Interactive Deal Rendering**: Renders interactive pins dynamically locked onto a Deal's physical `scheduledAt` metadata. Clicking a marker instantly spawns the `DealDetailModal` to permit quick updating of quoted prices, adding diary notes, or rescheduling via a date-picker.

### 4. `/dashboard/map` (Start Your Day)
Dedicated for the field. 
- **Leaflet Geo-Routing**: Consolidates today's active Deals and plots them on a native map using longitude/latitude metadata captured from the Deal Address or Contact Address strings.
- **Start-Travel Workflow**: 1-click execution to trigger "Start Navigation" (opens the native external map app for driving directions), "Send ETA SMS" (routes an automated text to the specific contact), and "Arrive / Safety Check" (prompts the job diary) flows natively from the physical location markers.

### 5. `/dashboard/contacts`
 A fully dedicated Client Management System index.
- **Granular Search**: Renders a comprehensive list of all leads, vendors, and active customers, supporting live-filtering text searches across names and organization tags.
- **Profile Deep-Dives**: Generates a split-pane layout showing Lifetime Customer Value calculations (aggregated from purely "Completed" deals), linked Deal active histories, and isolated communication activity specific only to that Contact.

### 6. `/dashboard/team`
A lightweight organizational interface for admins.
- **Workforce Management**: Visual UI tracking active staff profiles, designated organizational roles, productivity bounds, and internal task routing mechanisms.

### 7. `/dashboard/reports`
Analytics dashboards dynamically hooked to real pipeline data.
- **Quantitative Charts**: Plotted graphs projecting Quote-to-Win conversion ratios, total revenue aggregations split dynamically by month logic, and Speed-to-Lead turnaround tracking.

### 8. `/dashboard/settings`
The AI "Brain Setup" configuration layer consisting of four primary sub-menus:
- **Workspace Profile**: The core foundational layer. Here, the business owner actively overrides default placeholders to inject their specific Business Name, Address, Website, and defined Trading/Operating Hours directly into the AI's system prompt to govern its responses.
- **Agent Capabilities**: Dedicated UI for manual safety override limits. The user can dictate strict "Booking Padding" logic (e.g. enforcing 30-minute travel buffers), establish strict "Call-Out Fees", and append raw custom text to strictly block the AI from providing upfront prices.
- **Automations Engine**: A dedicated macro creator exposing internal logic to the user. They can link custom IF/THEN mechanics, mapping triggers (e.g., "Deal Stage = Sent to Lost") to actions (e.g., "AI sends survey via text").
- **Appearance**: Global overrides to enforce the Ottorize design system, allowing users to lock the entire software suite into Light Mode, Dark Mode, or Premium Custom Indigo UI presentations.

---
**Document Maintained by:** Pj Buddy AI Engineering Team
**Last Updated:** February 2026
