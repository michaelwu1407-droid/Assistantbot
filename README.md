# Pj Buddy - Company Onboarding & App Manual

Welcome to Pj Buddy! This document serves as the master onboarding guide for anyone joining the company or working on the application. It outlines our core vision, the technological backbone of the platform, the primary features we offer, and how users interact with the system.

## 1. The Vision
Pj Buddy is an AI-first CRM and workflow management tool purpose-built for **Tradies** (Tradespeople and local service businesses). 
Our goal is to eliminate administrative overhead by providing a conversational, intelligent platform where jobs can be quoted, scheduled, and invoiced entirely through natural language (voice and text) alongside a powerful but simplified Kanban dashboard. 

*(Note: While the platform previously explored Real Estate Agent modules like open-house kiosks and commission calculators, we have officially pivoted and sunsetted those features to focus 100% on the Tradie vertical).*

## 2. Tech Stack
Pj Buddy is built on a modern, high-performance, edge-ready tech stack:

- **Framework:** [Next.js 14](https://nextjs.org/) (App Router format for server-side rendering and API routes).
- **Language:** TypeScript across the entire stack.
- **Styling:** Tailwind CSS + [shadcn/ui](https://ui.shadcn.com/) (using Radix UI primitives) for accessible, beautiful components. 
- **Database & Auth:** [Supabase](https://supabase.com/) (PostgreSQL database, Row Level Security, and Authentication).
- **ORM:** [Prisma](https://www.prisma.io/) (for type-safe database queries and schema management).
- **AI & NLP:** [Vercel AI SDK](https://sdk.vercel.ai/) (`@ai-sdk/react`) integrated with **Google Gemini 2.5** for generative natural language processing, tool calling, and chat generation.
- **Voice / Telephony:** [Twilio](https://www.twilio.com/) (multi-tenant subaccount orchestration for SMS/Voice routing), currently exploring/integrating with [Retell AI](https://www.retellai.com/) and [Vapi](https://vapi.ai/) for native conversational voice agents.

## 3. Key Features & Use Cases
Pj Buddy replaces legacy CRM software with an AI-first approach. 

### A. The "Chat-First" Interface (Basic Mode)
The primary way Tradies interact with Pj Buddy is not by clicking through endless forms, but by simply talking to the Assistant.
- **Voice-to-Text:** Users can click the pulsing Mic button in the chat to speak naturally (e.g., *"I just got a call from John Smith, he needs a leaky pipe fixed on Tuesday at 2pm, quote him $250"*).
- **Generative AI Tools:** The AI (Gemini) parses this text, calls internal server functions (`showJobDraft`, `moveDeal`), and instantly renders UI cards (like the `JobDraftCard`) right inside the chat window for the Tradie to review and confirm.

### B. The Tradie Pipeline (Kanban)
For visual management, we provide a modern Drag-and-Drop Kanban board tailored specifically to the Tradie workflow.
- **Columns:** `New request` ➔ `Quote sent` ➔ `Scheduled` ➔ `Pipeline` ➔ `Ready to be invoiced` ➔ `Completed` ➔ `Deleted jobs`.
- **Functionality:** Users can drag-and-drop Deal Cards to progress jobs. Automated actions tied to stage changes (like SMS confirmations) are triggered automatically in the background.

### C. Unified Inbox & Calendar
- **Inbox:** Intercepts Twilio SMS messages and routes them securely to the specific Business/Workspace subaccount, displaying them in a clean, email-style chronological feed.
- **Schedule:** A visual Monthly calendar that plots all jobs automatically based on the `scheduledAt` metadata from the associated deals.

### D. Smart Invoicing & Client Delivery
When a job is moved to "Ready to be invoiced", Tradies use Pj Buddy to automatically generate polished, professional invoices based on the quoted job price and recorded job notes. These invoices can then be pushed directly to the client via integrated Email or SMS workflows, fully eliminating manual paperwork.
## 4. Interactive Tutorial Mapping
*(The interactive tutorial system uses `react-joyride` to map tooltips and guided walkthroughs to specific DOM element IDs across the application).*

| Feature Area | DOM Element ID | Tutorial Step Description |
|--------------|----------------|---------------------------|
| **Sidebar Menu** | `#sidebar-nav` | Explains the main navigation structure (Schedule, Contacts, Map, etc). |
| **Chat Assistant** | `#chat-panel` | Highlights the AI Assistant input where users can type/speak commands to create jobs. |
| **Kanban Board** | `#kanban-board` | Introduces the drag-and-drop pipeline showing how jobs progress from Request to Invoice. |
| **Add New Job** | `#new-deal-btn` | Points to the manual "Plus" button for users who prefer creating jobs without AI. |
| **KPI Cards** | `#kpi-cards` | Highlights the top-row metrics showing daily Revenue, Scheduled Jobs, and Follow-ups. |

---
**Document Maintained by:** Pj Buddy Engineering Team
**Last Updated:** February 2026
