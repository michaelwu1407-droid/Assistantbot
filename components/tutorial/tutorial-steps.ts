// ─── Tutorial Steps (17 cards) ───────────────────────────────────────
// Steps 1–12: Welcome, chat mode, dashboard, nav (inbox → settings).
// Steps 13–17: Travis Handbook pointer, Competitive Edge, Pro Tip, We're Listening, Finish.
// Each step spotlights a feature/button/area and shows a chat example

export interface TutorialStep {
    id: string
    targetId: string | null
    title: string
    message: string
    chatExample?: { input: string; output: string }
    position?: string
    actionLabel: string
    section?: string
    /** Optional element to show a "drag to resize" arrow (e.g. chat panel resize handle) */
    resizeHandleId?: string
}

export const TUTORIAL_STEPS: TutorialStep[] = [
    // ══════════════════════════════════════════════════════════════
    // SECTION 1: WELCOME & INTRO (Steps 1-5)
    // ══════════════════════════════════════════════════════════════
    { id: "welcome", targetId: null, title: "Welcome to Earlymark! 🎉", message: "I'm Travis, your AI assistant. My goal is to handle the boring admin so you can focus on the tools. Let's take a quick tour!", actionLabel: "Let's Go", section: "Welcome" },
    { id: "two-modes", targetId: "chat-mode-window", title: "Two Modes, One App", message: "**Chat mode** — The EASIEST way to use Earlymark is to just type what you want.\n\n**Advanced mode** — Toggle this on to play with the full dashboard and features yourself.", actionLabel: "Got it" },
    { id: "lets-explore", targetId: null, title: "Let's Explore! 🗺️", message: "I'll walk you through the key features. Everything I show you, you can also just type to me in the chatbox.", actionLabel: "Show me" },

    // ══════════════════════════════════════════════════════════════
    // SECTION 2: BASIC MODE & CHAT (Steps 6-20)
    // ══════════════════════════════════════════════════════════════
    { id: "basic-mode", targetId: "assistant-pane", title: "Chat Mode — Your AI Companion", message: "This is where the magic happens. Chat mode hides complex widgets, leaving you with an intelligent chat.", chatExample: { input: "New repair job for Frank at 300 George St for $600 tomorrow 2pm", output: "Job \"Repair\" created for Frank at 300 George St, $600, scheduled tomorrow 2pm." }, position: "left", actionLabel: "Next", section: "Chat Mode", resizeHandleId: "assistant-resize-handle" },

    // ══════════════════════════════════════════════════════════════
    // SECTION 3: ADVANCED MODE & DASHBOARD
    // ══════════════════════════════════════════════════════════════
    { id: "chat-preferences", targetId: "assistant-pane", title: "Teach Me Your Rules", message: "I remember your preferences permanently.", chatExample: { input: "From now on always add 1 hour buffer between jobs", output: "Preference saved: \"Always add 1 hour buffer between jobs\". I'll follow this rule." }, position: "left", actionLabel: "Next" },
    { id: "dashboard-home", targetId: "main-canvas", title: "🏠 The Dashboard", message: "This is the dashboard where you can see your CRM pipeline from new requests to completed jobs. On the left is the navigation bar to other pages.", chatExample: { input: "Give me my daily summary", output: "Today: 4 jobs, $2,400 revenue. 1 overdue task. 3 new messages." }, position: "right", actionLabel: "Next" },

    // ══════════════════════════════════════════════════════════════
    // SECTION 4: SIDEBAR NAVIGATION
    // ══════════════════════════════════════════════════════════════
    { id: "nav-inbox", targetId: "main-canvas", title: "📬 Unified Inbox", message: "See your conversation with each customer in one place — across emails, texts, calls.\n* Travis answers calls, takes messages, and routes emergencies.\n* Use Travis to send automated messages or initiate outbound calls. Or do it yourself too.\n* Oh...and Travis can call the customer in different languages.", actionLabel: "Next" },
    { id: "nav-schedule", targetId: "main-canvas", title: "📅 Smart Schedule", message: "Your visual calendar.", actionLabel: "Next" },
    { id: "nav-map", targetId: "map-link", title: "🗺️ Interactive Route Map", message: "See all active jobs plotted on a live map with color-coded pins.\n\nOpen the **Today's Jobs** list on the left to see your run for the day — tap a job to jump to it on the map.", actionLabel: "Next" },
    { id: "nav-contacts", targetId: "contacts-link", title: "👥 Contact Directory", message: "Every person auto-saved to CRM. View job history, contact details, notes.\n\nSort between **individual** or **business** customers.", actionLabel: "Next" },
    { id: "nav-team", targetId: "team-link", title: "👥 Team Management", message: "Manage staff and subbies. Assign them to jobs.\n\nStaff only see what you allow — **strict team permissions**.", actionLabel: "Next" },
    { id: "nav-settings", targetId: "settings-link", title: "⚙️ Workspace Settings", message: "Use the left menu to jump to any tab: **Profile**, **Help** (Travis Handbook), **Phone** & **Support**, **Account** & **Billing**, **Notifications**, **Workspace** & **Display**, **One-Tap Messages**, **Automations**, **Integrations**, **AI Voice Agent**, **Agent Capabilities**, and **Repair Glossary**.", actionLabel: "Next" },

    // ══════════════════════════════════════════════════════════════
    // TRAVIS HANDBOOK & WRAP-UP (Steps 13–17)
    // ══════════════════════════════════════════════════════════════
    { id: "travis-handbook", targetId: "settings-link", title: "📖 Travis Handbook", message: "There's a lot more Travis can do — agent modes, top commands, scheduling, and more.\n\nOpen **Settings → Help** anytime to read the full **Travis Handbook**, organised by category.", actionLabel: "Next", section: "Wrap Up" },
    { id: "bonus-competitive", targetId: null, title: "🏆 Competitive Edge", message: "95% of tradies don't follow up. 80% don't track leads. You're already ahead by using Earlymark.", actionLabel: "Next" },
    { id: "bonus-feedback", targetId: null, title: "💬 We're Listening", message: "Found something that could be better? Just type 'feedback' in chat and tell us. We read every message.", actionLabel: "Next" },
    { id: "replay-finish", targetId: null, title: "You're Ready to Roll! 🚀", message: "That's everything! You can replay this tutorial anytime from **Settings → Help**.\n\nTo get started, try asking me:\n\n📱 \"Create a new test job\"\n📱 \"What's on my schedule?\"\n📱 \"Show me my pipeline\"\n\nI'm always here to help. Let's build your business together!", actionLabel: "Start Using Earlymark", section: "Wrap Up" },
]
