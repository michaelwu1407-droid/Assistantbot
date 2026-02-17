# Pj Buddy (Assistantbot)

> **A "Hub and Spoke" CRM for Modern Service Businesses.**
> Powered by Next.js 14, Supabase, and Gemini AI.

![Pj Buddy Banner](https://placeholder-banner-image.com)

## 🚀 Overview

**Pj Buddy** is an AI-first CRM designed to unify fragmented business operations. It combines a powerful central database ("The Hub") with dedicated, role-specific interfaces ("Spokes") for field technicians and sales agents.

### Key Capabilities
- **Hub**: Centralized Command Center (Kanban, Calendar, Contacts).
- **Tradie Mode**: Mobile-first workflow for technicians (Jobs, Safety, Invoicing).
- **Agent Mode**: High-velocity tools for Real Estate (Leads, Matches, Reports).
- **AI Assistant**: Natural language "Chat First" interface for all operations.

## 📚 Documentation

For a complete, granular breakdown of every feature, please see the **[Operational Manual](APP_MANUAL.md)**.

- **[APP_MANUAL.md](APP_MANUAL.md)**: Detailed feature guide.
- **[project_status_log.md](project_status_log.md)**: Active project status and change history.
- **[ACECAP_LOG.md](ACECAP_LOG.md)**: Master log of all identified issues and resolutions.

## 🛠️ Tech Stack

- **Frontend**: Next.js 14 (App Router), Tailwind CSS, Shadcn UI.
- **Backend**: Server Actions, Supabase (PostgreSQL), Prisma ORM.
- **AI**: Google Gemini Flash (Intent Parsing), Vercel AI SDK.
- **Auth**: Clerk (Identity Management).
- **Maps**: Leaflet (OpenStreetMap).

## ⚡ Quick Start

1.  **Clone & Install**:
    ```bash
    git clone https://github.com/your-org/pj-buddy.git
    cd pj-buddy
    npm install
    ```

2.  **Environment Setup**:
    Copy `.env.example` to `.env.local` and populate keys (Clerk, Supabase, Gemini).

3.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000).

## 🤝 Contributing

Please refer to `project_status_log.md` before making changes to ensure you are aligned with the latest roadmap.

---

**License**: MIT
