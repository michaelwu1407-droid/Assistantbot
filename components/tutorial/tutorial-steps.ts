// ─── Tutorial Steps (15 cards) ───────────────────────────────────────
// Section 1: Welcome & Orientation (3 steps)
// Section 2: Chat Mode & AI Power (3 steps)
// Section 3: Dashboard & Navigation (7 steps)
// Section 4: Settings & Wrap-Up (2 steps)

export interface TutorialStep {
    id: string
    targetId: string | null
    title: string
    message: string
    chatExample?: { input: string; output: string }
    /** Compact feature bullets rendered as dot-prefixed list */
    features?: string[]
    /** Optional tip shown in a highlighted callout box */
    tip?: string
    position?: string
    actionLabel: string
    section?: string
    /** Optional element to show a "drag to resize" arrow (e.g. chat panel resize handle) */
    resizeHandleId?: string
}

export const TUTORIAL_STEPS: TutorialStep[] = [
    // ══════════════════════════════════════════════════════════════
    // SECTION 1: WELCOME & ORIENTATION
    // ══════════════════════════════════════════════════════════════
    {
        id: "welcome",
        targetId: null,
        title: "Welcome to Earlymark! 🎉",
        message: "I'm Tracey, your AI assistant. My goal is to handle the boring admin so you can focus on the tools. Let's take a quick tour!",
        actionLabel: "Let's Go",
        section: "Welcome",
    },
    {
        id: "two-modes",
        targetId: "chat-mode-window",
        title: "Two Modes, One App",
        message: "**Chat mode** — The EASIEST way to use Earlymark. Just type what you want. Also works via **WhatsApp Assistant**.\n\n**Advanced mode** — Toggle this on to access the full dashboard, pipeline, and all pages yourself.",
        actionLabel: "Got it",
    },
    {
        id: "lets-explore",
        targetId: null,
        title: "Let's Explore! 🗺️",
        message: "I'll walk you through the key features. Everything I show you, you can also just type to me in the chatbox.",
        actionLabel: "Show me",
    },

    // ══════════════════════════════════════════════════════════════
    // SECTION 2: CHAT MODE & AI POWER
    // ══════════════════════════════════════════════════════════════
    {
        id: "chat-mode",
        targetId: "assistant-pane",
        title: "Chat Mode — Your AI Companion",
        message: "This is where the magic happens. Type naturally — create jobs, check your schedule, send quotes, and more.",
        tip: "Drag the edge of the chat panel to resize it",
        chatExample: { input: "New repair job for Frank at 300 George St for $600 tomorrow 2pm", output: "Job \"Repair\" created for Frank at 300 George St, $600, scheduled tomorrow 2pm." },
        position: "left",
        actionLabel: "Next",
        section: "Chat Mode",
        resizeHandleId: "assistant-resize-handle",
    },
    {
        id: "chat-preferences",
        targetId: "assistant-pane",
        title: "Teach Me Your Rules",
        message: "I remember your preferences permanently. Tell me your business rules and I'll follow them every time.",
        features: [
            "'Always add 1 hour buffer between jobs'",
            "'Always text the client the day before a job'",
            "'Never schedule jobs on Fridays'",
        ],
        chatExample: { input: "From now on always add 1 hour buffer between jobs", output: "Preference saved. I'll follow this rule going forward." },
        position: "left",
        actionLabel: "Next",
    },
    {
        id: "chat-power",
        targetId: "assistant-pane",
        title: "More Than Just Chat",
        message: "Here's a taste of what you can ask me:",
        features: [
            "**Quotes & Invoices** — 'Send Frank a quote for $600'",
            "**Daily summary** — 'What's on today?'",
            "**Contact lookup** — 'Show me Frank's job history'",
            "**Analytics** — 'How much revenue this month?'",
            "**Scheduling** — 'Move tomorrow's 2pm to Thursday'",
        ],
        chatExample: { input: "Send Frank a quote for the repair job", output: "Quote generated for $600. Ready to send to Frank." },
        position: "left",
        actionLabel: "Next",
    },

    // ══════════════════════════════════════════════════════════════
    // SECTION 3: DASHBOARD & NAVIGATION
    // ══════════════════════════════════════════════════════════════
    {
        id: "dashboard-home",
        targetId: "main-canvas",
        title: "🏠 The Dashboard",
        message: "Your CRM pipeline — drag deals across stages. Click any card to see full details, create invoices, or assign team members.",
        features: [
            "**New Request** → **Quote Sent** → **Scheduled** → **Awaiting Payment** → **Completed**",
        ],
        tip: "**Drag the resize handle** to open or close the chat panel on the right. If collapsed, tap the floating **chat bubble** to reopen it. Tracey is available on every page in advanced mode.",
        chatExample: { input: "Give me my daily summary", output: "Today: 4 jobs, $2,400 revenue. 1 overdue task. 3 new messages." },
        position: "right",
        actionLabel: "Next",
    },
    {
        id: "nav-inbox",
        targetId: "main-canvas",
        title: "📬 Unified Inbox",
        message: "Every customer conversation in one place.",
        features: [
            "**Emails, texts, calls, WhatsApp** — all unified",
            "Tracey answers calls, takes messages, and routes emergencies",
            "Send automated messages or make outbound calls",
            "Tracey can call customers in **different languages**",
        ],
        actionLabel: "Next",
    },
    {
        id: "nav-schedule",
        targetId: "main-canvas",
        title: "📅 Smart Schedule",
        message: "Your visual calendar.",
        features: [
            "See jobs by **day, week, or month** — drag to reschedule",
            "Jobs auto-slot when Tracey creates them",
            "Auto-checks for **clashes** and suggests alternatives",
            "Groups **nearby jobs** together to minimise travel",
            "Syncs with **Google Calendar** if connected",
        ],
        actionLabel: "Next",
    },
    {
        id: "nav-map",
        targetId: "map-link",
        title: "🗺️ Interactive Route Map",
        message: "All active jobs plotted on a live map with **color-coded pins**.\n\nOpen the **Today's Jobs** list to see your daily run — tap a job to jump to it on the map.",
        actionLabel: "Next",
    },
    {
        id: "nav-contacts",
        targetId: "contacts-link",
        title: "👥 Contact Directory",
        message: "Every person auto-saved to your CRM. View **job history, contact details, notes**. Sort between **individual** or **business** customers.",
        actionLabel: "Next",
    },
    {
        id: "nav-analytics",
        targetId: "reports-link",
        title: "📊 Analytics",
        message: "Track your business performance — **revenue trends, customer metrics, job stats**. Filter by **7 days, 30 days, 90 days, or last 12 months**. See monthly revenue breakdowns at a glance.",
        actionLabel: "Next",
    },
    {
        id: "nav-team",
        targetId: "team-link",
        title: "👥 Team Management",
        message: "Manage **staff and subbies**. Assign them to jobs. Staff only see what you allow — **strict team permissions**. Invite new members directly from here.",
        actionLabel: "Next",
    },

    // ══════════════════════════════════════════════════════════════
    // SECTION 4: SETTINGS & WRAP-UP
    // ══════════════════════════════════════════════════════════════
    {
        id: "nav-settings",
        targetId: "settings-link",
        title: "⚙️ Settings & Handbook",
        message: "Configure everything from the settings menu.",
        features: [
            "**Account** — Profile, phone, security, referrals",
            "**My Business** — Hours, pricing, service areas, AI Attachment Library",
            "**Calls & Texting** — SMS templates, contact hours, automated messages",
            "**AI Assistant** — Agent modes, learning rules, WhatsApp, board attention",
            "**Integrations** — Gmail, Outlook, Google Calendar, Xero",
            "**Automations** — IFTTT-style rules to automate your workflow",
            "**Billing, Notifications, Display, Data & Privacy**",
        ],
        tip: "Open **Settings → Help** anytime to read the full **Tracey Handbook**",
        actionLabel: "Next",
        section: "Wrap Up",
    },
    {
        id: "finish",
        targetId: null,
        title: "You're Ready to Roll! 🚀",
        message: "That's everything! Replay this tutorial anytime from **Settings → Help**.\n\nFound something that could be better? Just type **'feedback'** in chat.\n\nTo get started, try asking me:\n📱 'Create a new test job'\n📱 'Send a quote to a customer'\n📱 'What's on my schedule?'\n📱 'Show me this month's revenue'\n\nI'm always here to help. Let's build your business together!",
        actionLabel: "Start Using Earlymark",
        section: "Wrap Up",
    },
]
